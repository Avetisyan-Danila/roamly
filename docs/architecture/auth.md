# Authentication

## Overview

Roamly uses cookie-based session authentication.

The authentication system consists of:

- short-lived JWT access tokens;
- long-lived opaque refresh tokens;
- server-side auth sessions stored in PostgreSQL;
- refresh token rotation;
- automatic access token refresh;
- HttpOnly cookies;
- CSRF protection;
- protected Next.js routes.

The NestJS API is the authentication and authorization security boundary.

Next.js is responsible for the web authentication experience:

- forwarding authentication cookies during server-side requests;
- automatically refreshing expired access tokens before rendering protected pages;
- redirecting unauthenticated users to `/login`.

---

# Tokens

## Access token

The access token is a short-lived JWT.

Current TTL:

```text
15 minutes
```

Configured through:

```env
JWT_ACCESS_TTL_SECONDS=900
```

The JWT contains the user identifier:

```text
sub = userId
```

The token is signed by NestJS and validated by `JwtStrategy`.

The access token is stored in:

```text
access_token
```

cookie.

Cookie properties:

```text
HttpOnly
SameSite=Lax
Secure in production
Path=/
Max-Age = JWT_ACCESS_TTL_SECONDS
```

Client-side JavaScript cannot read the token.

The browser still sends it automatically with requests.

---

## Refresh token

The refresh token is not a JWT.

It is an opaque token associated with an `AuthSession` stored in PostgreSQL.

Conceptually:

```text
refresh token
=
sessionId + secret
```

Only a hash of the secret is stored in the database.

The refresh token is stored in:

```text
refresh_token
```

cookie.

Cookie properties:

```text
HttpOnly
SameSite=Lax
Secure in production
Path=/
Max-Age = REFRESH_TOKEN_TTL_DAYS
```

Current refresh lifetime:

```text
30 days
```

---

# Auth sessions

Each login creates an `AuthSession`.

Important fields:

```text
id
userId
refreshTokenHash
expiresAt
revokedAt
lastUsedAt
```

The session allows the backend to:

- revoke refresh tokens;
- rotate refresh tokens;
- expire sessions;
- invalidate a session during logout.

Deleting a user cascades to their auth sessions.

---

# Login

Endpoint:

```text
POST /auth/login
```

Status:

```text
200 OK
```

Flow:

```text
LoginForm
↓
login()
↓
browserApiClient
↓
POST /auth/login
↓
Nest AuthService
↓
verify email + password
↓
create access JWT
↓
create AuthSession
↓
create refresh token
↓
Set-Cookie:
  access_token
  refresh_token
↓
return user
↓
router.push("/profile")
```

The access and refresh tokens are never returned to frontend JavaScript.

Only user data is returned in the response body.

---

# Registration

Endpoint:

```text
POST /auth/register
```

Status:

```text
201 Created
```

Flow:

```text
RegisterForm
↓
register()
↓
browserApiClient
↓
POST /auth/register
↓
Nest
↓
hash password with Argon2id
↓
create User
↓
return user
↓
router.push("/login")
```

Registration does not automatically create an authenticated session.

Login remains a separate operation.

---

# Access token validation

Protected NestJS endpoints are guarded by the global `JwtAuthGuard`.

The JWT is read from the:

```text
access_token
```

cookie.

Flow:

```text
request
↓
JwtAuthGuard
↓
JwtStrategy
↓
read access_token cookie
↓
verify JWT signature
↓
verify expiration
↓
extract sub
↓
request.user = { userId }
```

The backend is the real security boundary.

Next.js route protection must never be treated as authorization for API operations.

---

# Refresh token rotation

Endpoint:

```text
POST /auth/refresh
```

Status:

```text
204 No Content
```

Flow:

```text
refresh_token cookie
↓
parse sessionId + secret
↓
find AuthSession
↓
verify:
  session exists
  not revoked
  not expired
  secret matches stored hash
↓
generate new refresh secret
↓
generate new access token
↓
atomically replace refreshTokenHash
↓
Set-Cookie:
  new access_token
  new refresh_token
```

The previous refresh token becomes invalid immediately.

This is called refresh token rotation.

The database update uses a compare-and-swap style condition so concurrent use of the same old refresh token cannot successfully rotate the same session multiple times.

---

# Browser API client

Browser-side requests use:

```text
shared/api/browser
```

The browser API client:

- sends credentials with requests;
- serializes JSON;
- handles API errors;
- adds CSRF protection to state-changing requests;
- automatically refreshes expired authentication;
- retries an authenticated request once after successful refresh.

Protected browser requests explicitly opt into refresh behavior.

Conceptually:

```text
browserApiClient("/some-protected-endpoint", {
  auth: true
})
```

Login, registration and logout do not use:

```text
auth: true
```

because their `401` responses must not trigger automatic refresh.

---

# Browser automatic refresh

