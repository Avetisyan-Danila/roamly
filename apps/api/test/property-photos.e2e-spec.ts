import type { INestApplication } from '@nestjs/common';
import sharp from 'sharp';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import { PHOTO_CLEANUP_GRACE_PERIOD_MS } from '../src/properties/photos/photo-cleanup.constants.js';
import { createE2eApp } from './helpers/create-e2e-app.js';
import { resetDatabase } from './helpers/reset-database.js';
import { deleteStorageObjects } from './helpers/storage.js';
import { createAuthenticatedAgent } from './helpers/auth.js';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from './helpers/http.js';
import {
  createDraft,
  createTestImage,
  requestPhotoUpload,
  seedPropertyPhotos,
  uploadToStorage,
} from './fixtures/property-photos.fixture.js';

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
    await deleteStorageObjects(storage, storageKeysToCleanUp);
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploads and confirms a property photo', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });
    const propertyId = await createDraft(agent);
    const jpeg = await createTestImage('jpeg');

    const { upload, uploadUrl } = await requestPhotoUpload(
      agent,
      prisma,
      propertyId,
      jpeg.length,
    );

    storageKeysToCleanUp.add(upload.storageKey);

    // Загружаем JPEG напрямую в SeaweedFS
    const putResponse = await uploadToStorage(uploadUrl, jpeg);

    expect(putResponse.status).toBe(200);

    const confirmResponse = await agent
      .post(`/properties/drafts/${propertyId}/photos/${upload.id}/confirm`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const photo = await prisma.propertyPhoto.findUniqueOrThrow({
      where: {
        id: confirmResponse.body.id as string,
      },
    });

    storageKeysToCleanUp.add(photo.storageKey);

    expect(photo.propertyId).toBe(propertyId);
    expect(photo.contentType).toBe('image/webp');
    expect(photo.sizeBytes).toBeGreaterThan(0);

    const photosResponse = await agent
      .get(`/properties/drafts/${propertyId}/photos`)
      .expect(200);

    expect(photosResponse.body).toHaveLength(1);

    const listedPhoto = photosResponse.body[0] as {
      id: string;
      url: string;
      position: number;
    };

    expect(listedPhoto.id).toBe(photo.id);
    expect(listedPhoto.position).toBe(0);

    // Проверяем, что подписанная ссылка действительно работает
    const downloadResponse = await fetch(listedPhoto.url);

    expect(downloadResponse.status).toBe(200);

    const downloadedBuffer = Buffer.from(await downloadResponse.arrayBuffer());
    const downloadedMetadata = await sharp(downloadedBuffer).metadata();

    expect(downloadedMetadata.format).toBe('webp');

    // Временная запись удалена
    const pending = await prisma.propertyPhotoUpload.findUnique({
      where: { id: upload.id },
    });

    expect(pending).toBeNull();

    // Проверяем реальный WebP в SeaweedFS
    const stored = await storage.readPhotoForValidation(photo.storageKey);
    const metadata = await sharp(stored.buffer).metadata();

    expect(metadata.format).toBe('webp');
    expect(stored.contentType).toBe('image/webp');

    // Повторное подтверждение той же загрузки не создает дубликат
    await agent
      .post(`/properties/drafts/${propertyId}/photos/${upload.id}/confirm`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(404);

    const photoCount = await prisma.propertyPhoto.count({
      where: { propertyId },
    });

    expect(photoCount).toBe(1);

    // Для исходного файла создано задание на удаление
    const deletionTask = await prisma.storageDeletionTask.findUnique({
      where: {
        storageKey: upload.storageKey,
      },
    });

    expect(deletionTask).not.toBeNull();

    // Удаление запланировано после срока загрузки + защитный период
    expect(deletionTask?.availableAt.getTime()).toBe(
      upload.expiresAt.getTime() + PHOTO_CLEANUP_GRACE_PERIOD_MS,
    );

    // Исходный файл пока еще существует в SeaweedFS
    const originalPhoto = await storage.readPhotoForValidation(
      upload.storageKey,
    );

    expect(originalPhoto.buffer.equals(jpeg)).toBe(true);
  });

  it('deletes a draft photo and updates remaining positions', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });
    const propertyId = await createDraft(agent);
    const photos = await seedPropertyPhotos(prisma, propertyId, 3);

    // Удаляем среднюю фотографию
    await agent
      .delete(`/properties/drafts/${propertyId}/photos/${photos[1].id}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(204);

    const remaining = await prisma.propertyPhoto.findMany({
      where: { propertyId },
      orderBy: { position: 'asc' },
    });

    expect(
      remaining.map((photo) => ({
        id: photo.id,
        position: photo.position,
      })),
    ).toEqual([
      { id: photos[0].id, position: 0 },
      { id: photos[2].id, position: 1 },
    ]);

    // Проверяем задание на удаление файла из SeaweedFS
    const deletionTask = await prisma.storageDeletionTask.findUnique({
      where: { storageKey: photos[1].storageKey },
    });

    expect(deletionTask).not.toBeNull();
    expect(deletionTask!.availableAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('prevents uploading photos to another user draft', async () => {
    const ownerAgent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });
    const anotherAgent = await createAuthenticatedAgent(app, {
      email: 'another@example.com',
    });
    const propertyId = await createDraft(ownerAgent);

    await anotherAgent
      .post(`/properties/drafts/${propertyId}/photos/upload-url`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .send({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      })
      .expect(403);

    const uploadCount = await prisma.propertyPhotoUpload.count({
      where: { propertyId },
    });

    expect(uploadCount).toBe(0);
  });

  it('rejects expired photo uploads', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });
    const propertyId = await createDraft(agent);
    const { upload } = await requestPhotoUpload(
      agent,
      prisma,
      propertyId,
      1024,
    );

    // Имитируем истечение срока подтверждения
    await prisma.propertyPhotoUpload.update({
      where: { id: upload.id },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await agent
      .post(`/properties/drafts/${propertyId}/photos/${upload.id}/confirm`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(404);

    const photoCount = await prisma.propertyPhoto.count({
      where: { propertyId },
    });

    expect(photoCount).toBe(0);
  });

  it('rejects confirmation when the file was never uploaded', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });
    const propertyId = await createDraft(agent);
    const { upload } = await requestPhotoUpload(
      agent,
      prisma,
      propertyId,
      1024,
    );

    // PUT в хранилище не выполняем
    await agent
      .post(`/properties/drafts/${propertyId}/photos/${upload.id}/confirm`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(422);
  });

  it('rejects invalid image content', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });
    const propertyId = await createDraft(agent);
    const invalidFile = Buffer.from('This is not a real JPEG image');

    const { upload, uploadUrl } = await requestPhotoUpload(
      agent,
      prisma,
      propertyId,
      invalidFile.length,
    );

    storageKeysToCleanUp.add(upload.storageKey);

    // Загружаем текст вместо изображения
    const putResponse = await uploadToStorage(uploadUrl, invalidFile);

    expect(putResponse.status).toBe(200);

    // Backend должен отклонить файл при подтверждении
    await agent
      .post(`/properties/drafts/${propertyId}/photos/${upload.id}/confirm`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(422);

    const photoCount = await prisma.propertyPhoto.count({
      where: { propertyId },
    });

    expect(photoCount).toBe(0);

    // Незавершенная загрузка остается в БД
    const pending = await prisma.propertyPhotoUpload.findUnique({
      where: { id: upload.id },
    });

    expect(pending).not.toBeNull();
  });

  it('rejects photos when property already has 10 photos', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });
    const propertyId = await createDraft(agent);

    await seedPropertyPhotos(prisma, propertyId, 10);

    // Backend должен отклонить запрос еще до выдачи ссылки
    const response = await agent
      .post(`/properties/drafts/${propertyId}/photos/upload-url`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .send({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      })
      .expect(409);

    expect(response.body.errorCode).toBe('PHOTO_LIMIT_REACHED');

    const photoCount = await prisma.propertyPhoto.count({
      where: { propertyId },
    });

    expect(photoCount).toBe(10);

    const pendingCount = await prisma.propertyPhotoUpload.count({
      where: { propertyId },
    });

    expect(pendingCount).toBe(0);
  });

  it('prevents exceeding photo limit during concurrent confirmations', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });
    const propertyId = await createDraft(agent);
    const jpeg = await createTestImage('jpeg');

    await seedPropertyPhotos(prisma, propertyId, 9);

    // Получаем две независимые ссылки на загрузку
    const uploads = [
      await requestPhotoUpload(agent, prisma, propertyId, jpeg.length),
      await requestPhotoUpload(agent, prisma, propertyId, jpeg.length),
    ];

    for (const { upload } of uploads) {
      storageKeysToCleanUp.add(upload.storageKey);
    }

    const putResponses = await Promise.all(
      uploads.map(({ uploadUrl }) => uploadToStorage(uploadUrl, jpeg)),
    );

    expect(putResponses.map((response) => response.status)).toEqual([200, 200]);

    // Подтверждаем обе загрузки одновременно
    const confirmResponses = await Promise.all(
      uploads.map(({ upload }) =>
        agent
          .post(`/properties/drafts/${propertyId}/photos/${upload.id}/confirm`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE),
      ),
    );

    const statuses = confirmResponses
      .map((response) => response.status)
      .sort((a, b) => a - b);

    expect(statuses).toEqual([201, 409]);

    // Проигравший запрос упирается либо в лимит, либо в конфликт транзакций
    const rejected = confirmResponses.find(
      (response) => response.status === 409,
    );

    expect(['PHOTO_LIMIT_REACHED', 'CONCURRENT_MODIFICATION']).toContain(
      rejected?.body.errorCode,
    );

    const photoCount = await prisma.propertyPhoto.count({
      where: { propertyId },
    });

    expect(photoCount).toBe(10);

    // Запоминаем созданный WebP для очистки после теста
    const savedPhoto = await prisma.propertyPhoto.findFirstOrThrow({
      where: {
        propertyId,
        storageKey: {
          startsWith: `properties/${propertyId}/photos/`,
        },
      },
    });

    storageKeysToCleanUp.add(savedPhoto.storageKey);
  });
});
