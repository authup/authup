# Entity statistics and the security event log

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

### Entity statistics (`GET /<entity>/@stats`)

Thirteen entities answer grouped counts over their own table: realms, clients,
scopes, identity providers, keys, trust anchors, users, paths, roles, policies,
permissions, sessions and events. A statistic is a rapiq GROUPED read: rows by
`filter`, grouping by `group`, measures by `aggregate`, e.g.
`?filter[createdAt]=>=...&group=bucket(createdAt,day),scope,name&aggregate=count`.
The answer is `EntityStatsResponse` (`@authup/core-http-kit`), not the entity
envelope: one row per group, `createdAt` the bucket start in UTC, absent
buckets hold no row (the consumer zero-fills between `meta.from` and `meta.to`).
Cross-entity statistics would get a root `GET /stats/<name>`; none exists.

- **One service, one adapter, a declaration per entity.** `EntityStatsService`
  (`core/stats/`) over an `EntityStatsDefinition`, and one
  `EntityStatsRepositoryAdapter` handing the query to `@rapiq/adapter-typeorm`'s
  `executeGrouped` (`applyGroupedQuery`). Dialect bucket expressions, UTC day
  edges and the to-many `EXISTS` filter are the adapter's, not authup's. What
  may be grouped and counted is the entity SCHEMA's `groups` / `aggregates`.
  Definitions are wired in `createStatsService` (the cache lives in a module
  the database module does not depend on). Adding an entity = the two schema
  blocks, a definition and a `@stats` method on its controller.
- **The gate is the list's, by construction.** Lists and statistics both call
  the service's `scopeRead(query, actor)` (`IReadScoper`, over
  `scopeReadQuery` in `core/query/scope.ts`), so they cannot disagree about
  reach. A `post` verdict narrows the statistic to the ownership term or to
  nothing (`narrowReadScope`): a grouped count has no row to evaluate, and
  failing closed cannot over-disclose. Consequence: a reader whose grant has a
  non-lowering policy sees a full list next to a statistic of 0 on the eight
  entities without an ownership term. Realms and identity providers are
  anonymous lists (no scope).
- **Decode.** Through the entity schema with `STATS_QUERY_PARAMETERS`
  (`filters`, `groups`, `aggregates`); the route carries
  `@DQuerySchema(<type>, 'stats')`. No `pagination` is decoded on purpose: a
  default page would silently truncate the series.
- **Window rules** (`resolveStatsWindow`, `core/stats/window.ts`), each a
  named 400: the first group is `bucket(<dateColumn>, hour|day|month)`; the
  filter has a TOP-LEVEL `gte`/`gt` on the date column; at most
  `STATS_MAX_BUCKETS` (744) buckets; an hour bucket stays inside the raw
  horizon. The lower bound is snapped to its bucket start; the upper bound is
  the caller's `lt`/`lte` or the read instant. A route realm
  (`/realms/:realmId/...`) is appended as a condition, which makes some
  statistics narrower than their list (accepted: narrower cannot disclose).
- **`meta.total`** drops only the TOP-LEVEL range conjuncts on the date column
  (`stripWindowConditions`); a range nested in an `or` stays. It is cached
  under that stripped query alone, so switching window or unit reuses it.
  "Active sessions" is the session total under `filter[expiresAt]=>now`.
- **Cache.** `STATS_CACHE_TTL` (60s), keyed by statistic, actor, rollup
  routing and the encoded LOWERED query, taken BEFORE an open window's upper
  bound is appended (it moves every request). The key holds what the gate
  produced, not just the identity: reach is a property of the request (a
  client-narrowed token, a bearer without `global`), and a restricted request
  must never read a broad one's answer.
- **Client and CLI.** `client.<entity>.getStats(query?)` on the 13 sub-APIs
  (`EntityStatsQuery` = rapiq `QueryBuildInput` picked to the three
  parameters); optional on `EntityAPIDispatch`, which is how the CLI derives
  `authup api <entity> stats`.

#### Event rollups (`auth_event_aggregates`)

Only the event statistic is backed by persisted DAILY counts, so dashboard
windows are not bounded by raw retention. No generic rollup mechanism: the
other tables are small and their rows live until deleted.