For an authenticated browser request:

```text
Browser
↓
protected API request
↓
Nest
↓
401
↓
browserApiClient
↓
POST /auth/refresh
↓
Nest rotates refresh token
↓
browser stores new cookies
↓
retry original request once
```

A request is never retried more than once.

This prevents infinite loops:

```text
401
→ refresh
→ retry
→ 401
→ stop
```

---

# Single-flight refresh

Multiple browser requests can fail with `401` simultaneously.

Without coordination:

```text
request A → refresh OLD
request B → refresh OLD
request C → refresh OLD
```

Refresh rotation would cause a race because the first successful refresh invalidates the old refresh token.

The browser API client therefore keeps one shared:

```text
refreshPromise
```

During refresh:

```text
request A ─┐
request B ─┼→ same refreshPromise
request C ─┘
              ↓
        one POST /auth/refresh
```

After the refresh completes, all waiting requests retry using the new access token.

The promise is reset after both successful and failed refresh attempts.

---

# Server API client

Server Components use:

```text
shared/api/server
```

The server API client performs:

```text
Next Server → NestJS
```

requests.

Browser cookies are not automatically forwarded by server-side `fetch`.

For authenticated requests the server API client therefore:

```text
Browser → Next
        access_token cookie
             ↓
        Next cookies()
             ↓
     serverApiClient
             ↓
Cookie: access_token=...
             ↓
            Nest
```

Authenticated server calls explicitly use:

```text
auth: true
```

---

# Protected Next.js routes

Protected pages live inside:

```text
app/(protected)/
```

Example:

```text
app/
└── (protected)/
    ├── layout.tsx
    └── profile/
        └── page.tsx
```

The route group name does not appear in the URL.

For example:

```text
app/(protected)/profile/page.tsx
```

is still:

```text
/profile
```

---

# Protected layout

`(protected)/layout.tsx` validates the current user before rendering protected pages.

Flow:

```text
ProtectedLayout
↓
getCurrentUser()
↓
GET /users/me
↓
Nest JwtAuthGuard
```

Result:

```text
200
→ render protected page

401
→ redirect("/login")

other error
→ rethrow error
```

Backend failures must not be silently converted into authentication failures.

---

# Next.js Proxy

`proxy.ts` is responsible for restoring expired sessions before protected pages render.

It is not the security boundary.

Its responsibility is session recovery.

Conceptually:

```text
Browser
↓
GET /profile
↓
proxy.ts
↓
access token valid?
├─ yes
│  ↓
│  continue
│
└─ no
   ↓
refresh token exists?
├─ no
│  ↓
│  redirect /login
│
└─ yes
   ↓
POST Nest /auth/refresh
   ↓
new access + refresh cookies
```

---

# Server-side automatic refresh

A refresh performed by Next differs from a browser refresh.

The request:

```text
Next Server → Nest
```

receives new cookies from Nest, but the browser does not see that Nest response directly.

Therefore Proxy must update two places.

## Current Next request

The new cookies are inserted into the request that continues through Next:

```text
Proxy
↓
new access token
↓
ProtectedLayout
↓
getCurrentUser()
↓
Nest /users/me
```

This allows the current page render to succeed immediately.

## Browser response

The same `Set-Cookie` headers are forwarded to the browser:

```text
Nest
↓
Next Proxy
↓
Set-Cookie
↓
Browser
```

This ensures future browser requests use the rotated tokens.

Both are required:

```text
new tokens
   /    \
  ↓      ↓
current  browser
request  cookies
```

---

# Protected route configuration

Routes that need Proxy-based session recovery are registered in the protected route configuration.

Conceptually:

```text
PROTECTED_ROUTE_PREFIXES = [
  "/profile"
]
```

Future routes may include:

```text
/bookings
/favourites
/account
/host
```

The two protection mechanisms have different responsibilities:

```text
(protected)/layout.tsx
→ requires a valid authenticated user

proxy.ts
→ restores an expired session when possible
```

If a route is accidentally omitted from the Proxy list, the protected layout still prevents unauthenticated access.

The failure mode is therefore:

```text
expired access
+
valid refresh
+
route missing from Proxy config
↓
ProtectedLayout receives 401
↓
redirect /login
```

Security remains intact; only automatic session recovery is lost.

---

# Current user

Endpoint:

```text
GET /users/me
```

This endpoint is protected by the Nest JWT guard.

It returns the authenticated user's public data.

Next Server Components use it through the `user` entity.

Both `ProtectedLayout` and pages such as `/profile` may call `getCurrentUser()`.

Identical server-side fetches during the same React render are deduplicated, so in the current implementation these calls result in one actual request to Nest for a single page render.

---

# Logout

Endpoint:

```text
POST /auth/logout
```

Status:

```text
204 No Content
```

Logout is intentionally public with respect to the JWT guard.

It does not require a valid access token.

