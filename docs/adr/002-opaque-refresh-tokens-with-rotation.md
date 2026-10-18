# 002. Opaque refresh tokens with rotation

Status: Accepted

## Context

Access tokens are short-lived JWTs (15 min) and cannot be revoked: the API verifies them without a database lookup. A long-lived credential is needed to keep users logged in, and it must be revocable (logout, compromised session).

## Decision

The refresh token is an opaque `sessionId.secret`, backed by an `AuthSession` row:

- only a SHA-256 hash of the secret is stored;
- every refresh replaces the hash (rotation), so the old token stops working;
- the replacement is a compare-and-swap `updateMany` on the old hash, so two concurrent refreshes with the same token cannot both succeed;
- logout sets `revokedAt`.

SHA-256 instead of Argon2 is intentional: the secret is 32 random bytes, so brute force is infeasible and a slow hash would only add latency to every refresh.

## Alternatives

- **Refresh token as a long-lived JWT.** Stateless, but cannot be revoked without a denylist, which is server-side state again.
- **No rotation.** Simpler and no concurrency issue, but a stolen refresh token stays valid for 30 days.
- **Long-lived access token only.** No refresh flow at all, but no revocation for its whole lifetime.

## Consequences

- \+ Sessions can be revoked; a leaked refresh token is single-use.
- \+ `sessionId` in the token gives an indexed lookup instead of scanning hashes.
- − One database query per refresh.
- − Rotation creates a race: parallel requests refreshing with the same token. Handled by compare-and-swap on the server and single-flight refresh in the browser client.
- − Reuse of an already rotated token returns `401` but does not revoke the session (no reuse detection yet; planned for the security pass).
- − Expired and revoked `AuthSession` rows are not cleaned up yet.
