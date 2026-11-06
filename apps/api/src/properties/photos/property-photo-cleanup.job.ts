import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';

import { runJob } from '../../common/logging/run-job.js';
import { PropertyPhotoCleanupService } from './property-photo-cleanup.service.js';

const JOB_NAME = 'property-photo-cleanup';

@Injectable()
export class PropertyPhotoCleanupJob {
  private readonly logger = new Logger(PropertyPhotoCleanupJob.name);

  constructor(
    private readonly cleanupService: PropertyPhotoCleanupService,
    private readonly pinoLogger: PinoLogger,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: JOB_NAME,
    waitForCompletion: true,
  })
  async handleCleanup(): Promise<void> {
    await runJob(this.pinoLogger, JOB_NAME, async () => {
      const { deleted, failed } =
        await this.cleanupService.cleanupExpiredUploads();

      if (deleted > 0) {
        this.logger.log(`Cleaned up ${deleted} expired photo uploads`);
      }

      if (failed > 0) {
        this.logger.warn(`Failed to clean up ${failed} photo uploads`);
      }
    });
  }
}
