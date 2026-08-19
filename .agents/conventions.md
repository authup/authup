# Conventions

## Tooling

| Tool             | Purpose                                           |
|------------------|---------------------------------------------------|
| NX               | Monorepo task runner (dependency-ordered builds)   |
| tsdown           | Package JS bundling (rolldown-based)               |
| Vite             | auth console SSR builds (`apps/client-auth-console/`) and account console SPA builds (`apps/client-account-console/`) |
| Nuxt             | client-admin-console builds                                 |
| Vitest + SWC     | Test runner with fast compilation                  |
| ESLint           | Linting (`@tada5hi/eslint-config-vue-typescript`) |
| Husky            | Pre-commit hooks via lint-staged                   |
| commitlint       | Commit message convention enforcement              |

## Validation & Error Handling

- **Validation**: `validup` framework with `@validup/adapter-zod` for Zod schema integration
- **Errors**: `@authup/errors` provides `AuthupError` (extends `BaseError` from `@ebec/core`) plus dedicated subclasses (`ValidationError`, `EntityNotFoundError`, `EntityConflictError`, `EntityCredentialsInvalidError`, `EntityInactiveError`, `InternalError`, `BadRequestError`, `UnauthorizedError`, etc.) with `Symbol.for(...)`-keyed duck-type guards in sibling `check.ts` files (`isError`, `isAuthupError`, `isValidationError`, `isOAuth2Error`, `isJWTError`, etc.). HTTP-status concern is decoupled — `ERROR_CODE_TO_STATUS` / `httpStatusFromCode(code)` map semantic codes to HTTP statuses in the adapter. **`core/**` must NOT throw HTTP-status-named error classes (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, …) — those names belong to the HTTP layer.** Core throws transport-agnostic domain errors: the generic `ValidationError` (business-rule / bad-input violation, maps to 400), the semantic `Entity*Error` family, or a purpose-built domain error (e.g. `KeyCertificateError`); the HTTP error middleware maps their `code` to a status via `httpStatusFromCode`. `@ebec/http` classes stay in the HTTP middleware for foreign-error translation. Domain-specific identity workflow errors (e.g. `RegistrationDisabledError`, `PasswordRecoveryDisabledError`) live in their respective `core/identity/<workflow>/` folders and extend `ValidationError`.
- **Error helpers**: `normalizeError(unknown): Error` coerces an arbitrary thrown value into a real `Error` for downstream inspection. `serializeError(Error): Record<string, any>` calls `toJSON()` when available (preserving every AuthupError attribute) and otherwise spreads enumerable own properties — use it at any JSON serialization boundary (HTTP error middleware, embedded-error response bodies). Both live in `@authup/errors`.
- **Outbound failures are `UPSTREAM_ERROR` (502), never the upstream's own status**: `sanitizeError` (`apps/server-core/src/utils/error.ts`) matches hapic's `isClientError` in a branch that MUST stay above the `isHTTPError` one. `isHTTPError` duck-matches any `BaseError` carrying a 4xx/5xx `status`, and hapic's `HttpResponseError` carries the upstream's, so without that ordering an upstream 400 becomes authup's own 400 `bad_request`. That reads as "your request was malformed" when the caller's request was fine and a dependency failed. The branch also drops hapic's message, which embeds the outbound method and URL (`400 Bad Request (POST https://idp.example.com/token)`) and would otherwise be served to the caller.
- **Log the error as raised, never the sanitized copy**: `describeError(input, headline?)` (same file) is the log-side counterpart of `serializeError`. It renders the upstream status, the decoded upstream body, the `cause` chain down to the syscall reason (`ECONNREFUSED`, `ENOTFOUND`, ...) and the stack as one indented block. The response payload stays sanitized; this is for the server's own log only. **Do not thread `cause` onto the sanitized `AuthupError` instead**: `BaseError.toJSON()` serializes `cause`, and the response body is `serializeError(next)`, so that would publish upstream internals to the caller. A `catch` that swallows a failure into a redirect or a marker (e.g. the identity-provider link callback) must call `describeError` before swallowing, since that is the only surface the reason can reach.
- **`check` / `safeCheck` pair on services**: When a service exposes a single verification that has two equally-valid call sites — one that wants exceptions (composition, business logic) and one that wants a value (HTTP boundary embedding denial in a response body) — split into two methods: `check(...)` throws on any failure, `safeCheck(...)` wraps `check` and returns `Result<null>` from `@authup/kit`. The HTTP controller calls `safeCheck` and maps `Result` → wire shape via `serializeError`. See `apps/server-core/src/core/identity/{permission,policy}/checker/` for the canonical example.
- **Validation location**: Validators from `@authup/core-kit` (e.g., `RoleValidator`, `UserValidator`) run inside core services, not in controllers. Services receive raw `Record<string, any>` data and call `validator.run(data, { group: ValidatorGroup.CREATE })` internally. Controllers use `useRequestBody(req)` to pass the raw body to the service.
- **Canonical identifier form**: `name` (every entity) and `user.email` are stored as `LOWER(TRIM(value))`. New `name`-style columns must chain `.trim().toLowerCase()` in their validator before the format check, and use `=` (not `LIKE`) in repository lookups. See `.agents/architecture.md#canonical-identifier-form` for the full rationale.
- **Property naming (plan 073)**: new entity/domain properties and management-API payload/response fields must be **camelCase**. On the TypeORM entity, pin the snake_case column explicitly — `@Column({ name: 'snake_col' })` on every camelCase property, `@JoinColumn({ name })` on every relation (there is no naming strategy; a forgotten `name` yields a camelCase column that diverges from the frozen migration, so always add it). The OAuth2/OIDC protocol surface and JWT claims stay snake_case. See `.agents/architecture.md#naming-split-plan-073`.
- **Relation targets**: when copying a `@ManyToOne` + `@JoinColumn` block (the usual way a new relation is written), re-check the target class against the join column — `@ManyToOne(() => RealmEntity)` left on a `client_id` column emits an FK to `auth_realms`, so the column can never hold a real client id. This has slipped through twice (`auth_permissions.client_id`, fixed in migration `1766830857009`; `auth_roles.client_id`, fixed in `1784970000000`) because TypeORM derives the FK name from the table + column only, so the name looks right either way and nothing fails until a row is written. Verify a migrated schema against the entity metadata with `dataSource.driver.createSchemaBuilder().log()` — an FK drop/add pair for the table means the two disagree.

