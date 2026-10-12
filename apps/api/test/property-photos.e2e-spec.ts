import type { INestApplication } from '@nestjs/common';
import sharp from 'sharp';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import { createE2eApp } from './helpers/create-e2e-app.js';
import { resetDatabase } from './helpers/reset-database.js';
import { createAuthenticatedAgent } from './helpers/auth.js';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from './helpers/http.js';

describe('Property photos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;

  const storageKeysToCleanUp = new Set<string>();

  beforeAll(async () => {
    const context = await createE2eApp();

    app = context.app;
    prisma = context.prisma;
    storage = app.get(StorageService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    storageKeysToCleanUp.clear();
  });

  afterEach(async () => {
    for (const storageKey of storageKeysToCleanUp) {
      await storage.deleteObject(storageKey);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploads and confirms a property photo', async () => {
    // 1. Создаём пользователя
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });

    // 2. Создаём черновик
    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

    // 3. Генерируем настоящее JPEG-изображение
    const jpeg = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: '#abcdef',
      },
    })
      .jpeg()
      .toBuffer();

    // 4. Запрашиваем presigned URL
    const uploadResponse = await agent
      .post(`/properties/drafts/${propertyId}/photos/upload-url`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .send({
        contentType: 'image/jpeg',
        sizeBytes: jpeg.length,
      })
      .expect(201);

    const { uploadId, uploadUrl } = uploadResponse.body as {
      uploadId: string;
      uploadUrl: string;
    };

    // Запоминаем временный объект для очистки
    const pendingUpload = await prisma.propertyPhotoUpload.findUniqueOrThrow({
      where: { id: uploadId },
    });

    storageKeysToCleanUp.add(pendingUpload.storageKey);

    // 5. Загружаем JPEG напрямую в SeaweedFS
    const putResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: new Uint8Array(jpeg),
    });

    expect(putResponse.status).toBe(200);

    // 6. Подтверждаем загрузку через NestJS
    const confirmResponse = await agent
      .post(`/properties/drafts/${propertyId}/photos/${uploadId}/confirm`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    // 7. Проверяем запись в PostgreSQL
    const photo = await prisma.propertyPhoto.findUniqueOrThrow({
      where: {
        id: confirmResponse.body.id as string,
      },
    });

    storageKeysToCleanUp.add(photo.storageKey);

    expect(photo.propertyId).toBe(propertyId);
    expect(photo.contentType).toBe('image/webp');
    expect(photo.sizeBytes).toBeGreaterThan(0);

    // 8. Проверяем, что временная запись удалена
    const pending = await prisma.propertyPhotoUpload.findUnique({
      where: { id: uploadId },
    });

    expect(pending).toBeNull();

    // 9. Проверяем реальный WebP в SeaweedFS
    const stored = await storage.readPhotoForValidation(photo.storageKey);

    const metadata = await sharp(stored.buffer).metadata();

    expect(metadata.format).toBe('webp');
    expect(stored.contentType).toBe('image/webp');
  });
});
