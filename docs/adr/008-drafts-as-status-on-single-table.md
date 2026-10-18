# 008. Drafts as a status on a single table

Status: Accepted

## Context

Creating a property takes a multi-step wizard. Hosts leave in the middle and come back later, so incomplete properties must be stored on the server. Photos are uploaded during the wizard and must stay attached to the property after publishing. Public endpoints must only ever return complete properties.

## Decision

One `Property` table with `status: DRAFT | PUBLISHED`:

- all content columns are nullable;
- `POST /properties/drafts` creates an empty row;
- `PATCH` fills it in partially;
- `publish` validates the row against `CreatePropertyDto`, requires a photo, and flips the status in a `Serializable` transaction;
- public reads filter by `status: PUBLISHED`.

## Alternatives

- **Separate `PropertyDraft` table.** The published table could have `NOT NULL` columns. But publishing would copy data between tables, photos and amenities would need to move or reference two parents, and IDs would change on publish.
- **Single table with a `CHECK` constraint** (`status = 'DRAFT' OR title IS NOT NULL AND ...`). Completeness enforced by PostgreSQL itself. Not chosen for now: the rule would exist twice (SQL and DTO), and length and range rules would either be duplicated or stay in code only.
- **Draft stored on the client only** (form state, `localStorage`). No server state, but drafts are lost between devices and photos have nothing to attach to.
- **Draft as a JSON column.** Flexible, but no types, no relations for amenities and photos, and a migration to real columns on publish.

## Consequences

- \+ One ID for the whole lifecycle; photos and amenities attach to the same row.
- \+ Publishing is a status change, not a data migration.
- − The database does not guarantee completeness of published rows. It relies on `publish` and on every update path rejecting `null` for published properties; `PropertyMapper` fails loudly if the invariant is broken.
- − Every query must remember to filter by `status`. A forgotten filter would expose drafts.
- − Nullable columns leak into code: every read of a draft handles `null`.
