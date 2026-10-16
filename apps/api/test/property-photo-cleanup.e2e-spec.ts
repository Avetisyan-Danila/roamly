import { Logger, type INestApplication } from '@nestjs/common';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { vi } from 'vitest';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import { PropertyPhotoCleanupService } from '../src/properties/photos/property-photo-cleanup.service.js';
import { createE2eApp } from './helpers/create-e2e-app.js';
import { resetDatabase } from './helpers/reset-database.js';
import { deleteStorageObjects } from './helpers/storage.js';
import { createAuthenticatedAgent } from './helpers/auth.js';
import {
  createDraft,
  createTestImage,
  requestPhotoUpload,
  uploadToStorage,
} from './fixtures/property-photos.fixture.js';

describe('Property photo cleanup (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: StorageService;
  let cleanupService: PropertyPhotoCleanupService;

  const storageKeysToCleanUp = new Set<string>();

  beforeAll(async () => {
    const context = await createE2eApp();

    app = context.app;
    prisma = context.prisma;
    storage = app.get(StorageService);
    cleanupService = app.get(PropertyPhotoCleanupService);
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

  it('removes expired photo uploads from storage and database', async () => {
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

    const putResponse = await uploadToStorage(uploadUrl, jpeg);

    expect(putResponse.status).toBe(200);

    const storedPhoto = await storage.readPhotoForValidation(upload.storageKey);

    expect(storedPhoto.buffer.equals(jpeg)).toBe(true);

    // Загрузка просрочена дольше защитного периода
    await prisma.propertyPhotoUpload.update({
      where: { id: upload.id },
      data: {
        expiresAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });

    const result = await cleanupService.cleanupExpiredUploads();

    expect(result).toEqual({
      deleted: 1,
      failed: 0,
    });

    const remainingUpload = await prisma.propertyPhotoUpload.findUnique({
      where: { id: upload.id },
    });

    expect(remainingUpload).toBeNull();

    await expect(
      storage.readPhotoForValidation(upload.storageKey),
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
    const propertyId = await createDraft(agent);
    const { upload } = await requestPhotoUpload(
      agent,
      prisma,
      propertyId,
      1024,
    );

    await prisma.propertyPhotoUpload.update({
      where: { id: upload.id },
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

      expect(errorLogSpy).toHaveBeenCalledWith(
        `Failed to clean up photo upload ${upload.id}`,
        expect.stringContaining('S3 temporarily unavailable'),
      );
    } finally {
      deleteSpy.mockRestore();
      errorLogSpy.mockRestore();
    }

    const pending = await prisma.propertyPhotoUpload.findUnique({
      where: { id: upload.id },
    });

    expect(pending).not.toBeNull();

    // Повторяем очистку, теперь SeaweedFS доступен
    const retryResult = await cleanupService.cleanupExpiredUploads();

    expect(retryResult).toEqual({
      deleted: 1,
      failed: 0,
    });

    const remainingUpload = await prisma.propertyPhotoUpload.findUnique({
      where: { id: upload.id },
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
    const propertyId = await createDraft(agent);
    const { upload } = await requestPhotoUpload(
      agent,
      prisma,
      propertyId,
      1024,
    );

    // Загрузка просрочена 5 минут назад
    await prisma.propertyPhotoUpload.update({
      where: { id: upload.id },
      data: {
        expiresAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    });

    const result = await cleanupService.cleanupExpiredUploads();

    expect(result).toEqual({
      deleted: 0,
      failed: 0,
    });

    const pending = await prisma.propertyPhotoUpload.findUnique({
      where: { id: upload.id },
    });

    expect(pending).not.toBeNull();
  });
});
