import { StorageService } from '../../src/storage/storage.service.js';

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
