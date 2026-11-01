# Testing

## Setup

- **Runner**: Vitest with SWC compiler for fast transpilation. SWC strips types without checking them (see `check:types` below).
- **Test location**: `test/unit/**/*.spec.ts` within each package/app
- **Config**: `test/vitest.config.ts` per package/app. Vitest does NOT auto-discover a config under `test/`, so every `test` script passes `--config test/vitest.config.ts`. A plain `npx vitest run` from the workspace directory finds no config and skips the global setup (`test/setup.ts`, which provisions the master realm and starts Docker containers).
- **Prerequisite**: `npm run build` before running tests
- **Reflect polyfill (server-core)**: `test/vitest.config.ts` sets `setupFiles: ['reflect-metadata']`. `@peculiar/x509` pulls in `tsyringe`, which throws at import time without a Reflect polyfill, and the `globalSetup` file runs in an isolated context, so its own import does not reach test files. Any spec importing `src/core` loads x509 transitively. Do not remove it.
- **Per-worker sqlite isolation (server-core, #3405)**: the global setup provisions a template database at `writable/test.sql`. `createTestDatabaseModuleForSuite` (`test/app/database.ts`) gives every vitest worker its own copy (`writable/test-<poolId>.sql`, keyed by `VITEST_POOL_ID`), created on first use and swept by the next global setup. Files that reuse a pool slot share its copy sequentially, so **a spec must never rely on state written by another spec file**.
- **MySQL/Postgres runs** share one server database, so `test/vitest.config.ts` turns `fileParallelism` off and raises `testTimeout` to 30s for them (expect several times the sqlite wall-clock). The sqlite run keeps vitest's 5s default, so it stays an honest signal about a slow test. `hookTimeout` is not raised: a hook that outgrows the default takes an explicit per-spec timeout (see below).
- **A second application in one spec (server-core)**: a spec booting two instances (`test/unit/http/controllers/entities/identity-provider/federation-e2e.spec.ts`) gives the second one `createTestDatabaseModuleForSecondaryInstance('<name>')` plus its own `withProvisioning(...)`. The factory follows the run's dialect: `writable/test-<name>-<poolId>.sql` on sqlite, a `<database>_<name>_<poolId>` database otherwise. Its database starts empty, which is why the caller provisions it. Do not pin the second instance to sqlite and seed it from `writable/test.sql`: that template exists only on sqlite runs, so the spec dies with `ENOENT` under `test:mysql` / `test:psql`. **Both hooks take an explicit timeout** (`TWO_INSTANCE_HOOK_TIMEOUT`, 60s): each `setup()` synchronizes a schema and runs a full provisioning pass, which exceeds vitest's 10s hook default on mysql. The symptom of a missing one is `Hook timed out in 10000ms` with every test in the file reported as passing.

## Running Tests

```bash
npm run build                                  # required before testing
npm run test                                   # test all apps/packages
npm run test --workspace=apps/server-core      # test a single app/package
npm run test --workspace=apps/server-core -- test/unit/core/entities/role/service.spec.ts  # one file
npm run check:types --workspace=apps/server-core  # type-check src + test (vitest's SWC does not)
```

Every workspace declares `check:types` (CI runs `npm run check:types --workspaces --if-present`). It is the only gate that type-checks `test/**`; a type error otherwise surfaces as a runtime assertion failure. See conventions.md -> *Workflow* for the per-workspace exceptions.

### Database-Specific Tests (server-core)

```bash
npm run test:mysql --workspace=apps/server-core
npm run test:psql --workspace=apps/server-core
```

Some behaviour exists only on a server database, and a green sqlite run says nothing about it. These specs are `describe.skipIf`-gated to mysql/postgres:

- `test/unit/http/controllers/entities/user-concurrency.spec.ts`: the row lock `UserService.save` / `ClientService.save` take through the repository `transaction(fn)` seam (#3526) is `FOR UPDATE` on mysql/postgres and an unlocked passthrough on sqlite, where the lost update reproduces by design. It also carries a pool-exhaustion pin (twelve concurrent updates on different users and twelve concurrent creates must resolve within the default timeout; a regression is a hang). It boots with the entity audit mirror on, so it also guards the #3539 audit-write pool deadlock. Every dialect runs the seam itself on the fakes (`transactionCalls === 1` after an update, `0` after a create).
- `test/unit/modules/provisioning-concurrency.spec.ts`: two `ProvisionerModule` instances boot concurrently against one empty secondary database and must leave one master realm, one `system` client, one `admin` user and one row per global permission/role/scope/policy. The provisioning lock is a passthrough on better-sqlite3. One DataSource models two replicas because each `setup()` takes its own query runner. Confirm the spec is honest by making `withDatabaseLock` an unconditional passthrough: it must fail with a duplicate key on `auth_realms(name)`.
- `test/unit/adapters/database/global-uniqueness.spec.ts`: runs `1788782400000-WidenClientSecretAndGlobalUniqueness`'s own `up()` / `down()` on an empty synchronized secondary database and asserts the unsynced index (name matches the entity, zero drift, a second global row refused, the pre-check naming duplicate tables). It has this shape because the suite synchronizes from entities, so an index declared `synchronize: false` never exists in any other spec.

## Test Layers (server-core)

### Service-Level Tests

Location: `test/unit/core/entities/{entity}/service.spec.ts`

Test business logic in isolation with in-memory fakes and a mock permission evaluator. No HTTP, database or Docker; no global setup needed.

Generic fakes from `@authup/server-test-kit`:
- `FakeEntityRepository<T>`: in-memory `IEntityRepository` backed by an array
- `FakePermissionEvaluator`: records calls (`evaluateCalls`, `preEvaluateCalls`, ...) and is configurable (`setBehavior(fn)`, `denyAll()`, `deny(method)`). `compile` defaults to `post` so per-row expectations hold; override with `setCompileResult`.
- `createAllowAllActor()` / `createDenyAllActor()`: `FakeActorContext` for permission testing
- `createMasterRealmActor(realmId?)` / `createNonMasterRealmActor(realmId?)`: presets with identity for realm defaulting tests

Domain fakes sit next to their entity at `test/unit/core/entities/<entity>/fake-repository.ts` (`FakeRoleRepository`, `FakeRealmRepository` which pre-seeds the master realm and offers `resolve()`, `FakePolicyRepository`, `FakePermissionRepository`, `FakeUserRepository`, `FakeClientRepository`).

Workflow / orchestration fakes are in `test/unit/core/helpers/` (barrel `index.ts`): `FakeMailClient`, `FakeIdentityPermissionProvider`, `FakeIdentityResolver`, `FakeIdentityRoleProvider`, `FakeKeyStore`, `FakeOAuth2TokenIssuer`, `FakeOAuth2OpenIDTokenIssuer`, `FakeOAuth2TokenRepository`, `FakeOAuth2TokenSigner`, `FakeOAuth2TokenVerifier`, `FakeOAuth2DeviceCodeRepository`, `FakeSessionManager`, `FakeSessionTokenRepository` (call recording for refresh-rotation tests), `FakeEventService`, `FakeAuthFlowMetrics`, `FakeAuthorizationCatalogRepository`, `createFakeRealmCipher`, `readEvaluatedRecordRealms`. The barrel does not re-export `@authup/server-test-kit`; import that package directly.

What to test: permission gates, validation, realm defaulting, uniqueness, built-in entity protection, upsert behavior, error paths.

**Writing philosophy:** assert the *expected* behavior from the service contract and the architecture docs, not what the implementation happens to do. A failing test may expose a real bug. When a failure looks like a legitimate implementation issue, flag it to the user before "fixing" the test. Tests are a verification tool, not a rubber stamp.

Integration specs outside `test/unit/core/entities/` (e.g. `test/unit/core/identity/provider/account.spec.ts`) need the provisioned database from the global setup, so run them through the npm script.

### HTTP-Level Tests

Location: `test/unit/http/controllers/entities/{entity}.spec.ts`

Integration tests that boot the full application (database, HTTP server) on a random port via `createTestApplication()` (`test/app/factory.ts`). They cover HTTP client compatibility (`core-http-kit`), request/response shaping, the middleware pipeline and end-to-end wiring. They need the Docker services.

`test/app/http.ts` exposes:
- `suite.client`: a typed `@authup/core-http-kit` `Client` against the test server with admin Basic auth. hapic strips the client-level header on token-API calls, so pass `{ authorizationHeaderInherit: true }` (or an explicit `authorizationHeader`) on e.g. `client.token.introspect`, or it goes out anonymous.
- `suite.baseURL`: the `http://localhost:<port>` URL, for raw `fetch()` calls.

`createTestApplication({ config: (c) => { c.publicUrl = '...'; } })` overrides config. The port is bound AFTER config normalization, so `publicUrl` is not `suite.baseURL`: a spec exercising a same-origin check reads `suite.container.resolve(ConfigInjectionKey).publicUrl`.

### HTTP test helpers

`test/utils/` (barrel `index.ts`) exports helpers for HTTP integration tests.

**`expectClientError(fn, { status?, code?, data? })`**: asserts an async call rejects with a hapic `ClientError` of that shape. `code` is shorthand for `data.code`; `data` matches arbitrary `response.data` fields.

```typescript
import { expectClientError } from '../../../utils';

await expectClientError(
    () => suite.client.token.createWithClientCredentials({ client_id, client_secret: 'foo' }),
    { status: 400, code: ErrorCode.ENTITY_CREDENTIALS_INVALID },
);

// OAuth2 error with both code and error fields
await expectClientError(
    () => suite.client.token.createWithAuthorizationCode({...}),
    {
        status: 400,
        code: ErrorCode.OAUTH_CLIENT_INVALID,
        data: { error: OAuth2ErrorCode.INVALID_CLIENT },
    },
);
```

**`httpRequest(suite, method, path, { form?, body?, headers? })`**: raw `fetch()` against the test server, for raw HTML bodies, redirect payloads, or RFC edge cases the typed client cannot express. Returns the native `Response`. `form` is shorthand for an urlencoded body plus Content-Type.

```typescript
import { httpRequest } from '../../../utils';

const response = await httpRequest(suite, 'POST', '/token', {
    headers: { Authorization: `Basic ${basic}` },
    form: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://example.com/redirect',
    },
});
expect(response.status).toEqual(200);
const body = await response.json();
```

### Non-admin identity tests

To test policies/permissions under a non-admin identity (e.g. `*_SELF_MANAGE`), grant the permission to a fresh identity and authenticate with its own bearer:

```typescript
const created = await suite.client.client.create({
    ...createFakeClient(),
    secret: knownSecret,
    secretHashed: false,
    secretEncrypted: false,
});
const permission = await suite.client.permission.getOne(PermissionName.CLIENT_SELF_MANAGE);
await suite.client.clientPermission.create({
    clientId: created.id,
    permissionId: permission.id,
});
const token = await suite.client.token.createWithClientCredentials({
    client_id: created.id,
    client_secret: knownSecret,
});

const selfClient = new HTTPClient({ baseURL: suite.baseURL });
selfClient.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
```

Working example: `test/unit/http/controllers/entities/client-self-manage.spec.ts`.

A bearer WITHOUT the `global` scope cannot come from the token endpoint (the password grant, Basic and the console cookie all carry `global`). `createScopeRestrictedClient(suite, scope?)` (`test/utils/token.ts`) re-signs the admin's claims with `scope` (default `openid`) through `OAuth2InjectionToken.TokenSigner` and returns a client bearing it plus the introspected `payload`.

### Testing the hosted pages (they render in another workspace now)

server-core renders no page: a hosted page GET is a redirect, and that is all its specs assert. The render belongs to `apps/server-auth-console`, whose `test/unit/handler.spec.ts` boots the real handler on an ephemeral port against the BUILT `@authup/client-auth-console` bundle. `/logout` is the smoke test that needs no backend (the page drives its end-session call from the browser).

The service holds no credential, no loopback and no database, so there is no DI seam to fake. It reads `GET /authorize/info` and `GET /` from whatever `apiUrl` names; a spec stubs those by pointing `apiUrl` at a server it controls. A substituted package is stubbed through config: `handler.spec.ts`'s `writeBundle` writes a fake package under a tmp dir (`package.json` with `"type": "module"` plus the needed `dist/` files, since the service `import()`s `dist/server/server.js`) and passes it as `resolveConfig({ path })`. That is how the suite pins the `CONTRACT_VERSION` refusal, the half-built bundle error, and handler isolation.

Caveats:
- The service renders the built bundle, so rebuild `apps/client-auth-console` after changing it or `client-web-kit`, or the specs exercise a stale bundle. The two static console services need their dists built the same way.
- Icon bundling is asserted in `apps/client-auth-console/test/unit/icons.spec.ts` against that app's built client entry, not through a rendered page (`@iconify/vue` resolves icons client-side, so SSR markup carries empty `<svg>` shells).

### The internal HTTP client seam (server-core)

server-core keeps one client for calls to its own API under `HTTPInjectionKey.InternalHttpClient` (built by `createInternalHttpClient`, handed to routes per request under `INTERNAL_HTTP_CLIENT_FACTORY_STORE_KEY`). Its one consumer is the console login's token exchange. `HTTPModule.setup` registers the production default unless the token is already bound, so a fake registered before `suite.setup()` wins:

```typescript
import { createFakeClient as createFakeHTTPClient } from '@authup/core-http-kit/testing';
import { HTTPInjectionKey } from '../../src/app';

const suite = createTestApplication();
suite.container.register(HTTPInjectionKey.InternalHttpClient, {
    useFactory: () => createFakeHTTPClient({ handlers: { /* ... */ } }),
}, { lifetime: 'transient' });
await suite.setup();
```

Register with `useFactory` + `lifetime: 'transient'`, never a singleton instance: a client carries per-user Authorization state. Register before `suite.setup()`, since the middleware mount is decided at boot. Alias the import, because `test/utils` already exports a `createFakeClient` entity factory. `test/unit/adapters/http/internal-client.spec.ts` covers the rewriter as a pure unit. The same test-fake-wins rule holds for `MailInjectionKey` and `LoggerInjectionKey`.

### Capturing what the server logs

`LoggerModule.setup` honors a pre-registered `LoggerInjectionKey`, so a spec asserting on log output registers a recorder before `suite.setup()`:

```typescript
const logLines: string[] = [];
const logger = createNoopLogger();
logger.error = ((message: unknown) => {
    logLines.push(String(message));
    return logger;
}) as Logger['error'];
suite.container.register(LoggerInjectionKey, { useValue: logger });

await suite.setup();
```

Use it where the log is the only observable surface (a `catch` that swallows a failure into a redirect). Example: `test/unit/http/controllers/entities/identity-provider/link.spec.ts`.

### Cookies a browser would actually send

Echoing `set-cookie` back proves the server sent a cookie, not that a browser would send it back. `TestCookieJar` (`test/utils/cookie-jar.ts`) stores `set-cookie` from a response (honouring `Path`, `Max-Age=0` and a past `Expires`) and yields a `cookie` header per request path with RFC 6265 §5.1.4 path matching. Use it for any flow whose contract is a cookie:

```typescript
function request(method: string, path: string, options: Record<string, any> = {}) {
    const cookie = jar.header(`/${path.replace(/^\//, '')}`);

    return httpRequest(suite, method, path, {
        ...options,
        headers: { ...(options.headers ?? {}), ...(cookie ? { cookie } : {}) },
    }).then((response) => {
        jar.store(response);
        return response;
    });
}
```

A same-origin POST (e.g. the federated login completion, which rides `isSameOriginRequest`) needs `sec-fetch-site: same-origin` and an `Origin` equal to publicUrl's. Example: `test/unit/http/controllers/entities/identity-provider/login-cookie-flow.spec.ts`.

### The OpenAPI parity gate

`test/unit/http/openapi-parity.spec.ts` checks that the generated OpenAPI document, the rapiq decode allow-lists and the `meta.schema` wire key are projections of one schema registry. It reads the built `dist/swagger.json`, asks a running server the same questions and requires byte-identical answers, `indexes` included, in both read shapes (a record read is compared against the `x-authup-schemas` entry projected onto its `x-query-schema` parameters). Completeness is checked against `schemaRegistry.getAll()`, not against the projection under test. It also requires every operation to declare every variable of its own path template.

The document half is skipped when `dist/swagger.json` is absent (`build:server:js` wipes `dist/`, so that is an ordinary state); the registry-against-wire half always runs. A skip notice must go to `process.stderr`: this runner swallows `console` output. The sibling coverage guards live in `test/unit/http/openapi-coverage.spec.ts`; see `.agents/topics/query.md` for the mechanism.

## Page Tests (apps/client-auth-console)

Vitest + `@vue/test-utils` + `happy-dom` (`test/vitest.config.ts`, `npm run test -w apps/client-auth-console`). Pages are thin: they read the hydration payload and hand it to a kit component, so a page test provides the payload and stubs that component instead of installing the kit.

- The payload symbol is `Symbol.for('HYDRATION_PAYLOAD')` (`src/di.ts`), provided by description.
- A page calling `useToast()` needs a manager under `Symbol.for('VCToastManager')`: `{ entries: ref([]), generateId: () => '…' }` is enough.

## Component Tests (packages/client-web-kit)

Vitest + `@vue/test-utils` + `happy-dom` (`test/vitest.config.ts`, `@vitejs/plugin-vue` for SFCs). Run with `npm run test --workspace=packages/client-web-kit`.

Mounting a kit component needs the same wiring a consumer app does. `test/utils/index.ts` exports `mountLoginForm(props?, handlers?)`, which assembles it: a fresh `createPinia()` and `createFakeClient` (from `@authup/core-http-kit/testing`; records every request in `.requests`, URLSearchParams bodies normalized to plain objects) per mount, `app.use(vuecs, {})` (`useSubmitButton` and `VC*` throw without the theme/defaults managers), and the kit `install(app, { baseURL, httpClient, pinia, isServer: true, cookieGet/cookieSet/cookieUnset })` (`isServer: true` disables the refresh timer; cookie stubs avoid `useCookies`). Stub `VCIcon` via `global.components` (`ATitle` resolves it globally).

The interactive-login realm contract is pinned at two layers: `test/unit/components/workflows/login-form.spec.ts` and `test/unit/core/store/login.spec.ts`.

**Server-render specs.** The SSR data handoff (`.agents/topics/ui.md`) branches on `typeof window`, so its server half cannot run under `happy-dom`. Those specs opt into node with a `// @vitest-environment node` docblock and render through `renderKitComponent()` (`test/utils/ssr.ts`: `createSSRApp` + the install options + `renderToString`), asserting on the HTML and on the entries a `createFakeHydrationStore()` (`test/utils/hydration.ts`) collected. The client half stays in `happy-dom` and seeds the same store before mounting. The recorded key is asserted verbatim on both sides (`test/unit/core/hydration{,-ssr}.spec.ts`, `test/unit/components/utility/entity-collection-hydration.spec.ts`). Assertions about the seeded first render must NOT `await flushPromises()`: the point is the render the markup is hydrated against.

## CLI Tests (apps/authup)

The CLI runs every service in process, so the wiring is the assertion and the behaviour lives in the packages. Two suites:

- **Unit** (`npm run test -w apps/authup`): the root command's meta and its exact subcommand set (`config`, `dev`, `healthcheck`, `migration`, `start`, plus the client commands; `core`, `console` and `worker` are roles of `start`), the root `setup` refusing a stray positional on `dev` alone, `start`'s `setup` refusing a bad role before anything boots (unknown role, a name after `core`/`worker`, an unknown console name, the tombstone `--worker` flag), and `healthcheck` dialing the inherited host with a wildcard bind looped to 127.0.0.1 (`test/unit/healthcheck.spec.ts`, asserting on what reaches `http.request`, since a socket probe cannot tell hosts apart on a dev box).
- **Host and commands** (`test/unit/host-*.spec.ts`, `test/unit/commands-*.spec.ts`): the CLI-as-client layer runs against hapic's `MemoryTransport` handed to the `Client`, never the kit's `FakeClient` (it overrides `request()` and so skips the hook path the refresh tests exercise). `@napi-rs/keyring` is mocked through `vi.hoisted` and `XDG_CONFIG_HOME` points at a tmp dir. The derived entity noun list is pinned, so a new kit sub-API fails it until acknowledged.
- **Smoke** (`npm run test:smoke`, `test/smoke/run.mjs`) runs two scenarios against the built CLI on sqlite:
  - **composed**: `start` on a non-default port. `/logout` hands over to `/console/auth/logout` and the hop is followed; `/console/account` and `/console/admin` answer 200 with the injected `window.__AUTHUP__`; the first script asset of each shell answers 200 as JavaScript (catches a dist built for another base). Then SIGTERM, clean exit, nothing listening. It also pins env-wins precedence: an `authup.yml` under `--configDirectory` names a different port than the environment, and `publicUrl` (supplied by the file alone) is read back from the injected config to prove the file was read.
  - **split**: `start core` and `start console` side by side. The API answers 404 for every console page, `/logout` still hands over, each console serves its shell and entry script. Console urls carry no path, which catches an asset rebase that prepends instead of replacing.
- **`npm run test:smoke:packed`** runs the composed scenario against `npm pack`ed tarballs installed into a temp project. This is the variant that matters: packaging breakage reproduces only from a packed artifact. Its workspace list includes the three console services and the three bundles. Both variants run in CI (`tests-launcher` job) and need `npm install --force`.

Runner trap: `child.on('exit')` fires once, so a listener attached after the child exited waits out the timeout. Check `exitCode` / `signalCode` first.

## Console Service Tests (apps/server-{admin,account,auth}-console)

Each service has its own suite (`npm run test -w apps/server-<name>-console`, node environment). It boots the real handler on an ephemeral port against the BUILT console dist and asserts the health route, the shell with its runtime config injected, the same shell for a nested route, the asset the shell references (a marker or vite-base mismatch fails here), and a missing asset answering 404 instead of the shell. The account console adds the `ref` verdicts. `test/unit/config.spec.ts` pins the registry-to-service mapping (derived and explicit console url, listen address, readers, refusal without `publicUrl`).

The shared mechanism is tested once in `packages/server-console-kit`: `html.spec.ts` (shell helpers, including the `$'`-expansion guard over all four patterns and the asset rebase), `theme.spec.ts` and `theme-provider.spec.ts`. Theme BEHAVIOUR belongs there; that a particular console applies it belongs to that console's service.

## Console Bundle Tests (apps/client-admin-console, apps/client-account-console)

Both bundles have their own suite. The admin console's `test/vitest.config.ts` registers `@vitejs/plugin-vue` because the guard spec imports the kit from source. Notable specs: `config.spec.ts` (runtime-config contract, `cookieSession` capability AND applicability), `guard.spec.ts` (login bounce with `redirect`, route-meta gates, cookie-mode rules), `event-stats.spec.ts` / `entity-stats.spec.ts` (stats composables against the fake client) and `dashboard-stats.spec.ts` (pure helpers).

A composable is tested through a bare component that takes the client as an argument. A whole page is mounted with `mountPage(path, handlers?, routes?)` (`test/utils/index.ts`): pinia, the kit `install` over a `createFakeClient`, vuecs, `installOverlays`, `installNavigation` and a memory-history router over the real `routes`, with `<Suspense>` around `RouterView` (async `setup()` detail pages need it) and `VCIcon` stubbed (iconify would fetch every icon). It installs no guard and no layout; a page reaching another global component adds its plugin there. Swap route records by mapping `routes`, as `test/unit/user-page.spec.ts` does.

The cookie login round-trip stays in server-core: `test/unit/http/controllers/workflows/account/console-session.spec.ts` (a `describe.each` over both consoles). Its "console shell" block asserts server-core answers 404 for every console page.

## Code Coverage

### Generate coverage report

```bash
npm run test:coverage --workspace=apps/server-core
```

Outputs a console summary (folder names truncated) and `apps/server-core/coverage/coverage-final.json`.

### Query coverage for specific modules

After `test:coverage`, from `apps/server-core/`:

```bash
node -e 'var cov=JSON.parse(require("fs").readFileSync("./coverage/coverage-final.json","utf8"));var files=Object.keys(cov).filter(function(f){return f.indexOf("PATTERN")>-1&&f.endsWith(".ts")});files.sort();files.forEach(function(f){var d=cov[f];var stmts=Object.values(d.s);var total=stmts.length;var covered=stmts.filter(function(v){return v>0}).length;var pct=total?Math.round(covered/total*100):0;var idx=f.lastIndexOf("core");var short=f.substring(idx);console.log(pct+"% ("+covered+"/"+total+") | "+short)})'
```

Replace `PATTERN` with a path fragment, e.g. `core/entities`, `core/oauth2`, `core/identity` (on Windows use `\\\\` as the separator).

### Coverage targets

| Layer | Target |
|---|---|
| Core entity services (`core/entities/*/service.ts`) | Maintain 95-100% |
| Workflow services (`core/identity/*/service.ts`) | Maintain 94-100% |
| OAuth2 module (`core/oauth2/`) | Improve with service-level tests |
| HTTP controllers, adapters | Covered by HTTP integration tests |

## Docker Services

Integration tests use the services in `docker-compose.yml`:

| Service    | Port      |
|------------|-----------|
| MySQL      | 3306      |
| PostgreSQL | 5432      |
| Redis      | 6379      |
| Vault      | 8090      |
| LDAP       | 389 / 636 |

## Migration Tests

The integration suite builds its schema with `dataSource.synchronize()` (`apps/server-core/test/app/database.ts`), so migrations in `apps/server-core/src/adapters/database/migrations/{mysql,postgres}/` are NOT exercised there. The `tests-migrations` CI job runs the migration CLI against fresh MySQL and PostgreSQL containers:

1. `migration run`: applies all migrations
2. `migration revert` x N: undoes every migration (verifies every `down()`)
3. `migration run`: re-applies the chain (idempotency)
4. `npm run test:schema-drift`: the migrated schema must match the entity metadata
5. `npm run test:migration-latest`: the populated round-trip (below)

Steps 1 to 4 run on an empty schema, so they cannot catch anything that fails only with rows present (an FK re-validating data, a lossy column rewrite, a narrowing type change).

The job pre-flights that compiled migrations exist under `apps/server-core/dist/adapters/database/migrations/{mysql,postgres}/`: without a build, typeorm reports "No migrations are pending" and exits 0. The cwd does not matter, since the glob is anchored on the package path (`SRC_PATH` / `DIST_PATH` in `apps/server-core/src/path.ts`).

Locally, with the compose stack running:

```bash
DB_TYPE=mysql DB_HOST=127.0.0.1 DB_PORT=3306 DB_USERNAME=root DB_PASSWORD=start123 DB_DATABASE=app \
    node apps/server-core/dist/cli/index.mjs migration run
```

The CLI creates the target database if it does not exist.

### Schema-drift gate (`npm run test:schema-drift`)

`apps/server-core/scripts/assert-schema-drift.mjs` runs `createSchemaBuilder().log()` against a migrated database and fails on any statement, i.e. when the migration chain and the entity classes disagree. The rule that keeps it green is in conventions.md -> *Database Migrations*: DDL is generated with `migration generate`, never hand-written. With the chain applied, `migration generate` writes no file.

Two traps that appear only with hand-written DDL:

- **Constraint names are derived**: typeorm names indexes and FKs from a table+column hash (`IDX_<hash>` / `FK_<hash>`). A readable name diverges permanently.
- **uuid columns are `varchar(255)` on MySQL.** `MysqlDriver.getColumnLength` shortens to 36 only for typeorm-generated columns. Writing `varchar(36)` drifts, and the next generated migration emits a `DROP COLUMN`. Pinning `length: 36` on the entity is not an escape: Postgres rejects a length on `uuid` at `DataSource.initialize()`.

When the gate fails, its output is the reconciling statement list: decide whether the entities changed without a migration or a migration wrote something the entities do not describe, fix that side, then regenerate.

### Populated round-trip (`npm run test:migration-latest`)

`apps/server-core/scripts/verify-latest-migration.mjs` drops and recreates `DB_DATABASE`, boots the real application (provisioning and a password grant write realms, clients, users, sessions, session tokens, events), seeds the remaining tables, then reverts and re-applies the newest migration. It asserts row counts unchanged both ways, zero drift afterwards, FKs still rejecting orphans and cascading, and the application still booting and issuing a token.

```bash
DB_TYPE=postgres DB_HOST=127.0.0.1 DB_PORT=5432 DB_USERNAME=postgres DB_PASSWORD=start123 \
    DB_DATABASE=scratch npm run test:migration-latest --workspace=apps/server-core
```

It needs a built `dist` and a scratch database (it drops the target). It is the only gate that can certify a migration touching columns, constraints or rows; run it locally when authoring one. The value comparison exempts columns the newest migration added (present before, absent after revert) and dropped (absent before, back after revert), and checks that the re-run drops them again.