Flow:

```text
LogoutButton
↓
POST /auth/logout
↓
read refresh_token
↓
find AuthSession
↓
verify refresh secret
↓
set revokedAt
↓
clear access_token
↓
clear refresh_token
↓
204
↓
router.replace("/login")
```

If the refresh token is missing or invalid, logout still clears browser cookies.

This makes logout effectively idempotent from the user's perspective.

The frontend does not use:

```text
auth: true
```

for logout.

Otherwise an expired access token could cause:

```text
refresh
↓
issue new tokens
↓
logout
```

which is unnecessary.

---

# CSRF protection

Authentication cookies are sent automatically by the browser.

Therefore state-changing endpoints need CSRF protection.

Roamly uses:

```text
HttpOnly auth cookies
+
SameSite=Lax
+
strict credentialed CORS allowlist
+
custom CSRF request header
```

State-changing requests use:

```http
X-CSRF-Protection: "enabled"
```

The value `enabled` is not a secret.

The protection comes from requiring a non-simple custom header.

Unsafe methods:

```text
POST
PUT
PATCH
DELETE
```

require the header.

Safe methods:

```text
GET
HEAD
OPTIONS
```

do not.

---

## Why the custom header works

A normal cross-site HTML form cannot add arbitrary request headers.

A malicious JavaScript request that adds:

```http
X-CSRF-Protection: "enabled"
```

requires a CORS preflight.

The Nest API only allows credentialed requests from the configured frontend origin.

Therefore an untrusted website cannot successfully perform the state-changing credentialed request.

The browser API client automatically adds the CSRF header to unsafe requests.

Server-side Next requests also include the same header so the backend has one consistent contract.

No separate CSRF token is currently required.

---

# CORS

NestJS allows credentialed cross-origin requests only from the configured frontend origin.

Conceptually:

```ts
enableCors({
	origin: FRONTEND_ORIGIN,
	credentials: true,
})
```

CORS and the custom CSRF header work together for browser requests.

CORS alone is not treated as the entire authentication mechanism.

---

# Cookie responsibilities

## Browser

The browser:

- stores `access_token`;
- stores `refresh_token`;
- sends cookies automatically;
- applies `Set-Cookie`;
- cannot expose HttpOnly token values to application JavaScript.

## Next Server

The Next server:

- can read incoming cookies using `cookies()`;
- explicitly forwards authentication cookies to Nest;
- can refresh sessions in Proxy;
- forwards rotated cookies back to the browser.

## NestJS

NestJS:

- creates tokens;
- validates access tokens;
- owns refresh sessions;
- rotates refresh tokens;
- revokes sessions;
- sets and clears auth cookies.

NestJS remains the source of truth for authentication.

---

# HTTP status codes

Current authentication endpoints:

```text
POST /auth/register → 201 Created

POST /auth/login    → 200 OK

POST /auth/refresh  → 204 No Content

POST /auth/logout   → 204 No Content

GET  /users/me      → 200 OK
```

Common errors:

```text
400 → invalid request data
401 → authentication failed / invalid session
403 → CSRF protection rejected request
409 → registration email already exists
```

---

# Architecture responsibilities

```text
NestJS
├── authentication
├── authorization
├── JWT verification
├── auth sessions
├── refresh rotation
├── session revocation
└── CSRF enforcement

Next Proxy
└── automatic server-side session recovery

ProtectedLayout
└── protected-page authentication requirement

browserApiClient
├── browser HTTP transport
├── CSRF header
├── automatic refresh
├── single-flight refresh
└── one-time retry

serverApiClient
├── server-side HTTP transport
├── cookie forwarding
└── CSRF header for unsafe requests

features/login
└── login user flow

features/register
└── registration user flow

features/logout
└── logout user flow

entities/user
└── current user model/API
```

---

# Security properties

Current authentication design provides:

```text
password hashing with Argon2id
short-lived signed access JWT
HttpOnly token cookies
Secure cookies in production
SameSite=Lax
server-side refresh sessions
refresh token hashing
refresh token rotation
session revocation
race-safe refresh rotation
automatic token refresh
single-flight browser refresh
CSRF protection
strict credentialed CORS
server-side protected route validation
backend JWT authorization boundary
```

---

# Important invariants

The following rules should remain true as authentication evolves.

1. NestJS is always the final authentication and authorization authority.
2. Client JavaScript never receives raw access or refresh tokens.
3. Refresh tokens are never stored in plaintext in PostgreSQL.
4. Refresh token rotation invalidates the previous refresh token.
5. Logout must work even when the access token has expired.
6. State-changing requests must satisfy CSRF protection.
7. Protected Next pages must not rely only on Proxy for security.
8. Proxy handles session recovery; ProtectedLayout handles page access.
9. Browser automatic refresh retries a request at most once.
10. Concurrent browser refresh attempts share one refresh operation.
