import { Logger, type INestApplication } from '@nestjs/common';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import { StorageDeletionTaskService } from '../src/storage/storage-deletion-task.service.js';
import { createE2eApp } from './helpers/create-e2e-app.js';
import { resetDatabase } from './helpers/reset-database.js';
import { createAuthenticatedAgent } from './helpers/auth.js';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from './helpers/http.js';
import {
  createDraft,
  createTestImage,
} from './fixtures/property-photos.fixture.js';

describe('Storage deletion (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let deletionTaskService: StorageDeletionTaskService;

  const storageKeysToCleanUp = new Set<string>();

  beforeAll(async () => {
    const context = await createE2eApp();

    app = context.app;
    prisma = context.prisma;
    storage = app.get(StorageService);
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

  it('creates storage deletion tasks when property is deleted', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });
    const propertyId = await createDraft(agent);

    const photoKey = `properties/${propertyId}/photos/test.webp`;
    const pendingKey = `properties/${propertyId}/pending/test`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const photo = await prisma.propertyPhoto.create({
      data: {
        propertyId,
        storageKey: photoKey,
        contentType: 'image/webp',
        sizeBytes: 1024,
        position: 0,
      },
    });

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

    await agent
      .delete(`/properties/${propertyId}`)
      .set(CSRF_HEADER, CSRF_HEADER_VALUE)
      .expect(204);

    const afterDelete = new Date();

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

    // Временный файл - после expiresAt + 10 минут
    expect(pendingTask!.availableAt).toEqual(
      new Date(expiresAt.getTime() + 10 * 60 * 1000),
    );
  });

  it('keeps property when storage deletion tasks cannot be created', async () => {
    const agent = await createAuthenticatedAgent(app, {
      email: 'owner@example.com',
    });
    const propertyId = await createDraft(agent);
    const storageKey = `properties/${propertyId}/photos/test.webp`;

    const photo = await prisma.propertyPhoto.create({
      data: {
        propertyId,
        storageKey,
        contentType: 'image/webp',
        sizeBytes: 1024,
      },
    });

    // Заранее создаем задание с тем же storageKey
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

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    expect(property).not.toBeNull();

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
    const webp = await createTestImage('webp');

    storageKeysToCleanUp.add(storageKey);

    await storage.saveProcessedPhoto(storageKey, webp);

    const storedPhoto = await storage.readPhotoForValidation(storageKey);

    expect(storedPhoto.buffer.equals(webp)).toBe(true);

    // Задание, которое уже можно выполнять
    const task = await prisma.storageDeletionTask.create({
      data: {
        storageKey,
        availableAt: new Date(Date.now() - 60_000),
      },
    });

    const result = await deletionTaskService.processDueTasks();

    expect(result).toEqual({
      deleted: 1,
      failed: 0,
    });

    const remainingTask = await prisma.storageDeletionTask.findUnique({
      where: { id: task.id },
    });

    expect(remainingTask).toBeNull();

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
    const webp = await createTestImage('webp');

    storageKeysToCleanUp.add(storageKey);

    await storage.saveProcessedPhoto(storageKey, webp);

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

    expect(await deletionTaskService.processDueTasks()).toEqual({
      deleted: 1,
      failed: 0,
    });

    expect(
      await prisma.storageDeletionTask.findUnique({
        where: { id: task.id },
      }),
    ).toBeNull();

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
