import { Logger, type INestApplication } from '@nestjs/common';
import sharp from 'sharp';
import { vi } from 'vitest';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import { createE2eApp } from './helpers/create-e2e-app.js';
import { resetDatabase } from './helpers/reset-database.js';
import { createAuthenticatedAgent } from './helpers/auth.js';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from './helpers/http.js';
import { PropertyPhotoCleanupService } from '../src/properties/photos/property-photo-cleanup.service.js';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { StorageDeletionTaskService } from '../src/storage/storage-deletion-task.service.js';
import { randomUUID } from 'node:crypto';
import { PHOTO_CLEANUP_GRACE_PERIOD_MS } from '../src/properties/photos/photo-cleanup.constants.js';

describe('Property photos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let cleanupService: PropertyPhotoCleanupService;
  let deletionTaskService: StorageDeletionTaskService;

  const storageKeysToCleanUp = new Set<string>();

  beforeAll(async () => {
    const context = await createE2eApp();

    app = context.app;
    prisma = context.prisma;
    storage = app.get(StorageService);
    cleanupService = app.get(PropertyPhotoCleanupService);
    deletionTaskService = app.get(StorageDeletionTaskService);
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

    // Нам понадобятся ее storageKey и expiresAt для проверки созданного задания
    const uploadBeforeConfirm =
      await prisma.propertyPhotoUpload.findUniqueOrThrow({
        where: { id: uploadId },
      });

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

    // Получаем фотографии объявления через API
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

    // Повторно подтверждаем ту же загрузку
    await agent
      .post(`/properties/drafts/${propertyId}/photos/${uploadId}/confirm`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(404);

    // Убеждаемся, что дубликат фотографии не появился
    const photoCount = await prisma.propertyPhoto.count({
      where: { propertyId },
    });

    expect(photoCount).toBe(1);

    // Для исходного файла создано задание на удаление
    const deletionTask = await prisma.storageDeletionTask.findUnique({
      where: {
        storageKey: uploadBeforeConfirm.storageKey,
      },
    });

    expect(deletionTask).not.toBeNull();

    // Удаление запланировано после срока загрузки + защитный период
    expect(deletionTask?.availableAt.getTime()).toBe(
      uploadBeforeConfirm.expiresAt.getTime() + PHOTO_CLEANUP_GRACE_PERIOD_MS,
    );

    // Исходный файл пока ещё существует в SeaweedFS
    const originalPhoto = await storage.readPhotoForValidation(
      uploadBeforeConfirm.storageKey,
    );

    expect(originalPhoto.buffer.equals(jpeg)).toBe(true);
  });

  it('deletes a draft photo and updates remaining positions', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });

    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

    // Создаём три фотографии с позициями 0, 1, 2
    const photos = await Promise.all(
      [0, 1, 2].map((position) =>
        prisma.propertyPhoto.create({
          data: {
            propertyId,
            storageKey: `test/properties/${propertyId}/photo-${position}.webp`,
            contentType: 'image/webp',
            sizeBytes: 1024,
            position,
          },
        }),
      ),
    );

    // Удаляем среднюю фотографию
    await agent
      .delete(`/properties/drafts/${propertyId}/photos/${photos[1].id}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(204);

    // Проверяем оставшиеся фотографии
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

    const draftResponse = await ownerAgent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

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

    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

    const uploadResponse = await agent
      .post(`/properties/drafts/${propertyId}/photos/upload-url`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .send({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      })
      .expect(201);

    const uploadId = uploadResponse.body.uploadId as string;

    // Имитируем истечение срока подтверждения
    await prisma.propertyPhotoUpload.update({
      where: { id: uploadId },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    // Подтверждение должно быть отклонено
    await agent
      .post(`/properties/drafts/${propertyId}/photos/${uploadId}/confirm`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(404);

    // Фотография не должна появиться в PostgreSQL
    const photoCount = await prisma.propertyPhoto.count({
      where: { propertyId },
    });

    expect(photoCount).toBe(0);
  });

  it('rejects invalid image content', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });

    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

    // Создаём файл с содержимым, которое не является JPEG
    const invalidFile = Buffer.from('This is not a real JPEG image');

    // Запрашиваем разрешение на загрузку JPEG
    const uploadResponse = await agent
      .post(`/properties/drafts/${propertyId}/photos/upload-url`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .send({
        contentType: 'image/jpeg',
        sizeBytes: invalidFile.length,
      })
      .expect(201);

    const { uploadId, uploadUrl } = uploadResponse.body as {
      uploadId: string;
      uploadUrl: string;
    };

    const pendingUpload = await prisma.propertyPhotoUpload.findUniqueOrThrow({
      where: { id: uploadId },
    });

    storageKeysToCleanUp.add(pendingUpload.storageKey);

    // Загружаем текст вместо изображения
    const putResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: new Uint8Array(invalidFile),
    });

    expect(putResponse.status).toBe(200);

    // Backend должен отклонить файл при подтверждении
    await agent
      .post(`/properties/drafts/${propertyId}/photos/${uploadId}/confirm`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(422);

    // Убеждаемся, что фотография не зарегистрирована
    const photoCount = await prisma.propertyPhoto.count({
      where: { propertyId },
    });

    expect(photoCount).toBe(0);

    // Незавершённая загрузка остаётся в БД
    const pending = await prisma.propertyPhotoUpload.findUnique({
      where: { id: uploadId },
    });

    expect(pending).not.toBeNull();
  });

  it('rejects photos when property already has 10 photos', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });

    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

    // Подготавливаем объявление с 10 фотографиями
    await prisma.propertyPhoto.createMany({
      data: Array.from({ length: 10 }, (_, position) => ({
        propertyId,
        storageKey: `test/properties/${propertyId}/photo-${position}.webp`,
        contentType: 'image/webp',
        sizeBytes: 1024,
        position,
      })),
    });

    // Backend должен отклонить запрос ещё до выдачи ссылки
    await agent
      .post(`/properties/drafts/${propertyId}/photos/upload-url`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .send({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      })
      .expect(409);

    // Количество подтверждённых фотографий не изменилось
    const photoCount = await prisma.propertyPhoto.count({
      where: { propertyId },
    });

    expect(photoCount).toBe(10);

    // Новая pending-загрузка не должна создаваться
    const pendingCount = await prisma.propertyPhotoUpload.count({
      where: { propertyId },
    });

    expect(pendingCount).toBe(0);
  });

  it('prevents exceeding photo limit during concurrent confirmations', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });

    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

    // У объявления уже есть 9 фотографий
    await prisma.propertyPhoto.createMany({
      data: Array.from({ length: 9 }, (_, position) => ({
        propertyId,
        storageKey: `test/properties/${propertyId}/photo-${position}.webp`,
        contentType: 'image/webp',
        sizeBytes: 1024,
        position,
      })),
    });

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

    const uploads: { uploadId: string; uploadUrl: string }[] = [];

    // Получаем две независимые ссылки на загрузку
    for (let i = 0; i < 2; i++) {
      const response = await agent
        .post(`/properties/drafts/${propertyId}/photos/upload-url`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          contentType: 'image/jpeg',
          sizeBytes: jpeg.length,
        })
        .expect(201);

      const upload = response.body as {
        uploadId: string;
        uploadUrl: string;
      };

      const pending = await prisma.propertyPhotoUpload.findUniqueOrThrow({
        where: { id: upload.uploadId },
      });

      storageKeysToCleanUp.add(pending.storageKey);
      uploads.push(upload);
    }

    // Загружаем обе фотографии в SeaweedFS
    const putResponses = await Promise.all(
      uploads.map(({ uploadUrl }) =>
        fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: new Uint8Array(jpeg),
        }),
      ),
    );

    expect(putResponses.map((response) => response.status)).toEqual([200, 200]);

    // Подтверждаем обе загрузки одновременно
    const confirmResponses = await Promise.all(
      uploads.map(({ uploadId }) =>
        agent
          .post(`/properties/drafts/${propertyId}/photos/${uploadId}/confirm`)
          .set(CSRF_HEADER, CSRF_HEADER_VALUE),
      ),
    );

    const statuses = confirmResponses
      .map((response) => response.status)
      .sort((a, b) => a - b);

    expect(statuses).toEqual([201, 409]);

    // В базе должно остаться ровно 10 фотографий
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

  it('removes expired photo uploads from storage and database', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });

    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

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

    // Создаём pending-загрузку
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

    const pending = await prisma.propertyPhotoUpload.findUniqueOrThrow({
      where: { id: uploadId },
    });

    storageKeysToCleanUp.add(pending.storageKey);

    // Физически загружаем файл в SeaweedFS
    const putResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: new Uint8Array(jpeg),
    });

    expect(putResponse.status).toBe(200);

    // Убеждаемся, что файл действительно существует
    const storedPhoto = await storage.readPhotoForValidation(
      pending.storageKey,
    );

    expect(storedPhoto.buffer.equals(jpeg)).toBe(true);

    // Имитируем загрузку, просроченную более 10 минут назад
    await prisma.propertyPhotoUpload.update({
      where: { id: uploadId },
      data: {
        expiresAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });

    // Запускаем очистку вручную
    const result = await cleanupService.cleanupExpiredUploads();

    expect(result).toEqual({
      deleted: 1,
      failed: 0,
    });

    // Проверяем, что запись исчезла из PostgreSQL
    const remainingUpload = await prisma.propertyPhotoUpload.findUnique({
      where: { id: uploadId },
    });

    expect(remainingUpload).toBeNull();

    // Проверяем, что SeaweedFS тоже удалил файл
    await expect(
      storage.readPhotoForValidation(pending.storageKey),
    ).rejects.toMatchObject({
      $metadata: {
        httpStatusCode: 404,
      },
    });
  });

  it('keeps expired uploads when storage deletion fails', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });

    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

    const uploadResponse = await agent
      .post(`/properties/drafts/${propertyId}/photos/upload-url`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .send({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      })
      .expect(201);

    const uploadId = uploadResponse.body.uploadId as string;

    const upload = await prisma.propertyPhotoUpload.findUniqueOrThrow({
      where: { id: uploadId },
    });

    // Делаем запись просроченной
    await prisma.propertyPhotoUpload.update({
      where: { id: uploadId },
      data: {
        expiresAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });

    // Имитируем ошибку SeaweedFS при удалении объекта
    const deleteSpy = vi
      .spyOn(storage, 'deleteObject')
      .mockRejectedValueOnce(new Error('S3 temporarily unavailable'));

    const errorLogSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    try {
      const result = await cleanupService.cleanupExpiredUploads();

      expect(result).toEqual({
        deleted: 0,
        failed: 1,
      });

      expect(deleteSpy).toHaveBeenCalledWith(upload.storageKey);

      // Проверяем, что сервис действительно залогировал ошибку
      expect(errorLogSpy).toHaveBeenCalledWith(
        `Failed to clean up photo upload ${uploadId}`,
        expect.stringContaining('S3 temporarily unavailable'),
      );
    } finally {
      deleteSpy.mockRestore();
      errorLogSpy.mockRestore();
    }

    // Запись должна остаться в PostgreSQL
    const pending = await prisma.propertyPhotoUpload.findUnique({
      where: { id: uploadId },
    });

    expect(pending).not.toBeNull();

    // Повторяем очистку — теперь SeaweedFS доступен
    const retryResult = await cleanupService.cleanupExpiredUploads();

    expect(retryResult).toEqual({
      deleted: 1,
      failed: 0,
    });

    // После успешной попытки запись удалена
    const remainingUpload = await prisma.propertyPhotoUpload.findUnique({
      where: { id: uploadId },
    });

    expect(remainingUpload).toBeNull();
  });

  it('registers photo cleanup cron job', () => {
    const schedulerRegistry = app.get(SchedulerRegistry);

    const cronJob = schedulerRegistry.getCronJob('property-photo-cleanup');

    expect(cronJob).toBeDefined();

    expect(cronJob.cronTime.source).toBe(CronExpression.EVERY_10_MINUTES);
  });

  it('keeps recently expired photo uploads during grace period', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });

    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

    const uploadResponse = await agent
      .post(`/properties/drafts/${propertyId}/photos/upload-url`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .send({
        contentType: 'image/jpeg',
        sizeBytes: 1024,
      })
      .expect(201);

    const uploadId = uploadResponse.body.uploadId as string;

    // Загрузка просрочена 5 минут назад
    await prisma.propertyPhotoUpload.update({
      where: { id: uploadId },
      data: {
        expiresAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    });

    // Запускаем очистку
    const result = await cleanupService.cleanupExpiredUploads();

    expect(result).toEqual({
      deleted: 0,
      failed: 0,
    });

    // Запись должна остаться в PostgreSQL
    const pending = await prisma.propertyPhotoUpload.findUnique({
      where: { id: uploadId },
    });

    expect(pending).not.toBeNull();
  });

  it('creates storage deletion tasks when property is deleted', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });

    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;

    const photoKey = `properties/${propertyId}/photos/test.webp`;
    const pendingKey = `properties/${propertyId}/pending/test`;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Создаём подтверждённую фотографию
    const photo = await prisma.propertyPhoto.create({
      data: {
        propertyId,
        storageKey: photoKey,
        contentType: 'image/webp',
        sizeBytes: 1024,
        position: 0,
      },
    });

    // Создаём незавершённую загрузку
    const upload = await prisma.propertyPhotoUpload.create({
      data: {
        propertyId,
        storageKey: pendingKey,
        contentType: 'image/jpeg',
        sizeBytes: 1024,
        expiresAt,
      },
    });

    const beforeDelete = new Date();

    // Удаляем объявление через настоящий HTTP API
    await agent
      .delete(`/properties/${propertyId}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(204);

    const afterDelete = new Date();

    // Объявление удалено
    expect(
      await prisma.property.findUnique({
        where: { id: propertyId },
      }),
    ).toBeNull();

    // Обе связанные записи удалены через Cascade
    expect(
      await prisma.propertyPhoto.findUnique({
        where: { id: photo.id },
      }),
    ).toBeNull();

    expect(
      await prisma.propertyPhotoUpload.findUnique({
        where: { id: upload.id },
      }),
    ).toBeNull();

    // Но задания на физическое удаление файлов сохранились
    const tasks = await prisma.storageDeletionTask.findMany();

    expect(tasks).toHaveLength(2);

    const photoTask = tasks.find((task) => task.storageKey === photoKey);

    const pendingTask = tasks.find((task) => task.storageKey === pendingKey);

    expect(photoTask).toBeDefined();
    expect(pendingTask).toBeDefined();

    // Постоянную фотографию разрешено удалять сразу
    expect(photoTask!.availableAt.getTime()).toBeGreaterThanOrEqual(
      beforeDelete.getTime(),
    );

    expect(photoTask!.availableAt.getTime()).toBeLessThanOrEqual(
      afterDelete.getTime(),
    );

    // Временный файл — после expiresAt + 10 минут
    expect(pendingTask!.availableAt).toEqual(
      new Date(expiresAt.getTime() + 10 * 60 * 1000),
    );
  });

  it('keeps property when storage deletion tasks cannot be created', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });

    const draftResponse = await agent
      .post('/properties/drafts')
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(201);

    const propertyId = draftResponse.body.id as string;
    const storageKey = `properties/${propertyId}/photos/test.webp`;

    // Создаём фотографию объявления
    const photo = await prisma.propertyPhoto.create({
      data: {
        propertyId,
        storageKey,
        contentType: 'image/webp',
        sizeBytes: 1024,
      },
    });

    // Заранее создаём задание с тем же storageKey
    await prisma.storageDeletionTask.create({
      data: {
        storageKey,
        availableAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Скрываем ожидаемый ERROR от NestJS
    const errorLogSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    try {
      await agent
        .delete(`/properties/${propertyId}`)
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .expect(500);
    } finally {
      errorLogSpy.mockRestore();
    }

    // Объявление должно остаться
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    expect(property).not.toBeNull();

    // Фотография тоже должна остаться
    const savedPhoto = await prisma.propertyPhoto.findUnique({
      where: { id: photo.id },
    });

    expect(savedPhoto).not.toBeNull();

    // Существующее задание не должно исчезнуть
    const tasks = await prisma.storageDeletionTask.findMany({
      where: { storageKey },
    });

    expect(tasks).toHaveLength(1);
  });

  it('deletes storage objects and completed deletion tasks', async () => {
    const storageKey = `test/storage-deletion/${randomUUID()}.webp`;

    // Создаём настоящее WebP-изображение
    const webp = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: '#abcdef',
      },
    })
      .webp()
      .toBuffer();

    // Регистрируем файл для очистки после теста
    storageKeysToCleanUp.add(storageKey);

    // Сохраняем фотографию в настоящий SeaweedFS
    await storage.saveProcessedPhoto(storageKey, webp);

    // Убеждаемся, что объект существует
    const storedPhoto = await storage.readPhotoForValidation(storageKey);

    expect(storedPhoto.buffer.equals(webp)).toBe(true);

    // Создаём задание, которое уже можно выполнять
    const task = await prisma.storageDeletionTask.create({
      data: {
        storageKey,
        availableAt: new Date(Date.now() - 60_000),
      },
    });

    // Запускаем обработчик вручную
    const result = await deletionTaskService.processDueTasks();

    expect(result).toEqual({
      deleted: 1,
      failed: 0,
    });

    // Задание должно исчезнуть из PostgreSQL
    const remainingTask = await prisma.storageDeletionTask.findUnique({
      where: { id: task.id },
    });

    expect(remainingTask).toBeNull();

    // Файл должен исчезнуть из SeaweedFS
    await expect(
      storage.readPhotoForValidation(storageKey),
    ).rejects.toMatchObject({
      $metadata: {
        httpStatusCode: 404,
      },
    });
  });

  it('retries storage deletion after a failure', async () => {
    const storageKey = `test/storage-deletion/${randomUUID()}.webp`;

    const webp = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: '#abcdef',
      },
    })
      .webp()
      .toBuffer();

    storageKeysToCleanUp.add(storageKey);

    // Сохраняем настоящий файл в SeaweedFS
    await storage.saveProcessedPhoto(storageKey, webp);

    // Создаём задание, которое уже пора выполнить
    const task = await prisma.storageDeletionTask.create({
      data: {
        storageKey,
        availableAt: new Date(Date.now() - 60_000),
      },
    });

    // Имитируем недоступность S3 только при первой попытке
    const deleteSpy = vi
      .spyOn(storage, 'deleteObject')
      .mockRejectedValueOnce(new Error('S3 temporarily unavailable'));

    // Скрываем ожидаемую ошибку в консоли теста
    const errorLogSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const beforeRun = Date.now();

    try {
      const result = await deletionTaskService.processDueTasks();

      expect(result).toEqual({
        deleted: 0,
        failed: 1,
      });

      expect(deleteSpy).toHaveBeenCalledWith(storageKey);

      expect(errorLogSpy).toHaveBeenCalledWith(
        `Failed to delete storage object ${storageKey}`,
        expect.stringContaining('S3 temporarily unavailable'),
      );
    } finally {
      deleteSpy.mockRestore();
      errorLogSpy.mockRestore();
    }

    const afterRun = Date.now();

    // Задание осталось в PostgreSQL
    const pendingTask = await prisma.storageDeletionTask.findUniqueOrThrow({
      where: { id: task.id },
    });

    // Повторная попытка назначена примерно через 10 минут
    expect(pendingTask.availableAt.getTime()).toBeGreaterThanOrEqual(
      beforeRun + 10 * 60 * 1000,
    );

    expect(pendingTask.availableAt.getTime()).toBeLessThanOrEqual(
      afterRun + 10 * 60 * 1000,
    );

    // Файл тоже остался в SeaweedFS
    const storedPhoto = await storage.readPhotoForValidation(storageKey);

    expect(storedPhoto.buffer.equals(webp)).toBe(true);

    // Пока время повторной попытки не наступило, задание не выполняется
    expect(await deletionTaskService.processDueTasks()).toEqual({
      deleted: 0,
      failed: 0,
    });

    // Имитируем наступление времени повторной попытки
    await prisma.storageDeletionTask.update({
      where: { id: task.id },
      data: {
        availableAt: new Date(Date.now() - 60_000),
      },
    });

    // Теперь удаление должно пройти успешно
    expect(await deletionTaskService.processDueTasks()).toEqual({
      deleted: 1,
      failed: 0,
    });

    // Задание удалено
    expect(
      await prisma.storageDeletionTask.findUnique({
        where: { id: task.id },
      }),
    ).toBeNull();

    // Файл удалён из SeaweedFS
    await expect(
      storage.readPhotoForValidation(storageKey),
    ).rejects.toMatchObject({
      $metadata: {
        httpStatusCode: 404,
      },
    });
  });

  it('registers storage deletion cron job', () => {
    const schedulerRegistry = app.get(SchedulerRegistry);

    const cronJob = schedulerRegistry.getCronJob('storage-deletion-tasks');

    expect(cronJob).toBeDefined();

    expect(cronJob.cronTime.source).toBe(CronExpression.EVERY_10_MINUTES);
  });
});
