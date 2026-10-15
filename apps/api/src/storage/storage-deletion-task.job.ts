import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { StorageDeletionTaskService } from './storage-deletion-task.service.js';

@Injectable()
export class StorageDeletionTaskJob {
  private readonly logger = new Logger(StorageDeletionTaskJob.name);

  constructor(
    private readonly deletionTaskService: StorageDeletionTaskService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: 'storage-deletion-tasks',
    waitForCompletion: true,
  })
  async handleDeletionTasks(): Promise<void> {
    const { deleted, failed } =
      await this.deletionTaskService.processDueTasks();

    if (deleted > 0) {
      this.logger.log(`Deleted ${deleted} storage objects`);
    }

    if (failed > 0) {
      this.logger.warn(`Failed to delete ${failed} storage objects`);
    }
  }
}
