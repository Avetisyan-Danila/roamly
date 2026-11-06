import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';

import { runJob } from '../common/logging/run-job.js';
import { StorageDeletionTaskService } from './storage-deletion-task.service.js';

const JOB_NAME = 'storage-deletion-tasks';

@Injectable()
export class StorageDeletionTaskJob {
  private readonly logger = new Logger(StorageDeletionTaskJob.name);

  constructor(
    private readonly deletionTaskService: StorageDeletionTaskService,
    private readonly pinoLogger: PinoLogger,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: JOB_NAME,
    waitForCompletion: true,
  })
  async handleDeletionTasks(): Promise<void> {
    await runJob(this.pinoLogger, JOB_NAME, async () => {
      const { deleted, failed } =
        await this.deletionTaskService.processDueTasks();

      if (deleted > 0) {
        this.logger.log(`Deleted ${deleted} storage objects`);
      }

      if (failed > 0) {
        this.logger.warn(`Failed to delete ${failed} storage objects`);
      }
    });
  }
}