- **Table.** One row per `(date, realmId, scope, name, refType)` with a
  `count` (`EVENT_AGGREGATE_COLUMNS`). `date` holds the UTC day (the `*At`
  suffix is reserved for timestamps; `createdAt` is the write stamp the
  finality rule reads). `realm_id` nullable, FK to `auth_realms`
  `ON DELETE CASCADE`. No unique constraint. Counts only: no actor, client or
  request data, and nothing personal may be added.
- **Writer: the `event-aggregator` component** (scheduled whenever
  `eventLogEnabled`). Every minute it recomputes today and yesterday,
  backfills up to `EVENT_AGGREGATE_BACKFILL_DAYS` (7) missing days per tick
  walking a cursor toward the oldest raw event (an empty day would otherwise
  read as missing forever), and prunes past
  `core.eventLogAggregateRetentionDays` (`EVENT_LOG_AGGREGATE_RETENTION_DAYS`,
  0 = forever). A day counts as present only when its rollup was written after
  the day ended (`findDays`), so a provisional recompute of an open day gets
  repaired.
- **A recompute replaces the day** under `withDatabaseLock(...,
  EVENT_AGGREGATE_DATABASE_LOCK, ...)` (name must stay stable across
  releases): grouped read, then delete plus chunked insert (500 rows, postgres
  binds at most 65535 values) in one transaction. The grouped read runs
  OUTSIDE the transaction: inside, it would wait on a second pooled connection
  while the first is pinned (#3526 pool deadlock). On better-sqlite3 the lock
  is a passthrough and one adapter queues its recomputes (one shared
  connection).
- **Gone realms.** `auth_events` is FK-less and outlives realms, the rollup is
  not, so rows of a deleted realm are dropped before insert (else the FK fails
  the whole tick every minute), EXCEPT rows about the realm itself
  (`refType: realm`), kept with `realmId` null so the Realms page's `Deleted`
  count survives. Accepted price: those rows fall inside every `ownOrNull`
  reach in the rollups but not in raw events, so a `realm_admin` day read can
  count another realm's create/delete that its hour read does not. The realm
  cascade removes its rollup rows on every day; only days the tick recomputes
  (or a fresh process's walk, while raw rows exist) come back.
- **Routing is by the query's shape AFTER the gate.** A `day` / `month` read
  whose lowered query references stored columns only and aggregates `count()`
  alone is translated (`translateEventAggregateQuery`: `createdAt` to `date`,
  `count()` to `sum(count)`) and answered from the rollups. Only `gte` / `lt`
  bounds at 00:00Z translate; anything else reads raw (never widened), which
  is why the console snaps its lower bound. Every `hour` read and every reader
  lowered onto its own `actorId` reads raw. Routing inspects the lowered query,
  not the request: that is what keeps an own-rows reader from ever reading
  other actors' counts.
- **A realm-bounded reader is answered in two parts.** An `ownOrNull` reach
  lowers to `or(ownership, reach)`, which references `actorId`. When
  `ReadScope.reach` references stored columns only, the statistic answers
  `and(filter, reach)` from rollups plus `and(filter, ownership, not(reach))`
  from raw events (rapiq's `not()` is null-inclusive, the exact complement)
  and sums per group. `meta.total` stays the raw count of the whole OR. Own
  events in a foreign realm older than the raw retention are counted nowhere.
- **Horizons.** A raw read past the raw retention is refused, never silently
  short: `resolveEventRawHorizonDays` uses `eventLogRetentionDays`, or
  `eventLogEntityRetentionDays` when the filter pins `scope=entity`. A routable
  read past the rollup retention reads raw and is refused only past the raw
  horizon too. Horizons snap to the bucket start; a month window is held to
  the horizon's day (`isPastRawHorizon`).
- **Coverage meta.** Every event statistic reports the raw retentions
  (`meta.retentionDays` / `meta.entityRetentionDays`, 0 = forever) and the
  rollup coverage (`meta.aggregateFrom` / `meta.entityAggregateFrom`, from
  `findCoverage`). Coverage is null unless the rollups can answer the read's
  GATED scope, else an own-rows reader would be offered a window the server
  then refuses. Overriding the retention with the rollup one was rejected: one
  key would mean two things, and a retention says nothing about what was
  backfilled.

## Security Event Log

`auth_events` is the persisted, PII-stripped security audit trail. It has a
closed taxonomy (`EventName` / `EventScope` in `@authup/core-kit`, never free
text), is append-only (read-only HTTP surface, no `updatedAt`), and has one
central PII write boundary.

- **Write path.** `EventService.record()` never fails the originating
  operation (logs instead), stamps `expiring` / `expiresAt` from
  `eventLogRetentionDays` (default 90, `0` = forever), truncates strings to
  column widths, and runs `data` through `sanitizeEventData`: allowlist-first,
  scalars only. Secrets are simply never allowlisted; do not add nested or
  object values. A structured log line fires per event even with
  `eventLogEnabled=false`.
- **Never put a rendered error into `data`.** Store a code (`errorCode`,
  `status`); messages carry addresses, hostnames and certificate names, and
  rows are readable self-service by their subject.
- **`sessionId`** (`auth_events.session_id`) is nullable, indexed and
  deliberately FK-less: the log must outlive what it references (CASCADE
  erases history, SET NULL destroys the correlation). The request context
  (AsyncLocalStorage, `adapters/http/request/event-context.ts`, mounted right
  after the authorization middleware) supplies the bearer's session; OAuth2 and
  MFA emit sites stamp the session they created or acted on explicitly,
  because they run before or outside a bearer context. Non-HTTP writes have no
  store, so null actor means "system".
- **Emit sites** are explicit `record()` calls through an optional
  `eventService?` ctx; security events never ride the CRUD subscriber bus.
  `LOGIN_FAILED` carries the canonicalized attempted identifier in `actorName`
  with `actorId` null (deliberate: it is the throttle key). Token issuance
  emits nothing (`auth_session_tokens` inventories it). Keys and trust anchors
  are subscriber-less, so their services record metadata-only ENTITY-scope
  rows themselves (#3269), never key material or certificate bytes.
- **Entity-CRUD mirror.** `EntityEventHandler` (registered when
  `eventLogEnabled && eventLogEntityEnabled`) mirrors subscriber publishes into
  scope-`entity` `created|updated|deleted` rows with a short per-row TTL
  (`eventLogEntityRetentionDays`, default 7).
  - The pre-update snapshot rides the publish CONTEXT (`dataPrevious`), never
    `content`, which is the shared realtime wire payload.
  - Updates carry `data.diff` of scalar `{ next, previous }` pairs
    (`buildEntityDiff`): `_at` keys and keys matching
    `/(password|secret|hash|token|credential)/i` are dropped, and
    `sanitizeEventData` re-checks the regex. Generic `(name, value)` rows get
    no diff at all (`ENTITY_OPAQUE_VALUE_TYPES`): a key-name denylist cannot
    see that `value` holds a client secret. For the same reason the
    identity-provider attribute subscriber nulls `value` on the realtime bus.
  - Realm attribution is the owner realm (`realmId`, a junction's owner key,
    `userRealmId`, or a realm's own `id`).
- **The audit row rides the write's own transaction (#3539).** Subscriber
  hooks run inside TypeORM's persist transaction; a save through the
  DataSource there takes a SECOND pooled connection and ten concurrent writes
  deadlock the pool. So `EntitySubscriber.publish` passes `event.manager` as
  the opaque `transaction` (server-kit knows no persistence, hence `unknown`),
  forwarded as `EventRecordInput.transaction`; `EventRepositoryAdapter.save`
  writes through it, serialized per connection and with `transaction: false`.
  - Serialization matters: the hooks of one array save run concurrently on one
    client (pg deprecates that).
  - Not atomic on the query-builder insert path (`Repository.insert`, the
    extra-attribute add): the INSERT already committed, so the row is an
    ordinary autocommitted write there.
  - Residual: on postgres a failed audit INSERT aborts the whole transaction
    and the write is silently rolled back while the API answers success. It is
    infrastructure-only because every column is truncated, enum-typed or
    server-minted; admitting free text into `scope`, `name` or `actorType`
    would reopen it.
  - Rejected: a savepoint around the audit save (concurrent hooks on one runner
    corrupt the savepoint stack); deferring to `afterTransactionCommit` alone
    (still a second connection, and a nested transaction fires it inside the
    outer one). Deferring plus riding the runner's manager would work and is
    the escape hatch if the residual ever bites.
- **Read API.** `GET /events` (+ realm mount), gated by `EVENT_READ` with the
  session-service shape: without it, own rows only (`actorId` + `actorType`);
  reach applied before pagination; the repository force-selects the gate
  columns. `admin` = `any`, `realm_admin` = `ownOrNull`.
- **Dashboard statistic.** `GET /events/@stats` is the event instance of the
  generic statistic. `meta.enabled` mirrors `eventLogEnabled`, which keeps
  that fact off the anonymous `GET /`. Without `EVENT_READ` it counts own rows,
  always from raw events.
- **Admin UI** (`apps/client-admin-console`).
  - The dashboard (`src/pages/index.vue`) reads `useEventStats` /
    `useEntityStats` (`src/composables/entity-stats.ts`), scoped by the realm
    switcher (`realmId: [<realm>, null]`), with `ENTITY_STATS_WINDOWS`. The
    chart (`components/dashboard/EventVolumeChart.vue`) colours series with
    theme tokens read by `readThemeToken` (a canvas cannot read CSS), re-read
    on colour-mode flip. Green vs red was rejected for deuteranopia.
  - `useEntityStats` reloads on the ENCODED scope, never object identity;
    snaps its lower bound with `buildStatsWindowStart` so reads within one
    bucket share a cache entry; honours `paused`; keeps the previous answer
    while a new scope loads and drops it only on failure; drops stale answers;
    raises `forbidden` on 403 instead of `onError`. Tiles render only once
    answered (never a fabricated 0).
  - Entity list pages open their `#header` slot with
    `components/stats/EntityActivity.vue` (as the first child, not a sibling
    root, so `@failed` falls through): Total from the entity's `@stats`, plus
    Created / Updated / Deleted from the entity-CRUD audit rows. These follow
    the realm switcher only, need `event_read` (else dropped and paused), and
    use `StatsWindowSwitch.vue`, which disables a window the event read does
    not cover (`isStatsWindowCovered`) instead of under-counting.
- **Retention sweep.** `components/event-cleaner` deletes
  `expiring = true AND expiresAt < now` in batches
  (`EVENT_RETENTION_SWEEP_BATCH_SIZE`, 1000: select ids, delete by id, since
  `DELETE ... LIMIT` is MySQL-only), stopping when a batch removes nothing.
  The oauth2 cleaner's sweeps share `deleteInBatches` /
  `resolveSweepBatchSize` (`app/modules/database/repositories/helpers.ts`).
  Do not re-type the loop: typeorm ignores a falsy `take`, so a drifted guard
  silently restores an unbounded `DELETE`.
- **Failed-login throttle (default off).** `LoginThrottleService` counts recent
  `LOGIN_FAILED` rows (`countRecent`) keyed on the (identifier, ip) PAIR, never
  identifier alone (lockout DoS); no derivable ip fails open. It throws
  `LoginThrottledError` (429, `data.retryAfter`) before `authenticate` in the
  password grant.
  - The identifier is truncated to `EVENT_ACTOR_NAME_MAX_LENGTH`, exactly as
    `record()` truncates `actorName`; a mismatch makes the throttle silently
    fail open for long identifiers.
  - Counting rows alone is check-then-act, so attempts are also reserved in
    fixed one-minute cache buckets before counting and released in a
    `finally` after the row is written. A release must target the bucket it
    reserved, else it reads below zero later and admits an extra attempt.
  - A user-id identifier drops the realm from the key (the resolver ignores
    the realm hint for one). Enabling the throttle with `eventLogEnabled=false`
    fails at config time. Basic auth is not throttled.
- **Metrics.** `IAuthFlowMetrics` (`core/metrics/`, noop default) with a
  prom-client adapter: `authup_login_total{result}`,
  `authup_token_grant_total{grant_type}`, `authup_authorize_total{outcome}`,
  `authup_refresh_replay_total`. Bounded label sets only; subject attribution
  belongs in the event log. The HTTP duration `path` label is the registered
  route template (`createRouteTemplateNormalizePath`), with unregistered paths
  collapsed into `/{unmatched}`, so raw ids never become label values (#3253).
