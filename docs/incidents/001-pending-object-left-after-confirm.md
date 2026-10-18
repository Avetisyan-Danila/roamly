# 001. Pending object left in storage after confirm

Detected: code review during development, not observed in a running system.
Fixed in: `9e53881 queue temporary photo cleanup after confirmation`.

## Symptoms

None visible to users. Found while reviewing how `pending/` objects are removed.

## Reproduction

1. Request an upload URL and `PUT` a file.
2. Make S3 `DeleteObject` fail (storage unavailable).
3. Confirm the upload.

## Expected

The `pending/` original is eventually deleted.

## Actual

Confirm succeeded, the `PropertyPhotoUpload` row was deleted in the transaction, and the post-commit deletion of the pending object failed with only a warning in the log. The object stayed in the bucket forever.

## Root cause

The `PropertyPhotoUpload` row was the only reference to the pending object, and the expired-upload cleanup finds objects through those rows. The transaction removed the reference, and the object's deletion was a best-effort call outside the transaction. Any storage error orphaned the object with nothing left to retry from.

A second, related issue: the presigned `PUT` URL was still valid right after confirm, so a repeated `PUT` could recreate the deleted object with no reference at all.

## Solutions considered

- Retry the deletion in the request: still loses the object if storage stays down or the process crashes.
- Keep the upload row with a `CONFIRMED` status for cleanup: mixes two lifecycles in one table.
- Schedule deletion in the same transaction via `StorageDeletionTask`.

## Decision

Create a `StorageDeletionTask` for the pending object inside the confirm transaction, with `availableAt = expiresAt + grace period`. See [ADR 006](../adr/006-deferred-storage-deletion.md).

## Trade-offs

The original lives up to about 25 minutes after confirm. Cleanup becomes eventually consistent.

## Verification

E2E: after confirm, a `StorageDeletionTask` exists for the pending key with the expected `availableAt`. Storage deletion E2E tests cover retry after failure.

## Interview version

After a successful photo confirm we deleted the database row for the temporary upload and then, outside the transaction, the temporary file in S3. If S3 failed, we only logged a warning. That row was the only thing pointing to the file, so the file was orphaned forever. Postgres and S3 can't share a transaction, so I made the deletion part of the database transaction instead: confirm writes a deletion task in the same transaction, and a background job processes tasks with retries. I also delayed it until the presigned PUT URL is dead, so the file can't be recreated after deletion. It's essentially a small transactional outbox.
