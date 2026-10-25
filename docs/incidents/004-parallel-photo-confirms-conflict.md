# 004. Parallel photo confirms fail with 409

Detected: manual test of the wizard photos step in the browser, before the feature was committed.
Fixed in: `6dfe18c upload draft photos from the wizard`.

## Symptoms

Four files were selected at once on the photos step: three valid images and a text file renamed to `.jpg`. The text file was rejected with `422` as expected. One of the three valid images also failed and showed "Upload failed. Try again.".

The network log showed two confirms for the same draft finishing almost together:

```
POST /properties/drafts/:id/photos/a5251c9d-…/confirm   201
POST /properties/drafts/:id/photos/cade93c3-…/confirm   409
{"message":"Concurrent modification, please retry","errorCode":"CONCURRENT_MODIFICATION"}
```

The `upload-url` and `PUT` requests of the failed file had succeeded.

## Reproduction

1. In `apps/web/features/create-property/model/use-draft-photos.ts` change `runConfirm = createLimiter(1)` to `createLimiter(3)`.
2. Open the wizard, go to the photos step, select three images at once.
3. Usually at least one tile ends with "Upload failed" and the confirm request returns `409 CONCURRENT_MODIFICATION`.

## Expected

All valid images are confirmed. Selecting several files at once is the normal case, not a race the user should hit.

## Actual

When two confirms of one draft overlap, one of them is rolled back. The user has to press Retry on a file that is perfectly valid.

## Baseline

First run: 2 confirms overlapped, 1 failed. Not measured over many runs; the overlap depends on how close the `PUT` requests finish.

## Root cause

Confirm runs a `Serializable` transaction: count the photos of the draft, compare with the limit, insert the new photo with `position = count` ([ADR 007](../adr/007-photo-limit-under-concurrency.md)). Two overlapping confirms both read the same count and both want the same position. No serial order can produce that result, so PostgreSQL aborts one transaction (`P2034`) and the API answers `409 ... please retry`.

This is the backend working as designed: it is how the 10-photo limit holds under concurrency, and ADR 007 says the client is expected to retry. The bug was on the frontend. The first version ran the whole upload pipeline (`upload-url` → `PUT` → `confirm`) two files at a time, so confirms of one draft regularly overlapped.

## Solutions considered

- **Show the error and let the user press Retry.** That is what happened. Correct, but a valid file failing on a normal action is bad UX.
- **Retry `409 CONCURRENT_MODIFICATION` automatically on the client.** Follows ADR 007 literally. Under parallel confirms the conflict is not rare but expected, so every batch would cost extra requests and Sharp runs on the server, and retries would still need backoff and a cap.
- **Serialize on the server with `SELECT ... FOR UPDATE` on the property row.** Requests would wait instead of failing. Needs raw SQL with Prisma and changes a decision recorded in ADR 007 for a problem that only one client has.
- **Confirm one photo at a time on the client, keep the transfer parallel.**

## Decision

Two queues in `use-draft-photos.ts`, built with `shared/lib/create-limiter.ts`:

- `runTransfer = createLimiter(3)`: `upload-url` and `PUT` to S3, up to 3 files at once. They do not touch the photo count, so they cannot conflict.
- `runConfirm = createLimiter(1)`: confirms of all files go one after another.

The slow part, sending the file, stays parallel. Only the short server-side step waits. As a side effect, the API never holds more than one decoded image per tab at a time (see "Confirm memory" in [file-upload.md](../architecture/file-upload.md#known-limitations)).

## Trade-offs

- Confirms of a batch take longer in total, because each waits for the previous one.
- The queue lives in one browser tab. Two tabs confirming photos of the same draft can still conflict and get `409`; the Retry button covers that case.
- Photo order becomes the order of confirms, which is the order in which `PUT` requests finished, not the order of selection.

## Verification

Three images selected at once after the fix: three `PUT` requests in parallel, then three confirms strictly one after another, all `201`, no `409`.

## Result

| | Before | After |
|---|---|---|
| Confirms of one draft running at once | up to 2 | 1 |
| Valid files failing with `409` in the first batch | 1 of 3 | 0 of 3 |

## Interview version

The backend guarantees a 10-photo limit with a serializable transaction: count, then insert. When two transactions overlap, PostgreSQL aborts one and the API returns 409. That was a deliberate design, documented in an ADR. When I built the upload UI, I uploaded files two at a time, and in the very first manual test a valid photo failed with 409. Nothing was broken on the server; my client was violating its contract. I considered automatic retries, but with parallel uploads the conflict is expected, not rare, so retries would just burn requests. Moving the lock to the server would change a backend decision because of one client. Instead I split the pipeline: file transfer to S3 stays parallel, and only the short confirm step goes through a queue of one. The lesson for me: a serializable transaction protects the invariant, but the client still has to be designed so that the protection rarely fires.
