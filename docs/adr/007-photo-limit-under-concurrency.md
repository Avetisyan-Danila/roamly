# 007. Photo limit under concurrency

Status: Accepted

## Context

A property may have at most 10 photos, and positions must stay contiguous. Confirms and deletions can run in parallel: several browser tabs, or the frontend confirming several uploads at once. A plain `count` followed by `create` lets two requests both see 9 and both insert.

## Decision

Two checks with different purposes:

- **Early check** when issuing an upload URL: reject with `409` if 10 photos already exist. This is for UX and to avoid pointless uploads ([incident 002](../incidents/002-upload-allowed-at-photo-limit.md)), not for correctness.
- **Authoritative check** inside the confirm transaction at `Serializable` isolation: count, compare, create with `position = count`. Deletion also runs at `Serializable` and shifts the following positions down.

PostgreSQL aborts one of two conflicting serializable transactions (Prisma `P2034`). The API maps that to `409 ... please retry`.

## Alternatives

- **Unique constraint on `(propertyId, position)`.** Prevents duplicate positions, but not an 11th photo at position 10, and shifting positions on delete conflicts with the constraint unless it is deferrable.
- **`SELECT ... FOR UPDATE` on the property row.** Explicit pessimistic lock, but needs raw SQL with Prisma.
- **Counter column with a `CHECK (photo_count <= 10)`.** Atomic `UPDATE ... WHERE photo_count < 10`, but a denormalized value that must stay in sync.

## Consequences

- \+ The limit and contiguous positions hold under any concurrency, verified by an E2E test with parallel confirms.
- \+ No raw SQL and no extra columns.
- − Conflicts surface as `409`; the client is expected to retry. The wizard avoids them by confirming one photo at a time ([incident 004](../incidents/004-parallel-photo-confirms-conflict.md)).
- − Serializable transactions can abort for broader reasons than the actual conflict under load.
- − The early check ignores pending uploads, so it does not stop a client from obtaining more upload URLs than free slots.
