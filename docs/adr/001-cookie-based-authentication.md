# 001. Cookie-based authentication

Status: Accepted

## Context

The web app talks to the API from two places: the browser and the Next server (Server Components, Proxy). Tokens must reach the API from both, and a successful XSS must not be able to steal a long-lived session.

## Decision

Store access and refresh tokens in `HttpOnly` cookies set by NestJS. Browser requests use `credentials: "include"`. The Next server forwards the `access_token` cookie explicitly.

## Alternatives

- **Bearer tokens in `localStorage` / memory + `Authorization` header.** No CSRF, simple cross-domain. But any XSS can read and exfiltrate the tokens, and Server Components cannot see a token that lives only in browser memory.
- **Access token in memory, refresh token in an HttpOnly cookie.** Smaller XSS window, but SSR still needs a cookie, and the app ends up with two transport mechanisms.

## Consequences

- \+ JavaScript cannot read tokens; XSS can still act as the user while the page is open, but cannot steal the session.
- \+ Next Proxy and Server Components can authenticate the same way the browser does.
- − The browser sends cookies automatically, so CSRF protection is required ([ADR 003](003-csrf-custom-header.md)).
- − Deployment depends on cookie scoping: separate web and API domains need a shared parent domain and a correct `Domain`, `SameSite` and `Secure` setup.
- − Server-side refresh must write rotated cookies to both the current request and the browser response (see `docs/architecture/auth.md`).
