# Provisioning

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## Provisioning Architecture

Provisioning declaratively synchronizes entities into the database on startup.
Core logic lives in `core/provisioning/`, wiring in `app/modules/provisioning/`.

### Layers

- **`core/provisioning/entities/`**: what can be provisioned, plus validators.
  A client declares `permissions` / `roles` (define new client-scoped ones) and
  `globalPermissions` / `realmPermissions` / `globalRoles` / `realmRoles` /
  `globalScopes` / `realmScopes` (assign existing; each lands in its junction).
- **`core/provisioning/strategy/`**: `createOnly`, `merge`, `replace`,
  `absent`.
- **`core/provisioning/synchronizer/`**: `ProvisioningEntityResolver<T>`
  (name resolution with wildcards; the client dimension is always pinned so a
  client-ownable entity never resolves another owner's rows, and entities with
  no client column opt out via `{ clientScoped: false }`),
  `ProvisioningJunctionSynchronizer<T>`, and one synchronizer per entity.
- **`app/modules/provisioning/sources/`**: `default` (built-ins), `file`
  (`.json`, `.yaml`, `.ts`, `.js`), `composite`.
- **The composite source DEEP-MERGES colliding entries** (key
  `name:realmId:clientId`), never replaces wholesale: a mounted file declaring
  the master realm to add one client must not displace the default source's
  admin user and `system` client relations. Later source wins per scalar;
  relation lists union (entity lists recurse by key, scalar lists dedup);
  policy `extraAttributes` merge per key with the later source winning (they
  are configuration, not a set); `strategy` is replaced only when the later
  entry carries one.

### File-Source Validation (`ValidatorGroup.PROVISIONING`)

- Only the FILE source validates; default and programmatic sources are
  code-built, which is why `BaseProvisioningSynchronizer.canonicalizeName`
  stays as defense in depth.
- `FileProvisioningSource` runs `RootProvisioningValidator` with
  `ValidatorGroup.PROVISIONING` and USES the validated output. Every nested run
  (`createProvisioningEntitiesValidator`, `core/provisioning/entities/utils.ts`)
  passes the group explicitly, because zod check closures do not inherit the
  validup run group, and assigns the result back so transforms reach the
  synchronizers.
- In the core-kit validators, identifier fields are mounted
  `[CREATE, PROVISIONING]`; `builtIn` is mounted ONLY under PROVISIONING (no
  HTTP service runs that group); `user.email` is optional under PROVISIONING
  (the synchronizer backfills a placeholder).
- Invalid entities fail the boot before anything synchronizes; unmounted keys
  are stripped; top-level `policies` go through `PolicyProvisioningValidator`.
- A failure is rethrown with the file path and every issue as
  `<path>: <message>`; the raw validup message names neither.
- `CLIENT_RESERVED_NAMES` (`system`, `admin-console`, `account-console`) is an
  API-path guard (`ClientService.save`) and NOT enforced for explicit realm
  blocks. A WILDCARD realm entry rejects reserved names at load: a template in
  every realm would fight the system-client MERGE on every boot.

### Synchronization Order

`ProvisionerModule` runs `GraphProvisioningSynchronizer`, then the deprecated,
config-gated `assignDefaultPolicy` backfill.

- Graph: policies, permissions, roles, scopes, realms.
- Per realm (`RealmProvisioningSynchronizer`): scopes, paths, clients,
  permissions, roles, users. Scopes and paths come first because clients and
  users in the same block reference them (`realmScopes`, `relations.path`).

### Concurrent boots: the provisioning lock (issue #3356)

`ProvisionerModule.setup` holds a deployment-wide mutex around the whole pass
(typeorm-extension's `withDatabaseLock`, name `PROVISIONING_DATABASE_LOCK` in
`app/modules/provisioning/constants.ts`). `DatabaseModule.migrate` holds
`MIGRATION_DATABASE_LOCK` around a boot-time migration run. Both pass
`DATABASE_LOCK_OPTIONS` (`app/modules/database/constants.ts`: 60s timeout,
`strict: false`).

- **Lock names must stay stable across releases**: a renamed lock is a
  different mutex, so an outgoing and an incoming replica would not exclude
  each other.
