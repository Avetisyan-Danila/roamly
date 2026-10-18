# 002. Upload allowed when the photo limit is reached

Detected: E2E reproduction during development.
Fixed in: `e695545 reject photo uploads when limit reached`.

## Symptoms

With 10 confirmed photos, the 11th file could be fully uploaded and was rejected only at confirm.

## Reproduction

1. Draft with 10 confirmed photos.
2. `POST upload-url` → `201`.
3. `PUT` the file to S3 → `200`.
4. `POST confirm` → `409 Maximum 10 photos allowed`.

## Expected

The client learns about the limit before uploading anything.

## Actual

The limit was enforced only in the confirm transaction. Data stayed correct (never more than 10 photos), but the user waited for a full upload to get an error, and an unused object remained in storage until cleanup.

## Root cause

The only limit check was the authoritative one at the commit point. Nothing stopped the cheap, early part of the flow.

## Solutions considered

- Move the check from confirm to upload-url: loses race protection between parallel confirms.
- Count pending uploads too: stricter, but abandoned slots would block uploads for 15 minutes.
- Add an early check by confirmed photos and keep the transactional check.

## Decision

Early `409` in `createPhotoUploadUrl` when 10 photos exist; the `Serializable` check at confirm remains the source of truth. See [ADR 007](../adr/007-photo-limit-under-concurrency.md).

## Trade-offs

The early check is not race-safe and ignores pending uploads; it only improves the common case.

## Verification

E2E: with 10 photos, `upload-url` returns `409` and no `PropertyPhotoUpload` is created. A separate E2E test confirms parallel uploads and expects exactly one `201` and one `409`.

## Interview version

Our photo limit was enforced correctly inside a serializable transaction at confirm, but only there. An E2E test showed that with 10 photos you could still get an upload URL and upload an 11th file, only to get a 409 at the end. I added a cheap early check when issuing the URL and kept the transactional check as the source of truth. The general pattern is: an early check for UX, an authoritative check at the commit point for correctness.
