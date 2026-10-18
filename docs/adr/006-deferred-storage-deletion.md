# 006. Deferred storage deletion

Status: Accepted

## Context

PostgreSQL and S3 cannot share a transaction. Deleting a photo, confirming an upload or deleting a property removes database rows that are the only reference to S3 objects. Deleting the object in the request after the commit is not reliable: if storage is unavailable, the object is orphaned forever with nothing pointing to it ([incident 001](../incidents/001-pending-object-left-after-confirm.md)).

A second constraint: a presigned `PUT` URL stays valid after confirm. If the pending object is deleted immediately, a repeated `PUT` recreates it with no reference.

## Decision

- Every change that drops the last reference to an object creates a `StorageDeletionTask` in the **same database transaction**.
- A cron job deletes due objects in batches and removes the task; a failure moves `availableAt` forward by 10 minutes.
- Pending originals are scheduled for `expiresAt + grace period`: after the presigned `PUT` is dead and after any running confirm has finished.
- Expired, never-confirmed uploads are cleaned up by a separate job using `PropertyPhotoUpload` rows themselves.

## Alternatives

- **Delete in the request after commit, log failures.** The previous implementation. Loses objects on any storage error.
- **Delete before commit.** If the transaction then fails, the database references a missing object.
- **S3 lifecycle rules on `pending/`.** Storage-native, but day granularity, provider-dependent, and it does not cover deleted photos.
- **Outbox + message queue.** The same idea with a dedicated worker. Not needed until the project has a queue.

## Consequences

- \+ No object loses its last reference without a scheduled deletion; storage outages only delay cleanup.
- \+ The pattern is reusable for any future external side effect (a simple transactional outbox).
- − Deletion is eventually consistent: objects live up to about 25 minutes after confirm and up to 10 minutes after a photo is deleted.
- − The grace period (10 min) is a safety margin, not a measured value.
- − The cron job runs on every API instance and has no attempt limit.