## Workflow

- After making changes, **always build** the affected app/package and **run ESLint** on all changed files.
- Build: `npm run build -w <workspace>` (from repo root, e.g. `-w apps/server-core`, `-w packages/kit`)
- Lint: `npx eslint --fix path/to/changed/file1.ts path/to/changed/file2.ts`
- Fix any build or lint errors before considering a task complete.
- Every workspace splits `build` into `build:types` + `build:js` — packages emit
  declarations (`tsc`/`vue-tsc --emitDeclarationOnly`), the console apps run a
  pure type check (`vue-tsc --noEmit`, or `nuxi typecheck` in the admin
  console) before bundling. The Vite console apps' tsconfigs deliberately
  declare **no local `paths`**: they inherit the root `tsconfig.json` map
  (`@authup/* → packages/*/src`), so the type check runs against package
  SOURCE, matching the vite/nuxt `@authup/* → src` aliases the bundles are
  built from. Do not re-add app-local relative `paths` entries — `paths`
  resolve against the inherited root `baseUrl`, so `../../packages/...`
  silently resolves outside the repo, never matches, and the check degrades to
  the last-built dist declarations (where vue-tsc-emitted component prop
  unions can differ from source). The corollary is that each Vite console
  app's `resolve.alias` map must list **every** `@authup/*` package it pulls
  in, transitive ones included: an unaliased package is bundled from its
  built dist while `vue-tsc` checks the source, so the two silently disagree
  until a rebuild.
- The auth console emits both halves of its SSR output from one
  `vite build`, declared as `environments: { client, ssr }` plus
  `builder: {}` rather than two invocations with CLI flags. The output
  paths are load-bearing (server-core reads `dist/client/index.html`,
  `dist/client/.vite/ssr-manifest.json` and `dist/server/server.js`), so
  the SSR `entryFileNames` is pinned instead of derived from the entry
  name. Leave `builder.sharedPlugins` at its default (off): plugin
  instances hold `configResolved`-scoped state, and the environments
  resolve differently enough (`consumer`, `build.ssr`, outDir) that
  sharing one instance across both is not something the plugin set is
  written for.

