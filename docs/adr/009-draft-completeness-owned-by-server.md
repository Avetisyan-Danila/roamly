# 009. Draft completeness owned by the server

Status: Accepted

## Context

A host who leaves the wizard and comes back via `?draftId=...` should land on the first step that still needs input, not on step one.

To do that, someone has to decide what is missing. The rule already exists in `publish`: fields valid against `CreatePropertyDto` plus at least one photo. Two gaps made it hard to reuse:

- An empty amenity list is ambiguous. It means either "this property has no amenities" or "the host never reached that step". Nothing in the data told them apart.
- The client cannot derive completeness from form values: `mapDraftToFormValues` fills defaults (`pricePerNight: 100`, `currency: "EUR"`), and photos come from a separate endpoint.

## Decision

The server is the only place that decides whether a draft is complete.

- `getMissingRequirements(property, photoCount)` in `draft-completeness.ts` returns what is missing: names of invalid `CreatePropertyDto` fields, `amenities`, `photos`. An empty list means the draft can be published.
- Every draft response (`POST`, `GET`, `PATCH /properties/drafts`) includes `missingRequirements`. The photo count comes from `_count` in the same query.
- `publish` calls the same function. Error codes are unchanged: everything except `photos` goes into `422 PROPERTY_INCOMPLETE` (`invalidFields`), `photos` gives `422 PHOTO_REQUIRED`.
- `Property.amenitiesConfirmedAt` records that the host answered the amenities step. A draft `PATCH` sets it whenever `amenityIds` is present, including `[]`. The migration backfilled it for published properties and for drafts that already had amenities.
- The client only maps requirements to steps (`requirements` in `property-form-steps.ts`) and opens the first step with a missing one, or the preview when nothing is missing.

The wizard step itself is not stored.

## Alternatives

- **Compute completeness on the client** from `null` fields plus a `GET` of photos, treating amenities as always done. Cheap, but the rule would exist twice (client and `publish`) and drift apart; amenities stay ambiguous; one more request on page load.
- **Store the last wizard step** (`lastStep` column). Couples the database to the UI: reordering or adding steps breaks saved drafts. A step being reached also does not mean its data is valid.
- **Boolean `amenitiesAnswered`.** Same meaning, but a timestamp costs the same and also says when.
- **Require at least one amenity.** Removes the ambiguity, but forbids properties that genuinely have none.

## Consequences

- \+ Resume and publish use one rule and cannot disagree.
- \+ The list of requirements is a TypeScript union; the Swagger plugin turns it into an OpenAPI `enum`, and `openapi-typescript` into a union on the client. A new `CreatePropertyDto` field reaches the client without manual lists.
- \+ Publish error codes stay the same for existing clients.
- − Publish now also requires `amenitiesConfirmedAt`. Drafts that had no amenities at migration time send the host back to the amenities step once.
- − Every draft read runs an extra `COUNT` of photos.
- − The client still maps requirements to steps by hand. A requirement no step covers sends the host to the preview, where `publish` reports it.
