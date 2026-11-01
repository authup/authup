# Conventions

## Tooling

| Tool             | Purpose                                           |
|------------------|---------------------------------------------------|
| NX               | Monorepo task runner (dependency-ordered builds)   |
| tsdown           | Package JS bundling (rolldown-based)               |
| Vite             | Every console BUNDLE: the auth console's SSR build and the two SPA builds. The console SERVICES are tsdown like every other server package |
| Nuxt             | `packages/client-web-nuxt` only (the integration downstream apps such as hub use). No authup app is a Nuxt app |
| trapi            | OpenAPI generation off the routup decorators (`build:swagger` in `apps/server-core`). The query surface is contributed by a preset handler during the generate; nothing rewrites the document afterwards (architecture.md → *Query vocabulary discovery*) |
| Vitest + SWC     | Test runner with fast compilation                  |
| ESLint           | Linting (`@tada5hi/eslint-config`, root flat config `eslint.config.js`) |
| Husky            | Pre-commit hooks via lint-staged                   |
| commitlint       | Commit message convention enforcement              |

The ESLint config keeps authup's domain-local type files, public interface names and compatibility re-exports through explicit overrides; component test harnesses may define multiple components per file.

## Commit Convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) via `@tada5hi/commitlint-config` (`commitlint.config.js`). Type and scope drive release-please version bumps. No AI-attribution trailers or lines (see AGENTS.md).

## Validation & Error Handling

- **Validation**: `validup` with `@validup/adapter-zod`. Validators from `@authup/core-kit` (`RoleValidator`, `UserValidator`, ...) run inside core services, never in controllers. Services take raw `Record<string, any>` and call `validator.run(data, { group: ValidatorGroup.CREATE })`; controllers pass the body through (`@DBody()`).
- **Errors**: `@authup/errors` provides `AuthupError` (extends `@ebec/core` `BaseError`), subclasses (`ValidationError`, `EntityNotFoundError`, `EntityConflictError`, `EntityCredentialsInvalidError`, `EntityInactiveError`, `InternalError`, `BadRequestError`, `UnauthorizedError`, ...) and `Symbol.for(...)` duck guards in sibling `check.ts` files. `ERROR_CODE_TO_STATUS` / `httpStatusFromCode(code)` map codes to HTTP statuses in the adapter.
- **`core/**` must NOT throw HTTP-status-named errors** (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, ...). Core throws `ValidationError` (400), the `Entity*Error` family, or a purpose-built domain error (`KeyCertificateError`); the error middleware maps the `code`. `@ebec/http` classes stay in the HTTP middleware for foreign-error translation. Workflow errors (`RegistrationDisabledError`, `PasswordRecoveryDisabledError`) live in their `core/identity/<workflow>/` folder and extend `ValidationError`.
- **A dead bearer is 401 on a resource route, `invalid_grant` (400) on the token endpoint.** The `JWT_*` codes (`expired_token`, `inactive_token`, `invalid_token`) map to 401 (RFC 6750 §3.1). The token endpoint exception (RFC 6749 §5.2) is applied at the call site: `HTTPOAuth2RefreshTokenGrant` catches `isJWTError` and rethrows `OAuth2GrantError.invalid()`. **A new token-endpoint path that verifies a JWT must do the same**; the global map cannot know which surface it is on.
- **`POST /token/introspect` REPORTS, it does not raise** (RFC 7662 §2.2). An unreadable token (malformed, bad signature, unknown `kid`) and any kind other than `access_token` / `refresh_token` answer a bare `{active: false}`, which also hides whether we hold the signing key.
  - **Exception: an expired token this server issued** answers `200 {active: false, ...payload, ...claims}` (verify with `ignoreExpiry`), so an RP can name the user. Deliberate departure from the §2.2 / §4 SHOULD NOT.
  - **`permissions` is withheld from every inactive report**, expired included. `active` is derived before the permission read.
  - Still raised: a verifying token with no `sub`, and a subject that does not resolve (`identity_invalid`).
  - **`active` is derived in the controller, never from the verify**: `jti` not blocklisted AND `exp` in the future AND session present and bound to the token's subject and realm AND subject active, fail-closed on missing claims. The verifier's signature-keyed cache does not re-check `exp`, and it must never `saveWithSignature` on an `ignoreExpiry` path; do not relax that. A subject of another realm than the token names is answered bare.
  - Coupled with `@authup/client-web-kit`: the store checks `active` on the response (topics/ui.md → *What the kit store persists*). Do not separate the two.