## Testing

- **Service-level tests** isolate domain logic with in-memory fakes. Generic fakes (`FakeEntityRepository`, `FakePermissionEvaluator`, `createAllowAllActor()` etc.) come from `@authup/server-test-kit`; domain fakes (`FakeRealmRepository`, `FakeRoleRepository`, `FakeUserRepository`, ...) live alongside their entity at `test/unit/core/entities/<entity>/fake-repository.ts`. No HTTP, no Docker.
- **HTTP-level tests** spin up the real server on a random port. Use `suite.client` (typed `@authup/core-http-kit` Client) for API calls; `suite.baseURL` for raw `fetch()` (e.g., asserting HTML response bodies).
- **UI/SSR tests** stub the rendered Vue app's outbound HTTP via a fake client: register `{ useFactory: () => createFakeClient(handlers) }` (from `@authup/core-http-kit/testing`) with `{ lifetime: 'transient' }` under `HTTPInjectionKey.UIHttpClient` before `suite.setup()` (see `.agents/testing.md`). Transient lifetime — never a singleton instance — because the client carries per-user Authorization state. Production code never imports from `@authup/core-http-kit/testing`.

## Database Migrations

Migrations live in `apps/server-core/src/adapters/database/migrations/{mysql,postgres}/` (sqlite never runs them — the options builder wires `migrations: []` for `better-sqlite3`, so boot falls back to `dataSource.synchronize()` from the entity classes; the test suite does the same).

**MySQL and PostgreSQL are the supported servers, and MariaDB is not one of them.** There is no `migrations/mariadb/` directory and the config validator only accepts `mysql` / `postgres` / `better-sqlite3`, so typeorm's MariaDB-specific behaviour (native `uuid` columns from 10.7, `RETURNING`) never activates either — it is gated on `options.type === 'mariadb'`. Pointing `type: 'mysql'` at a MariaDB server mostly works but is unsupported, and two things diverge concretely: MariaDB refuses to change a column an existing foreign key references even with `FOREIGN_KEY_CHECKS` off (`ER_FK_COLUMN_CANNOT_CHANGE`), which aborts `1785871780234-AlignSchemaWithEntityMetadata`; and MariaDB 11.4+ defaults to the `utf8mb4_uca1400_ai_ci` collation where MySQL 9 uses `utf8mb4_0900_ai_ci`, so every string column reads as drift. Do not reshape a migration to accommodate it.