- **Why one mutex rather than catching duplicate-key errors per write site:**
  global `auth_permissions` / `auth_roles` / `auth_scopes` / `auth_policies`
  rows are unique over tuples with a nullable column, and all three dialects
  treat NULLs as distinct, so two booting replicas both insert with no error
  to catch at the unique key. The #3559 coalesced index now refuses that
  duplicate on mysql/postgres, which turns it into a failed boot; the lock is
  what keeps replicas from racing at all.
- The lock is SESSION-scoped, so each call site owns a dedicated query runner
  for its lifetime, released in a `finally`. Never use `dataSource.query()`
  for it (acquire and release land on different pooled connections).
- On better-sqlite3 the callback runs unlocked (`strict: false`): one database
  file per container, no second replica.
- A timeout throws `DatabaseLockError` and fails the boot rather than
  proceeding unlocked. Boot stays fatal: a replica without the master realm,
  admin user or permission catalogue passes a health check while being
  useless.
- Residuals: the lock serializes boot against boot, not against a live
  `POST /realms` running the same realm provisioners (the request side logs
  and degrades; the boot-side backfill can abort and the restart reconciles).
  `RealmService.save` runs no `checkUniqueness`, so two concurrent
  `POST /realms` with one name give the loser a 500, not a 409.

### Wildcard Realm Entry (`realms[].attributes.name: "*"`)

A realm entry named the literal `*` (`REALM_WILDCARD_NAME`) is a SELECTOR: its
relations are ensured in EVERY realm, existing at boot and new at creation
(e.g. a downstream login client, or a wildcard user with
`globalRoles: [realm_admin]`, #2927). In YAML it must be quoted (`"*"`), since
a bare `*` is an alias token.

- **Relations only.** Realm-level attributes and `strategy` are rejected
  (`RealmWildcardProvisioningValidator`); a partial pattern like `tenant-*`
  fails the ordinary name check. Child strategies keep the full vocabulary.
  `createOnly` binds a user's or client's declared roles, permissions and
  scopes only on the pass that creates it, except a `builtIn` client (only
  provisioning writes it, so system clients stay extendable).
- **Expansion.** `ProvisionerModule.setup` folds the wildcard entries (shared
  helpers in `core/provisioning/merge/`) and deep-merges the result UNDER every
  explicit realm entry, with the composite-source rules (explicit wins). A
  sequential run-after was rejected: `createOnly` is first-writer-wins and
  `merge` last-writer-wins, so no ordering satisfies "explicit wins" for both.
  Realms without an explicit entry get it from the startup backfill; realms
  created at runtime get it from `WildcardRealmProvisioner`
  (`ProvisioningInjectionKey.WildcardRealmProvisioner`), resolved lazily by
  `LazyWildcardRealmProvisioner` since HTTP has no boot-order dependency on
  provisioning.
- **Clone per realm (load-bearing).** `RealmProvisioningSynchronizer` MUTATES
  its input (realmId stamping; `replace` writes resolved ids back), so the
  entry is deep-cloned per realm. A shared object leaks one realm's ids into the
  next realm's sync.
- **`IRealmProvisioner` seam** (`core/provisioning/types.ts`): `RealmService`
  takes `realmProvisioners` in the order system clients, keys, wildcard, each
  wrapped never-fail. `ISystemClientProvisioner` and `IKeyProvisioner` extend
  it.
- Authup declares nothing through the wildcard: product infrastructure is
  code-owned (MERGE-reasserted), template data operator-owned (`createOnly`,
  admin edits survive).

## Provisioning Permissions With Policies

`PermissionProvisioningEntity.relations.policies` lists policy names attached
through `auth_permission_policies`. The default source uses it to bind
`system.default` plus an optional `ATTRIBUTE_NAMES` policy, e.g.
`CLIENT_SELF_MANAGE` gets `[SystemPolicyName.DEFAULT,
SystemPolicyName.CLIENT_NAMES_SELF_MANAGE]`.

`PermissionProvisioningSynchronizer.synchronizePolicies()` is idempotent. It
throws when a named policy is not provisioned, and when relations are declared
but the synchronizer was built without `policyRepository` /
`permissionPolicyRepository`.
