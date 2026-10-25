# Property photo upload

## Overview

Hosts upload up to 10 photos per draft property. Files go from the browser directly to S3-compatible storage (SeaweedFS locally) and never pass through Next.js or NestJS during upload. NestJS issues upload URLs, validates and re-encodes the uploaded file, and owns all database state.

```text
Browser ──1. POST upload-url──────────► NestJS ──► PostgreSQL (PropertyPhotoUpload)
   │    ◄── { uploadId, uploadUrl } ──┘
   │
   ├──2. PUT file (presigned URL)─────► S3  pending/<uuid>
   │
   └──3. POST confirm─────────────────► NestJS ──read──► S3 pending/<uuid>
                                          │ Sharp → WebP
                                          ├──write─────► S3 photos/<uuid>.webp
                                          └──tx────────► PostgreSQL (PropertyPhoto, StorageDeletionTask)
```

Decisions behind this design:

- [ADR 004: Direct-to-storage uploads](../adr/004-direct-to-storage-uploads.md)
- [ADR 005: Two-phase upload with server-side processing](../adr/005-two-phase-upload-with-server-processing.md)
- [ADR 006: Deferred storage deletion](../adr/006-deferred-storage-deletion.md)
- [ADR 007: Photo limit under concurrency](../adr/007-photo-limit-under-concurrency.md)

## Data model

| Model | Meaning | Lifetime |
|---|---|---|
| `PropertyPhotoUpload` | An issued upload slot. The only reference to the `pending/` object | Until confirmed or expired + cleaned up |
| `PropertyPhoto` | A confirmed, processed photo. Counts towards the limit and publishing | Until deleted with the photo or the property |
| `StorageDeletionTask` | An S3 object scheduled for deletion | Until the object is deleted |

The database stores `storageKey`, never a URL. URLs are presigned on every read.

Storage keys:

```text
properties/<propertyId>/pending/<uuid>          original upload, temporary
properties/<propertyId>/photos/<uuid>.webp      processed photo, permanent
```

`position` is 0-based and contiguous: a new photo gets `position = count`, deletion shifts the following photos down by one.

## Endpoints

All photo management endpoints require an authenticated owner and a property in `DRAFT` status.

| Endpoint | Success | Errors |
|---|---|---|
| `POST /properties/drafts/:id/photos/upload-url` | `201 { uploadId, uploadUrl }` | `400` invalid DTO, `409` 10 photos already |
| `PUT <uploadUrl>` (S3) | `200` | `403` expired URL or wrong `Content-Type` |
| `POST /properties/drafts/:id/photos/:uploadId/confirm` | `201 { id }` | `404` unknown or expired upload, `409` limit, race or already confirmed, `422` invalid file |
| `GET /properties/drafts/:id/photos` | `200 [{ id, url, position }]` | |
| `DELETE /properties/drafts/:id/photos/:photoId` | `204` | `404`, `409` concurrent change |
| `GET /properties/:id` (public, published only) | `200 { ..., photos }` | `404` |
| `POST /properties/:id/publish` | `201` | `422` incomplete or no confirmed photo, `409` already published |

Common to all owner endpoints: `403` not the owner, `404` no property, `409` wrong status.

`409` with "please retry" means a serialization conflict: the request is safe to repeat.

## Upload and confirm

**Upload URL.** The DTO allows `image/jpeg`, `image/png`, `image/webp` and `1 B … 10 MB`. The presigned PUT signs `Content-Type`, so the browser must send exactly the declared type. A `PropertyPhotoUpload` row is created with `expiresAt = now + 15 min`.

**Confirm** validates the file in this order:

1. The upload exists, belongs to the property and is not expired.
2. `HEAD` the object: size is within 1 B … 10 MB.
3. Read the object; actual size and `Content-Type` must match what was declared for the upload slot.
4. Sharp: at most 25 MP, a single frame, real format matches the declared type, no decoder warnings.
5. Re-encode: auto-orient, fit inside 2560×2560 without upscaling, WebP quality 82. All metadata is stripped (Sharp default), including EXIF GPS.
6. Write `photos/<uuid>.webp`.
7. `Serializable` transaction: delete the upload row (must still be unexpired), recheck the draft status and the limit, create `PropertyPhoto`, schedule deletion of the `pending/` object.

If step 7 fails, the permanent object from step 6 is deleted immediately (best effort).

## Timings