- **Introspection requires an INDEPENDENT credential; revocation deliberately does not (#3489).**
  - `TokenController.assertIntrospectionAuthorized` accepts a request identity the authorization middleware resolved (live bearer or Basic), or confidential client credentials (`extractClientCredentialsFromRequest` + `OAuth2ClientAuthenticator`, `secret`/`tls`; an `authMethod: none` client is refused `invalid_client`). Nothing answers `401 identity_unauthorized` with a bare `WWW-Authenticate: Bearer`. The authenticated client is promoted via `setRequestIdentity`.
  - Rejected: a self-introspection exemption for the token's own string. Possession is exactly what a finder has.
  - Layer two, `TokenController.isIntrospectionAllowed`: the token's own subject, the client it was issued for (`payload.client_id`), or an actor holding `TOKEN_INTROSPECT` whose realm reach covers the token's `realm_id`. Anyone else gets a bare `{active: false}` plus a server log line. A resource server introspecting FOREIGN tokens (adapter remote mode) needs `TOKEN_INTROSPECT` on its client.
  - Specs: hapic STRIPS the client-level header on token-API calls, so pass `{ authorizationHeaderInherit: true }` (or an explicit `authorizationHeader`) on `client.token.introspect`.
  - Revocation stays open: a public `client_id` proves nothing, the consoles' kit revokes anonymously during logout teardown, and revoking a held token is benign. Do not add an anonymous read to introspection, and do not gate revocation without changing the kit's teardown order.
- **`POST /token/revoke` answers `200` for a token it cannot read** (RFC 7009 §2.2): `ignoreExpiry` plus an `isJWTError` branch. An invalid token and a revoked one must keep the SAME status, or the oracle returns.
- **The `token` parameter is read from the form BODY only** (RFC 7662 / 7009 §2.1). A missing one is `400 invalid_request`; one in the query string is `400`, never read and never replaced by the request's own bearer. `GET /token/introspect` only introspects the request's own bearer.
- **A `kid` resolving to no usable key is a `JWTError`, not a `JWKError`.** `JWK_NOT_FOUND` (404) is right at `GET /jwks/:id` only. `OAuth2TokenVerifier` raises `JWTError.headerPropertyInvalid('kid')` for an unknown or `enc` key (no echo of the `kid`) and `JWTError.keyNotActive()` for a disabled or deleted key (issued, not guessed, so the failed-auth rate limit must not count it). The kit refreshes on either. `JWKError.decryptionKeyMissing()` stays for a key row without material.
- **A 401 from a protected resource carries `WWW-Authenticate`** (RFC 6750 §3), stamped by the error middleware: `Bearer error="invalid_token", error_description="..."` when a bearer was presented, bare `Bearer` for `identity_unauthorized` with none. Gated on the request's own `Authorization` header, so the token endpoint's `invalid_client` 401 does not get it. `"` and `\` are stripped from the description.
- **Error helpers** (`@authup/errors`): `normalizeError(unknown)` coerces a thrown value into an `Error`; `serializeError(Error)` calls `toJSON()` when present, else spreads own properties. Use it at every JSON serialization boundary.
- **Outbound failures are `UPSTREAM_ERROR` (502), never the upstream's status.** In `sanitizeError` (`apps/server-core/src/utils/error.ts`) the hapic `isClientError` branch MUST stay above `isHTTPError`, which duck-matches any `BaseError` with a status. The branch also drops hapic's message, which embeds the outbound method and URL.
- **Log the error as raised, never the sanitized copy.** `describeError(input, headline?)` (same file) renders upstream status, decoded body, `cause` chain and stack for the server log. **Do not thread `cause` onto the sanitized `AuthupError`**: `toJSON()` serializes `cause` into the response. A `catch` that swallows a failure into a redirect or marker must `describeError` first.
- **`check` / `safeCheck` pair**: `check(...)` throws; `safeCheck(...)` wraps it and returns `Result<null>` from `@authup/kit`. A refusal of the request's own input (the subject `identity` names) still throws from `safeCheck`. Controllers call `safeCheck` and map via `serializeError`. Canonical: `apps/server-core/src/core/identity/{permission,policy}/checker/`.
- **Canonical identifier form**: `name` (every entity) and `user.email` are stored as `LOWER(TRIM(value))`. New `name`-style columns chain `.trim().toLowerCase()` before the format check and use `=` (never `LIKE`) in lookups. See architecture.md → *Canonical Identifier Form*.
- **Property naming**: entity and management-API fields are camelCase. On the TypeORM entity pin the snake_case column with `@Column({ name })` and `@JoinColumn({ name })` on every relation; there is no naming strategy. OAuth2/OIDC protocol fields and JWT claims stay snake_case (architecture.md → *Naming split*).
- **Relation targets**: when copying a `@ManyToOne` + `@JoinColumn` block, re-check the target class against the join column. TypeORM derives the FK name from table + column only, so a wrong target looks right until a row is written (the bug behind `1766830857009` and `1784970000000`). Verify with `dataSource.driver.createSchemaBuilder().log()`: an FK drop/add pair means the two disagree.

## Workflow

- After changes, build the affected workspace (`npm run build -w <workspace>`) and lint changed files (`npx eslint --fix <files>`). Fix errors before calling a task done.
- Every workspace splits `build` into `build:types` + `build:js`. Packages and console services emit declarations; console bundles run `vue-tsc --noEmit` before bundling.
- **Vite console bundles declare no local `paths`.** They inherit the root map (`@authup/* → packages/*/src`), so the type check runs against source like the vite aliases. App-local `../../packages/...` entries resolve against the root `baseUrl`, never match, and silently fall back to built dist declarations. Corollary: each console's `resolve.alias` must list every `@authup/*` package it pulls in, transitive ones included, or the bundle uses dist while `vue-tsc` checks source.
- **`check:types` is the only thing that type-checks `test/**`.** `build:types` compiles `src` only and vitest's SWC strips types without checking, so a type error otherwise surfaces as a runtime assertion failure (#3517). Every workspace declares the script, so CI's `npm run check:types --workspaces --if-present` is a real gate; a new workspace needs its `tsconfig.test.json`.
  - Exception: the three client console bundles carry none; their `build:types` config already includes `test/**/*.ts`.
  - `packages/client-web-nuxt` runs `nuxt-module-build prepare && vue-tsc -p tsconfig.test.json`: its tsconfig extends the generated, gitignored `.nuxt/tsconfig.json` (absent on a warm nx cache), Nuxt aliases the kit to source (`.vue`), and it omits `"ignoreDeprecations": "6.0"` because it never reaches the root `baseUrl`. That config is stricter (`noUncheckedIndexedAccess`).
  - Root-level build files (`tsdown.config.ts`, `vite.config.ts`, `test/vitest.config.ts`) stay unchecked.
- The auth console emits both SSR halves from one `vite build` (`environments: { client, ssr }` plus `builder: {}`). The output paths are load-bearing (`dist/client/index.html`, `dist/client/.vite/ssr-manifest.json`, `dist/server/server.js`), so the SSR `entryFileNames` is pinned. Leave `builder.sharedPlugins` off: plugin instances hold `configResolved` state the two environments resolve differently.

## Testing

- **Service-level tests** use in-memory fakes. Generic fakes (`FakeEntityRepository`, `FakePermissionEvaluator`, `createAllowAllActor()`, ...) come from `@authup/server-test-kit`; domain fakes live at `test/unit/core/entities/<entity>/fake-repository.ts`. No HTTP, no Docker.
- **HTTP-level tests** boot the real server on a random port: `suite.client` (typed client), `suite.baseURL` (raw `fetch()`).
- **server-core's loopback client** is faked under `HTTPInjectionKey.InternalHttpClient` (transient lifetime, registered before `suite.setup()`): see testing.md → *The internal HTTP client seam (server-core)*. Production code never imports `@authup/core-http-kit/testing`.

## Database Migrations

Migrations live in `apps/server-core/src/adapters/database/migrations/{mysql,postgres}/`. sqlite never runs them (`migrations: []` for `better-sqlite3`; boot and tests `synchronize()`).

- **MySQL and PostgreSQL are supported; MariaDB is not.** There is no `mariadb/` directory and the config validator accepts only `mysql` / `postgres` / `better-sqlite3`. A MariaDB server behind `type: 'mysql'` diverges (it refuses to change an FK-referenced column, which aborts `1785871780234-AlignSchemaWithEntityMetadata`; its 11.4+ default collation reads as drift). Do not reshape a migration for it.
- **One named migration per feature; released migrations are immutable.** Descriptive class and file name (`1784289540000-CamelCaseAttributes.ts`), both dialects, doc-comment header. A migration may be amended only while on its own unmerged branch; before touching one, verify against release tags that it has not shipped.
- **Consolidation is optional and happens at release time**: a window's migrations may be squashed into one file per dialect, keeping the earliest timestamp, before the release PR merges. Anyone who ran the pre-squash files drops their dev DB. Move every reference to the old names with it (precedent: `1788782400000-WidenClientSecretAndGlobalUniqueness`).
- Verify with the migration round-trip (`migration run` → `revert` × N → `run`, testing.md → *Migration Tests*). A migration touching columns, constraints or rows also needs `npm run test:migration-latest`; the CI round-trip runs on an empty schema.
- **Never hand-write DDL. Generate it:**

  ```bash
  docker compose up -d mysql postgres            # the generator connects to both
  npm run build --workspace=apps/server-core     # it diffs the compiled entities
  npm run cli --workspace=apps/server-core -- migration generate
  ```

  It replays the chain into a local `migrations` database per dialect and writes both files under one timestamp. Rename `<timestamp>-Default.ts` and its class, add the header, leave the DDL untouched. Hand-authored statements are limited to data migrations (`UPDATE` / `INSERT` / backfills), guarded or idempotent wrappers, comments, and an expression index (below). If a change seems to need hand-written DDL, fix the entity and regenerate. Every schema defect so far came from hand-authored DDL; `test:schema-drift` in the `tests-migrations` job fails on any divergence (testing.md → *Schema-drift gate*).
- Planned for `v1.0.0` final: squash the beta chain into one baseline with a stepping-stone upgrade path.
- **Never hand-write a constraint name.** Index, unique and FK names are typeorm's table+column hash (`IDX_<hash>`, `FK_<hash>`); entities pin none (`@Index()`, `@Unique([...])`, `@JoinColumn({ name })`). A readable name reads as drift and gets renamed by the next generated migration. Primary keys are exempt (never compared); the existing readable `PK_auth_*` stay.
- **The one hand-named constraint is an expression index** (#3559, `1788782400000`): a unique index over `COALESCE(...)`, declared on the entity as `@Index('IDX_auth_permissions_global_name', { synchronize: false })` with DDL hand-written under that name. The name must be given: an unsynced name-less index matches nothing and the builder drops the live one, and on mysql the derived hash collides with the `@Unique`'s own index. sqlite never gets it.
- **uuid columns are `varchar(255)` on mysql, not `varchar(36)`.** A plain `@Column({ type: 'uuid' })` derives the generic varchar default. Do not "fix" it with `length: 36`: postgres rejects a length on `uuid` at `DataSource.initialize()`, and both dialects are generated off the same entities.
- **An index added on a MySQL FK column breaks the generated `down()`.** MySQL drops its implicit FK index once another index can serve the constraint, so the generated `DROP INDEX` fails ("needed in a foreign key constraint") and leaves a partial state (MySQL DDL is non-transactional). Wrap the generated mysql `down()` (never edit its statements): drop the affected FKs first, re-add them last. Pattern and affected-set query: `1786436332251-QueryIndexes.ts`. Postgres is unaffected.

## File Organization

- Exported types (interfaces, type aliases) live in a `types.ts` next to the implementation, never inline. Implementation files import from it.
- Barrel `index.ts` files re-export from `types.ts` and implementation modules.

## Workspace Naming (apps & packages)

Shared grammar with PrivateAIM/hub (apps `client-ui`, `server-core`; packages `client-vue`, `server-kit`, `core-kit`).

- **The prefix marks the side of the client-server relationship** the app sits on or a package is built for: `server-` for server applications (third-party resource servers embedding `server-adapter-*` included), `client-` for client applications. Unprefixed means both sides: `kit`, `errors`, `specs`, `access`, `i18n`, `core-*`. It does NOT mark where code executes (the SSR auth console runs client code server-side). A future API-driving CLI would be `client-admin-cli`.
- **`core-*` names the core service's domain surface** (domain types, HTTP and realtime clients), consumed on both sides.
- **Apps are role-named**: `server-core`, `client-{admin,account,auth}-console` (bundles), `server-{admin,account,auth}-console` (services). The `authup` CLI is the eponymous exception. The admin app carries the full `admin-console` role because the three consoles are peers. Console apps match their per-realm OAuth2 client rows; `client-auth-console` is the deliberate exception (it IS the IdP surface, so no client row exists).
- **A console's bundle and service share a role and differ only in prefix**, one to one. A second service for one bundle, or one service for two, needs discussion before naming.
- **Packages are surface- or platform-named**: `client-web-kit` / `client-web-nuxt` / `client-web-theme` serve any web RP; `server-kit` / `server-adapter-*` any server-side consumer.
- **The second slot differs by species, by design**: apps carry a role, packages a platform or surface. Do not pad app names with platform tokens (`client-web-account-console`); the shape difference keeps apps and libraries apart in the flat `@authup/*` scope. App and package names deliberately do not mirror each other.
- **Operator vocabulary is a separate, shorter layer**: binaries (`authup`, plus per-service `authup-<name>-console`), CLI roles (`start`, `start core`, `start worker`, `start console [admin|account|auth]`), config sections (`core`, `<name>Console`), the container command (the CLI's own argument list; the entrypoint's `server/core` selector is deprecated, accepted with a stderr notice through the 1.0.0-beta line, removed in v1.0.0) and helm keys. The grammar governs workspace and npm identity only.
- **An export does not repeat its package's name.** `@authup/server-account-console` exports `createApplication`, `createHandler`, `createServer`, `resolveConfig`, `readConfigFromEnv`, `CONFIG_SCHEMA`. Sibling packages sharing names is intended; the importing consumer (`apps/authup`) aliases. Applies to service package exports only: bundles keep module-internal qualified names (`resolveAccountConsoleConfig`), and `@authup/server-config` keeps `ACCOUNT_CONSOLE_BASE_PATH` etc. because it declares all three sections.
- Rejected (2026-08-03): a `web-` platform-prefix grammar (`web-kit`, `web-admin-console`). "web" already means Web-standard APIs in `server-adapter-web`, the kit's real constraint is Vue, and it would blur apps and libraries in the npm scope.

## Dependency Classification (published packages)

Sort each runtime dependency of a published package by one question: **would a second copy in the consumer's tree be a bug?**

- **`peerDependencies` (+ a devDependency mirror)**: singletons only, where a second instance breaks or the app owns and configures it. Framework runtimes (`vue`, `pinia`), a manager registered via `app.use()` (`@vuecs/core` and the `@vuecs/*` components bound to it, even when imported as type only), and `provide`/`inject` clusters keyed by a module-local `Symbol()` (`validup`/`@validup/vue`, `ilingo`/`@ilingo/vue`/`@ilingo/validup-vue`, `vue-router`). A nested copy silently splits the singleton. Peer range = caret on the dev pin.
- **`dependencies`**: runtime-required stateless leaves the package instantiates itself and never shares by identity (`smob`, `rapiq`, `@posva/event-emitter`, `@validup/zod`, `@ilingo/validup`, internal `@authup/*` building blocks; internal `@authup/*` are never peers). "Needed at runtime" does NOT imply peer. A phantom runtime need (`universal-cookie` via `@vueuse/integrations/useCookies`) is declared here.
- **`peerDependenciesMeta` `optional: true`**: a singleton needed only on an opt-in path that degrades gracefully (`@vuecs/locale`).
- **`devDependencies` only**: build/test tooling, plus packages referenced only in `test/` or internal code that never surfaces in the emitted `.d.ts`.
- **`import type` is NOT automatically `devDependencies`.** A type re-exposed in the public `.d.ts` (return/parameter/field type, re-export, or `declare module '<pkg>'` augmentation) must resolve for consumers: `dependencies` for a leaf, `peerDependencies` for a singleton or an augmentation (`validup` in `i18n`, optional). The monorepo build hides this (hoisting); verify with `rg '<pkg>' dist/**/*.d.ts`.
- **An exported config registry is a runtime value**: entries hold live zod types, so `zod` and `@authup/server-config-kit` are plain `dependencies` of each service package.
- **Declare every internal import; never copy the symbol over.** Workspaces symlink every `@authup/*` package, so an undeclared import resolves and tsdown inlines it, but nx builds its graph from `package.json`, so the missing edge lets a build run before its dependency, `rimraf ./dist` wipes output, and `authup dev` later fails with `Cannot find module '.../<pkg>/dist/index.mjs'` from an unrelated file. Audit by diffing imported vs declared `@authup/` specifiers per workspace. A copy leaves the edge missing and adds drift.
- **State a dependency rule as its reason, not a category.** `@authup/server-config-kit` depends on `@authup/kit` legitimately: the rule is "no server-core / server-kit tail (native bcrypt and jsonwebtoken, winston, redis, socket.io emitter, `@rapiq/core`)", not "no `@authup/*`". A category rule forbids harmless edges and the import gets made undeclared anyway.
- Do not use peers as a blanket dedup enforcer on leaves. Before deleting or demoting an entry, verify usage (`rg "from '<pkg>'" src`, `dist`, and whether a lower package peers it: `socket.io-client` is a peer of `@authup/core-realtime-kit`, so `@authup/client-web-kit` keeps declaring it).

## The root `package.json` carries NO `overrides`, and an exact pin there is what CAUSED the duplicate copies

- **Do not re-add an `overrides` block** (#3573). An exact override forces one node that arborist can never replace with a newer version, so when workspaces move past the pinned patch npm nests a fresh copy under each workspace instead. Without overrides a fresh resolution yields one copy of everything a pin would have covered.
- **Two packages nest for an unrelated reason.** `pinia@4` requires `@vue/devtools-api@^8` while `vitepress` (docs) needs `^7`. The correct shape is `@vue/devtools-api@8` at the root, `7.x` nested under `vitepress`, `pinia` and `vue-router` hoisted. `vue-router`'s optional `vite` peer, the root `vite@8`'s `esbuild` peer and the nested `esbuild@0.25` under `packages/client-web-nuxt` (via `@nuxt/module-builder`) produce ERESOLVE, which is why every install needs `npm install --force`.
- **When a bump leaves nested copies, splice; never `npm dedupe` or regenerate the lock** (dedupe adds copies and rewrites thousands of lines; regenerating re-resolves every transitive version). Procedure: delete every lock entry of the nested package AND its blocker (for `vue-router` / `pinia` that includes `@vue/devtools-api`), root and nested, children included (keys matching `(^|/)node_modules/<name>(/|$)`); then `npm install --package-lock-only --force`; then `npm install --force`.
- **Verify the lock, not the working tree**: `npm ls --all --package-lock-only 2>&1 | grep invalid` should report only `cac`, `commander`, `unplugin` and `universal-cookie` (pre-existing, inside nuxt's and vitepress's trees).
- **Trap**: under `--force` arborist accepts an invalid non-peer edge instead of re-placing it, silently. Restore a mistakenly spliced entry by hand from the previous lock, never by re-resolving.

## Response Versioning

- **A response never carries a contract version of its own shape.** API versioning is all-or-nothing for the whole surface, as a path prefix (`/v1/...`), never per endpoint.
- `GET /` and `GET /schemas` are not precedents: they report the deployment's release (read from server-core's `package.json` by `resolveVersion`) so a cached document can be attributed. That is deployment metadata, not a shape version.

## Interfaces & Types

- **Every interface is `I`-prefixed**: `IEntityAPI`, `IClient`, `IEntityRepository`, `IDomainEventHandler`.
- **`interface` is reserved for contracts a class `implements`.** Everything else (object shapes, options, payloads, structurally satisfied contracts) is a `type`.
- **Contract-first**: define the interface and have the class implement it. No types derived from classes (`typeof Client`, mapped-over-class tricks), except at a third-party boundary authup cannot make implement an interface.
- Interfaces state **precise payload types** (`create(data: RealmCreatePayload)`), never weakened supertypes like `Partial<T>`.

## Configuration Naming

- Boolean toggles use the `Enabled` suffix (`registrationEnabled`); env vars are `SCREAMING_SNAKE_CASE` with `_ENABLED` (`REGISTRATION_ENABLED`); `authup.yml` keys are camelCase matching the TypeScript property.
- Config keys in `apps/server-core/src/app/modules/config/types.ts` match the service option names.
- **Every key is declared once, in `@authup/server-config`**, in the section it belongs to. Services SELECT keys rather than declare them, so they cannot mis-spell a path, env var or reader. Rejected: per-package declarations plus an agreement check; it misses zod type and description drift and cannot see an omitted key.
- **The document's types are authup's own**, never borrowed from the consuming library. `db`, `redis`, `smtp` and the `middleware*` keys would otherwise drag typeorm, `@authup/server-kit` and `@routup/*` into a leaf a static file server imports. server-core casts at the boundary.
- **Every path key resolves against `rootPath` through its own `resolve`** (`resolveRootRelativePath`, `packages/server-config/src/helpers/path.ts`), so every service receives an absolute path and one document means one directory to all of them. A new path key does the same.
- **Logs are written, provisioning is read, so they never share a directory.** `logDirectoryPath` (`LOG_DIRECTORY_PATH`, default `logs`) is the only directory the process writes; `provisioningDirectoryPath` (`PROVISIONING_DIRECTORY_PATH`, default `provisioning`) is operator input the process must never rewrite. Same rule as the theme directory (topics/consoles.md → *Console Theming*): a process-writable directory must not hold what the process serves or reads as configuration. A missing provisioning directory is logged once at `info` with its resolved path and never refused (provisioning is optional; the Docker image sets `/etc/authup/provisioning` without creating it, so `warn` would hit `error.log` every boot).
- **`logDirectoryPath` does not hold the database.** The sqlite file comes from `db.database` / `DB_DATABASE`, resolved against the process cwd. The Docker image defaults the two keys to `/var/log/authup` and `/etc/authup/provisioning`; elsewhere they default under `rootPath` so an unprivileged `npx` start works.
- **With no database configured, the boot path falls back to sqlite outside production.** `DatabaseModule.buildDataSourceOptions` calls `DataSourceOptionsBuilder.buildWithEnvOrDefault` (`apps/server-core/src/adapters/database/data-source/options/module.ts`), which supplies `better-sqlite3` with `db.sqlite` only when no driver type is set. A connection named without a type (`DB_HOST`, `DB_DATABASE`, `DB_URL`, a `TYPEORM_*` alias) is refused, never answered with sqlite; `hasDatabaseConnectionEnv` reads those through typeorm-extension's `useEnv()` and excludes list-valued keys. Production refuses sqlite via `isDatabaseTypeSupportedForEnvironment`, whose message names the `DB_*` variables.
- **`buildWithEnv` stays strict; do not collapse it into the defaulting method.** The `migration` CLI and the `scripts/` CI runners call it, and a sqlite fallback there would report "No migrations are pending" and exit `0`.

## Upstream (Own) Libraries

Most non-framework dependencies are tada5hi's (`github.com/tada5hi/<name>`): `rapiq`, `vuecs`, `validup`, `ilingo`, `routup`, `hapic`, `ebec`, `typeorm-extension`, `smob`, `locter`.

- **When authup work reveals a gap, bug or awkward API in one of these, open an upstream issue** (`gh issue create --repo tada5hi/<name>`) with the authup use case. Do not silently build an authup-side workaround. Precedents: tada5hi/rapiq#790, #800, #806, #811; tada5hi/vuecs#1591, #1601, #1689.
- **rapiq is experimental**: breaking changes are expected and welcome; authup is its driving consumer.
- A deliberate authup-side fallback while an upstream issue is open is fine, but the issue must exist so the fallback has a removal trigger.
- When upstream code is consulted, update the matching file under `.agents/references/`.

## References

`.agents/references/` holds one file per external project this codebase cross-references, a cumulative code mapping. When looking up an external project's source or docs, record: the external file path / function (or doc anchor), the corresponding authup file / function, and behavioral differences pinned to a release version.

- [authentik.md](references/authentik.md): concept → authup mapping behind the parity roadmap, verified through Authentik 2026.5.
- [keycloak.md](references/keycloak.md): posture comparisons (key storage, hosted login/consent, RP-initiated logout).
- [privateaim-hub.md](references/privateaim-hub.md): source of the server-kit layout, domain-event publisher and telemetry `Event` shape.
- [routup.md](references/routup.md): dispatch walk, decorator flattening, `event.store`, `trustProxy`.
- [locter.md](references/locter.md): runtime-environment probes behind typeorm-extension's `CodeTransformation` gate, `locateUpSync` and `read`.
- [typeorm.md](references/typeorm.md): uuid widths per dialect, postgres `createFullType` quirk, `synchronizeDatabaseSchema`, `migration generate` / schema drift.

## Writing Style

Applies to code comments, `.agents/**`, commit messages, issue and PR text, and above all user-facing copy (the `@authup/i18n` catalogs).

- **Avoid the em dash.** Use a full stop, colon, semicolon or parentheses. Two short sentences beat one spliced sentence.
- Prefer plain ASCII punctuation. Non-ASCII is fine when it carries meaning (accented words in de / fr / es, arrows in tables).
- Keep i18n copy short and declarative: what the field does, and what an empty value means.

## Consolidating shallow modules

Gathering several one-purpose modules behind one object relocates logic rather than deepening it. Tried once and reverted (2026-07-04): the `apps/server-core/src/adapters/http/request/helpers/` files became one `RequestContext`, then went back.

- The goal was not reached: a lazily created blank context let every reader degrade to `undefined` exactly as before.
- Discoverability got worse: `grep getRequestRealmID` landing in a 30-line file beats a method on a 180-line class.
- Avoiding churn needed a facade, so both surfaces existed.

The value was the boundary tests (`apps/server-core/test/unit/adapters/http/request/`), which needed no restructure. Offer tests and restructure as separate work. Do not re-attempt this one without a concrete need for a single request-scoped state object, and then commit fully instead of keeping both surfaces.

## Best Practices

- Use ESM and modern TypeScript.
- Prefer Web APIs over Node.js-specific APIs where possible.
- Use hexagonal architecture where possible; study surrounding patterns and naming before adding code.
- Respect separation of concerns: domain logic → core-kit, API clients → core-http-kit, UI components → client-web-kit.
- Domain interfaces (core-kit) in ports; TypeORM entity classes only in adapters.
- No explanatory comments unless requested.
