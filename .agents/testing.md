# Testing

## Setup

- **Runner**: Vitest with SWC compiler for fast transpilation
- **Test location**: `test/unit/**/*.spec.ts` within each package/app
- **Config**: `test/vitest.config.ts` per package/app
- **Prerequisite**: `npm run build` before running tests

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
- `FakeUserRepository`, `FakeClientRepository`, `FakeRobotRepository`

Workflow / orchestration helpers still in `test/unit/core/helpers/`:
- `FakeMailClient`, `FakeIdentityPermissionProvider`, `FakeIdentityResolver`, `FakeIdentityRoleProvider`, `FakeOAuth2KeyRepository`, `FakeOAuth2TokenIssuer`, `FakeOAuth2TokenRepository`, `FakeOAuth2TokenSigner`, `FakeSessionManager`. `helpers/index.ts` also re-exports everything from `@authup/server-test-kit` for terse spec imports.

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
    secret_hashed: false,
    secret_encrypted: false,
});
const permission = await suite.client.permission.getOne(PermissionName.CLIENT_SELF_MANAGE);
await suite.client.clientPermission.create({
    client_id: created.id,
    permission_id: permission.id,
});
const token = await suite.client.token.createWithClientCredentials({
    client_id: created.id,
    client_secret: knownSecret,
});

const selfClient = new HTTPClient({ baseURL: suite.baseURL });
selfClient.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });
```

`suite.client.permission.getOne(name)` resolves the provisioned permission by name. See `test/unit/http/controllers/entities/client-self-manage.spec.ts` for a working example asserting both allowed-field updates and ATTRIBUTE_NAMES policy rejections.

### Testing the SSR'd consent UI is not yet supported

`GET /authorize` returns SSR'd HTML built from the bundled Vue app under `apps/server-core/ui/`. The SSR fires several unawaited HTTP calls during render against `config.publicUrl` (`store.resolve()` for session hydration, `IdentityProviderAPI.getMany()`, `AuthorizeScopes.vue`'s scope fetch). In a test environment where `publicUrl` doesn't reach a live server, those fetches `ECONNREFUSE` and leak unhandled rejections that fail vitest.

Workarounds that don't work:
- Suppressing `unhandledRejection` — vitest catches them through its own infrastructure.
- Pinning `config.port` to match `publicUrl` — breaks parallel runs.

The right fix is an injectable HTTP client so tests can stub the SSR's outbound calls. Until that lands, `GET /authorize` is covered indirectly: the assets middleware unit tests assert path resolution, and `apps/server-core` ships a self-contained tarball whose SSR `render()` is verified manually via `npm pack` smoke testing.

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

This catches SQL syntax errors, cross-DB type mismatches, and `down()` regressions across every migration. It does **not** catch data-correctness bugs in `UPDATE`/`INSERT` migrations against pre-existing rows — those still require manual smoke-testing against a populated database.

The job pre-flights with a sanity check that the compiled migrations exist under `apps/server-core/dist/adapters/database/migrations/{mysql,postgres}/` — without this guard, running the CLI from the wrong working directory results in typeorm silently reporting "No migrations are pending" with exit code 0, masking the failure.

Locally, run the same flow with a running compose stack:

```bash
DB_TYPE=mysql DB_HOST=127.0.0.1 DB_PORT=3306 DB_USERNAME=root DB_PASSWORD=start123 DB_DATABASE=app \
    node apps/server-core/dist/cli/index.mjs migration run
```

The CLI auto-creates the target database if it does not exist.
