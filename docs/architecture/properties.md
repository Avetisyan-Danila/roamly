# Properties

## Overview

A property is created as an empty draft, filled in step by step, and published once it is complete. Both states live in the same `Property` row; `status` decides what the row guarantees.

```text
POST /properties/drafts ──► DRAFT ──PATCH…──► DRAFT ──POST /:id/publish──► PUBLISHED
                            (any field may be null)                         (complete, ≥ 1 photo)
```

Each property has exactly one owner (`ownerId`). There are no host/guest roles: ownership is checked per property.

Decisions behind this design:

- [ADR 008: Drafts as a status on a single table](../adr/008-drafts-as-status-on-single-table.md)
- [ADR 007: Photo limit under concurrency](../adr/007-photo-limit-under-concurrency.md) (the same `Serializable` approach is used for publish)

Photos are described in [file-upload.md](file-upload.md).

## Statuses

| | `DRAFT` | `PUBLISHED` |
|---|---|---|
| Fields | Any of them may be `null` | All required fields are set |
| Visible to | Owner only | Everyone, via `GET /properties/:id` |
| Editable via | `PATCH /properties/drafts/:id` | `PATCH /properties/:id` |
| Photos | Can be added and removed | Read-only |

Completeness of a published property is enforced by `publish`, not by the database: the columns are nullable for drafts. `PropertyMapper.toPublishedResponse` rechecks it on every read and fails with `500` if a published row has a `null` field.

## Endpoints

| Endpoint | Auth | Success | Errors |
|---|---|---|---|
| `POST /properties/drafts` | owner | `201` draft | |
| `GET /properties/drafts/:id` | owner | `200` draft | `404` missing, not yours or not a draft |
| `PATCH /properties/drafts/:id` | owner | `200` draft | `400` empty body or invalid data, `409` no longer a draft |
| `POST /properties/:id/publish` | owner | `201` property | `409` already published or concurrent change, `422` incomplete or no photo |
| `GET /properties/:id` | public | `200` property with photos | `404` missing or draft |
| `PATCH /properties/:id` | owner | `200` property | `400` invalid data or `null`, `409` not published |
| `DELETE /properties/:id` | owner | `204` | `409` concurrent change |

Owner endpoints also return `403` for someone else's property and `404` for a missing one (see Ownership). `GET /properties/drafts/:id` is the exception: it filters by owner in the query and returns `404` in both cases.

## Updating fields

`UpdatePropertyDto` is `PartialType(CreatePropertyDto)`: every field is optional and validated by the same rules as on creation.

| In the request | Draft | Published |
|---|---|---|
| Field omitted | Unchanged | Unchanged |
| Field with a value | Validated and saved | Validated and saved |
| Field set to `null` | Cleared | `400` |
| Empty body | `400` | `400` |
| Unknown field (e.g. `status`) | `400` | `400` |

Unknown fields are rejected by the global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`), so `status` can only change through `publish`.

`amenityIds` replaces the whole set (`set`, not append). Unknown IDs return `400` with `missingAmenityIds`.

## Money and coordinates

| Field | Database | API |
|---|---|---|
| `pricePerNight` | `Decimal(10, 2)` + `currency` enum | String, e.g. `"120.50"` |
| `latitude`, `longitude` | `Decimal(9, 6)` | Number |
| `bathrooms` | `Decimal(3, 1)` | Number (`1.5` is allowed) |

The price is a string in both directions so it never passes through a binary floating-point `number`.

## Ownership

`PropertyAuthorizationService.ensureOwner(propertyId, userId, expectedStatus?)` runs before every owner operation:

```text
no property          → 404
another user's       → 403
wrong status         → 409
```

Property IDs are visible in URLs, so every owner endpoint must call it. Without it, any authenticated user could edit someone else's property by changing the ID (IDOR).

`ensureOwner` runs before the write, so the state can change in between (for example, another tab publishes the draft). Every write repeats the decisive condition in its own `where` clause:

```ts
prisma.property.update({ where: { id, status: DRAFT }, ... })
```

If the condition no longer holds, Prisma throws `P2025` and the API returns `409`. `ensureOwner` gives precise errors; the `where` clause gives correctness.

## Publish

Inside one `Serializable` transaction:

1. Reload the draft by `id`, `ownerId` and `status: DRAFT`.
2. Validate its fields with `CreatePropertyDto` (`plainToInstance` + `validateSync`). On failure: `422` with `invalidFields: string[]`.
3. Require at least one `PropertyPhoto`. Otherwise `422`.
4. Set `status = PUBLISHED`.

`CreatePropertyDto` is the single definition of a complete property; publish reuses it instead of a separate checklist.

`Serializable` prevents publishing with zero photos when the last photo is deleted concurrently: PostgreSQL aborts one of the conflicting transactions, and the API returns `409 Concurrent property change, please retry`.

`invalidFields` names DTO properties, so the client can map them to wizard steps.

## Deletion

`DELETE /properties/:id` works for both statuses. In one `Serializable` transaction it schedules `StorageDeletionTask` rows for all photos and pending uploads, then deletes the property; photos and uploads cascade. Objects are removed from storage by the background job ([ADR 006](../adr/006-deferred-storage-deletion.md)).

## Invariants

1. A `PUBLISHED` property has all required fields and at least one photo.
2. `status` changes only through `publish`, and only from `DRAFT` to `PUBLISHED`.
3. Only the owner can read a draft or modify a property.
4. Every write repeats its status condition in the database query.
5. Drafts are never returned by public endpoints.
