# Testing

## Setup

- **Runner**: Vitest with SWC compiler for fast transpilation
- **Test location**: `test/unit/**/*.spec.ts` within each package/app
- **Config**: `test/vitest.config.ts` per package/app
- **Prerequisite**: `npm run build` before running tests
- **Reflect polyfill (server-core)**: `test/vitest.config.ts` sets
  `setupFiles: ['reflect-metadata']`. `@peculiar/x509` v2 pulls in
  `tsyringe`, which throws at import time unless a Reflect polyfill is
  already loaded, and the `globalSetup` file runs in an isolated context
  so its own `import 'reflect-metadata'` does not reach test-file
  contexts. Any spec importing `src/core` transitively loads x509 (via the
  client-certificate module), so this must stay — do not remove it.
- **Per-worker sqlite isolation (server-core, issue #3405)**: spec files run
  in parallel vitest workers, so a shared database file made the suite flake
  on a different spec each run. The global setup provisions a template
  database at `writable/test.sql`; `createTestDatabaseModuleForSuite` gives
  every worker its own copy (`writable/test-<poolId>.sql`, keyed by
  `VITEST_POOL_ID`), created on first use in that worker and swept by the
  next global setup. Files that reuse a pool slot share its copy
  sequentially, so a spec must never rely on state written by another spec
  file. The MySQL/Postgres runs have no per-worker copy (one shared server
  database), so `test/vitest.config.ts` turns `fileParallelism` off for
  them instead; expect those runs to take several times the sqlite
  wall-clock.
- **A second application in one spec (server-core)**: a spec that boots two
  instances (`federation-e2e.spec.ts`, one authup brokering a login to
  another) gives the second one
  `createTestDatabaseModuleForSecondaryInstance('<name>')` plus its own
  `withProvisioning(...)`. The factory follows the dialect the run itself
  uses: a `writable/test-<name>-<poolId>.sql` file on sqlite, a
  `<database>_<name>_<poolId>` database on the server otherwise. Do **not**
  pin the second instance to sqlite by hand and seed it from
  `writable/test.sql`: that template only exists on sqlite runs, so the spec
  dies with `ENOENT` under `test:mysql` / `test:psql`. Its database starts
  empty rather than as a template copy, which is why the caller provisions
  it. Booting two applications in one process is otherwise supported, and
  regressions in that isolation surface here first (see architecture.md →
  *Policy engine evaluators are per engine*). **Both of its hooks take an
  explicit timeout.** Each `setup()` is a schema synchronize plus a full
  provisioning pass before the instance listens, and the hook adds ten API
  round-trips on top; vitest's default budget is 10s, which the sqlite runs
  clear and the mysql one does not, since it shares one server with every other
  spec file and runs with file parallelism off. A second two-instance spec
  needs the same treatment — the symptom is a `Hook timed out in 10000ms` with
  every test in the file reported as PASSING, because it is the hook and not an
  assertion that ran out of clock.

## Running Tests

```bash
npm run build                                  # required before testing
npm run test                                   # test all apps/packages
npm run test --workspace=apps/server-core      # test a single app/package
npm run test --workspace=apps/server-core -- test/unit/core/entities/role/service.spec.ts  # run a specific test file
```

### Database-Specific Tests (server-core)

```bash
npm run test:mysql --workspace=apps/server-core
npm run test:psql --workspace=apps/server-core
```

## Test Layers (server-core)

### Service-Level Tests

Location: `test/unit/core/entities/{entity}/service.spec.ts`

Test business logic in isolation using fake repositories (in-memory) and mock permission checkers. No HTTP, database, or Docker required. Tests run in ~1ms each.

Generic fakes from `@authup/server-test-kit`:
- `FakeEntityRepository<T>` — in-memory `IEntityRepository` backed by an array
- `FakePermissionEvaluator` — `IPermissionEvaluator` implementation with call recording (`evaluateCalls`, `preEvaluateCalls`, etc.) and configurable behavior (`setBehavior(fn)`, `denyAll()`, `deny(method)`)
- `createAllowAllActor()` / `createDenyAllActor()` — `FakeActorContext` for permission testing
- `createMasterRealmActor(realmId?)` / `createNonMasterRealmActor(realmId?)` — presets with identity for realm defaulting tests

Domain fakes colocated under each entity's test dir as `test/unit/core/entities/<entity>/fake-repository.ts`:
- `FakeRoleRepository`, `FakeRealmRepository` (pre-seeds master realm + `resolve()` helper), `FakePolicyRepository`, `FakePermissionRepository`
- `FakeUserRepository`, `FakeClientRepository`

Workflow / orchestration helpers still in `test/unit/core/helpers/`:
- `FakeMailClient`, `FakeIdentityPermissionProvider`, `FakeIdentityResolver`, `FakeIdentityRoleProvider`, `FakeOAuth2KeyRepository`, `FakeOAuth2TokenIssuer`, `FakeOAuth2TokenRepository`, `FakeOAuth2TokenSigner`, `FakeOAuth2TokenVerifier`, `FakeSessionManager`, `FakeSessionTokenRepository` (in-memory `ISessionTokenRepository` for refresh-rotation grant tests — `create`/`markRefreshConsumed`/`hasConsumedChild`/`revokeBySessionId`/... with call recording). `helpers/index.ts` also re-exports everything from `@authup/server-test-kit` for terse spec imports.

What to test: permission gates, validation, realm defaulting, uniqueness, built-in entity protection, upsert behavior, error paths.

**Writing philosophy:** Tests should assert *expected* behavior based on the service contract and architecture docs — not merely confirm what the implementation currently does. If a test fails, it may surface a real bug in the implementation rather than a test error. When a test failure seems like it could be a legitimate implementation issue, flag it to the user before "fixing" the test. The tests are a verification tool, not a rubber stamp.

**Important:** The vitest config lives at `test/vitest.config.ts`, not the project root. Running `npx vitest run` directly from the workspace directory will **not** find the config and **skips the global setup** (`test/setup.ts`), which provisions the master realm and starts Docker containers.

- **Always use** `npm run test --workspace=apps/server-core` (from repo root) or `npx vitest run --config test/vitest.config.ts` (from workspace directory)
- Service-level tests (`test/unit/core/entities/`) don't need the global setup and work without it
- Integration tests (e.g., `test/unit/core/identity/provider/account.spec.ts`) **require** the provisioned database from the global setup and will fail without it

### HTTP-Level Tests

Location: `test/unit/http/controllers/entities/{entity}.spec.ts`

Integration tests that spin up the full application (database, HTTP server). Test HTTP client compatibility (`core-http-kit`), request/response shaping, middleware pipeline, and end-to-end wiring. Require Docker services.

`test/app/http.ts` exposes:
- `suite.client` — a typed `@authup/core-http-kit` `Client` pointed at the running test server with admin Basic auth.
- `suite.baseURL` — the `http://localhost:<random-port>` URL of the test server, useful for raw `fetch()` calls when the typed client doesn't fit (e.g., asserting on HTML response bodies).

### HTTP test helpers

`test/utils/` exports two helpers tuned for HTTP integration tests:

**`expectClientError(fn, { status?, code?, data? })`** — asserts the supplied async call rejects with a hapic `ClientError` matching the given shape. Replaces the `expect.assertions(N) + try/catch + isClientError` boilerplate. `code` is shorthand for `data.code`; pass `data` for arbitrary `response.data` field assertions (e.g. OAuth2 errors carrying both `code` and `error`).

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

**`httpRequest(suite, method, path, { form?, body?, headers? })`** — raw `fetch()` against the test server, for tests that need to bypass the typed `Client` (raw HTML bodies, OAuth2 redirect payloads, RFC 6749 edge cases the typed client deletes). Returns the native `Response`; caller controls status / body parsing. `form: Record<string, string>` is shorthand for urlencoded body + auto Content-Type.

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

To test policies/permissions under a non-admin identity (e.g. `*_SELF_MANAGE` flows), grant the relevant permission to a freshly-created identity and authenticate against the server with its own bearer token:

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

`suite.client.permission.getOne(name)` resolves the provisioned permission by name. See `test/unit/http/controllers/entities/client-self-manage.spec.ts` for a working example asserting both allowed-field updates and ATTRIBUTE_NAMES policy rejections.

### Testing the hosted pages (they render in another workspace now)

Since plan 101 D2 the auth pages are NOT rendered by server-core, so its suite has no page assertions left: a hosted page GET is a redirect, and that is all server-core's specs check. The render itself belongs to `apps/server-auth-console`, whose `test/unit/handler.spec.ts` boots the real handler on an ephemeral port and asserts against the BUILT `@authup/client-auth-console` bundle. `/logout` is the honest smoke test there, because it is the one page the service can answer with no backend at all (it drives the end-session call from the browser, so the render is a pure shell); the other pages hydrate over HTTP from server-core and a spec that wants them needs a stub API, not a DI seam.

That is the shape change worth internalizing: the service holds **no credential, no loopback and no database**, so there is nothing to inject a fake client into. It reads `GET /authorize/info` and `GET /` from whatever `apiUrl` names, and a spec stubs those by pointing `apiUrl` at a server it controls.

Caveats that survive the move:
- The service renders from the **built** bundle (`apps/client-auth-console/dist/server/server.js`, resolved through node_modules), so rebuild `apps/client-auth-console` after changing that app or `client-web-kit`, or the specs exercise a stale bundle. The two static console services have the same requirement for their own dists.
- There is no just-in-time branch any more: it was a vite dev server inside server-core and left with the rendering, so the dist path is the only path and the JIT gate now decides nothing but the migrations glob (architecture.md → *The `cli-dev` JIT gate*).
- Icon bundling is asserted in `apps/client-auth-console/test/unit/icons.spec.ts` against that app's own built client entry, not through a rendered page (`@iconify/vue` resolves icons client-side, so an SSR'd page carries empty `<svg>` shells either way).

