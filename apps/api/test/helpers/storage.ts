import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadObjectCommand, NotFound, S3Client } from '@aws-sdk/client-s3';

import { StorageService } from '../../src/storage/storage.service.js';
import type { Env } from '../../src/config/env.validation.js';

export async function deleteStorageObjects(
  storage: StorageService,
  storageKeys: Iterable<string>,
): Promise<void> {
  const results = await Promise.allSettled(
    [...storageKeys].map((storageKey) => storage.deleteObject(storageKey)),
  );

  const errors = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason);

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to delete test storage objects');
  }
}

export async function storageObjectExists(
  app: INestApplication,
  storageKey: string,
): Promise<boolean> {
  const bucket = app
    .get(ConfigService<Env, true>)
    .getOrThrow('S3_BUCKET', { infer: true });

  try {
    await app
      .get(S3Client)
      .send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }));

    return true;
  } catch (error) {
    if (error instanceof NotFound) {
      return false;
    }

    throw error;
  }
}
