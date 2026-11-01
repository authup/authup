# Deployment topology, CLI roles and dev mode

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

#### The `cli-dev` JIT gate (#3382)

- The gate is typeorm-extension's `isCodeTransformation(JUST_IN_TIME)`, a
  loader heuristic over locter (not a config key). It decides one thing: the
  mysql/postgres migrations glob (`src/.../*.{ts,js,mjs}` instead of `dist/`),
  in `adapters/database/data-source/options/module.ts`.
- Only `cli-dev` in `apps/server-core` (`node --loader ts-node/esm
  src/cli/index.ts`) reaches it. Under vitest it is always false, so the suite
  covers the dist arm only. A dark gate looks exactly like a working one
  (#3380).
- ts-node is the only runner that works. Rejected: tsx (esbuild emits no
  `design:type`, so `ColumnTypeUndefinedError`), `@swc-node/register` (needs
  a shim nothing detects), the bare `ts-node src/cli/index.ts` form (CJS hook
  only, Node's strip-only typing dies on decorators).
- The `locter` floor `^4.1.1` is load-bearing: the `--loader` form runs on a
  loader thread and sets no marker symbol, and only locter >= 4.1.1 reads
  `process.execArgv` (`--require`/`-r`, `--import`, `--loader`,
  `--experimental-loader` only).
- Both arms are anchored on the package path (`SRC_PATH` / `DIST_PATH`,
  `src/path.ts`), never the cwd. Do not use `transformFilePath`: it skips the
  rewrite whenever the path contains `dist` anywhere (e.g.
  `/srv/my-dist-app/...`) and silently reports "No migrations are pending".

## Deployment Topology & UI Boundary

**The hosted auth pages live on the IdP origin.** `/authorize`, `/register`,
`/activate`, `/password-forgot`, `/password-reset`, `/logout` render in
`@authup/server-auth-console`, but always on server-core's origin (same
listener under `authup start`, or a proxy rule). Serving them on another
origin is rejected, because:

- WebAuthn rpId/origin derives from `publicUrl`.
- The `prompt=none` / `select_account` decisions are taken client-side from
  first-party kit cookies on the `/authorize` origin. The console session
  cookie cannot help: it is denied on the issuance surface.
- Each workflow path answers a page on GET and the JSON API on POST.
- Mail deep links land on these pages; headless deployments
  (`ADMIN_CONSOLE_ENABLED=false`) still need them.

The admin console is an ordinary OAuth2 client (per-realm `admin-console`)
with no privileged channel. Cookie mode applies to it because it is served on
the same ORIGIN, whichever process answers.

**CLI sign-in (`authup login`, #3592)** (`apps/authup/src/host/`):

- `login` runs the device grant against an OPERATOR-SUPPLIED client
  (`--client`, `--realm`, remembered in `$XDG_CONFIG_HOME/authup/hosts.json`).
  Rejected: a provisioned `cli` client, because the client's `accessPolicyId`
  is the operator's admission control.
- The realm hint must ride BOTH the device request and every `/token` poll: a
  client name without a hint resolves in master, mismatches the device code's
  client and answers `invalid_grant`.
- Tokens go to the OS keychain (`@napi-rs/keyring`, optional, lazy, kept out
  of the bundle via `neverBundle`) unless `login --insecure-storage`. A
  keychain failure is an error, never a silent file fallback. Plain `http:` is
  refused for non-loopback hosts.
- `createHostClient` attaches `ClientAuthenticationHook` (`timer: false`).
  Refresh runs under `hosts.lock` (stale after 30 s) and re-reads the store
  first, adopting another process's rotation instead of replaying the refresh
  token into family revocation. The refresh grant uses a second, hook-less
  `Client`, since a `/token` 401 without an RFC 6749 `error` body would
  re-enter the hook's own refresh (#3757).
- `logout` revokes both tokens and never calls `DELETE /sessions/@me`: the
  device tokens ride the approving browser's session row.
- Entity commands are derived under ONE `api` group (`authup api realm
  list`) by `defineCLIEntityCommands` from `EntityType` via `pickEntityAPI`,
  skipping `userAuthenticator`. A new entity-shaped sub-API becomes a command
  with no CLI edit. Rejected: nouns at the root (a derived set would collide
  with operator commands), a raw `api <path>` passthrough, a hand-listed set.
- Several filter conditions ride one `--filter` joined by `&`: citty parses
  with no `multiple`, so a repeated flag keeps only its last value.
- `describeHostError` always adds method and url, because the kit `Client`
  overwrites a hapic error message with `response.data.message`. The thrown
  error renders via `nodejs.util.inspect.custom`, or citty dumps a stack.

**Process topology: one binary, one listener verb, several roles.**

- `authup` (`apps/authup`) runs every service IN PROCESS: no spawn, no
  supervisor. Signals, exit codes and env reach the server directly;
  `registerShutdownHandlers` exits 1 on a second signal and after a 10 s
  teardown timeout. `PORT`/`HOST` follow ordinary precedence.
- `start` composes server-core's `createApplication` /
  `createWorkerApplication` / `HTTPModule({ mount })` plus the consoles.
  `migration` reuses server-core's `defineCLIMigrationCommand`; only
  server-core's dev CLI passes `{ generate: true }`, because `generate` drops
  the local compose databases and writes into the checkout.
  `apps/server-core` ships no `bin`.
- Roles are the positional of `start`: `start` (everything), `start core` (API
  only, reads no console config), `start worker`, `start console
  [admin|account|auth]` (each console on its own port). A role, not a
  subcommand or boolean flag, because they are one thing started differently.
- citty 0.2.2 facts that shape `start` (`apps/authup/src/commands/start.ts`):
  1. A positional's `options` is decorative, so role, console name and arity
     are refused by hand in `setup` before anything boots. `migration`
     operations likewise (#3542: a typo applied every migration and exited 0).
  2. Parsing is non-strict, so `start` declares a tombstone `worker` boolean
     and throws on it; otherwise a stale `--worker` boots the full API.
  3. A subcommand is re-parsed with only its own args, so `start` spreads
     `CLI_CONFIG_ARGS` itself or a trailing `--configDirectory /x` becomes a
     positional.
  4. `--help` shows choices only via `valueHint`.
  5. `assertNoStrayPositionals(args, commands)`
     (`apps/server-core/src/cli/commands/config.ts`, default `{'start'}` for
     server-core's dev CLI) is called by authup's root with `{'dev'}`.
- Container: `entrypoint.sh` strips an optional deprecated `server/core`
  prefix (scheduled for removal in v1.0.0), `cd`s into `apps/server-core` (typeorm's
  cwd-relative driver lookup) and execs the CLI with `--configDirectory
  /etc/authup`. `WORKDIR /opt/authup`, `CMD ["start"]`, `HOST`/`PORT` are
  `ENV` defaults (so `-e PORT=` wins). No state directory: only
  `PROVISIONING_DIRECTORY_PATH=/etc/authup/provisioning` (read) and
  `LOG_DIRECTORY_PATH=/var/log/authup` (written). The `HEALTHCHECK` probes
  `PORT`, which fits every role but `start console`, which overrides it.
- Each console is its own runnable SERVICE: `createApplication` over
  `@authup/server-console-kit`, started by both `authup start console` and the
  `authup-<name>-console` bin, so the two cannot diverge. server-core imports
  none of it.
- Mount window: `HTTPModule` runs the `mount` callback itself, AFTER the
  controllers (a console wildcard shell must not shadow
  `/console/<name>/login/start`) and BEFORE the error middleware, before
  listening. Mounting on the resolved app after `setup()` is too late.
- Mount path = console url path MINUS publicUrl's path
  (`assertConsolePath`, `apps/authup/src/console/path.ts`): the proxy strips
  publicUrl's prefix, so the full path 404s (#3531). A console url with no
  path of its own, or outside publicUrl's prefix, is refused (composed roles
  only). The console's `basePath` stays the full browser-facing path.
- Composed roles hand the auth console this process's listen address as its
  internal API url unless the document names one (`applyInternalApiUrl`,
  `console/api-url.ts`); see *Auth Workflow UI*.
- The console role closes listeners with `close(true)`, or container stop
  waits out every keep-alive socket.

**Worker mode** (`authup start worker`, `createWorkerApplication` in
`app/factory.ts`): config, logger, cache, database, components and a health
listener, no API.

- `core.worker.enabled` (`WORKER_ENABLED`) says whether this process runs the
  sweeps. Default mode runs them alongside the API; worker mode requires it
  (`ComponentsModule({ required: true })` throws) so it cannot come up idle.
- Worker mode never migrates: `verifySchemaOrSynchronize`
  (`app/modules/database/migration.ts`) fails the boot when the chain is
  behind. Its no-migrations (sqlite) branch must fall through to
  `synchronizeDatabaseSchema`, or a sqlite worker has no schema.
- `WorkerHealthModule` (`app/modules/components/health.ts`): bare
  `node:http`, `GET`/`HEAD /` answer 200 or 503 while any component is
  overdue (`COMPONENT_OVERDUE_AFTER` 5 min without success, unless a pass is
  running and younger than `COMPONENT_HUNG_AFTER` 30 min). Binds
  `core.worker.port`, which defaults to `core.port`. A database outage answers
  503, so in Kubernetes it is a readiness probe, never liveness.
- Components are hubwire `defineScheduledComponent` (`noOverlap`). `stop()`
  does not wait for a running pass, so teardown awaits each `settled?.()`
  before the database module tears down.

**Console replica sets** (`docs/src/guide/deployment/console-replicas.md`):

- All consoles live under `/console`; the proxy routes `/console/**` to
  `start console` replicas, EXCEPT `/console/<name>/login/start` and
  `/console/<name>/callback`, which must reach the API set (the pending-login
  cookie is issued on the origin that reads it back).
- Redis is required for a split; sticky routing is no substitute (the
  authorization code is minted on one API replica and popped on another).
  sqlite cannot split.
- There is no `authConsoleEnabled`: the auth pages are the issuance surface.

**Configuration** is one `authup.yml` per deployment; env always beats file.

- Discovery is narrowed to the root file name by a custom confinity naming
  scheme (`packages/server-config/src/read/fs.ts`), since confinity's default
  would let `authup.<name>.<ext>` place keys at the document root. A retired
  `authup.conf` is reported, not read (otherwise the server silently boots on
  defaults).
- Every key is declared once in `@authup/server-config` (one folder per
  section under `src/sections/`). Services SELECT: server-core's
  `app/modules/config/constants.ts` spreads `ROOT_SCHEMA` and `CORE_SCHEMA`
  plus the console `url`/`enabled` keys it needs. Rejected: each package
  declaring what it reads, because agreement checks cannot cover zod types or
  descriptions and cannot see an omission.
- The mapped `Schema` type is the exhaustiveness guard: a `Config` key without
  an entry fails the build.
- A section is a nested registry: server-core reads its own sections flat
  (`config.port`), borrowed console keys nested (`config.adminConsole.url`).
  `defineSchema`'s `pathPrefix` stamps document paths. Compose passes with
  `mergeSchemaData`, never a spread: a spread of one key replaces the whole
  section and drops its file values and defaults.
- Derived keys use `resolve` (run in `resolveSchemaData`, lazily, so order is
  irrelevant): every listener `host` defaults to `''` and inherits the root
  `host` (`HOST`); `publicUrl` derives from `core.host` + `core.port`
  (`derivePublicUrl`), which is why consoles carry the core section and can
  compute the same issuer standalone. `port` has no inheritance.
- Each console's `resolveConfig` runs `mountSchema` over its own selection, or
  a bad file value (the file read is verbatim, unlike the env readers) would
  boot unvalidated.
- Sections sit at the document root; there is no `server.` wrapper. A
  document carrying `server:` has the subtree skipped silently.
- `@authup/server-config-kit` (the mechanism) depends only on `@authup/kit`,
  never server-kit: consoles must not inherit native bcrypt/jsonwebtoken,
  winston, redis, socket.io or `@rapiq/core`. `@authup/server-config` declares
  its own option types (`DatabaseConnectionOptions`, `RedisConnectionOptions`,
  `SMTPConnectionOptions`, `MiddlewareOptions`) for the same reason;
  server-core casts at the boundary.
- Cross-section invariants live in `normalizeConfig`, including: every console
  url must be on publicUrl's ORIGIN (a foreign domain half-works, since
  cookie mode and `prompt=none` need the same origin).
- Env readers are chosen per entry: the security toggles (`worker.enabled`,
  `migrationEnabled`, `eventLogEnabled`, `eventLogEntityEnabled`,
  `loginAttemptThrottleEnabled`, `mfaEnabled`, `mfaRequired`,
  `querySchemaDiscoveryEnabled`, `userAdminEnabled`) use `readEnvBoolStrict`
  (throws on an unknown value); other booleans silently skip `yes`. Choose a
  new key's reader deliberately.
- The JSON Schema is generated, never committed: `.github/workflows/docs.yml`
  runs `authup config schema` into `docs/src/public/schema/config.json`
  (gitignored), over the WHOLE document. `config` lives in `apps/authup`
  because only there is the whole document assembled; `config validate` runs
  server-core's `normalizeConfig` and every declared zod type.

**Shared cookie domains are partly unsupported.** A standalone console or
downstream kit app sharing a cookie domain with the hosted auth pages clobbers
their cookies (same names). A `@authup/client-web-nuxt` consumer can set
`cookiePrefix` (#3527); a prefix is then a contract for that app's own
resource servers too. Two kit-default consumers on one host still collide (a
kit-level option, PR #3403, is parked). Served consoles are unaffected (cookie
mode, base-path-scoped cookies).

### Development mode (`authup dev`)

**EXPERIMENTAL**: the source-checkout detection and the vite-major coupling
may change.

- `authup dev` (`apps/authup/src/commands/dev.ts`) is `authup start`, except a
  console whose package is a SOURCE checkout (`isSourceCheckout`: a
  `vite.config.ts` in the resolved package dir, never a config key) is served
  through a vite dev server. Published consoles ship no vite config, so for an
  operator it behaves like `start`.
- Vite middlewares sit IN FRONT of the console handler (`compose()`,
  `apps/authup/src/dev/mount.ts`), never instead of it, and run with
  `appType: 'custom'`. With `spa`, vite would answer the shell itself and drop
  the theme, `ref` validation and security headers.
- Seams, all optional: the static consoles take `readShell(event)` on
  `createHandler`; the auth console takes `render` (dev inlines the SSR
  entry's CSS as `<style data-vite-dev-id>` so the page is not unstyled until
  hydration and HMR replaces rather than duplicates it); server-core runs from
  TS via the `authup-source` export condition (workspace only).
- The condition name must stay private to this repo. A public name like
  `development` is set by vite/vitest by default, and Node does not fall back
  when the matched target (`src/`, not published) is missing, breaking every
  downstream consumer with `ERR_MODULE_NOT_FOUND`. Keep the `default` entry
  next to `import`.
- Dev lands everything on one origin, so it exercises cookie mode. The
  standalone `npm run dev -w apps/client-*-console` (vite :5173) runs
  cross-origin and only reaches browser-PKCE.
- HMR ports: `resolveHmrPort` (`apps/authup/src/dev/server/module.ts`) takes
  the first free port at or above `HMR_PORT_BASE` (24678) immediately before
  each server binds, never all three up front (they would get the same port).
  Do not refuse to start on a busy port: vite only logs `EADDRINUSE`.
- Dev exempts console base paths from the rate limiter
  (`apps/authup/src/dev/middleware/rate-limit.ts`): a vite page load is
  hundreds of module requests.
- Security guards (the dev servers ride a listener bound to `HOST`):
  - `CONSOLE_FS_DENY` (`apps/authup/src/dev/server/module.ts`) adds
    `**/*.sql`, `**/*.sqlite`, `**/authup.yml`, `**/.env`, `**/.env.*`,
    `**/writable/**`, since `/@fs/` would otherwise serve the sqlite file
    holding plaintext signing keys. Supplying `fs.deny` REPLACES vite's
    default, which vite does not export, so `VITE_FS_DENY_DEFAULT` must track
    the vite floor. Use `deny`, not a narrower `allow`: the allow-list must
    span the workspace for the kit aliases.
  - `createOpenInEditorGuard` 404s any `__open-in-editor` path, registered
    before vite: vite's endpoint spawns a process on a cross-origin GET, and
    its host check does not stop it.
  - Primary control: `assertNotProduction(config.env)` refuses to start in
    production. The image has every `vite.config.ts` and devDependency
    installed (`npm ci` before `NODE_ENV=production`), so it looks like a
    source checkout.
- Every started dev server is registered for teardown as soon as it exists,
  closed with `Promise.allSettled` if a later one fails.
- Console vite configs alias the kit and theme packages to source, which
  makes kit edits hot in every console including the SSR pages.

| Edited | Effect |
|--------|--------|
| `apps/client-*-console/src/**` | Hot module replacement |
| `packages/client-web-kit/src/**`, the two theme packages | Hot module replacement |
| `apps/server-core/src/**` | No build; restart the process |
| `apps/authup/src/**` | No build; restart the process |
| `packages/server-*`, `packages/kit`, `packages/errors`, the console services | `npm run build -w <workspace>` required |

ts-node applies no tsconfig `paths`, so those last packages resolve to their
built `dist/`.

- `cli-dev` is unaffected and stays the `migration generate` runner and the
  only route to the JIT gate.
- `vite` is never a dependency of `apps/authup`: it is `await import('vite')`
  and `tsdown.config.ts` lists it in `deps.neverBundle`, or rolldown inlines
  the whole vite toolchain and `loadVite`'s graceful failure becomes
  unreachable.
- `apps/authup` devDepends on `better-sqlite3` only so the driver resolves
  with cwd `apps/authup`. Root cause (unfixed): server-core wants `^13` while
  typeorm peers `^12`, so npm nests it under `apps/server-core/node_modules`,
  out of typeorm's reach. The built CLI from any other cwd (repo root
  included) fails with `DriverPackageNotInstalledError`.