### The internal HTTP client seam (server-core)

server-core keeps ONE client for calls to its own API, and it was renamed with the UI it lost: `HTTPInjectionKey.InternalHttpClient` (was `UIHttpClient`), backed by `createInternalHttpClient` (was `createInternalUIHttpClient`) and handed to routes per request under `INTERNAL_HTTP_CLIENT_FACTORY_STORE_KEY`. Its one consumer is the console login's token exchange. `HTTPModule.setup` registers the production default unless the token is ALREADY bound, so a fake registered before `suite.setup()` wins:

```typescript
import { createFakeClient as createFakeHTTPClient } from '@authup/core-http-kit/testing';
import { HTTPInjectionKey } from '../../src/app';

const suite = createTestApplication();
suite.container.register(HTTPInjectionKey.InternalHttpClient, {
    useFactory: () => createFakeHTTPClient({ handlers: { /* ... */ } }),
}, { lifetime: 'transient' });
await suite.setup();
```

Register with `useFactory` + `lifetime: 'transient'` (eldin), never a singleton-lifetime instance: a client carries per-user Authorization state. Register **before** `suite.setup()`, since the middleware mount is decided at boot. Alias the import (`createFakeHTTPClient`), because `test/utils` already exports a `createFakeClient` entity factory. `test/unit/adapters/http/internal-client.spec.ts` covers the rewriter as a pure unit (dispatch onto the own listen address, prefixed and prefix-less `publicUrl`, wildcard hosts normalized to loopback). For a spec that needs the whole application on a different public URL, the test factory takes a config override: `createTestApplication({ config: (c) => { c.publicUrl = '...'; } })`.

