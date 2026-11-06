import { randomUUID } from 'node:crypto';
import { withQueryTags } from '@prisma/sqlcommenter-query-tags';
import type { PinoLogger } from 'nestjs-pino';

export function runJob<T>(
  logger: PinoLogger,
  job: string,
  fn: () => Promise<T>,
): Promise<T> {
  const runId = randomUUID();

  return logger.runInContext(() => withQueryTags({ job, runId }, fn), {
    bindings: { job, runId },
  });
}