| What | Value | Where |
|---|---|---|
| Presigned PUT URL | 5 min | `StorageService.createUploadUrl` |
| Upload slot (`expiresAt`) | 15 min | `PropertiesService.createPhotoUploadUrl` |
| Grace period after `expiresAt` | 10 min | `PHOTO_CLEANUP_GRACE_PERIOD_MS` |
| Presigned GET URL | 15 min | `StorageService.createDownloadUrl` |
| Cleanup jobs | every 10 min, batches of 100 | `*.job.ts` |
| Deletion retry delay | 10 min | `StorageDeletionTaskService` |

The grace period protects a running confirm from cleanup deleting its source file. It does not extend the upload slot: the transaction rechecks `expiresAt`, so a confirm that finishes after expiry gets `409`. The 10 minutes are a safety margin, not a measured value.

## Cleanup

Two cron jobs (`@nestjs/schedule`):

**Expired uploads** (`PropertyPhotoCleanupJob`): finds `PropertyPhotoUpload` rows with `expiresAt + grace <= now`, deletes the S3 object, then the row. A failure leaves the row in place, so the next run retries.

**Deletion tasks** (`StorageDeletionTaskJob`): processes `StorageDeletionTask` rows with `availableAt <= now`, deletes the object, then the task. A failure moves `availableAt` forward by 10 minutes.

Deletion tasks are created inside the same transaction as the database change that drops the last reference to the object:

| Event | Object | `availableAt` |
|---|---|---|
| Confirm | `pending/` original | `expiresAt + grace` (after the presigned PUT is dead) |
| Photo deleted | `photos/` WebP | now |
| Property deleted | all `photos/` | now |
| Property deleted | all `pending/` | `expiresAt + grace` per upload |

S3 `DeleteObject` is idempotent, so a repeated run is harmless.

## Frontend contract

- Upload sequence: `upload-url` → `PUT` with the same `Content-Type` → `confirm`. A photo exists only after `confirm` returns `{ id }`.
- `url` in photo responses expires in 15 minutes and changes on every request. Identify photos by `id`, refetch the list to get fresh URLs, never persist `url`.
- `409` "please retry" can be retried; `422` means the file itself is rejected.
- Photos can be managed only while the property is a `DRAFT`.
- Confirm uploads of one property one at a time. Parallel confirms run `Serializable` transactions over the same photo count, so all but one fail with `409`. The wizard sends `upload-url` and `PUT` up to 3 at a time and queues confirms (`use-draft-photos.ts`, [incident 004](../incidents/004-parallel-photo-confirms-conflict.md)).

## Known limitations

- **Orphan on double failure.** If the confirm transaction fails and the best-effort deletion of the new WebP also fails, the object is only logged. No `StorageDeletionTask` is created for it.
- **Pending uploads are not counted.** The early limit check counts confirmed photos only, so a client can obtain many upload URLs and upload many files. The limit is still enforced at confirm; extra files are removed by cleanup.
- **Size is not enforced by storage.** A presigned PUT cannot limit body size, so an oversized file is stored until confirm rejects it or cleanup removes it.
- **Confirm memory.** One confirm holds up to 10 MB of input plus a decoded image of up to 25 MP (about 100 MB as RGBA). Parallel confirms are the first suspect under load.
- **Cron on every instance.** Each API instance runs both jobs. Deletion is idempotent, so this is wasted work rather than data corruption, but it will matter with horizontal scaling.
- **No max attempts.** A permanently failing deletion task is retried forever every 10 minutes.
- **Photo order is confirm order.** `position` is assigned at confirm, so photos selected together are ordered by which `PUT` finished first, not by selection order.
- **Photos are draft-only.** A published property cannot add, remove or reorder photos. There is no reorder endpoint yet.
- **Bucket CORS is not in the repo.** Local uploads rely on SeaweedFS defaults; staging and production need an explicit CORS policy for the web origin.

## Invariants

1. A `PropertyPhoto` exists only for a file that passed validation and was re-encoded by the server.
2. Every S3 object has a database reference (`PropertyPhotoUpload`, `PropertyPhoto` or `StorageDeletionTask`), except for the double-failure case above.
3. The last reference to an object is never removed without scheduling its deletion in the same transaction.
4. A property never has more than 10 `PropertyPhoto` rows.
5. Positions are contiguous from 0.
6. Storage is private; clients see only short-lived presigned URLs.
7. Publishing requires at least one `PropertyPhoto`.
