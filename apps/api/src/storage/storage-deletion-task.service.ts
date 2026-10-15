import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from './storage.service.js';

const BATCH_SIZE = 100;
const RETRY_DELAY_MS = 10 * 60 * 1000;

@Injectable()
export class StorageDeletionTaskService {
  private readonly logger = new Logger(StorageDeletionTaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async processDueTasks(): Promise<{
    deleted: number;
    failed: number;
  }> {
    const now = new Date();

    const tasks = await this.prisma.storageDeletionTask.findMany({
      where: {
        availableAt: { lte: now },
      },
      orderBy: {
        availableAt: 'asc',
      },
      take: BATCH_SIZE,
    });

    let deleted = 0;
    let failed = 0;

    for (const task of tasks) {
      try {
        await this.storage.deleteObject(task.storageKey);

        const result = await this.prisma.storageDeletionTask.deleteMany({
          where: { id: task.id },
        });

        deleted += result.count;
      } catch (error) {
        failed++;

        this.logger.error(
          `Failed to delete storage object ${task.storageKey}`,
          error instanceof Error ? error.stack : String(error),
        );

        try {
          await this.prisma.storageDeletionTask.updateMany({
            where: { id: task.id },
            data: {
              availableAt: new Date(Date.now() + RETRY_DELAY_MS),
            },
          });
        } catch (retryError) {
          this.logger.error(
            `Failed to reschedule storage deletion ${task.id}`,
            retryError instanceof Error ? retryError.stack : String(retryError),
          );
        }
      }
    }

    return { deleted, failed };
  }
}
