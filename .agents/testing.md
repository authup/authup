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

Helpers in `test/unit/core/helpers/`:
- `FakeEntityRepository<T>` — in-memory `IEntityRepository` backed by an array
- `FakeRealmRepository` — in-memory `IRealmRepository` with `resolve()` and a pre-seeded master realm
- `createAllowAllActor()` / `createDenyAllActor()` — mock `ActorContext` for permission testing
- `createMasterRealmActor()` / `createNonMasterRealmActor(realmId)` — presets with identity for realm defaulting tests

What to test: permission gates, validation, realm defaulting, uniqueness, built-in entity protection, upsert behavior, error paths.

**Writing philosophy:** Tests should assert *expected* behavior based on the service contract and architecture docs — not merely confirm what the implementation currently does. If a test fails, it may surface a real bug in the implementation rather than a test error. When a test failure seems like it could be a legitimate implementation issue, flag it to the user before "fixing" the test. The tests are a verification tool, not a rubber stamp.

**Note:** The global setup (`test/setup.ts`) starts Docker containers and the full application. Service-level tests don't need this infrastructure but currently run under the same vitest config. Running via `npm run test --workspace=apps/server-core` triggers the global setup (~7s overhead). Running directly from the workspace directory (`cd apps/server-core && npx vitest run test/unit/core/...`) skips it.

### HTTP-Level Tests

Location: `test/unit/http/controllers/entities/{entity}.spec.ts`

Integration tests that spin up the full application (database, HTTP server). Test HTTP client compatibility (`core-http-kit`), request/response shaping, middleware pipeline, and end-to-end wiring. Require Docker services.

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
