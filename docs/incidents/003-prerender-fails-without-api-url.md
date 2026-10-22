# 003. Build fails without API_URL while prerendering /profile

Detected: first CI run on a clean runner ([run 39773347980](https://github.com/Avetisyan-Danila/roamly/actions/runs/39773347980)).
Fixed in: `7384139 ci fix`.

## Symptoms

`next build` passed locally but failed in CI:

```
Error occurred prerendering page "/profile"
Error: API_URL is not configured
    at serverApiClient (shared/api/server/server-api-client.ts:18)
    at getCurrentUser (entities/user/api/get-current-user.ts:7)
    at ProtectedLayout (app/(protected)/layout.tsx:16)
```

## Reproduction

```sh
cd apps/web
API_URL= pnpm build
```

## Expected

`/profile` and other protected pages are detected as dynamic and skipped during prerender. The build does not need the backend address.

## Actual

The build crashed on `/profile`. Locally it passed only because `API_URL` is set in `.env.local`, which is not in git.

## Root cause

`next build` does not analyze code to decide whether a route is static. It starts rendering the route, and if the render calls a request-time API (`cookies()`, `headers()`, `searchParams`), it stops and marks the route dynamic.

`serverApiClient` checked `API_URL` first and called `cookies()` second. With `API_URL` set, the render reached `cookies()` and Next bailed out as intended. Without it, the render threw before `cookies()`, so Next saw an ordinary error instead of a dynamic route.

Whether a page was static or dynamic depended on the order of two checks in a helper and on an env variable being present at build time.

## Solutions considered

- Add `API_URL` to CI env: green build, but the build still depends on a runtime-only backend address, which differs between staging and prod.
- Mark the protected layout as dynamic explicitly: fixes this layout only, any other page calling `serverApiClient` with `auth: true` keeps the trap.
- Check `API_URL` after `cookies()`, right before `fetch`.

## Decision

Moved the `API_URL` check in `serverApiClient` below the `cookies()` call. Every authenticated server request now marks the route dynamic before anything can throw. Runtime behavior is unchanged: a missing `API_URL` still throws on the first real request.

## Trade-offs

The fix relies on statement order inside the helper, which is easy to undo in a refactor. A static page that really fetches data at build time still needs `API_URL` at build, which is a real dependency.

## Verification

- `API_URL= pnpm build` passes, `/profile` and `/host/properties/new` stay `ƒ (Dynamic)`.
- CI run on `7384139` is green.

## Interview version

When I set up CI, `next build` failed on a clean runner but passed on my machine. The cause was how Next decides whether a page is static: it simply tries to render it at build time and bails out when the code calls `cookies()`. My API helper validated the backend URL before reading cookies. Locally the URL came from an untracked `.env.local`, so the render reached `cookies()` and the page was skipped. In CI it threw first. Adding the env var to CI would have hidden the problem, so instead I moved the check after `cookies()`: the build no longer depends on a runtime backend address. The general lesson: in Next, static vs dynamic is decided by what actually runs during the build render, and CI on a clean machine is what makes such hidden dependencies visible.
