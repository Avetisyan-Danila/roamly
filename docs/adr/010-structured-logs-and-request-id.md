# 010. Structured logs and request id propagation

Status: Accepted

## Context

The API logged plain text through Nest's default `ConsoleLogger`. Text cannot be queried by field ("all errors of user X", "everything for request Y"), and parallel requests interleave with nothing to tie their lines together. Upcoming stages (bookings under concurrency, payments, several instances behind a load balancer) need to follow one request through HTTP, application code and the database.

Constraints: existing code uses `new Logger(Foo.name)` from `@nestjs/common` and should not be rewritten; nothing secret (cookies hold auth tokens) may reach logs.

## Decision

- **pino via `nestjs-pino`.** JSON lines to stdout. `app.useLogger` routes Nest's `Logger` into pino, so existing calls keep working. Per-request context lives in `AsyncLocalStorage`, set up by the `pino-http` middleware.
- **Whitelist serializers.** `req` is `{ id, method, url }`, `res` is `{ statusCode }`.
- **Request id.** Incoming `X-Request-Id` if it matches `^[\w-]{1,64}$`, else `randomUUID()`. Echoed in the response header; added to 5xx bodies.
- **User id** assigned to the context in `JwtStrategy.validate` with `assignResponse: true`, so the final request line has it.
- **One line per failed request.** `ApiExceptionFilter` sets `response.err` for 5xx instead of logging; pino-http logs it with the request.
- **SQL comments** via `@prisma/sqlcommenter-query-tags`: `requestId` for HTTP, `job` and `runId` for cron runs.
- `LOG_LEVEL` from validated env; pretty output only by piping to `pino-pretty` in `start:dev`.

## Alternatives

- **Keep Nest `ConsoleLogger` with JSON mode.** No per-request context: `req.id` would have to be passed by hand everywhere.
- **winston.** Formats inside the process and is slower; no ready-made Nest integration with per-request context of the same quality.
- **`redact` (blacklist) instead of serializers.** A new sensitive header (`x-api-key`, webhook signatures) leaks silently until someone adds it to the list.
- **Filter logs the error itself.** Two lines per 5xx, and pino-http's line carries a synthetic `failed with status code 500` error.
- **Prisma `log: ['query']` events with request id.** The link lives only in app logs; PostgreSQL tooling (`pg_stat_activity`, slow query log) still cannot tell where a statement came from, and logging every statement is expensive.
- **OpenTelemetry tracing now.** Solves the same correlation and more, but needs a collector and backend; planned for stage 66. `traceparent` can be added to SQL comments then (`@prisma/sqlcommenter-trace-context`).

## Consequences

- \+ Any log line, response and SQL statement of a request share one id; slow or locking queries in PostgreSQL lead back to the endpoint and user.
- \+ Existing `Logger` calls became structured without changes.
- \+ Prisma errors are searchable by `err.code` (`P2002`, `P1001`).
- − Every SQL text is unique. Fine with unnamed prepared statements and `pg_stat_statements` (groups by parse tree), but would defeat a text-keyed statement cache.
- − Client-supplied ids can collide or be spoofed; acceptable because the id is only for debugging.
- − Two `AsyncLocalStorage` contexts (pino and query tags) are opened per request and per cron run; they must stay in sync in `queryTagsMiddleware` and `runJob`.
- − `userId` is missing on public routes even for signed-in users.
