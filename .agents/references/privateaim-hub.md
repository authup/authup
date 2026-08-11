# PrivateAIM/hub — event-system mapping

Cross-reference for the **security event log** (authup `Event` domain, `auth_events`,
plans 057/053/058 — wave-2 PR #3229). authup's implementation was designed from a deep
investigation of hub's telemetry event system (itself Authentik-derived) and deliberately
adopts its shape while fixing its weaknesses — **authup is the reference implementation;
the "upstream candidates" below are improvements hub should adopt back**, tracked as
**PrivateAIM/hub#1745**. Claims pinned to hub lockstep version `0.12.1` (2026-07).

## Code mapping

| hub | authup | Notes |
|---|---|---|
| `packages/telemetry-kit/src/domains/event/entity.ts` `Event` | `packages/core-kit/src/domains/event/entity.ts` `Event` | Same column vocabulary: `(scope, name)`, `ref_type`/`ref_id`, `actor_type/actor_id/actor_name`, `request_*`, `data`, `expiring` + `expires_at`. authup adds `client_id` (IdP-specific), drops `updated_at` (append-only). |
| `apps/server-telemetry` `events` table | `apps/server-core` `auth_events` table | authup embeds the store in server-core (no separate telemetry service — lean/embed charter). |
| free-string `scope`/`name`/`ref_type` | closed `EventName`/`EventScope` enums (+`EventRefType`) | See upstream candidate 1. |
| `EVENT_CREATE/READ/DELETE` permissions | `EVENT_READ` only | authup writes are internal-only; no create/delete API at all. |
| `EventAPI` (`getMany/getOne/create/update/delete`) | `EventAPI` (`getMany/getOne` only) | hub's `update()` POSTs to a route that does not exist (dead code) and has no `EVENT_UPDATE` permission. |
| `EntityEventHandler` (`server-telemetry-kit/src/core/event/subscriber.ts`) | `EntityEventHandler` (`core/entities/event/entity-event-handler.ts`) | CRUD→event bridge: `scope: 'entity'`, `name: created/updated/deleted`, scalar `data.diff`, short TTL. |
| actor/request via TypeORM `SaveOptions.data → queryRunner.data` (`RequestRepositoryAdapter.extendOptionsData`) | `AsyncLocalStorage` request event context (`adapters/http/request/event-context.ts`), injected into the handler as a function | authup's approach needs no ORM options threading and no base-repository coupling — see upstream candidate 8. |
| `Event`+`Log` split (Log → VictoriaLogs, syslog `LogLevel`) | Event only; the structured logger line in `EventService.record()` is the log-pipeline complement | Same audit-vs-operational split, without a second storage backend. |
| cleaner: cron `0 1 * * *`, batches of 100, `{ expiring: true, expires_at < now }` | cleaner: cron `* * * * *`, single indexed DELETE, same predicate | Same predicate; authup's per-minute single statement suits the smaller row volume. |

## Deliberate authup deltas — candidates to upstream to hub

1. **Closed taxonomy.** hub's `(ref_type, scope, name)` are free strings (`min 3` is the only
   guard) — no compile-time safety, typo-able event names. authup: closed enums.
2. **Append-only events.** hub events are mutable (`updated_at`, `update()` client onto a dead
   route, no `EVENT_UPDATE` permission). audit records should not be updatable.
3. **PII/credential write boundary.** hub stores context unfiltered. authup: allowlist-first
   scalars-only sanitizer for `data`, plus a secret-denylist (`password|secret|hash|token|credential`)
   on entity-diff keys.
4. **`serialize(null)` bug.** `@authup/kit` `serialize(null)` returns the string `'null'` — the
   bare hub transformer pattern persists literal `'null'` text instead of SQL NULL. authup
   null-guards the `to` side. **hub's entities (and authup's own four EA precedents:
   role/user/policy/identity-provider-attribute) carry the unguarded pattern.**
5. **IPv6.** hub `request_ip_address` is `varchar(15)` + `zod.ipv4()` (the `::1 → 127.0.0.1`
   hack is a symptom). authup: `varchar(45)`.
6. **`realm_id` index.** hub's primary read filter is unindexed; authup indexes it. hub also
   indexes nearly every column (14) on a write-mostly table; authup keeps 10 justified ones.
7. **Validator/column width mismatch.** hub validates `scope/name/ref_type` at max 128 against
   `varchar(64)` columns (silent truncation / insert errors). authup single-sources widths and
   truncates client-controlled strings at the write boundary.
8. **Request-context capture.** `AsyncLocalStorage` around the request (after the authorization
   middleware) instead of threading `SaveOptions.data` through repositories — no ORM coupling,
   non-HTTP writes (provisioning/CLI/cron) naturally attribute as system (null actor).
9. **Configurable retention.** hub hard-codes `WEEK_IN_MS` in the bridge (and 24h in one
   call-site) with no config key and no cleaner-cron config. authup: `eventLogRetentionDays`
   (365) + `eventLogEntityRetentionDays` (7) + `eventLogEnabled`/`eventLogEntityEnabled`, with a
   fail-loud cross-check for dependent features (login throttle).
10. **Previous-state transport.** hub passes `dataPrevious` inside the subscriber payload — safe
    there only because its consumer is an internal WORK queue. authup's publish `content` is the
    shared realtime wire payload (redis/socket → browsers), so `dataPrevious` rides the publish
    **context**, never the content. hub should double-check nothing re-broadcasts its payload.
11. **Wire-shape parity for failure counting.** authup's `loginFailed` rows carry the attempted
    identifier in `actor_name` (indexed) — enabling the `(identifier, ip)` throttle as a pure
    column predicate. hub has no auth events (auth is delegated to authup), but the pattern
    applies to any attempt-counting need.

## Shared gaps (neither has it yet)

- Aggregation/statistics endpoints (counts over time, per-action) — both expose only
  list+filter; Authentik-style dashboards would need new query surfaces.
- Notification rules over the event stream (authup: rejected in plan 062; hub: n/a).

## Migration hygiene (drift gate, 2026-08-10)

| hub | authup | difference |
|---|---|---|
| `.github/workflows/main.yml` migration round-trip (run / revert xN / re-run, per server app x dialect) | `tests-migrations` job | hub HAS the empty round-trip but NO drift gate and no populated round-trip on top of it. |
| `apps/server-core/.../1784000000000-RegistryFkSetNullAndRenameAnalysis` (`RENAME TABLE analysis TO analyses`, "constraint names intact") | `1785871780234-AlignSchemaWithEntityMetadata` (the repair for the same failure class) | The carried-over names are the bug: typeorm derives `IDX_/FK_<hash>` from table+column, so a table rename changes every derived name. hub server-core drifts 14 statements per dialect (4 indexes + 3 FKs on `analyses` under `analysis`-derived hashes); messenger/storage/telemetry probed clean. Filed as PrivateAIM/hub#1823 with the authup fix as the template (`assertSchemaMatchesMetadata` gate from typeorm-extension >= 4.0.0-beta.3 — hub is already on beta.3 — plus `scripts/{assert-schema-drift,verify-latest-migration}.mjs`). |
