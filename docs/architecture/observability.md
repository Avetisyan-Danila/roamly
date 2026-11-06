# Observability: logs and request id

## Overview

The API writes one JSON object per line to stdout ([pino](https://github.com/pinojs/pino) via `nestjs-pino`). Every log line written while handling an HTTP request carries the request id, and every SQL statement sent by Prisma carries it as a comment. Cron runs get their own run id the same way.

```text
Client ── X-Request-Id? ──► pino-http ── req.id ──► AsyncLocalStorage (logger + query tags)
                               │                         │
                               │              Guard ─────┤ assign({ userId })
                               │              Service ───┤ new Logger(...).log() → has req.id, userId
                               │              Prisma ────┘ SQL /*requestId='…'*/ → PostgreSQL
                               ▼
                          response + X-Request-Id
                          one "request completed" / "request errored" line
```

Decision behind this design: [ADR 010: Structured logs and request id propagation](../adr/010-structured-logs-and-request-id.md).

## Log line

A request produces one line when the response finishes:

```json
{"level":40,"time":1793985787841,"pid":95673,"hostname":"…",
 "req":{"id":"57ff0679-…","method":"GET","url":"/users/me"},
 "userId":"cd31ed93-…",
 "res":{"statusCode":401},"responseTime":1,"msg":"request completed"}
```

| Field | Source |
|---|---|
| `level` | pino numbers: 30 info, 40 warn, 50 error. 5xx → `error`, 4xx → `warn`, other → `info` |
| `req` | Whitelist serializer: `id`, `method`, `url` only. Headers, cookies and bodies are never logged |
| `res` | `statusCode` only |
| `userId` | Set by `JwtStrategy.validate`. Absent on `@Public()` routes |
| `err` | Only on 5xx: the real exception, serialized with `type`, `message`, `stack` and own fields (`code`, `meta` for Prisma) |
| `context` | Class name, for lines written with Nest's `Logger` |

Logs written with `new Logger(Foo.name)` from `@nestjs/common` go through pino too (`app.useLogger` in `main.ts`) and inherit `req.id` and `userId` of the current request.

## Request id

- Generated in `genRequestId` (`common/logging/request-id.ts`) at the very start of the request.
- An incoming `X-Request-Id` is kept if it matches `^[\w-]{1,64}$`, otherwise replaced with a UUID. It is a debugging aid, never an input for security decisions.
- Returned in the `X-Request-Id` response header on every response, and as `requestId` in the body of 5xx responses. It is not exposed to browser JavaScript via CORS.

## Errors

`ApiExceptionFilter` does not log. For any response `>= 500` it sets `response.err = exception` and adds `requestId` to the body. pino-http then writes a single `request errored` line with the real error. 4xx responses are logged as `warn` without `err`.

## SQL comments

`PrismaService` is created with `comments: [queryTags()]` (`@prisma/sqlcommenter-query-tags`). `queryTagsMiddleware` wraps every request in `withQueryTags({ requestId })`, so each statement ends with:

```sql
SELECT … FROM "public"."Amenity" … /*requestId='9de4edcb-…'*/
```

The comment is visible in the PostgreSQL log, `pg_stat_activity` and `current_query()`. To see it locally:

```sql
ALTER SYSTEM SET log_min_duration_statement = 0; SELECT pg_reload_conf();
-- …make requests, then
ALTER SYSTEM RESET log_min_duration_statement; SELECT pg_reload_conf();
```

## Cron jobs

Jobs run outside any request. `runJob(pinoLogger, name, fn)` (`common/logging/run-job.ts`) opens a logging context with `{ job, runId }` and the same query tags, a new `runId` per run:

```sql
SELECT … FROM "public"."PropertyPhotoUpload" … /*job='property-photo-cleanup',runId='4644a312-…'*/
```

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`. `silent` in `.env.test` and CI |

The app always writes JSON. `pnpm dev:api` pipes it through `pino-pretty`; production reads raw JSON.

## Invariants

1. No headers, cookies or request bodies in logs: `req`/`res` serializers are a whitelist.
2. Every response has `X-Request-Id`; every 5xx body has `requestId` equal to it.
3. One log line per 5xx, with the original exception as `err`.
4. Every SQL statement inside an HTTP request carries `requestId`; inside a cron run, `job` and `runId`.

## Not done yet

- Next.js server does not forward `X-Request-Id` to the API, so SSR calls get a new id in Nest.
- The frontend does not show `requestId` to the user on 5xx.
- No log shipping: logs stay in stdout until staging (stage 13).
- Background queues (BullMQ, later) must copy `requestId` into the job payload and open a context from it.
