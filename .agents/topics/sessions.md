# Session management API

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## Session Management API

`SessionController` (`adapters/http/controllers/entities/session/`),
dual-mounted `/sessions` + `/realms/:realmId/sessions`, over `SessionService`
(`core/entities/session/`). Read and delete only; the OAuth2 grants own
creation.

**Ownership** is `session.sub === identity.data.id && session.subKind ===
identity.type`. The subject is polymorphic (user or client), which is why
`SESSION_READ` / `SESSION_DELETE` exist instead of reusing `USER_*` /
`CLIENT_*`. `admin` holds both at `any`, `realm_admin` read at `ownOrNull` and
delete at `own`.

- `GET /sessions`: without `SESSION_READ` the caller is force-scoped to its
  own sessions through a repository `andWhere` a filter cannot override. With
  it, the compiled WHERE (ownership OR reach), with a per-row `reachesRecord`
  drop on `post`. The list bypasses the id-keyed session cache.
- `GET /sessions/:id`: own needs no permission, else `SESSION_READ` plus
  reach. `@me` / `@self` is the bearer's session (`useRequestSessionId`).
- `DELETE /sessions/:id`: own needs no permission, else `SESSION_DELETE` plus
  reach. Every revoke goes through `SessionManager.revoke`, the one
  chokepoint: it drops the cache entry, deletes the row (cascading the
  session's `auth_session_tokens`, so refresh tokens die too) and pushes
  back-channel logout tokens (see *Back-channel logout*). Access tokens stay
  valid on local-JWKS adapters until `exp`; authup's own API refuses them at
  once.
  - Trap: `SessionRepository.remove` reads the id before the TypeORM
    `remove`, which unsets the primary key. Dropping the cache key afterwards
    drops `SESSION:undefined` and the revoked session stays resolvable.
- `DELETE /sessions`: bulk revoke. A **flat** key of `SESSION_FILTER_KEYS`
  (`id`, `sub`, `subKind`, `userId`, `clientId`, `realmId`, in
  `core/authentication/session/types.ts`) selects the admin path.
  - No target filter: self-service, revoke the caller's sessions except the
    current one, narrowed by any other filter (`filter[seenAt]`, #3642). The
    owner scope is appended with `appendQueryConditions`, so no `or(...)` can
    reach another subject. The current session id comes from the bearer
    (`setRequestSessionId`), never from the client. A relation-qualified
    `filter[user.id]` stays on this path.
  - A target filter: admin force-logout via `deleteManyByQuery`, gated by
    `SESSION_DELETE` plus a per-session reach check, so filter breadth cannot
    escalate. It loads every match through `ISessionRepository.findAllByQuery`,
    deliberately unbounded: the paginated `findMany` would truncate at
    `maxLimit`. A non-admin sending any target filter, even its own `userId`,
    gets 403.
  - Both paths decode strictly (`throwOnFailure: true`): on a destructive
    selection a dropped leaf WIDENS the revoke, so an unknown key, a gated
    relation, a malformed or empty value answers 400.
  - Client: `client.session.deleteMany()` (self) /
    `deleteMany({ filter: { userId } })` (admin).

**Force-select the gate's columns.** Every realm-gated `findMany` must
force-select the columns its per-row gate reads, whatever the client's
`fields` projection: a stripped `realmId` makes the record check throw, and
defaulting it to `null` would read the row as global to an `ownOrNull`
reader.

- `EntityRepositoryAdapter` does it from its `realmScope` option (see
  *Adapter Implementation*). Adapters outside the base call the helpers in
  `app/modules/database/repositories/helpers.ts` directly after `applyQuery`:
  `applyRealmScopeSelect` (session and consent `+ sub, subKind`, event
  `+ actorId, actorType`, user authenticator `+ userId`, key) and
  `applyJunctionRealmScopeSelect` for a row without `realmId`
  (identity-provider account: `userRealmId` + `userId`).
- The helper dedupes against `qb.expressionMap.selects`: TypeORM's
  `addSelect` duplicates an already-selected column, and under join + take
  postgres rejects the DISTINCT wrapper's `ORDER BY` as ambiguous (mysql:
  duplicate column), so every `include=` list would 500.
- A new per-row gate wires every column it reads into its adapter.

**UI**

- Admin: `apps/client-admin-console/src/pages/sessions/` (list, subject names
  via the gated `include=user,client`; `/sessions/:id` shows the token
  inventory through `<ASessionTokens>` over
  `GET /session-tokens?filter[sessionId]=`) and `pages/users/[id]/sessions.vue`
  with a "Log out everywhere" action (`SESSION_REVOKE_ALL*`, gated on
  `SESSION_DELETE`).
- The user tab is gated on `SESSION_READ` in the route meta in
  `src/router.ts`: without it the server force-scopes the reader to its own
  sessions and the tab would mislead. The route guard checks every matched
  record, so direct navigation is covered.
- Account: `apps/client-account-console/src/pages/sessions.vue`, own sessions,
  each expandable into its token inventory. No per-token ip or user agent:
  server-side renderer refreshes stamp values like `node` that read as an
  unknown device. "Log out other devices" (`SESSION_REVOKE_OTHERS*`) calls
  `deleteMany()` and disables at `total <= 1`.
- The current row carries a "This device" badge (`SESSION_CURRENT`) and no
  delete button. The kit store exposes the id as `sessionId`, set from the
  introspection's `session_id` in `commitSession`.
- Session-token reads always join a client SUMMARY (id, name, displayName) in
  the adapter. `client` is deliberately not in the session-token schema's
  `relations.allowed`, so `?include=client` cannot force the full join, while
  a reader without `CLIENT_READ` still sees application names.

### Session continuity: one session per interactive login

An interactive login must leave one `auth_sessions` row. The hosted
`/authorize` page password-grants a bearer session to authenticate
`POST /authorize`; the code exchange then reuses that session instead of
creating a second one that would linger until expiry.

- `HTTPOAuth2Authorizer.authorizeWithRequest` threads
  `useRequestSessionId(event)` (server-derived, never client input) through
  `OAuth2Authorization.authorize` onto the code blob's `session_id` (cache
  blob, no migration).
- `OAuth2AuthorizeGrant.resolveSession` reuses and refreshes it. A code whose
  session is gone or does not match its `sub` / `sub_kind` / `realm_id` is
  refused with `invalid_grant`, so a revoke between issue and redemption
  (sign-out, password change, deactivation) reaches a pocketed code. The
  grant first refuses a subject that does not resolve, is inactive or is in
  another realm (`isTokenSubjectActive`), which catches a deactivation written
  outside the services that revoked nothing.
- Only a session-less authorize (HTTP Basic) creates a session at redemption.
- **Subject foreign keys.** `auth_sessions.user_id` and `client_id` are the
  polymorphic subject's typed FKs, and `SessionManager.create` sets exactly
  one from `subKind`, so `ON DELETE CASCADE` drops a subject's own sessions.
  Never write the authorizing application into `client_id`: deleting that
  application would then delete users' sessions and every other application's
  tokens on them. Per-application attribution is
  `auth_session_tokens.client_id`.
