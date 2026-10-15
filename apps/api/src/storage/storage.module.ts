import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

import type { Env } from '../config/env.validation.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StorageService } from './storage.service.js';
import { StorageDeletionTaskService } from './storage-deletion-task.service.js';
import { StorageDeletionTaskJob } from './storage-deletion-task.job.js';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: S3Client,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new S3Client({
          endpoint: config.getOrThrow('S3_ENDPOINT', { infer: true }),
          region: config.getOrThrow('S3_REGION', { infer: true }),
          forcePathStyle: config.getOrThrow('S3_FORCE_PATH_STYLE', {
            infer: true,
          }),
          credentials: {
            accessKeyId: config.getOrThrow('S3_ACCESS_KEY_ID', {
              infer: true,
            }),
            secretAccessKey: config.getOrThrow('S3_SECRET_ACCESS_KEY', {
              infer: true,
            }),
          },
          requestChecksumCalculation: 'WHEN_REQUIRED',
        }),
    },
    StorageService,
    StorageDeletionTaskService,
    StorageDeletionTaskJob,
  ],
  exports: [S3Client, StorageService],
})
export class StorageModule {}
