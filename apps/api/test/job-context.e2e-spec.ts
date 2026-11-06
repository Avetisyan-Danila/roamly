import type { INestApplication } from '@nestjs/common';

import { PropertyPhotoCleanupJob } from '../src/properties/photos/property-photo-cleanup.job.js';
import { PropertyPhotoCleanupService } from '../src/properties/photos/property-photo-cleanup.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createE2eApp } from './helpers/create-e2e-app.js';

describe('Job context (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createE2eApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('tags SQL queries of a cron run with the job name and a unique run id', async () => {
    const executedSql: string[] = [];

    const cleanupSpy = vi
      .spyOn(PropertyPhotoCleanupService.prototype, 'cleanupExpiredUploads')
      .mockImplementation(async () => {
        const [row] = await prisma.$queryRaw<
          { query: string }[]
        >`SELECT current_query() AS query`;

        executedSql.push(row.query);

        return { deleted: 0, failed: 0 };
      });

    try {
      const job = app.get(PropertyPhotoCleanupJob);

      await job.handleCleanup();
      await job.handleCleanup();
    } finally {
      cleanupSpy.mockRestore();
    }

    const runIds = executedSql.map((sql) => /runId='([\w-]+)'/.exec(sql)?.[1]);

    expect(executedSql[0]).toContain("job='property-photo-cleanup'");
    expect(runIds[0]).toBeDefined();
    expect(runIds[1]).toBeDefined();
    expect(runIds[0]).not.toBe(runIds[1]);
  });
});
