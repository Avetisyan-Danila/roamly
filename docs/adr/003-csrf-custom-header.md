# 003. CSRF protection via custom header

Status: Accepted

## Context

Auth cookies are sent automatically ([ADR 001](001-cookie-based-authentication.md)), so another site could try to trigger state-changing requests on behalf of a logged-in user. `SameSite=Lax` blocks most cross-site cases, but it is not sufficient alone: it does not protect against same-site origins (other subdomains), and it allows top-level `GET` navigations.

## Decision

A global `CsrfGuard` requires `X-CSRF-Protection: enabled` on `POST`, `PUT`, `PATCH` and `DELETE`. Combined with:

- `SameSite=Lax` cookies;
- credentialed CORS allowed only for `FRONTEND_ORIGIN`;
- no state changes on safe methods.

A cross-site form cannot set custom headers. A cross-origin `fetch` with a custom header triggers a preflight, which fails for any origin except the frontend. The header value is not a secret.

## Alternatives

- **Synchronizer token (CSRF token in session + form/header).** Classic and robust, but needs token issuing, storage and delivery to both the browser and the Next server.
- **Double-submit cookie.** Stateless, but requires a JS-readable cookie and the same delivery work.
- **`SameSite=Strict`.** Breaks login state when users arrive from external links.
- **Checking `Origin` / `Referer`.** Useful as defense in depth, not implemented yet.

## Consequences

- \+ No token management; both API clients add one constant header.
- − Security relies on the CORS configuration staying strict: allowing `*` or reflecting arbitrary origins with credentials would break this protection.
- − Protection depends on browser preflight behavior; non-browser clients are unaffected by CSRF anyway.
