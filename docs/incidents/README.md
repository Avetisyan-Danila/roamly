# Incidents

One file per problem that was reproduced or observed: what happened, why, and how it was fixed. Written when the problem is found, not afterwards.

## Index

| # | Incident | Detected |
|---|---|---|
| [001](001-pending-object-left-after-confirm.md) | Pending object left in storage after confirm | Code review |
| [002](002-upload-allowed-at-photo-limit.md) | Upload allowed when the photo limit is reached | E2E |
| [003](003-prerender-fails-without-api-url.md) | Build fails without API_URL while prerendering /profile | CI |

## Template

```md
# NNN. Title

Detected: how and where.
Fixed in: commit.

## Symptoms
## Reproduction
## Expected
## Actual
## Baseline
Metrics before the fix, if measurable.

## Root cause
## Solutions considered
## Decision
## Trade-offs
## Verification
## Result
Before / after, if measurable.

## Interview version
The story in 1–2 minutes.
```