### Capturing what the server logs

`LoggerModule.setup` honors a pre-registered `LoggerInjectionKey` (test-fake-wins, the same rule as `MailInjectionKey` and `InternalHttpClient`), so a spec asserting on log output registers its own recorder before `suite.setup()`:

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

Reach for this where the log is the ONLY observable surface, a `catch` that swallows a failure into a redirect for instance. See `test/unit/http/controllers/entities/identity-provider/link.spec.ts`, which asserts the upstream status and body reach the log while the browser only sees `?linkError=link_failed`.

### Cookies a browser would actually send

A spec that echoes `set-cookie` straight back proves the server SENT a cookie,
not that a browser would send it BACK: a cookie scoped to the wrong `Path`
passes it and breaks every real request. `TestCookieJar` (`test/utils/`) is the
smallest thing that closes that gap. It stores `set-cookie` from a response
(honouring `Path`, `Max-Age=0` and a past `Expires`) and yields a `cookie`
header per request path, RFC 6265 §5.1.4 path matching included. Use it for any
flow whose contract is a cookie:

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

Note the harness binds its port AFTER the config is normalized, so `publicUrl`
is NOT `suite.baseURL`. A spec asserting an `Origin` check (the federated
login's completion endpoint) must read the config
(`suite.container.resolve(ConfigInjectionKey).publicUrl`), not the base URL. See
`test/unit/http/controllers/entities/identity-provider/login-cookie-flow.spec.ts`.

## Page Tests (apps/client-auth-console)

The auth console carries the same vitest + `@vue/test-utils` + `happy-dom`
setup as the kit (`test/vitest.config.ts`, run with `npm run test -w
apps/client-auth-console`; `nx run-many -t test` picks the target up on its
own). Its pages are thin: they read the hydration payload and hand it to a kit
component, so a page test provides the payload and stubs that component rather
than installing the kit.

- The payload symbol is `Symbol.for('HYDRATION_PAYLOAD')` (`src/di.ts`), so it
  is provided by description, no import needed.
- A page calling `useToast()` needs a manager under
  `Symbol.for('VCToastManager')` — `{ entries: ref([]), generateId: () => '…' }`
  is enough; the full `@vuecs/overlays` install is not.

## Component Tests (packages/client-web-kit)

The kit has a vitest + `@vue/test-utils` + `happy-dom` setup
(`test/vitest.config.ts`, `@vitejs/plugin-vue` for SFC compilation). Run with
`npm run test --workspace=packages/client-web-kit` — the package script passes
`--config test/vitest.config.ts` explicitly, which is **mandatory**: vitest
does NOT auto-discover a config under `test/` (packages/access carries a dead
config as a cautionary example — its plain `vitest run` script never loads it).

Mounting a kit component needs the same wiring a consumer app does —
`test/utils/index.ts` exports a `mountLoginForm(props?, handlers?)` harness
that assembles it: fresh `createPinia()` + `createFakeClient` (from
`@authup/core-http-kit/testing`, records every request in `.requests` with
URLSearchParams bodies normalized to plain objects) per mount, `app.use(vuecs,
{})` (ThemeManager + DefaultsManager — `useSubmitButton`/`VC*` throw without
them), and the kit `install(app, { baseURL, httpClient, pinia, isServer:
true, cookieGet/cookieSet/cookieUnset })` (`isServer: true` disables the
auth-hook refresh timer; cookie stubs avoid `useCookies`). The only global
component lookup in the login subtree is `resolveComponent('VCIcon')` in
`ATitle` — stub via `global.components`.

The realm-plumbing regression suite pins the interactive-login contract at two
layers: `test/unit/components/workflows/login-form.spec.ts` (picker-selected
realm transmitted; `codeRequest.realm_id` transmitted incl. late-arriving prop
via `setProps`; empty realm omitted from the grant body) and
`test/unit/core/store/login.spec.ts` (the `store.login()` gate forwards
`ctx.realmId` even though the store's own realm ref is null pre-login — the
original one-line bug).

**Server-render specs.** The SSR data handoff (architecture.md → *SSR data
handoff*) branches on `typeof window`, so its server half cannot be exercised
in the default `happy-dom` environment. Those specs opt into node with a
`// @vitest-environment node` docblock and render through
`renderKitComponent()` (`test/utils/ssr.ts`: `createSSRApp` + the same install
options + `renderToString`), asserting on the returned HTML plus the entries a
`createFakeHydrationStore()` (`test/utils/hydration.ts`) collected. The client
half stays in `happy-dom` and seeds the same store before mounting. The
recorded key is asserted verbatim on both sides
(`test/unit/core/hydration{,-ssr}.spec.ts`,
`test/unit/components/utility/entity-collection-hydration.spec.ts`), so a
change to the key format fails both rather than silently degrading to a
cache miss. Assertions about the seeded first render must NOT
`await flushPromises()`: the point is the render the markup is hydrated
against, before the async lookup settles.

## CLI Tests (apps/authup)

The `authup` CLI runs every service in process (plan 101 D1/D2), so almost
nothing is left to unit-test: the wiring is the assertion, and the behaviour
lives in the packages. The suite is split in two accordingly.

- **Unit** (`npm run test -w apps/authup`, config at `test/vitest.config.ts` like
  every other workspace): `createCLIEntryPointCommand` carries the `authup`
  meta read from the package and exactly the subcommands it should
  (`config`, `console`, `core`, `healthcheck`, `migration`, `start`,
  `worker`), and its `setup` refuses a stray positional on
  `core`/`start`/`worker` (the retired `authup start server.core` selector
  shape) while leaving the commands whose positional is real alone
  (`migration run`, `console admin`). The composed-schema spec that sat here
  is gone with `composeSchemas`: every configuration key is declared once in
  `@authup/server-config` now, so there is no pair of declarations left to
  prove consistent. The supervisor-era specs are gone with the supervisor: there is no entrypoint to
  resolve, no child environment to map and no routing table.
- **Smoke** (`npm run test:smoke`) runs TWO scenarios, because each fails in a
  way the other cannot show.
  - The **composed** scenario boots the built CLI's `start` against sqlite on
    a non-default port and asserts all three consoles are served on that one
    listener: `/logout` hands over to `/console/auth/logout` and the hop is
    then followed (a forward that lands nowhere answers the API-side probe
    exactly like a working one, so the hop and its target are checked
    separately), `/console/account` and `/console/admin` each answer 200 with
    the injected `window.__AUTHUP__`, and the first script asset each shell
    references answers 200 as JavaScript, so a dist built for another base
    fails here instead of serving a blank console. Then SIGTERM, a clean exit
    and nothing still listening. It additionally pins **env-wins precedence**:
    the run writes an `authup.yml` under `--configDirectory` naming a
    DIFFERENT port and passes the real one in the environment, so a regression
    that lets the file win moves the listener and the readiness probe never
    answers. That the file was read at all is proven separately, by reading
    `publicUrl` back out of the injected console config: it is the one key
    only the file supplies.
  - The **split** scenario runs `authup core` and `authup console` side by
    side and asserts what only two processes can show: the API answers **404**
    for every console page (the shed; a shell answered there would mean both
    sides serve it, with whichever mounted first winning silently), `/logout`
    still hands over to the console process, and each console serves its shell
    and its own entry script. Its console urls carry **no path**, which is
    what a prefix-stripping proxy delivers and what catches an asset rebase
    that PREPENDS rather than replaces: a console published at its own vite
    base looks identical either way.
- `npm run test:smoke:packed` runs the composed scenario against `npm pack`ed
  tarballs installed into a temp project. **The packed variant is the one that
  matters:** every CLI breakage found in plan 078 (the ESM `__dirname` crash,
  the stale spawn path, and nitro's symlinked module store being dropped by
  `npm pack`) reproduced ONLY from a packed artifact, where a workspace-dist
  run passes straight through all three. Its workspace list carries the three
  console SERVICES as well as the three bundles: the CLI depends on the
  services and each service resolves its bundle at runtime, so without both
  halves a packed install reaches for the registry. Both variants run in CI
  (`tests-launcher` job); the packed one needs `npm install --force` like
  every install in this repo.

**One trap the split scenario surfaced, worth knowing for any runner that
awaits a SECOND process:** `child.on('exit')` fires once, so a listener
attached after the child already exited waits out the whole timeout. Check
`exitCode`/`signalCode` first. That was harmless while one process was
awaited and fatal for the second.

## Console Service Tests (apps/server-{admin,account,auth}-console)

Each console service carries its own vitest suite (`npm run test -w
apps/server-<name>-console`, config at `test/vitest.config.ts`, node
environment). They boot the real handler on an ephemeral port and assert
against the BUILT console dist: the health route, the shell with its runtime
config injected, the same shell for a nested/sub route, the asset the shell
references (which is what makes a marker or vite-base mismatch fail here
rather than in a browser), and a missing asset answering 404 rather than the
shell. The account console adds the `ref` verdicts (a trusted origin is
injected, a foreign one is dropped). `test/unit/config.spec.ts` pins the
registry-to-service mapping: the derived console url, an explicit one winning,
the listen address, the boolean and list readers, and the refusal to start
without `publicUrl`.

The MECHANISM those services share is tested once, in
`packages/server-console-kit` (`npm run test -w packages/server-console-kit`):
`html.spec.ts` for the shell helpers (including the `$'`-expansion guard the
`replaceTemplateMarker` rule exists for, asserted over all four expansion
patterns, and the asset rebase over more than one vite base), plus
`theme.spec.ts` and `theme-provider.spec.ts`,
which moved out of server-core's suite with the code. A spec asserting theme
BEHAVIOUR belongs there now; a spec asserting that a particular console
applies it belongs to that console's service.

## Console Bundle Tests (apps/client-admin-console, apps/client-account-console)

Both static console bundles carry a vitest suite of their own. The admin
console's `test/vitest.config.ts` registers `@vitejs/plugin-vue`, because its
guard spec imports the kit (aliased to package source, which carries `.vue`
files); `test/unit/config.spec.ts` pins the runtime-config contract (injected
config, same-origin API derivation, the capability-AND-applicability rule
behind `cookieSession`), `test/unit/guard.spec.ts` the routing guard (the
login bounce with `redirect`, the three route-meta gates, the cookie-mode
rules: `logout({ revoke: false })` on a failed or `RESTORING` resolve, never a
code exchange). The server-side half is split by ownership now: the SERVING
lives in each console service's suite (above), and the cookie login round-trip
stays in server-core, as the `describe.each` over both consoles in
`test/unit/http/controllers/workflows/account/console-session.spec.ts`. That
file gained a **"console shell"** block asserting server-core answers 404 for
`''`, `/login` and an arbitrary sub-path under each segment, which is the
regression guard for the shed itself.

## Code Coverage

### Generate coverage report

```bash
npm run test:coverage --workspace=apps/server-core
```

This runs all tests with coverage collection and outputs:
- Console summary table (truncated folder names, hard to read for specific files)
- `apps/server-core/coverage/coverage-final.json` — detailed JSON report

### Query coverage for specific modules

After running `test:coverage`, use this from `apps/server-core/`:

```bash
node -e 'var cov=JSON.parse(require("fs").readFileSync("./coverage/coverage-final.json","utf8"));var files=Object.keys(cov).filter(function(f){return f.indexOf("PATTERN")>-1&&f.endsWith(".ts")});files.sort();files.forEach(function(f){var d=cov[f];var stmts=Object.values(d.s);var total=stmts.length;var covered=stmts.filter(function(v){return v>0}).length;var pct=total?Math.round(covered/total*100):0;var idx=f.lastIndexOf("core");var short=f.substring(idx);console.log(pct+"% ("+covered+"/"+total+") | "+short)})'
```

Replace `PATTERN` with a path fragment to filter files. Examples:
- `core\\\\entities` — all entity service/type files
- `core\\\\oauth2` — OAuth2 module
- `core\\\\identity` — registration and password recovery
- `core\\\\entities.*service` — only service implementation files

**Note:** Windows paths use `\\\\` (double-escaped backslash) in the filter string.

### Coverage targets

| Layer | Current | Target |
|---|---|---|
| Core entity services (`core/entities/*/service.ts`) | 95-100% | Maintain |
| Workflow services (`core/identity/*/service.ts`) | 94-100% | Maintain |
| OAuth2 module (`core/oauth2/`) | Mixed (0-100%) | Improve with service-level tests |
| HTTP controllers, adapters | Covered by HTTP integration tests | — |

## Docker Services

Integration tests use Docker services defined in `docker-compose.yml`:

| Service    | Port      |
|------------|-----------|
| MySQL      | 3306      |
| PostgreSQL | 5432      |
| Redis      | 6379      |
| Vault      | 8090      |
| LDAP       | 389 / 636 |

## Migration Tests

The `tests-server-core` CI job runs the integration suite against MySQL and PostgreSQL, but the schema is built via `dataSource.synchronize()` (see `apps/server-core/test/app/database.ts`) — migrations in `apps/server-core/src/adapters/database/migrations/{mysql,postgres}/` are NOT exercised by that suite.

A separate `tests-migrations` CI job runs the migration CLI end-to-end against a fresh MySQL and PostgreSQL container:

1. `migration run` — applies all migrations forward
2. `migration revert` × N — undoes every migration in reverse order (verifies every `down()` works)
3. `migration run` — re-applies the full chain (verifies idempotency)
4. `npm run test:schema-drift` — asserts the migrated schema matches the entity metadata (see below)

This catches SQL syntax errors, cross-DB type mismatches, and `down()` regressions across every migration. It does **not** catch data-correctness bugs in `UPDATE`/`INSERT` migrations against pre-existing rows — the schema is empty throughout, so anything that only fails with rows present (a foreign key re-validating existing data, a column rewrite losing values, a narrowing type change truncating) passes here. Use the populated round-trip below for those.

### Schema-drift gate (`npm run test:schema-drift`)

`apps/server-core/scripts/assert-schema-drift.mjs` runs `createSchemaBuilder().log()` against a migrated database and fails when it returns any statement — i.e. when the migration chain and the entity classes, two independent descriptions of the same schema, disagree. Every divergence so far was found by hand: two foreign keys pointing at the wrong table (`auth_permissions.client_id` in `1766830857009`, `auth_roles.client_id` in `1784970000000`) and an entire naming + column-type split introduced by the hand-authored `1783325495597` / `1783769340000` and closed by `1785871780234-AlignSchemaWithEntityMetadata`.

The rule that keeps the gate green is in [conventions.md](conventions.md#database-migrations): **DDL is generated with `migration generate`, never hand-written.** A green gate is the normal state — with the chain applied, `migration generate` writes no file at all.

The two traps below are why. Both are invisible while hand-writing DDL and cannot occur when generating it:

- **Constraint names are derived, not chosen.** typeorm names indexes and foreign keys from a table+column hash (`IDX_<hash>` / `FK_<hash>`). A readable `IDX_auth_events_actor_name` reads better and diverges permanently from the model.
- **uuid columns are `varchar(255)` on MySQL.** MySQL has no uuid type, and `MysqlDriver.getColumnLength` only shortens to 36 for columns typeorm generates itself (`@PrimaryGeneratedColumn('uuid')`); a plain `@Column({ type: 'uuid' })` falls through to the generic varchar default. Writing `varchar(36)` holds a uuid perfectly well but drifts — and the next generated migration then emits `DROP COLUMN`, data loss that reads as routine in review. Pinning `length: 36` on the entity is **not** an escape: `uuid` is not in Postgres's `withLengthColumnTypes`, so `EntityMetadataValidator` throws `Column X of Entity Y does not support length property.` at `DataSource.initialize()` — the app would not boot on Postgres at all.

When the gate does fail, its output is the list of statements needed to reconcile the two — read it as "the entities changed without a migration" or "a migration wrote something the entities do not describe", and fix whichever is wrong before regenerating.

### Populated round-trip (`npm run test:migration-latest`)

`apps/server-core/scripts/verify-latest-migration.mjs` closes the empty-schema gap for the newest migration. It drops and recreates `DB_DATABASE`, boots the real application (so provisioning and a password grant write realms / clients / users / sessions / session tokens / events), seeds the remaining tables, then reverts and re-applies the newest migration and asserts: row counts unchanged in both directions, zero schema drift afterwards, foreign keys still rejecting orphans and still cascading, and the application still booting and issuing a token against the migrated schema.

```bash
DB_TYPE=postgres DB_HOST=127.0.0.1 DB_PORT=5432 DB_USERNAME=postgres DB_PASSWORD=start123 \
    DB_DATABASE=scratch npm run test:migration-latest --workspace=apps/server-core
```

It needs a built `dist` and a scratch database (it drops the target). It runs in the `tests-migrations` job as the final step, for both dialects, because it is the only gate that can certify a migration touching columns, constraints or rows — the empty round-trip above cannot. Run it locally too when authoring such a migration, rather than waiting for CI.

The job pre-flights with a sanity check that the compiled migrations exist under `apps/server-core/dist/adapters/database/migrations/{mysql,postgres}/`. Without that guard a missing or partial build leaves typeorm silently reporting "No migrations are pending" with exit code 0, masking the failure. The working directory is no longer part of that failure mode: the glob is anchored on the package path (`SRC_PATH` / `DIST_PATH` from `apps/server-core/src/path.ts`), so `migration run` applies the chain from any cwd.

Locally, run the same flow with a running compose stack:

```bash
DB_TYPE=mysql DB_HOST=127.0.0.1 DB_PORT=3306 DB_USERNAME=root DB_PASSWORD=start123 DB_DATABASE=app \
    node apps/server-core/dist/cli/index.mjs migration run
```

The CLI auto-creates the target database if it does not exist.
