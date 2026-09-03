# Conventions

## Tooling

| Tool             | Purpose                                           |
|------------------|---------------------------------------------------|
| NX               | Monorepo task runner (dependency-ordered builds)   |
| tsdown           | Package JS bundling (rolldown-based)               |
| Vite             | every console BUNDLE: the auth console's SSR build (`apps/client-auth-console/`) and the two SPA builds (`apps/client-account-console/`, `apps/client-admin-console/`). The console SERVICES that serve them are tsdown like every other server package |
| Nuxt             | `packages/client-web-nuxt` only (the integration downstream apps such as hub use). No authup app has been a Nuxt app since plan 081 |
| Vitest + SWC     | Test runner with fast compilation                  |
| ESLint           | Linting (`@tada5hi/eslint-config-vue-typescript`) |
| Husky            | Pre-commit hooks via lint-staged                   |
| commitlint       | Commit message convention enforcement              |

## Validation & Error Handling

- **Validation**: `validup` framework with `@validup/adapter-zod` for Zod schema integration
- **Errors**: `@authup/errors` provides `AuthupError` (extends `BaseError` from `@ebec/core`) plus dedicated subclasses (`ValidationError`, `EntityNotFoundError`, `EntityConflictError`, `EntityCredentialsInvalidError`, `EntityInactiveError`, `InternalError`, `BadRequestError`, `UnauthorizedError`, etc.) with `Symbol.for(...)`-keyed duck-type guards in sibling `check.ts` files (`isError`, `isAuthupError`, `isValidationError`, `isOAuth2Error`, `isJWTError`, etc.). HTTP-status concern is decoupled — `ERROR_CODE_TO_STATUS` / `httpStatusFromCode(code)` map semantic codes to HTTP statuses in the adapter. **`core/**` must NOT throw HTTP-status-named error classes (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, …) — those names belong to the HTTP layer.** Core throws transport-agnostic domain errors: the generic `ValidationError` (business-rule / bad-input violation, maps to 400), the semantic `Entity*Error` family, or a purpose-built domain error (e.g. `KeyCertificateError`); the HTTP error middleware maps their `code` to a status via `httpStatusFromCode`. `@ebec/http` classes stay in the HTTP middleware for foreign-error translation. Domain-specific identity workflow errors (e.g. `RegistrationDisabledError`, `PasswordRecoveryDisabledError`) live in their respective `core/identity/<workflow>/` folders and extend `ValidationError`.
- **A dead bearer is 401 on a resource route, `invalid_grant` (400) on the token endpoint.** The three `JWT_*` codes (`expired_token`, `inactive_token`, `invalid_token`) map to **401** in `ERROR_CODE_TO_STATUS`, per RFC 6750 §3.1. They were unlisted and therefore took the 400 fallback, so a dead bearer answered 400 while a MISSING one answered 401 (`identity_unauthorized`), and no client could tell "your credential died" from "your request was malformed" by status alone. The token endpoint is the exception RFC 6749 §5.2 carves out, and it is honoured at the call site rather than in the map: `HTTPOAuth2RefreshTokenGrant` catches a verification failure (`isJWTError`) and re-throws `OAuth2GrantError.invalid()`, so every unacceptable refresh token answers one shape (400 `invalid_grant`) instead of splitting by what was wrong with it. **A new token-endpoint path that verifies a JWT must do the same** — the global map cannot know which surface it is on. The account console reads the 401 (`usePageError`), and the kit's auth hook already keyed on both the status and the JWT codes, which is why this had gone unnoticed.
- **`POST /token/introspect` REPORTS, it does not raise.** RFC 7662 §2.2: a token that "is not active, does not exist on this server, or the protected resource is not allowed to introspect" MUST be answered with `active: false`. That covers a token authup cannot read at all (malformed, bad signature, a `kid` naming no key), which used to answer `401` (`404` for the last); reporting them uniformly also stops the endpoint telling a caller whether a string was signed by a key we hold. Those reports are BARE (`{active: false}` and nothing else), per the §2.2 / §4 SHOULD NOT. **The expired token is the deliberate exception**: the verify passes `ignoreExpiry`, so it still yields its payload and the subject's claims, and the answer is `200 {active: false, ...payload, ...claims}`: a relying party can say "your session ended, \<name\>" instead of only "no". That is a knowing departure from the same SHOULD NOT, taken only for a token this server did issue and can still read. **`permissions` is withheld from any inactive report**, expired included (RFC 7662 §2.2 / §4): naming the subject is the point of reading an expired token, handing over their authorization set is not. `active` is therefore derived BEFORE the permission read, so a dead token never pays to resolve one either. Two cases still raise and are NOT reports about a token: a verifying token with no `sub`, and a subject that no longer resolves (`identity_invalid`). **`active` is derived in the CONTROLLER, never from the verify**: `OAuth2TokenVerifier`'s signature-keyed cache returns a hit without re-checking `exp`, so under `ignoreExpiry` the verify alone would report an expired token as live. It is `jti` not blocklisted AND `exp` in the future, fail-closed on either claim missing. The verifier's own rule (never `saveWithSignature` on an `ignoreExpiry` path) is what keeps an expired payload out of that cache in the first place; do not relax it. Note the coupling with `@authup/client-web-kit`: the store's `revalidate()` relied on introspection *throwing* to reach its refresh fallback, so the store now checks `active` on the response (see architecture.md → *What the kit store persists*); the two must not be separated.
- **`POST /token/revoke` answers `200` for a token it cannot read**, which is the one place an RFC names invalid tokens outright: RFC 7009 §2.2, "invalid tokens do not cause an error response since the client cannot handle such an error in a reasonable way". Expiry was already bypassed via `ignoreExpiry`; the `if (isJWTError(e))` branch covers malformed and unverifiable, the `HTTPOAuth2RefreshTokenGrant` call-site shape. The status is `200` because §2.2 names it; it was `202` until then, which sat in the same 2xx class but was not the spec's answer. What the RFC actually asks for is that an invalid token be indistinguishable from a revoked one, so both paths must keep returning the SAME status — changing one without the other reintroduces the oracle. A missing `token` **parameter** is a malformed request and stays `400 invalid_request` here and on introspection alike.
- **`POST /token/introspect` (and its `GET` form, which delegates to the same handler) requires an INDEPENDENT credential; `POST /token/revoke` deliberately does not (#3489).** RFC 7662 §2.1 makes authorization a MUST ("To prevent token scanning attacks, the endpoint MUST also require some form of authorization"), and `TokenController.assertIntrospectionAuthorized` accepts exactly two forms: a request identity the global authorization middleware already resolved (a LIVE bearer, or Basic), or confidential client credentials read the way the grants read them (`extractClientCredentialsFromRequest` + `OAuth2ClientAuthenticator`, `secret`/`tls`; a resolved `authMethod: none` client is refused with `invalid_client`, as the client-credentials grant refuses it, because a bare public `client_id` identifies and proves nothing). Nothing at all answers `401 identity_unauthorized` with the bare `WWW-Authenticate: Bearer` challenge. The credential has to be independent of the token being introspected: possession of that string is exactly what a finder of it has, so the issue's "self-introspection exemption for an expired bearer" would have been anonymous introspection under another name (and could not exist anyway, since the middleware answers 401 to an expired bearer before any route runs). That is also why the gate is what makes the expired report above safe to give: it now reaches only a caller that proved who it is. **Authentication is layer one; WHOSE tokens the caller may introspect is layer two** (`TokenController.isIntrospectionAllowed`): the token's own subject, the client the token was issued for (`payload.client_id`), or an actor granted `TOKEN_INTROSPECT`, whose realm reach is matched against the token's `realm_id` (`admin` reaches everything at `any`; a default grant's `own` covers same-realm tokens). A caller failing all three is answered with the bare `{active: false}` RFC 7662 §2.2 prescribes for a resource "not allowed to introspect" (indistinguishable from a dead token, no oracle), plus a server-side log line, since the caller gets nothing to diagnose with. Consequence for integrators: a resource server verifying FOREIGN tokens through the server adapters' remote mode needs the `TOKEN_INTROSPECT` grant on its client (one client-permission row); a downstream RP introspecting tokens issued to its own client needs nothing. The gate's credential-authenticated client is promoted to the request identity (`setRequestIdentity`, the `clientAuthBasic` shape) so the permission layer sees its grants. Every caller in the repo already had one: the kit introspects its own LIVE access token as the bearer and throws on `active: false`, so it never read the expired report, and its expired call already 401'd into `refreshSession()`; the server adapters' remote mode introspects with the resource server's own client-credentials bearer, minted lazily by `ClientAuthenticationHook` on the first 401 and replayed under `authorizationHeaderInherit` (pinned in `introspect.spec.ts` in that exact shape); the test suite's `suite.client` carries admin Basic, but hapic STRIPS the client-level header on every token-API call, so a spec must pass `{ authorizationHeaderInherit: true }` (or an explicit `authorizationHeader`) on `client.token.introspect` or it goes out anonymous. Cohort (from memory, see the introspection rows in `.agents/references/{keycloak,authentik}.md`): Keycloak is client-auth only and refuses public clients outright, Authentik is `client_id` + secret only and answers a bare `active: false` otherwise; neither accepts a bearer, which authup does because RFC 7662 names it and the secret-less consoles have nothing else. **Revocation stays open as a deliberate authup choice, not an RFC 7009 requirement:** §2.1 asks the client to send its credentials (a bare `client_id` for a public client) and the server to verify the token was issued to that client; authup knowingly skips both, because a public `client_id` proves nothing (an ownership check built on it would be advisory), the consoles are public clients whose kit revokes anonymously during logout teardown (the header is unset before the six best-effort revokes go out, and a refresh token cannot be its own bearer), possession of a token makes revoking it the benign action, and the uniform `200` leaves a scanner nothing to learn. Do not add an anonymous read to introspection, and do not gate revocation without changing the kit's teardown order.
- **A `kid` that resolves to no usable verification key is a `JWTError`, not a `JWKError`.** `JWK_NOT_FOUND` maps to 404, which is right at `GET /jwks/:id` and wrong for a token whose header names an unknown, `enc`-use or disabled key: that made a dead bearer 404 on every resource route, escape the refresh grant's `isJWTError` catch as a 404 from `/token`, and drive the kit's http hook into its terminal branch instead of a refresh — so a key rotation ended every live browser session instead of renewing it. `OAuth2TokenVerifier` raises `JWTError.headerPropertyInvalid('kid')` for all three, which also stops echoing the supplied `kid` back. `JWKError.decryptionKeyMissing()` stays: a key row with no material is a server misconfiguration, not a property of the token.
- **A 401 from a protected resource carries `WWW-Authenticate`** (RFC 6750 §3), stamped by the error middleware: `Bearer error="invalid_token", error_description="..."` when the request presented a bearer, a bare `Bearer` when it presented nothing and the code is `identity_unauthorized`. The gate on the request's own `Authorization` header is what keeps the header off the token endpoint's `invalid_client` 401 (RFC 6749 §5.2), which is not a bearer failure. The description is a quoted-string and `message` can carry a third-party string, so `"` and `\` are stripped.
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
  declarations (`tsc`/`vue-tsc --emitDeclarationOnly`), the console BUNDLES
  run a pure type check (`vue-tsc --noEmit`) before bundling, and the console
  SERVICES emit declarations like any other server package. The Vite console
  bundles' tsconfigs deliberately
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
- **`check:types` (`tsc -p tsconfig.test.json`, `vue-tsc` in the Vue
  workspaces) is the only thing that type-checks `test/**`.** `build:types`
  compiles `src` alone, and vitest transpiles through SWC, which strips types
  without checking them. So a type error in a spec (or in `src`, exercised
  only by a spec) otherwise ships green and surfaces as a RUNTIME assertion
  failure, which reads as a different class of bug and gets diagnosed as one.
  That happened in #3517. Every workspace declares the script, so CI's
  `npm run check:types --workspaces --if-present` is a real gate rather than
  a hand-kept list; adding a workspace means adding its `tsconfig.test.json`
  too. The three client console BUNDLES are the exception and carry none:
  their `build:types` is already `vue-tsc --noEmit -p tsconfig.json` and that
  config's `include` lists `test/**/*.ts`, so their tests are gated by the
  build job instead, and a second script there would run vue-tsc twice for no
  coverage. `packages/client-web-nuxt` is the one config that deviates, in
  three ways: its script is prefixed with `nuxt-module-build prepare` because
  its tsconfig extends the generated, gitignored `.nuxt/tsconfig.json` (on a
  warm nx cache the lint job's build step is skipped and `.nuxt` never
  exists); it runs `vue-tsc` because Nuxt's generated config aliases
  `@authup/client-web-kit` to source, which imports `.vue`; and it omits
  `"ignoreDeprecations": "6.0"`, because that chain never reaches the repo
  root, whose deprecated `baseUrl` is the whole reason the other configs
  carry it. That generated config is also STRICTER than the root (it sets
  `noUncheckedIndexedAccess`), which is why two genuine `src` errors surfaced
  there and nowhere else. The gate stops at the include globs
  (`src/**/*.ts` + `test/**/*.ts`), so root-level build files
  (`tsdown.config.ts`, `vite.config.ts`, `test/vitest.config.ts`) stay
  unchecked.
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
  `client-admin-console` / `client-account-console` / `client-auth-console`
  (the three console BUNDLES), `server-admin-console` /
  `server-account-console` / `server-auth-console` (the three console
  SERVICES that serve them, plan 101 D2), and the planned
  `server-core-worker` (optional background processor). The `authup`
  operator CLI is the eponymous exception. The admin app carries the full
  `admin-console` role (not bare `console`) because the UI surfaces are
  peers: admin console, account console and auth console.
  Console apps normally match their per-realm OAuth2 client rows
  (`admin-console`, `account-console`); **`client-auth-console` is the
  deliberate exception**. The auth pages ARE the IdP surface (they issue
  tokens rather than obtain them), so no client row exists for them. The
  name keeps the console-family symmetry anyway (settled 2026-08-02 with
  the maintainer, plan 083).
- **A console's bundle and its service share a role and differ only in the
  prefix**, which is the grammar working as intended rather than a
  collision: the bundle is built FOR a browser (`client-`) and the service
  runs on a server (`server-`), and the pair is exactly the client-server
  split the prefix marks. Keep them in step, one to one. A second service
  serving one bundle, or one service serving two, is the shape to argue
  about before it is named. Note the prefix still does not mark where code
  EXECUTES: `client-auth-console`'s code runs server-side, inside
  `server-auth-console`'s render.
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
- **Operator-facing vocabulary is a separate, shorter layer**: the binaries
  (`authup`, the one an ordinary deployment runs, plus a per-service
  `authup-<name>-console` escape hatch), the CLI ROLES (one listener verb,
  `start`, whose positional is the role: `start core`, `start worker`,
  `start console [admin|account|auth]`), the configuration sections
  (`core`, `<name>Console`), the container command (the CLI's own argument
  list; the docker entrypoint's former `server/core` selector never mirrored
  a configuration section and is deprecated, accepted with a notice on
  stderr through the 1.0.0-beta line and removed in v1.0.0), and helm
  values keys. The grammar above governs
  workspace directory and npm package identity only, which is why a role is
  the bare console name (`authup start console admin`) while the workspace
  behind it is `server-admin-console`.

- **An export does not repeat its package's name.** The package IS the
  namespace, so `@authup/server-account-console` exports `createApplication`,
  `createHandler`, `createServer`, `resolveConfig`, `readConfigFromEnv` and
  `CONFIG_SCHEMA`, not `createAccountConsoleApplication` and its siblings.
  Identical names across sibling packages are the intended outcome, not a
  collision (`server-adapter-node` and `server-adapter-socket-io` have both
  exported `createMiddleware` since long before the consoles existed): the two
  only ever meet in a consumer that imports several, and there an alias at the
  import site says which is which. `apps/authup` is that consumer for the three
  consoles. This applies to the SERVICE packages only. The client BUNDLES keep
  a qualified `resolveAccountConsoleConfig`, because that is a module-internal
  function rather than a package export, and `@authup/server-config` keeps its
  `ACCOUNT_CONSOLE_BASE_PATH` constants, because it declares all three sections
  and the console name is what tells them apart.

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

**An exported config registry is an ordinary value, and it drags `zod` with it.** Each service package exports its config registry for the CLI to compose, and every entry holds a live zod type, so `zod` and `@authup/server-config-kit` are plain `dependencies` there rather than devDependencies or peers: the CLI evaluates the object at runtime and never owns an instance of anything in it. This is also the reason a shared key is declared in each registry instead of imported from one: the import would be the dependency, and the whole point of the boundary is that neither side takes on the other's tree (see architecture.md → *Four registries, one document*).

Do **not** use `peerDependencies` as a blanket "dedup enforcer" on leaves — dedup is free and applies to `dependencies` too; peer's only unique power (forbid a private nested copy, fail loud on conflict) matters solely for singletons. Before deleting or demoting an entry, verify actual usage (`rg "from '<pkg>'" src`, check `dist`, and check whether a *lower* package peers it — e.g. `socket.io-client` is a peer of `@authup/core-realtime-kit` and is statically imported by its `ClientManager`, so `@authup/client-web-kit` must keep declaring it even though its own `src` never imports it).

## Root `vue` / `vue-router` overrides track every bump of theirs

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
It has recurred four times (the July 2026 `@vuecs` bump, #3317, #3461, #3516). Fix:
set `overrides.vue` to the new patch, `npm install --force`, then verify
`node_modules/vue/node_modules/@vue` is gone and
`node_modules/@vue/server-renderer` is hoisted. A dependabot PR whose table
lists `vue` needs this before merge; its own CI already shows the failure.

`vue-router` carries an override for the same reason and needs the same care
on a bump of its own. The duplication arrives from the other direction: the six
workspaces declare the new range while `nuxt` (`^5.2.0`) and
`@vuecs/navigation` (`^4.x || ^5.x`) are satisfied by the old patch, so npm
hoists the OLD one to the root and nests a copy of the new one under every
workspace that asked for it. Two nominal type identities again, and the symptom
is a `check:types` failure in `packages/client-web-nuxt` alone
(`src/runtime/middleware/00.root.ts`, `TS2345`, one `vue-router/dist/index-*`
path "not assignable" to another) — the router is a `provide`/`inject`
singleton, so a second copy is a runtime hazard and not only a typing one.

**Adding the override is not enough by itself**: npm will not re-resolve a
lockfile entry that already satisfies its dependents, so `npm install --force`
leaves the old resolution in place and the tree unchanged. Delete that
package's entries from `package-lock.json` (the hoisted one and every nested
one), then `npm install --package-lock-only --force` followed by
`npm install --force`. Do NOT reach for `rm -rf node_modules package-lock.json`:
a full regeneration does produce a correct single-copy tree, but it rewrote
~22k lock lines and re-resolved unrelated transitive versions, which is not
reviewable inside a dependency PR. The targeted splice leaves a lock diff that
only removes the duplicated subtrees.

**Both overrides must stay EXACT versions, and a caret is not an improvement** —
which is worth stating because relaxing the pin is the obvious way to stop
having to realign it. It was measured: with `^3.5.42` / `^5.3.0` npm re-created
the five nested `vue-router` copies the exact pin had just collapsed. An exact
pin rewrites every spec to one identical string, which npm dedupes to a single
node; a range leaves the specs as ranges and npm is free to satisfy them
per-consumer. The manual realignment on each bump is the price of the single
copy, not an oversight.

## Interfaces & Types

- **Every interface is prefixed with `I`**: `IEntityAPI`, `IClient`, `IRealmAPI`, `IEntityRepository`, `IDomainEventHandler`.
- **`interface` is reserved for contracts a class `implements`.** Anything not class-implemented (object shapes, options bags, payloads, structural contracts satisfied only implicitly — e.g. a third-party class matching a transport surface) is a `type` alias.
- **Contract-first, never implementation-inferred**: define the interface explicitly and have the class `implements` it. Do not derive public types from classes (no `typeof Client` / mapped-over-class "public interface" tricks) — the only sanctioned exception is at a third-party boundary where authup cannot make the dependency's class implement an authup interface.
- Interfaces must state **precise payload types** (e.g. `create(data: RealmCreatePayload)`), not weakened supertypes like `Partial<T>` that implementations silently narrow.

## Configuration Naming

- Boolean feature toggles use the `Enabled` suffix: `registrationEnabled`, `passwordRecoveryEnabled`, `emailVerificationEnabled`
- Config keys in `app/modules/config/types.ts` match the service option names
- Environment variable names use `SCREAMING_SNAKE_CASE` with `_ENABLED` suffix: `REGISTRATION_ENABLED`, `PASSWORD_RECOVERY_ENABLED`, `EMAIL_VERIFICATION_ENABLED`
- Config file keys (`authup.yml`) use `camelCase` matching the TypeScript property name
- **Every configuration key is declared once, in `@authup/server-config`**,
  in the document section it belongs to; a service SELECTS the sections and
  keys it reads rather than declaring them. A service that names key names
  cannot mis-spell a path, an environment variable or a reader. The
  predecessor had each package declare what it read: `composeSchemas`
  asserted that overlapping declarations agreed on path, environment
  variable, default and reader, but not on the zod type or the description,
  and could not see a key a registry never declared at all.
- **The configuration document's types are authup's own**, never borrowed
  from the library that eventually consumes the value. `db`, `redis`, `smtp`
  and the seven `middleware*` keys would otherwise drag typeorm,
  `@authup/server-kit` and six `@routup/*` packages into a leaf that a
  static file server imports. Their zod types are loose either way, so the
  published JSON Schema is unchanged; server-core casts at the boundary
  where it hands the value to the library.
- **Every path key is resolved against `rootPath` after the `...parsed` spread**
  in `normalizeConfig`, so consumers receive an absolute path and none of them
  has to know what the process cwd was. server-core's own are
  `logDirectoryPath` and `provisioningDirectoryPath`; the console-side path keys
  (`theme.directoryPath`, `<name>Console.path`) live in the console
  registries now and are resolved for them by the CLI (`resolvePaths` in
  `apps/authup/src/console/config.ts`), against server-core's `rootPath`, so one
  document means the same directory to every service it configures. A new
  server-core path key joins that block; computing it *before* the spread
  reads a default `rootPath` rather than the configured one (the
  `writableDirectoryPath` bug, fixed after v1.0.0-beta.62 on the key these two
  replaced; it silently ignored `rootPath` and stayed relative).
- **Logs are written, provisioning is read, so they never share a directory.**
  `logDirectoryPath` (`LOG_DIRECTORY_PATH`, default `logs`) is the ONE
  directory the process writes to; `provisioningDirectoryPath`
  (`PROVISIONING_DIRECTORY_PATH`, default `provisioning`) is operator-authored
  input a running process must never be able to rewrite, and it names the
  directory itself rather than a `provisioning` subdirectory of it. Same rule
  the theme directory already follows (architecture.md → *Console Theming*):
  a process-writable directory must not hold what the process serves or reads
  as configuration. The predecessor key `writableDirectoryPath` conflated the
  two.
- **`logDirectoryPath` does not hold the database.** It holds the production
  log files; that is the whole of it. The sqlite file comes from
  `db.database` / `DB_DATABASE`, which typeorm-extension resolves against the
  process cwd (`resolveSQLiteDatabasePath`), so pointing `LOG_DIRECTORY_PATH`
  at a volume does NOT move the database onto it. The Docker image defaults
  the two keys to `/var/log/authup` and `/etc/authup/provisioning`; everything
  else defaults to `<rootPath>/logs` and `<rootPath>/provisioning`, which is
  what keeps an unprivileged `npx` start working (any absolute system path
  needs root or a pre-chowned directory).
- **With no database configured at all, the boot path falls back to sqlite,
  outside production.** `db` carries no default and
  `readDataSourceOptionsFromEnv()` returns nothing unless the driver type is
  set (typeorm-extension's `hasEnvDataSourceOptions()` is `!!useEnv('type')`,
  which reads `DB_TYPE` or `TYPEORM_CONNECTION`, else the scheme of `DB_URL` or
  `TYPEORM_URL`), so `DatabaseModule.buildDataSourceOptions` calls
  `DataSourceOptionsBuilder.buildWithEnvOrDefault`, which supplies
  `better-sqlite3` plus the same `db.sqlite` name typeorm-extension derives for
  that driver, resolved against the process cwd like any other sqlite path.
  The gate is the TYPE alone: a WRONG value still fails, and a lone
  `DB_DATABASE` or `DB_HOST` is ignored along with everything else, so the
  fallback answers "nothing configured" and never rescues a half-written
  configuration. Outside production that is silent, which is the one place the
  fallback is weaker than the throw it replaced; in production the refusal
  below names the variables, so a half-written configuration still fails loud
  where it matters.
  Production is the exception, because `isDatabaseTypeSupportedForEnvironment`
  refuses `better-sqlite3` there. That is why the Docker image
  (`NODE_ENV=production`) still requires postgres or mysql, and why that
  refusal carries the actionable message naming the `DB_*` variables: with the
  fallback in place it is the only error an operator with no database
  configuration ever sees. **`buildWithEnv` stays strict and the two methods
  must not be collapsed into one.** It is what the `migration` CLI command and
  the two `scripts/` CI runners call, none of which applies the environment
  check, so an unconfigured `migration run` would create a sqlite file, read
  sqlite's empty migrations array, report "No migrations are pending" and exit
  `0`. That is the same silent success the round-trip's `dist` pre-flight
  exists to catch (testing.md → *Migration Tests*). The fallback exists because
  it was already documented while nothing implemented it (the `db` entry's own
  description, published as the JSON Schema, its `types.ts` doc comment, and
  the database guide's opening line), so no surface booted unconfigured,
  `npx authup start` included.

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
- [locter.md](references/locter.md) — locter: the runtime-environment probes behind typeorm-extension's `CodeTransformation` gate (the ts-node loader-thread gap, tsx ruled out), `locateUpSync` and `read` call sites.
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

## Consolidating shallow modules

A refactor that gathers several one-purpose modules behind one object relocates
logic rather than deepening it. It was tried here once and reverted (plan 029,
2026-07-04): `apps/server-core/src/adapters/http/request/helpers/`, eleven files
answering "what do we know about this request", became a single `RequestContext`
under one `event.store` symbol, and then went back.

Three things went wrong, and all three generalize:

- **The headline goal was not reached.** "Build order enforced by construction"
  failed because the getter lazily created a blank context, so every reader
  still degraded to `undefined` / `[]` exactly as the free functions did. The
  coupling was centralized, not enforced.
- **The diagnosis was weak.** `grep getRequestRealmID` landing in a 30-line file
  is more discoverable than a method on a 180-line class.
- **It grew the call surface.** Avoiding churn across ~115 call sites required a
  facade, so `ctx.realmId` and `getRequestRealmID` both ended up existing.

The value in the attempt was the boundary tests written to make the move safe
(`test/unit/adapters/http/request/`), and those needed no restructure at all.
So when a consolidation is proposed, offer the tests and the restructure as
separate pieces of work. Do not re-attempt this one without a concrete need for
a single request-scoped state object, and then commit fully instead of keeping
both surfaces.

## Best Practices

- Use **ESM** and modern TypeScript/JavaScript.
- Prefer **Web APIs** over Node.js-specific APIs where possible.
- Use hexagonal architecture if possible.
- Maintain consistency with existing naming and architectural conventions.
- Before adding new code, always study surrounding patterns, naming conventions, and architectural decisions.
- Respect separation of concerns: domain logic → core-kit, API clients → core-http-kit, UI components → client-web-kit.
- No explanatory comments unless explicitly requested. Agents should rely on existing patterns and structure.
- Use domain interfaces (from core-kit) in ports, TypeORM entity classes only in adapters.
