# 004. Direct-to-storage uploads

Status: Accepted

## Context

Hosts upload photos of up to 10 MB, up to 10 per property. Streaming every byte through the API would tie up API memory, bandwidth and request time with work that object storage does better.

## Decision

NestJS issues a presigned S3 `PUT` URL (5 min, `Content-Type` signed). The browser uploads the file directly to storage. NestJS sees the file only afterwards, during confirm ([ADR 005](005-two-phase-upload-with-server-processing.md)).

## Alternatives

- **Multipart upload to NestJS.** Simplest to validate (the server sees the file immediately), but every upload goes through the API process.
- **Upload via a Next.js route handler.** Same cost, plus an extra hop and a second place that handles auth.
- **Presigned `POST` with a policy.** Can enforce `content-length-range` in storage. Not chosen: `PUT` is simpler for `fetch`, and size is validated at confirm anyway. Worth revisiting if storage abuse becomes a problem.

## Consequences

- \+ The API never handles raw upload bytes; uploads scale with storage, not with API instances.
- − The server does not see the file during upload, so a separate confirm step with validation is required.
- − Abandoned uploads leave objects with no photo, so cleanup is required ([ADR 006](006-deferred-storage-deletion.md)).
- − Storage does not enforce the declared size; an oversized file is stored until confirm or cleanup removes it.
- − The bucket needs a CORS policy for the web origin.
