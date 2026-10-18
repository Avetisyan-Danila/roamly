# Architecture Decision Records

One file per significant decision: why it was made, what else was considered, what it costs.

ADRs are not edited after acceptance. A changed decision gets a new ADR that supersedes the old one.

## Index

| # | Decision | Status |
|---|---|---|
| [001](001-cookie-based-authentication.md) | Cookie-based authentication | Accepted |
| [002](002-opaque-refresh-tokens-with-rotation.md) | Opaque refresh tokens with rotation | Accepted |
| [003](003-csrf-custom-header.md) | CSRF protection via custom header | Accepted |
| [004](004-direct-to-storage-uploads.md) | Direct-to-storage uploads | Accepted |
| [005](005-two-phase-upload-with-server-processing.md) | Two-phase upload with server-side processing | Accepted |
| [006](006-deferred-storage-deletion.md) | Deferred storage deletion | Accepted |
| [007](007-photo-limit-under-concurrency.md) | Photo limit under concurrency | Accepted |
| [008](008-drafts-as-status-on-single-table.md) | Drafts as a status on a single table | Accepted |

## Template

```md
# NNN. Title

Status: Proposed | Accepted | Superseded by NNN

## Context
The problem and constraints.

## Decision
What was chosen.

## Alternatives
What else was considered and why it was rejected.

## Consequences
What we gain (+) and what we pay (−).
```
