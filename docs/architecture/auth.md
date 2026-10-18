# Authentication

## Overview

Roamly uses cookie-based session authentication:

- short-lived JWT access token and long-lived opaque refresh token, both in HttpOnly cookies;
- server-side `AuthSession` per login, with refresh token rotation and revocation;
- CSRF protection through a required custom header;
- automatic refresh in the browser client and in Next Proxy.

**NestJS is the only authentication and authorization authority.** Next.js improves the experience (session recovery, redirects) but never decides whether an API operation is allowed.

```text
Browser ──fetch, credentials: include──────────────► NestJS ──► PostgreSQL
   │                                                   ▲
   └──page request──► Next Server ──Cookie forwarded───┘
                      (proxy.ts, Server Components)
```

Decisions behind this design:

- [ADR 001: Cookie-based authentication](../adr/001-cookie-based-authentication.md)
- [ADR 002: Opaque refresh tokens with rotation](../adr/002-opaque-refresh-tokens-with-rotation.md)
- [ADR 003: CSRF protection via custom header](../adr/003-csrf-custom-header.md)

## Components

| Component | Location | Responsibility |
|---|---|---|
| `AuthController`, `AuthService`, `TokenService` | `apps/api/src/auth` | Login, refresh, logout; issue, rotate and revoke tokens; set and clear cookies |
| `JwtAuthGuard` (global) | `apps/api/src/auth/guards` | Requires a valid access token on every endpoint except `@Public()` |
| `CsrfGuard` (global) | `apps/api/src/common/guards` | Requires the CSRF header on unsafe methods |
| `proxy.ts` | `apps/web` | Restores an expired session before a protected page renders |
| `(protected)/layout.tsx` | `apps/web/app` | Requires an authenticated user for protected pages |
| `browserApiClient` | `apps/web/shared/api/browser` | Browser → Nest: credentials, CSRF header, refresh and one retry on `401` |
| `serverApiClient` | `apps/web/shared/api/server` | Next Server → Nest: forwards `access_token`, CSRF header |

## Tokens and cookies

| | `access_token` | `refresh_token` |
|---|---|---|
| Format | JWT, `sub = userId` | Opaque `sessionId.secret` |
| Lifetime | `JWT_ACCESS_TTL_SECONDS` (900) | `REFRESH_TOKEN_TTL_DAYS` (30) |
| Stored in DB | No, stateless | SHA-256 hash of the secret in `AuthSession.refreshTokenHash` |
| Verified by | `JwtStrategy` (signature + `exp`) | `AuthService.refresh` (session state + hash comparison) |

Both cookies: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production. Set and cleared only by NestJS.

**Why Next can read cookies set by Nest.** Cookies are scoped to a host, not to a port, so cookies set by `localhost:3001` are also sent to `localhost:3000`. On separate subdomains (`web.` / `api.`) this requires an explicit `Domain` attribute.

`AuthSession` fields: `refreshTokenHash`, `expiresAt`, `revokedAt`, `lastUsedAt`. Deleting a user cascades to sessions.

## Flows

### Login

`POST /auth/login` → verify Argon2id hash → create `AuthSession` and both tokens → `Set-Cookie` → body contains only `{ user }`. Tokens never reach JavaScript.

Registration (`POST /auth/register`) only creates the user. It does not log in.

### Refresh rotation

`POST /auth/refresh`:

1. Parse `sessionId.secret`, load the session.
2. Reject if revoked, expired or the secret hash does not match.
3. Replace the hash with a compare-and-swap update:
   `updateMany where { id, refreshTokenHash: oldHash, revokedAt: null, expiresAt > now }`.
4. If 0 rows were updated, someone already rotated this token → `401`.
5. Set new `access_token` and `refresh_token`.

The previous refresh token becomes invalid immediately.

### Browser refresh

Only requests marked `auth: true` refresh on `401`:

```text
request → 401 → POST /auth/refresh → retry once → 401 again → throw
```

Concurrent `401`s share one `refreshPromise` (single-flight). Without it, parallel requests would rotate the same refresh token, and all but the first would fail.

Login, registration and logout do not use `auth: true`: their `401` means bad credentials, not an expired session.

### Server-side refresh (Proxy)

`proxy.ts` runs for matched routes (`config.matcher`: `/profile`, `/host`) before rendering:

```text
access token present and not expired? ── yes ──► continue
        │ no
refresh token present? ── no ──► clear cookies, redirect /login
        │ yes
POST Nest /auth/refresh ── fails ──► redirect /login
        │ ok
write new cookies to BOTH:
  1. the current request headers → Server Components see the new token now
  2. the response Set-Cookie      → the browser stores rotated tokens
```

Both writes are required: the browser never sees the Next → Nest response, and the current render cannot wait for the browser.

Proxy reads `exp` from the JWT without verifying the signature. This is only a hint for whether to refresh. Nest still verifies every request.

### Protected pages

`(protected)/layout.tsx` calls `GET /users/me`: `200` → render, `401` → `redirect("/login")`, any other error is rethrown. Backend failures must not look like logouts.

If a route is missing from the Proxy matcher, security is unaffected: the layout still gets `401` and redirects. Only automatic session recovery is lost.

### Logout

`POST /auth/logout` is `@Public()`, so it works with an expired access token. If the refresh token is valid, the session gets `revokedAt`. Cookies are always cleared, so logout is idempotent from the user's point of view.

## CSRF and CORS

Unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`) require `X-CSRF-Protection: enabled`. Both API clients add it.

**Why the custom header works.** A cross-site HTML form cannot set custom headers. JavaScript that sets one triggers a CORS preflight, and Nest allows credentialed CORS only from `FRONTEND_ORIGIN`. The value `enabled` is not a secret: the protection comes from the header being non-simple, not from its value.

CORS alone is not protection: it limits who can read responses, not which requests are sent. See [ADR 003](../adr/003-csrf-custom-header.md).

## Status codes

| Endpoint | Success | Errors |
|---|---|---|
| `POST /auth/register` | `201` | `400` invalid data, `409` email exists |
| `POST /auth/login` | `200` | `400`, `401` invalid credentials |
| `POST /auth/refresh` | `204` | `401` invalid, expired, revoked or already rotated |
| `POST /auth/logout` | `204` | none |
| `GET /users/me` | `200` | `401` |
| Any unsafe request without the CSRF header | | `403` |

## Invariants

1. NestJS is always the final authentication and authorization authority.
2. Client JavaScript never receives raw access or refresh tokens.
3. Refresh tokens are never stored in plaintext.
4. Refresh rotation invalidates the previous refresh token.
5. Logout works when the access token has expired.
6. State-changing requests must satisfy CSRF protection.
7. Protected pages do not rely only on Proxy for security.
8. Proxy recovers sessions; the protected layout enforces page access.
9. The browser client retries a request at most once after refresh.
10. Concurrent browser refreshes share one refresh request.