- **One named migration per feature; released migrations are immutable.** Each feature/PR adds its own migration with a descriptive class/file name (e.g. `1784289540000-CamelCaseAttributes.ts`, `1784460916000-RemoveRobots.ts`; both dialects, doc-comment header explaining the change). A migration may still be amended while it lives only on its own unmerged branch; once it ships in a **release** it is immutable — before touching an existing migration, verify against the release tags / last release-PR merge that it has not shipped (folding into an already-released file is the failure mode this rule exists to prevent).
- Consolidation happens at release time, not at merge time: the window's migrations MAY be squashed into one file per dialect as a deliberate last step before the release PR merges (keeping the earliest timestamp so ordering against the released chain holds) — but this is optional; shipping several named migrations in one release is fine. Anyone who executed the pre-squash files must drop their dev DB (the CLI re-creates it) or fix its `migrations` table by hand.
- After adding or amending a migration, verify with the migration round-trip (`migration run` → `revert` × N → `run`, see [testing.md](testing.md#migration-tests)). A migration that touches columns, constraints or rows additionally needs the populated round-trip (`npm run test:migration-latest`) — the CI round-trip runs on an empty schema and cannot surface anything that only fails with rows present.
- **Never hand-write DDL. Generate it with the CLI.** Schema changes (tables, columns, indexes, constraints, types) are produced by `migration generate` and committed as emitted — never typed by hand, and never edited afterwards in any way that changes the resulting schema:

  ```bash
  docker compose up -d mysql postgres            # the generator connects to both
  npm run build --workspace=apps/server-core     # it diffs the compiled entities
  npm run cli --workspace=apps/server-core -- migration generate
  ```

  The command drops and recreates a local `migrations` database per dialect, replays the existing chain, diffs it against the entity metadata and writes **both** dialect files under one shared timestamp. Rename the emitted `<timestamp>-Default.ts` file **and** its class to the descriptive name the rule above asks for, add the doc-comment header, and leave the DDL untouched.

  Hand-authored statements are confined to what the generator cannot express — data migrations (`UPDATE` / `INSERT` / backfills), guarded or idempotent wrappers, and comments. They may sit alongside generated DDL in the same file; they may not replace it. If a change seems to need hand-written DDL, the entity is the thing to fix, then regenerate.

  This is not a style preference. Every schema defect found so far came from hand-authored DDL diverging from the entity model: two foreign keys pointing at the wrong table (`auth_permissions.client_id` in `1766830857009`, `auth_roles.client_id` in `1784970000000`), and the naming + column-type split that `1783325495597` / `1783769340000` introduced and `1785264000000-AlignSchemaWithEntityMetadata` had to repair across 28 constraints and 15 columns. Two traps in particular are invisible while hand-writing and unmissable when generating: constraint names are typeorm's table+column hash (`IDX_<hash>` / `FK_<hash>`, never a readable `IDX_auth_events_actor_name`), and a plain `@Column({ type: 'uuid' })` is `varchar(255)` on MySQL, not `varchar(36)` — pinning `length: 36` is no escape, Postgres rejects a length on `uuid` at `DataSource.initialize()`. The `test:schema-drift` gate in the `tests-migrations` job fails the build on any divergence; see [testing.md](testing.md#schema-drift-gate-npm-run-testschema-drift).
- Planned for `v1.0.0` final: squash the entire beta chain into a single baseline migration with a stepping-stone upgrade path (upgrade to the last beta first).
- **Never hand-write a constraint name.** `migration generate` diffs the live schema against the entity metadata, so a hand-authored `CREATE INDEX IDX_auth_events_actor_id` that the model does not declare reads as drift: the next generated migration renames it to typeorm's `IDX_<hash>`, burying whatever real change was being generated. Index, unique and foreign key names come from typeorm, and the entities pin none of them (`@Index()`, `@Unique([...])`, `@JoinColumn({ name })`). The 32 readable names the hand-authored beta.52/beta.53 migrations introduced were renamed onto the derived ones by `1785871780234-AlignSchemaWithEntityMetadata`. Primary keys are the one exception that needs no thought either way: the schema builder never compares their constraint names, so the 5 readable `PK_auth_*` are left as they are.
- **uuid columns are `varchar(255)` on mysql, not `varchar(36)`.** MySQL has no uuid type and `MysqlDriver.getColumnLength` only shortens to 36 for values typeorm generates itself, so a plain `@Column({ type: 'uuid' })` derives the generic varchar default. The same two migrations declared 15 of them as `varchar(36)`, which `1785871780234` widens. Do not try to close such a gap from the entity side with `length: 36`: postgres rejects a length on a `uuid` column at `DataSource.initialize()`, and a dialect-conditional column type is not expressible because `migration generate` builds both dialects in one process off the same entity classes.
- **An index added on a MySQL foreign-key column breaks the generated `down()`.** MySQL keeps an implicit index per FK (named after the constraint) and silently DROPS it the moment another index that can serve the constraint is created — so the new index becomes the FK's only server, and the generated `down()`'s plain `DROP INDEX` fails with "needed in a foreign key constraint" (worse: MySQL DDL is non-transactional, so a failed revert leaves a partial state). The generator has no awareness of this. Fix by WRAPPING the generated mysql `down()` (never editing the generated statements): a hand-authored phase dropping the affected FK constraints first, and a closing phase re-adding them (`ADD CONSTRAINT` recreates each implicit index under the constraint's own name, restoring the exact pre-migration state). See `1786436332251-QueryIndexes.ts` for the pattern and the affected-set query (information_schema: FK columns whose ONLY leading index is one the migration created). Postgres is unaffected (FKs there require no index).

## File Organization

- Exported **types** (interfaces, type aliases) must live in a `types.ts` file in the same directory, not inline in the implementation module. Implementation files import from `types.ts`.
- Barrel `index.ts` files re-export from `types.ts` and implementation modules.

## Workspace Naming (apps & packages)

The workspace name grammar, shared with PrivateAIM/hub (whose tree is the reference
implementation: apps `client-ui`, `server-core`, `server-core-worker`; packages
`client-vue`, `server-kit`, `core-kit`):

- **The prefix marks the side of the client-server relationship** that the
  application sits on (apps) or is built for (packages): `server-` for server
  applications, including third-party resource servers embedding the
  `server-adapter-*` packages; `client-` for client applications. An unprefixed
  workspace serves both sides: `kit`, `errors`, `specs`, `access`, `i18n`,
  `core-*`. The prefix does NOT mark where code executes: a client app's code
  may run server-side (the SSR auth console), and a server package may call
  the API (the adapters fetch JWKS). A future API-driving CLI is a client
  application and would be role-named `client-admin-cli`, next to
  `client-admin-console` (Keycloak's `admin-cli` precedent).
- **`core-*` names the core service's domain surface** (domain types, HTTP and
  realtime clients for `server-core`'s API). Consumed on both sides, hence unprefixed.
- **Apps are role-named** after the prefix: `server-core` (the IdP),
  `client-admin-console` (the admin console), `client-account-console` (the
  account console: a static SPA whose dist server-core serves at
  `/account`), `client-auth-console` (the auth console: the SSR auth
  workflow UI whose dist server-core renders on the IdP origin, plan 083),
  and the planned `server-core-worker` (optional background processor). The
  `authup` CLI supervisor is the eponymous exception. The admin app carries
  the full `admin-console` role (not bare `console`) because the UI
  surfaces are peers: admin console, account console and auth console.
  Console apps normally match their per-realm OAuth2 client rows
  (`admin-console`, `account-console`); **`client-auth-console` is the
  deliberate exception**. The auth pages ARE the IdP surface (they issue
  tokens rather than obtain them), so no client row exists for them. The
  name keeps the console-family symmetry anyway (settled 2026-08-02 with
  the maintainer, plan 083).
- **Packages are surface- or platform-named** after the prefix: `client-web-kit` /
  `client-web-nuxt` / `client-web-theme` serve ANY web client (RP) embedding authup,
  not just the console; `server-kit` / `server-adapter-*` serve any server-side
  consumer.
- **The second slot answers a different question per species, by design.** Apps
  are deployed by identity, so they carry a role (`client-admin-console`,
  `server-core`); packages are picked up by kind, so they carry a platform or
  surface (`client-web-kit`, `server-adapter-node`). Do not pad app names with
  platform tokens for symmetry (`client-web-account-console`): the shape
  difference is what keeps applications and libraries distinguishable in the
  flat `@authup/*` npm scope, and console app names must keep matching their
  per-realm OAuth2 client rows. App and package names deliberately do NOT
  mirror each other (hub precedent: app `client-ui`, library `client-vue`), so
  renaming an app never implies renaming a published package family.
- **Operator-facing vocabulary is a separate, shorter layer**: binaries
  (`authup-server`, `authup-admin-console`), the CLI package selectors and config sections
  (`server.core`, `client.admin-console`; slash form `server/core` in the docker
  entrypoint), and helm values keys. The grammar above governs workspace directory
  and npm package identity only.

History: `apps/client-web` (`@authup/client-web`, binary `authup-ui`) was renamed to
`apps/client-admin-console` (`@authup/client-admin-console`, binary `authup-admin-console`) pre-1.0,
with no aliases kept. The `client-web-*` packages keep their names on purpose.
A `web-` platform-prefix grammar (`web-kit`, `web-admin-console`) was evaluated
and rejected 2026-08-03: "web" already means Web-standard APIs in
`server-adapter-web`, the kit's real constraint is Vue rather than "web", and
aligning app names to package shapes would blur the app/library distinction in
the npm scope.

## Dependency Classification (published packages)

Sort each runtime dependency of a **published** package by one question: **would a second copy in the consumer's tree be a bug?**

- **`peerDependencies` (+ a devDependency mirror)** — only for **singletons**: something a *second instance* would break, or that the consuming app *owns and configures*. Framework runtimes (`vue`, `pinia`), a plugin/theme manager registered via `app.use()` (`@vuecs/core` and the `@vuecs/*` components bound to it — peer even when the kit's own import is `import type`, because the runtime singleton flows through the components), and `provide`/`inject` clusters keyed by a module-local `Symbol()` (`validup`/`@validup/vue`, `ilingo`/`@ilingo/vue`/`@ilingo/validup-vue`, and `vue-router`, whose `useRoute()` is `inject(routeLocationKey)` against a module-local `Symbol` provided by the host's `app.use(router)` / Nuxt, so a nested second copy resolves to `undefined`). Here `dependencies` would be *wrong*, not just wasteful — a private nested copy silently splits the singleton. The dev mirror lets the package build/test in isolation; keep peer range and dev pin aligned (peer = caret on the dev pin).
- **`dependencies`** — runtime-required **stateless leaves** with no singleton semantics: pure functions/enums/classes the package instantiates internally and never shares by identity (`smob`, `rapiq`, `@posva/event-emitter`, `@validup/zod`, `@ilingo/validup`, and the internal `@authup/*` building blocks — the package constructs its own `PermissionEvaluator`/`Client`/`ClientManager`, so there is no host-owned instance to dedupe). One version is still guaranteed by lockstep release + resolver dedup; `dependencies` just spares the consumer a manual install. This matches the `@authup/core-kit` / `@authup/client-web-nuxt` precedent (internal `@authup/*` as plain `dependencies`, never peers). **"Needed at runtime" does NOT imply peer.** A phantom runtime need (a package used only transitively, e.g. `universal-cookie` via `@vueuse/integrations/useCookies`) is still declared here.
- **`peerDependenciesMeta` `optional: true`** — a singleton needed only on an opt-in path that degrades gracefully (`@vuecs/locale`: `tryUseLocaleManager()` falls back to the ilingo locale).
- **`devDependencies` only** — build/test tooling (`@types/node`, `@vitejs/plugin-vue`, `vue-tsc`, `cross-env`), plus packages referenced **only** in `test/` or internal build code that never surface in the emitted `.d.ts`.

**`import type` is NOT automatically `devDependencies`.** A type-only import erases from the emitted JS, but if the type is **re-exposed in the package's public `.d.ts`** — as the return / parameter / field type of a public export, a re-exported type, or a `declare module '<pkg>'` augmentation — then a *consumer* compiling against that `.d.ts` must resolve the package, so it belongs in `dependencies` (stateless leaf: `rapiq`'s `PaginationParseOutput` re-exposed by `server-kit`, `@authup/server-kit`'s `ActorContext` / `IEntityRepository` re-exposed by `server-test-kit`'s fakes) or `peerDependencies` (a singleton, or an augmentation of the consumer's own copy: `validup` in `i18n`, whose `declare module 'validup'` block augments the consumer's validup — optional, since it only matters when that feature is used). Only a type used **purely internally** (never in the emitted `.d.ts`) may be `devDependencies`-only. The monorepo build does **not** catch this — the demoted package is still hoisted for the workspace; verify per package with `rg '<pkg>' dist/**/*.d.ts` after building. `@authup/client-web-kit` re-exposed `vue-router`'s `LocationQuery` in `dist/components/workflows/authorize/helpers.d.ts` while declaring the package in no field at all; the omission only surfaced when a component started calling `useRoute()` at runtime.

Do **not** use `peerDependencies` as a blanket "dedup enforcer" on leaves — dedup is free and applies to `dependencies` too; peer's only unique power (forbid a private nested copy, fail loud on conflict) matters solely for singletons. Before deleting or demoting an entry, verify actual usage (`rg "from '<pkg>'" src`, check `dist`, and check whether a *lower* package peers it — e.g. `socket.io-client` is a peer of `@authup/core-realtime-kit` and is statically imported by its `ClientManager`, so `@authup/client-web-kit` must keep declaring it even though its own `src` never imports it).

## Root `vue` override tracks every `@vue/*` bump

The root `package.json` `overrides` block pins `vue` to an exact patch. That pin
must move whenever ANY dependency bump (dependabot's `minorandpatch` group
included, not only a `@vuecs/*` bump) pulls the `@vue/*` subpackages to a newer
patch. With the pin behind, npm nests vue's own runtime deps under
`node_modules/vue/node_modules/@vue/{reactivity,runtime-core,runtime-dom,server-renderer}`
at the OLD patch while the compiler packages sit at the top level at the new
one. Two symptoms, both in the CI `Test Packages` / `Build Packages` jobs and
both in files nobody touched: `@vue/test-utils` (a top-level package peering
`@vue/server-renderer`) fails every client-web-kit SSR spec with
`Cannot find package '@vue/server-renderer'`, and two `@vue/reactivity` copies
give `vue-tsc` two `RefSymbol` identities (`Property '[RefSymbol]' is missing`).
It has recurred three times (the July 2026 `@vuecs` bump, #3317, #3461). Fix:
set `overrides.vue` to the new patch, `npm install --force`, then verify
`node_modules/vue/node_modules/@vue` is gone and
`node_modules/@vue/server-renderer` is hoisted. A dependabot PR whose table
lists `vue` needs this before merge; its own CI already shows the failure.

## Interfaces & Types

- **Every interface is prefixed with `I`**: `IEntityAPI`, `IClient`, `IRealmAPI`, `IEntityRepository`, `IDomainEventHandler`.
- **`interface` is reserved for contracts a class `implements`.** Anything not class-implemented (object shapes, options bags, payloads, structural contracts satisfied only implicitly — e.g. a third-party class matching a transport surface) is a `type` alias.
- **Contract-first, never implementation-inferred**: define the interface explicitly and have the class `implements` it. Do not derive public types from classes (no `typeof Client` / mapped-over-class "public interface" tricks) — the only sanctioned exception is at a third-party boundary where authup cannot make the dependency's class implement an authup interface.
- Interfaces must state **precise payload types** (e.g. `create(data: RealmCreatePayload)`), not weakened supertypes like `Partial<T>` that implementations silently narrow.

## Configuration Naming

- Boolean feature toggles use the `Enabled` suffix: `registrationEnabled`, `passwordRecoveryEnabled`, `emailVerificationEnabled`
- Config keys in `app/modules/config/types.ts` match the service option names
- Environment variable names use `SCREAMING_SNAKE_CASE` with `_ENABLED` suffix: `REGISTRATION_ENABLED`, `PASSWORD_RECOVERY_ENABLED`, `EMAIL_VERIFICATION_ENABLED`
- Config file keys (`.conf`) use `camelCase` matching the TypeScript property name
- **Every path key is resolved against `rootPath` after the `...parsed` spread**
  in `normalizeConfig`, so consumers receive an absolute path and none of them
  has to know what the process cwd was: `writableDirectoryPath`,
  `themeDirectoryPath`, `authConsolePath`, `accountConsolePath`. A new path key
  joins that block; computing it *before* the spread reads a default `rootPath`
  rather than the configured one (the `writableDirectoryPath` bug, fixed after
  v1.0.0-beta.62 — it silently ignored `rootPath` and stayed relative).
- **`writableDirectoryPath` does not hold the database.** It holds the
  production log files and is where `<dir>/provisioning` is read from; that is
  the whole of it. The sqlite file comes from `db.database` / `DB_DATABASE`,
  which typeorm-extension resolves against the process cwd
  (`resolveSQLiteDatabasePath`), so pointing `WRITABLE_DIRECTORY_PATH` at a
  volume does NOT move the database onto it. The Docker image defaults the key
  to `/var/lib/authup`; everything else defaults to `<rootPath>/writable`,
  which is what keeps an unprivileged `npx` start working (any absolute system
  path needs root or a pre-chowned directory).

## Upstream (Own) Libraries

Most non-framework dependencies are maintained by the same author (tada5hi) and can be
changed easily: `rapiq` (`@rapiq/*`), `vuecs` (`@vuecs/*`), `validup` (`@validup/*`),
`ilingo` (`@ilingo/*`), `routup` (`@routup/*`), `hapic` (`@hapic/*`), `ebec` (`@ebec/*`),
`typeorm-extension`, `smob`, `locter` — each lives at `github.com/tada5hi/<name>`.

- **When authup work reveals a gap, bug, or awkward API in one of these, open an issue in
  the upstream repo** (`gh issue create --repo tada5hi/<name>`) describing the authup use
  case — do NOT silently build an authup-side workaround. Workarounds calcify; upstream
  changes are cheap here. Precedents: tada5hi/rapiq#790 (TS2590), #800
  (`assertSchemaMatchesEntity`), #806 (context RFC), #811 (public-IR negation);
  tada5hi/vuecs#1591 (theme-manager merge), #1601 (generic `VCTable`), #1689 (Reka
  trigger-label snapshot).
- **rapiq is experimental** — big breaking changes are still expected and welcome; authup
  is the driving consumer, so gaps found during authup work should shape rapiq's design
  now while breakage is cheap.
- A deliberate authup-side fallback while an upstream issue is open is fine (e.g. keeping
  `invert: true` policies as post-checks until rapiq#811) — but the issue must exist so
  the fallback has a removal trigger.
- When upstream code is consulted, also update the corresponding mapping file under
  `.agents/references/` (see below).

## References

External project references live in `.agents/references/` — one Markdown file per external project
this codebase cross-references, building a **cumulative code mapping** so future work can find
corresponding code without re-searching. When looking up source code or docs in a referenced
project, update the corresponding reference file with:

- The source file path / function name (or doc/release anchor) in the external project
- The corresponding file path / function name in this project
- Any behavioral differences between the implementations (pin claims to a release version)

Current references:

- [authentik.md](references/authentik.md) — Authentik (goauthentik.io): the concept→authup mapping
  behind the competitive-parity roadmap (`.agents/plans/048-authentik-parity-overview.md`),
  release-verified through Authentik 2026.5.
- [keycloak.md](references/keycloak.md) — Keycloak: posture comparisons (key storage at rest,
  hosted login/consent, RP-initiated logout).
- [privateaim-hub.md](references/privateaim-hub.md) — PrivateAIM/hub: the sibling codebase authup
  borrows server-kit layout, the domain-event publisher and the telemetry `Event` shape from.
- [routup.md](references/routup.md) — routup: dispatch walk, decorator flattening, `event.store`
  contract, `trustProxy` resolution.
- [typeorm.md](references/typeorm.md) — typeorm + typeorm-extension: uuid column widths per dialect,
  the postgres `createFullType` length quirk, `synchronizeDatabaseSchema` boot behaviour, and the
  `migration generate` / schema-drift tooling.

## Writing Style

Applies to everything written in this repo: code comments, doc-comments, the
`.agents/**` docs, commit messages, issue and pull-request text, and above all
user-facing copy such as the `@authup/i18n` catalogs.

- **Avoid the em dash (`—`).** Use a full stop, a colon, a semicolon, or
  parentheses instead. Two short sentences almost always beat one sentence
  spliced with a dash. `An RP-initiated logout may redirect back to this URI.
  Leave empty to end on the confirmation page.` reads better than the same text
  joined by a dash.
- Prefer plain ASCII punctuation in general. Non-ASCII characters are fine when
  they carry meaning (accented words in the de / fr / es catalogs, arrows in
  tables), not as decoration.
- Keep i18n copy short and declarative. A hint should say what the field does
  and what an empty value means, in as few clauses as possible.

## Best Practices

- Use **ESM** and modern TypeScript/JavaScript.
- Prefer **Web APIs** over Node.js-specific APIs where possible.
- Use hexagonal architecture if possible.
- Maintain consistency with existing naming and architectural conventions.
- Before adding new code, always study surrounding patterns, naming conventions, and architectural decisions.
- Respect separation of concerns: domain logic → core-kit, API clients → core-http-kit, UI components → client-web-kit.
- No explanatory comments unless explicitly requested. Agents should rely on existing patterns and structure.
- Use domain interfaces (from core-kit) in ports, TypeORM entity classes only in adapters.
