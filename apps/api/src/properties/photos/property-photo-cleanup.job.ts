import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PropertyPhotoCleanupService } from './property-photo-cleanup.service.js';

@Injectable()
export class PropertyPhotoCleanupJob {
  private readonly logger = new Logger(PropertyPhotoCleanupJob.name);

  constructor(private readonly cleanupService: PropertyPhotoCleanupService) {}

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: 'property-photo-cleanup',
    waitForCompletion: true,
  })
  async handleCleanup(): Promise<void> {
    const { deleted, failed } =
      await this.cleanupService.cleanupExpiredUploads();

    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} expired photo uploads`);
    }

    if (failed > 0) {
      this.logger.warn(`Failed to clean up ${failed} photo uploads`);
    }
  }
}
