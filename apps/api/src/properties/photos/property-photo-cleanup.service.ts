import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../../storage/storage.service.js';

const CLEANUP_GRACE_PERIOD_MS = 10 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 100;

@Injectable()
export class PropertyPhotoCleanupService {
  private readonly logger = new Logger(PropertyPhotoCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async cleanupExpiredUploads(): Promise<{
    deleted: number;
    failed: number;
  }> {
    const cutoff = new Date(Date.now() - CLEANUP_GRACE_PERIOD_MS);

    const uploads = await this.prisma.propertyPhotoUpload.findMany({
      where: {
        expiresAt: { lte: cutoff },
      },
      select: {
        id: true,
        storageKey: true,
      },
      orderBy: {
        expiresAt: 'asc',
      },
      take: CLEANUP_BATCH_SIZE,
    });

    let deleted = 0;
    let failed = 0;

    for (const upload of uploads) {
      try {
        await this.storage.deleteObject(upload.storageKey);

        const result = await this.prisma.propertyPhotoUpload.deleteMany({
          where: {
            id: upload.id,
            expiresAt: { lte: cutoff },
          },
        });

        deleted += result.count;
      } catch (error) {
        failed++;

        this.logger.error(
          `Failed to clean up photo upload ${upload.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return { deleted, failed };
  }
}
