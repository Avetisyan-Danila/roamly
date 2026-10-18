# 005. Two-phase upload with server-side processing

Status: Accepted

## Context

With direct uploads ([ADR 004](004-direct-to-storage-uploads.md)) the client controls the bytes. The file may be of the wrong type, huge in pixels, contain EXIF GPS coordinates of the host's home, or never be uploaded at all. Draft photos must not be publicly accessible.

## Decision

Two phases:

1. **Upload slot.** `PropertyPhotoUpload` records the declared type, size and `expiresAt`. The object goes to `pending/`.
2. **Confirm.** The server reads the object, checks that it matches the slot, decodes it with Sharp (max 25 MP, single frame, real format = declared) and re-encodes it to WebP (max 2560 px, metadata stripped). Only then is a `PropertyPhoto` created, and the result is stored in `photos/`.

Storage is private. The database stores `storageKey`; clients get presigned `GET` URLs valid for 15 minutes.

## Alternatives

- **Trust the uploaded file.** No processing cost, but serves arbitrary bytes under an image type, keeps EXIF location, and leaves huge images unoptimized.
- **Process asynchronously in a queue.** Confirm would return immediately, but needs a worker, job status and polling. Deferred until a queue exists in the project.
- **Public bucket with permanent URLs.** Simpler and CDN-friendly, but draft photos would be reachable by anyone with the link.
- **Store URLs in the database.** URLs expire and depend on the storage domain; keys do not.

## Consequences

- \+ Every stored photo is a known-good WebP of bounded size, without metadata.
- \+ A photo is either fully confirmed or does not exist; pending uploads never count towards the limit or publishing.
- − Confirm is synchronous and expensive: memory for the decoded image and CPU in the libuv thread pool. It is the main suspect under load.
- − Presigned URLs change on every response, which defeats browser and `next/image` caching. A CDN or stable public URLs for published photos may be needed later.
- − Two objects per photo until the pending original is removed ([ADR 006](006-deferred-storage-deletion.md)).
