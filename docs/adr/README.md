# Architecture Decision Records

One file per significant decision: why it was made, what else was considered, what it costs.

ADRs are not edited after acceptance. A changed decision gets a new ADR that supersedes the old one.

## Index

| # | Decision | Status |
|---|---|---|
| [001](001-cookie-based-authentication.md) | Cookie-based authentication | Accepted |
| [002](002-opaque-refresh-tokens-with-rotation.md) | Opaque refresh tokens with rotation | Accepted |
| [003](003-csrf-custom-header.md) | CSRF protection via custom header | Accepted |

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
