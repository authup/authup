# Project Structure

The project is a monorepo using TypeScript and ESM modules.
It follows hexagonal architecture principles, separating core business logic, adapters, and interfaces.

## Applications

| Name | Type | Description |
|------|------|-------------|
| [authup](../apps/authup) | CLI | The operator CLI and the one binary an ordinary deployment runs. It imports every service and runs it **in process** (no spawn, no supervisor), so signals, exit code and environment reach the server directly and env beats `authup.yml`. It is the only workspace that knows all four config registries (see *CLI rules* below). It is also a CLIENT of a running deployment (`login`, `logout`, `whoami`, `api <entity> <verb>`); see topics/deployment.md -> *CLI sign-in*. |
| [client-account-console](../apps/client-account-console) | Application | The account console BUNDLE: a client-only Vite/Vue SPA (no SSR: auth-gated content cannot server-render) for end-user self-service (profile, password, authenticators, connected accounts, sessions, applications). Served by `@authup/server-account-console`; the same `dist/` is hostable standalone. Accepts an optional `ref` (the application the visitor came from), validated by the serving service. No binary, no process. See topics/consoles.md -> *Account Console*. |
| [client-admin-console](../apps/client-admin-console) | Application | The admin console BUNDLE: a client-only Vite/Vue SPA (no Nuxt, no process, no binary), served by `@authup/server-admin-console` with runtime config injected at `<!--admin-config-->` -> `window.__AUTHUP__`. Served on the IdP origin it uses the `HttpOnly` cookie-session credential; standalone it falls back to browser-side auth-code + PKCE. Route table in `src/router.ts` (route `meta`: `requireLoggedIn` / `requireLoggedOut` / `requirePermissions` / `layout`), guard in `src/guard.ts`, `src/App.vue` wraps the layout switch in `<Suspense>` for the `async setup()` detail pages. `/settings/*` redirects to the account console with `ref`. Landing page `/` is the event dashboard over `GET /events/@stats`; see topics/consoles.md -> *Admin Console* and topics/events-stats.md -> *Admin UI*. |
| [client-auth-console](../apps/client-auth-console) | Application | The auth console BUNDLE: the Vite-built Vue SSR app behind the hosted auth pages (`/authorize`, `/register`, `/activate`, `/password-forgot`, `/password-reset`, `/logout`, `/device`). Rendered by `@authup/server-auth-console` through its render contract (`src/contract.ts`: `render(RenderContext) => RenderResult`, `CONTRACT_VERSION`), which is the supported reskin seam: substitute the package instead of forking. Architecturally inseparable from the IdP origin, so never hosted standalone, and it has NO per-realm OAuth2 client row (it IS the IdP surface). No binary, no process. |
| [server-account-console](../apps/server-account-console) | Service | Serves `@authup/client-account-console`'s `dist/` over `defineStaticConsole` (`@authup/server-console-kit`). A thin declaration: package, marker `<!--account-config-->`, vite base `/console/account/`, config section `accountConsole`. Validates `ref` against the trusted app origins. `createHandler` is the mountable half; the `authup-account-console` bin starts `createApplication` (the same graph `authup start console account` runs). AGPL-3.0-only. |
| [server-admin-console](../apps/server-admin-console) | Service | The same shape for the admin console (`<!--admin-config-->`, `/console/admin/`, `adminConsole`), plus a wildcard shell route for nested client routes. One package per console because config ownership is one section per package, an account-only deployment never installs the admin dist, and the packages map one-to-one onto the `authup start console` names. |
| [server-auth-console](../apps/server-auth-console) | Service | The SSR service behind the hosted auth pages. It holds no credential, no loopback and no database: page data is read anonymously over HTTP from server-core, and on `/authorize` it forwards only the visitor's kit access-token cookie so the render shows the session the browser holds. Verifies the bundle's `CONTRACT_VERSION` against its own (`src/constants.ts`) at boot when a built bundle resolved and the render is not substituted. Carries its own config registry (`authConsole`) and applies the operator theme. See topics/consoles.md -> *Auth Workflow UI*. |
| [server-core](../apps/server-core) | Service | The backbone: the OAuth2/OIDC protocol surface and the management API, and nothing that renders a page. The hosted page GETs redirect to the auth console with the request's own query; the static consoles are served by their own services. Under `/console/<name>` it keeps only the cookie-mode pair `login/start` and `callback` (sessions, keys, cache; the pending-login cookie must be issued on the origin that reads it back). No `bin`: the CLI runs it in process. `HTTPModule({ mount })` lets the CLI compose console handlers onto the listener without server-core knowing consoles exist; mount ORDER is load-bearing (after the controllers, before the error middleware, before listen). Also runs worker mode (`authup start worker`, cron sweeps alone; topics/deployment.md -> *Worker mode*), publishes its query vocabulary (topics/query.md -> *Query vocabulary discovery*) and serves `auth_paths` (topics/paths.md). `src/cli/` is dev-only tooling plus the `defineCLI*Command` source the CLI composes. |

### CLI rules (`apps/authup`)

- `migration` composes server-core's exported `defineCLIMigrationCommand`, so the command body stays with the service and an embedder can reuse it. `start` (`src/commands/start.ts`) is the CLI's own command over server-core's factories (`createApplication`, `createWorkerApplication`, `HTTPModule({ mount })`) plus the consoles' `createApplication`: composing a listener is the CLI's job.
- `start` takes ONE positional, the role (`core`, `worker`, `console [admin|account|auth]`), validated by hand in its own `setup` before anything boots. It refuses an unknown role, a name after `core`/`worker`, an unknown console name, and a `--worker` flag (a declared tombstone, since citty's non-strict parse would otherwise swallow it). `start` re-declares `--configDirectory` / `--configFile` because citty re-parses a subcommand with only its own args. The root `setup` refuses a stray positional on `dev` alone (`assertNoStrayPositionals(args, new Set(['dev']))`). See topics/deployment.md -> *Process topology*.
- `healthcheck` (`src/commands/healthcheck.ts`) layers defaults, file and env but deliberately does NOT run `resolveSchemaData`: an unrelated cross-key invariant would fail the probe for the wrong reason. It spells the one inheritance itself (`core.host || defaultHost`) and hands it to `buildInternalUrl`, so a wildcard bind is dialed at 127.0.0.1. Reading the unresolved `core.host` gives `''`, which node coerces to `localhost`.
- `src/console/config.ts` hands each console its resolved section (`readConsoleConfigs`), resolving path keys against server-core's `rootPath`; each console validates it in its own async `resolveConfig`, so a bad value fails the boot. `config validate` / `config schema` (`src/commands/config.ts`) run against `@authup/server-config`'s whole-document `SCHEMA`, so no console key is reported unread or missing. The docs workflow publishes the schema as `docs/src/public/schema/config.json`, generated per deploy, never committed.
- **`dev`** (`src/commands/dev.ts`) is EXPERIMENTAL: `start` with every console whose package is a SOURCE checkout (a `vite.config.ts` next to it) served by a vite dev server with HMR, still through server-core's `mount` hook, so login exercises the cookie-session credential. It refuses a production environment and denies the database, `authup.yml`, `.env`, `writable/` and vite's `__open-in-editor` endpoint. server-core runs from TypeScript via the workspace-only `authup-source` export condition, which deliberately is NOT the public `development` condition (vite and vitest set that by default and broke every downstream consumer). See topics/deployment.md -> *Development mode*.

## Packages & Libraries

| Name | Type | Description |
|------|------|-------------|
| [access](../packages/access) | Library | Permission and policy evaluation. Record helpers (`evaluateRecord`, `evaluateRecordOneOf`, `reachesRecord*`, `evaluateRecordUpdate`) take a required `realm` (`undefined` throws) plus optional `realmId` / `clientId` naming the definition's owner (absent = global, #3769); `hasUnboundedReach` reports an `any` grant with no narrowing policy. `createAuthorizationEvaluator` builds an evaluator from the `GET /authorization` catalog plus introspected grants; `createAuthorizationCheckEvaluator` from `POST /authorization/check` verdicts. `projectAuthorizationPolicy` is the one wire projection of a policy tree, over an open validator registry (#3635). See topics/authorization.md and topics/realms.md -> *Realm reach*. |
| [client-web-kit](../packages/client-web-kit) | Library | Reusable Vue components, composables and the pinia auth store for any web client. Entity components include the folder tree (`APaths`, `APathPicker`, `APathTree`, ...). Hosted-page forms live under `src/components/workflows/` (one folder per flow); `apps/client-auth-console` pages are thin wrappers. Store contract below. |
| [client-web-kit-theme](../packages/client-web-kit-theme) | Library | Kit-level vuecs theme over `@vuecs/theme-tailwind`, and the owner of ALL kit component CSS (the kit ships zero `<style>` blocks). Rules below. |
| [client-web-nuxt](../packages/client-web-nuxt) | Library | Nuxt integration for downstream apps (hub); no authup app uses it. Route-meta permission requirements are a name or `{ name, realmId?, clientId? }`, a bare name meaning the global definition (#3769). Rules below. |
| [client-web-theme](../packages/client-web-theme) | Library | Authup app theme (extends `@authup/client-web-kit-theme`). CSS ships raw under `assets/css/` (`exports.style` + `./index.css`). It imports the kit theme via `@import "@authup/client-web-kit-theme";` and apps import it via `@import "@authup/client-web-theme";`. Tailwind v4 resolves CSS imports by node resolution honoring the `style` condition; the apps' `@authup/* -> src` aliases do NOT apply there, so do not switch these to relative paths. |
| [core-kit](../packages/core-kit) | Library | Domain types, validators, enums and utilities for the core service. |
| [core-http-kit](../packages/core-http-kit) | Library | Typed HTTP client with one sub-API per resource and workflow. Rules below. |
| [core-realtime-kit](../packages/core-realtime-kit) | Library | Client for the core socket service. |
| [create-authup](../packages/create-authup) | CLI | The install wizard (`npm create authup`). Rules below. |
| [errors](../packages/errors) | Library | `AuthupError` (extends `@ebec/core` `BaseError`), error codes, built-in subclasses, code -> HTTP status map and `Symbol.for(...)` duck guards. Every guard's fast path is `matchesInstanceof` (symbol or serialized-string `@instanceof` chain), so JSON-rehydrated errors still match (#3042); new guards must use it, never raw `hasInstanceof`. `isAuthupError` is decided by the chain alone; there is deliberately no shape fallback (`BaseError` + `issues`), because every `BaseError` carries `issues` and rapiq's `ParseError.inputRejected` would then pass unmapped. |
| [i18n](../packages/i18n) | Library | Framework-agnostic translation catalogs (ilingo `CatalogNode`) and the locale registry. Rules below. |
| [kit](../packages/kit) | Library | General, context-independent utilities. |
| [specs](../packages/specs) | Library | Constants, interfaces and utils for external specifications (OAuth2, OIDC, JWK). |
| [server-adapter-kit](../packages/server-adapter-kit) | Library | Authup layer over vouchly for resource servers: `TokenVerifier` (authup issuer matched on string `realm_id`, keys from the per-realm key endpoint, access-token `kind` gate, remote mode via `creator`, failures mapped onto `JWTError`) and `RedisTokenCache`. Must not inherit server-kit's native jsonwebtoken, winston or redis. |
| [server-adapter-node](../packages/server-adapter-node) | Library | Node `IncomingMessage` middleware adapter for token verification. |
| [server-adapter-socket-io](../packages/server-adapter-socket-io) | Library | socket.io middleware adapter for token verification. |
| [server-adapter-web](../packages/server-adapter-web) | Library | Transport-neutral Web `Request` adapter for token verification. |
| [server-config-kit](../packages/server-config-kit) | Library | The declarative configuration schema MECHANISM. Rules below. |
| [server-config](../packages/server-config) | Library | **Every key of `authup.yml`, declared exactly once.** Rules below. |
| [server-console-kit](../packages/server-console-kit) | Library | The page-serving mechanism every console service shares. Rules below. Apache-2.0 by the blanket `packages/` rule, accepted deliberately. |
| [server-kit](../packages/server-kit) | Library | Crypto, shared server primitives (`IEntityRepository`, `ActorContext`, `AbstractEntityService`) and service abstractions. One folder per concern (`cache/`, `core/`, `crypto/`, `domain-event/`, `logger/`, `redis/`, `utils/`), each `module.ts` + `types.ts` + `index.ts`. **No singletons**: no `useLogger` / service locator and no vault module; factories (`createLogger`, `createNoopLogger`, `createRedisClient`) passed down by constructor (DIP). `Logger` is a winston-shaped structural type. `DomainEventPublisher.publish` runs every handler even when one throws, then rejects with the first error; `safePublish` catches and logs, so an event-bus failure never fails the originating DB transaction. |
| [server-test-kit](../packages/server-test-kit) | Library | Generic server-side test fakes (`FakeEntityRepository`, `FakePermissionEvaluator`, actor factories). devDependency-only. |

### client-web-kit store

- `status` is presence-derived (`unauthenticated | authenticating | restoring | authenticated`): AUTHENTICATED means token + realm + user present (validation is `resolve()`'s job); a refresh-token-only store reads RESTORING. `lastAuthOrigin` is `login | exchange | restore`. Session lifecycle is read from these two only: there is no `loggedIn` flag, no public token/realm setters, no lifecycle events. The dispatcher carries token-ref updates, `USER_UPDATED`, `REALM_MANAGEMENT_UPDATED` and the involuntary `SESSION_EXPIRED`.
- Sessions are staged across network round trips and committed in one synchronous block. A failed login/exchange reverts and best-effort revokes the staged tokens; a generation counter keeps an interleaved logout final.
- `permissionEvaluator` is one stable `StorePermissionEvaluator` delegating to the evaluator built from `POST /authorization/check` (owners `granted`, `targetRealms: ownOrNull`), memoized by the introspection's subject, scope and grants and refetched when the route's `max-age` runs out (#3618). That route is the store's ONLY authorization source, because the store is always a browser client acting AS the actor; the catalog (`GET /authorization`) is the resource-server surface and is not consulted even as a fallback. A 404 lands on the name-only view. See topics/authorization.md -> *The batch check*.
- SSR rides one optional seam, `install({ hydrationStore })`; without it the kit performs no server-side loads. See topics/ui.md -> *SSR data handoff*. What the store persists: topics/ui.md -> *What the kit store persists*.

### client-web-kit-theme rules

- CSS lives under `assets/css/` (`index.css` + `styles/{tokens,picker,account,auth,realm,login}.css`); kit structural classes are `a-`-prefixed and rules sit in `@layer components` so consumer utilities can override single properties.
- Kit-theme tokens reference ONLY `--vc-*` aliases or neutral literals, never app-theme brand vars; `@authup/client-web-theme` rebinds `--authup-auth-accent{,-alt}` / `--authup-auth-logo-background` from its `@layer base`. `tokens.css` declares `--authup-<component>-*` tokens in `@layer authup`, placed before `base` so a consumer override wins; they default to `--vc-color-*` aliases so dark mode tracks for free.
- The `--authup-{auth,account}-logo-image` / `-logo-mark-visibility` pairs are the operator-logo seam (topics/consoles.md -> *Console Theming*): the image paints onto the built-in mark's `<svg>` box and only the mark's CHILDREN are hidden (`visibility` on the svg would take the background with it).
- CSS ships **raw** (`files: ["assets", "dist"]`, `exports.style` + `./index.css`); tsdown builds only the theme factory. **Do NOT bundle the CSS**: rolldown strips bare `@layer a, b, ...;` statements, which silently breaks the cascade order.
- **Element-key typing:** `ThemeElements` in `@vuecs/core` is an EMPTY interface filled by module augmentation, so both theme packages `import type {}` every component package whose keys they style (devDependency-only). Without it the keys compile UNCHECKED in the theme and error in a consumer that loads other augmentations.
- The `@source` hops in `assets/css/index.css` must resolve from both the workspace path and `node_modules/@authup/client-web-kit-theme/assets/css`; `@authup/client-web-kit` is an optional peer so the kit lands adjacent.

### client-web-nuxt rules

- `serverApiURL` is the one option routed to the private `runtimeConfig.authup` (read only in `import.meta.server`), so the internal API address never reaches the serialized public config. Its override is `NUXT_AUTHUP_SERVER_API_URL`, not `NUXT_PUBLIC_...`.
- It is a DIAL address only: `baseURL` stays the public API URL on both sides, and the server plugin passes `httpClient` a FUNCTION building `new Client({ baseURL: public, transport: createRebasedTransport(public, serverApiURL) })` (`runtime/helpers/http-client.ts`), because everything derived from the base is user-facing and hydration never corrects an attribute (#3754).
- The kit's `httpClient` is `IClient | (() => IClient)`: a function is called once per consumer, an instance is shared. Hosts that refresh must pass a function, since with one instance the refresh runs on the client the hook is attached to. The hook rejects a `/token` refusal carrying an RFC 6749 section 5.2 `error` without refreshing (#3757), but a `/token` 401 without that body still waits on itself. The auth console passes one instance safely because its render never refreshes.

### core-http-kit rules

- Entity **record** responses are `{ data, meta }` (`EntityRecordResponse`); query-capable GETs carry the vocabulary under `meta.schema` (rapiq `SchemaDescription`, #1649). The sort vocabulary key is `meta.schema.sorts` (rapiq 2.1.0); `sort` is gone from `meta.schema`, a wire-visible rename. The URL parameter is still `?sort=`.
- Entity-type dispatch goes through `pickEntityAPI(client, type)`; `ClientEntityAPIKey = keyof IClient & keyof EntityTypeMap`, and the cast-free `ClientEntityAPIRegistry` assignment is the compile-time proof that each sub-API serves its record type. `EntityAPIDispatch<T>` is per-verb optional (sessions/events read+delete, junctions no update), so callers guard per method instead of `as any`-indexing (#3087). `getStats` and `getSchema` are optional facets of it, which is how the CLI derives its `stats` and `schema` verbs.
- `client.<entity>.getStats(query?)` is `GET /<collection>/@stats` on the 13 admin-console entities (`src/domains/stats/`); `EntityStatsResponse` is not the entity envelope. `client.schema.getMany()` reads `GET /schemas`, also not the envelope (`meta`: `version`, `hash`, `recordParameters`). See topics/events-stats.md and topics/query.md.
- RFC 8628: `client.deviceAuthorization.create / lookup / approve / deny` and `client.token.createWithDeviceCode`. `create` drops the client-level `Authorization` header unless `authorizationHeaderInherit` is set (the token-API rule), so an authenticated client never sends mixed credentials.
- `client.client.rotateSecret(id, payload?)` answers the record plus the plaintext once under `meta.secret`; `ClientUpdatePayload` omits the storage flags. `client.realm.getOne(id)` carries `meta.endpoints` (`issuer`, `openidConfiguration`, `jwks`); `IRealmAPI` overrides only `getOne`. `StatusResponse` carries `publicUrl`, `endpoints` and `consoles` (a member is `null` for a surface that is off). `client.authorization.get` / `check` / `checkWithMaxAge` are the catalog and batch check (topics/authorization.md).
- `createRebasedTransport(from, to, transport?)` keeps a `Client`'s `baseURL` public while it dials an internal address. The default backend URL `API_URL_DEFAULT` (`http://localhost:3001`) lives here, not in `@authup/kit`.

### create-authup rules

- A `node:readline/promises` prompt flow feeds one pure renderer per target (`docker`, `compose`, `helm`, `bare-metal`); `src/index.ts` writes into cwd and never overwrites without `--force`. **Zero runtime dependencies** (node built-ins; YAML and env files are string templates). It never runs a service; every emitted file invokes the `authup` CLI or image, which is why no `authup init` alias exists (it would drag the server and console dists into "write me a compose file").
- Versions are the package's own `pkg.version`, pinned EXACTLY, never `latest` (release-please links image tag, npm version and wizard version). Helm names no tag, since the chart's `appVersion` owns it.
- It lives in the monorepo because every template value is a function of this repo's deployment surface. `test/unit/drift.spec.ts` checks every emitted `authup.yml` with `findUnknownSchemaPaths` against `@authup/server-config`'s `SCHEMA` and every emitted env name against the known sets; `@authup/server-config` is a devDependency for exactly that. Helm values are the one target tracking another repo (authup/helm), so their key set stays small; `test/unit/helm-schema.spec.ts` validates them against vendored chart fixtures. `npm run test:artifacts` (`scripts/verify-emitted.mjs`, weekly) hands each document to its real consumer (`docker compose config`, `nginx -t`, `helm template` against the live chart, `authup config validate`).
- Rules the emitted files rest on: every target derives the published/listen port from the public url and writes `TRUST_PROXY` as a hop count or `false`; secret files (`SECRET_FILES`) are written `0600` and an overwrite re-applies the mode; a secret dotenv cannot round-trip is refused at the prompt (`isEnvRepresentable`); secrets are muted on a TTY (`src/ask.ts`); a compose console split forces redis on and emits nginx config. Quoting specs use the real parser (dotenv, `docker compose config`, the chart schema) as oracle, never a restatement of its rules. Apache-2.0.

### i18n rules

- `TranslatorTranslationNamespace` values are `authup`-prefixed (`authupEntity`, `authupField`, `authupAction`, `authupCommon`, `authupError`, ...) so a host app cannot collide. Catalog modules are one file per namespace per locale (`catalogs/{en,de,fr,es}/*.ts`); the locale-parity test enforces exact key parity, and adding a locale to `LOCALES` surfaces it in the switcher.
- Entity nouns are ilingo plural nodes (`definePlural`); call sites pass `count` instead of using a separate plural key. `authupMail` holds transactional mail copy consumed server-side by server-core's mail renderer.
- `authupPermission`, `authupScope` and `authupPolicy` are keyed by the identifier enums (`PermissionName`, `ScopeName`, `SystemPolicyName`), which is why `access` and `core-kit` are runtime dependencies; the parity test reads its key set from the enums. Policy names are dotted, so lookups escape the dots (`useEntityNameTranslator()`, `core/translator/entity-name.ts`). Label precedence: `displayName`, then the catalog label (built-in rows only), then the raw `name`. `useEntityNameSearch()` ORs catalog-label matches into the search as `in(name, ...)`.

### server-config-kit rules

- A REGISTRY maps every config key onto its zod type, description, default and optional env name plus reader. The mapped `-?` `Schema` type is the compile-time exhaustiveness guard. Passes: `readSchemaFromEnv`, `readSchemaFromFileTree`, `buildSchemaDefaults`, `mountSchema`, `mergeSchemaData`, `resolveSchemaData`, `buildSchemaJSONSchema`. Folders: `schema/`, `entry/`, `source/` (defaults, file, env, merge, resolve), `json-schema/`, `validation/`.
- A registry is SHAPED like its config (a section is a nested registry); document-space passes (file read, unknown-path scan, JSON Schema) flatten it, since every entry carries an absolute path. **Compose with `mergeSchemaData`, never a spread**: a later pass carrying one key of a section would replace the whole section.
- An entry's `resolve` derives a key from the merged document via `get(path)` (lazy, memoized, cycle throws). Reference is by PATH, never by entry object, because `defineSchema` clones an entry when it stamps a prefix.
- One internal dependency, `@authup/kit`. The rule is its reason: nothing carrying server-core's or server-kit's TAIL (native `@node-rs/bcrypt` / jsonwebtoken, winston, redis, the socket.io emitter, `@rapiq/core`), so consoles can read config. See conventions.md -> *Dependency Classification*.

### server-config rules

- One folder per document section under `src/sections/`: `root/`, `theme/`, `core/`, `admin-console/`, `account-console/`, `auth-console/`. A section declares keys in the vocabulary of its service and spells no location; `defineSchema`'s `pathPrefix` derives it. A service declares nothing and SELECTS: it spreads its own section flat and keeps other sections nested, so it cannot mis-spell a path, env var or reader.
- `internalUrl` resolves to `publicUrl` unless named (#3550). Every listener's `host` defaults to `''` and resolves to the root `host` (env `HOST`); `port` has no counterpart because three listeners cannot share one.
- Normalization lives in each key's `resolve`, so a console computes `publicUrl`, canonical `trustedOrigins` and its own url without server-core.
- The document's TYPES are authup's own (`DatabaseConnectionOptions`, `RedisConnectionOptions`, `SMTPConnectionOptions`, `MiddlewareOptions`), not typeorm's / server-kit's / routup's, because a leaf every console imports cannot carry that tail; server-core casts at the boundary. `expandToOrigins`, `isValidTrustProxyListEntry`, `CERTIFICATE_SOURCES`, `EVENT_LOG_RETENTION_DAYS_DEFAULT` travel with their keys.

### server-console-kit rules

- Three groups: html helpers (`readUIClientPreferences`, `stampHtmlAttributes`, `replaceTemplateMarker`, `injectHeadContent`, `stampDocumentTitle`, `applyUIPageHeaders`, `rebaseAssetURLs`, `serializeInlineScriptJSON`); **`defineStaticConsole`**, one closure per console AND per handler; the theme subsystem (`ThemeProvider`, `applyTheme`, `createThemeAssetsHandler`, and `theme/contract/`, which imports nothing from node or routup).
- `replaceTemplateMarker` is why this is a package: a string replacement re-interprets `$&`, `` $` ``, `$'`, `$$` in the VALUE, spliced values carry raw request input, and the helper that defends it must exist once.
- Every piece of `defineStaticConsole` state is instance-scoped; a `setPackagePath`-style mutator would make two handlers in one process share a resolution.
- `createApplication` composes a console's module graph straight from orkos (`ConfigModule` + `ThemeModule` + `HTTPModule`), so a console is a runnable SERVICE; the bin and `authup start console` start the same thing. A pre-registered token wins (the test seam). Not a builder like server-core's `ApplicationBuilder`: a builder for two modules would be a factory for one product.
- Consumers must DECLARE the kit, never bundle it: `TypedToken` ids are `Symbol(name)`, so a second inlined copy resolves against nothing. The logger is a structural `ConsoleLogger`, never server-kit's. `tsconfig.build.json` pins `"types": ["node"]` because no dependency references node types.

## Package Dependency Layers

Changes to a lower-layer package affect all packages above it. Build order follows these layers.
Internal `@authup/*` dependencies are declared in each package's `package.json` (dependencies, devDependencies, peerDependencies): always consult those for the authoritative graph.

```
Foundation (no internal @authup deps):
  kit, errors
  create-authup     (no runtime @authup deps; devDeps server-config, server-config-kit for
                      the drift spec. Not @authup-scoped: npm resolves `npm create authup`)

Layer 1:
  server-config-kit → kit (+ envix, validup, @validup/zod, zod). The rule is "nothing
                      carrying server-core's/server-kit's tail", not "no @authup dep"
  server-config     → core-kit, kit, server-config-kit (no native bindings)
  specs             → kit, errors
  core-realtime-kit → kit
  server-console-kit → errors, kit (+ locter, validup, @validup/zod, zod, @routup/basic;
                      routup is a peer: the consumer owns the App. NOT server-kit)

Layer 2:
  access            → kit, errors
  core-kit          → kit, errors, specs
  server-kit        → access, core-kit, kit, specs, core-realtime-kit, @rapiq/core (IQuery is
                      re-exposed in the public .d.ts)

Layer 3:
  core-http-kit     → access, kit, core-kit, specs (errors devDep-only)
  i18n              → access, core-kit, errors (+ ilingo; validup optional peer for its
                      re-exposed `declare module`; access/core-kit key the identifier catalogs)
  server-adapter-kit → kit, errors, specs, core-http-kit (+ vouchly, redis-extension;
                      server-kit and jose devDep-only: adapters must not inherit server-kit's tail)
  server-test-kit   → access, core-kit, kit, server-kit, @rapiq/core (types re-exposed by the fakes)

Layer 4:
  server-adapter-node      → server-adapter-kit
  server-adapter-socket-io → server-adapter-kit (errors devDep-only)
  server-adapter-web       → server-adapter-kit (errors, core-http-kit, server-kit, specs devDep-only)

Application libraries:
  client-web-kit    → access, kit, core-kit, core-http-kit, core-realtime-kit, errors, i18n, specs
  client-web-nuxt   → access, kit, core-http-kit, client-web-kit

Apps:
  client-account-console → client-web-kit, kit, core-kit, core-http-kit, i18n, specs (build-time
                      only: the artifact is the static dist/)
  client-auth-console → client-web-kit, kit, core-kit, i18n (build-time) + core-http-kit (RUNTIME:
                      src/contract.ts re-exposes IClient)
  client-admin-console → access, client-web-kit, kit, core-kit, core-http-kit, i18n, specs (build-time;
                      NOT client-web-nuxt, which stays the integration for downstream apps)
  server-core       → access, i18n, kit, core-kit, core-http-kit, errors, server-config,
                      server-config-kit, server-console-kit, server-kit, specs (+ ilingo)
                      (NO console package: a server-core-only install pulls no console dist.
                       server-console-kit is kept for the shared vc-locale cookie name)
  server-account-console → client-account-console (RUNTIME: the dist it serves), kit, server-config,
                      server-config-kit, server-console-kit (+ routup, @routup/assets, @routup/basic,
                      @ebec/http, zod)
  server-admin-console → client-admin-console (RUNTIME), kit, server-config, server-config-kit,
                      server-console-kit (+ the same routup set)
  server-auth-console → client-auth-console (RUNTIME: the SSR bundle), core-http-kit (calls the API
                      without a credential of its own), errors, kit, server-config, server-config-kit,
                      server-console-kit, specs (OAuth2UIColorMode) (+ locter, routup, @routup/assets,
                      @routup/basic, zod)
                      (NOT server-core, in any of the three, and server-core never depends on a console:
                       either direction would drag the other's tree in)
  authup (CLI)      → server-core, server-account-console, server-admin-console, server-auth-console,
                      server-config, server-config-kit, server-console-kit, core-http-kit, core-kit,
                      errors, kit, specs (it imports and runs every service, so all are runtime deps;
                      the only workspace depending on all of them)
```

An undeclared `@authup/*` import still resolves through the workspace symlinks but is missing from nx's project graph; declare it (see conventions.md -> *Dependency Classification*).

## Separation of Concerns

- **Domain logic** -> core-kit
- **API clients** -> core-http-kit
- **UI components** -> client-web-kit

## UI Stack (`apps/client-admin-console`, `apps/client-auth-console`, `packages/client-web-kit`)

| Layer | Package(s) | Notes |
|---|---|---|
| **Theming** | `@vuecs/core` (3.x) + `@vuecs/theme-tailwind` (6.x) via `@authup/client-web-theme` | One CSS entry (`@authup/client-web-theme/index.css`) pulling `tailwindcss`, `@vuecs/design` and `@vuecs/theme-tailwind`. There is no Bootstrap-compat layer: render a `<VC*>` component (`<VCDropdownMenu>`, `<VCModal>`), never Bootstrap class names. See topics/ui.md -> *Theme and Tailwind rules*. |
| **Icons** | `@vuecs/icon` + `@vuecs/icons-font-awesome` | Icon DATA is bundled per app at build time (#3345): each console runs `NuxtIconBundle` from `@nuxt/icon/vite` and imports `virtual:nuxt-icon-bundle/register`; the kit ships no runtime registration of the full FA collections, so a consumer runs the same scan or registers its own icons. **The glob list fails silently** (an empty icon slot, no build error): it must cover `packages/client-web-kit/src`, `node_modules/@vuecs/icons-font-awesome/dist/*.mjs` (vuecs behavioral defaults no authup file names) and `.ts`. `apps/client-auth-console/test/unit/icons.spec.ts` is its only guard. **Do not use `<VCButton>`'s `icon-left` prop**: render `<VCIcon>` in the `#leading` slot (the one exception is `useSubmitButton()`'s derived `iconLeft`). |
| **Links** | `@vuecs/link` (2.x) | `<VCLink>` picks `NuxtLink` / `RouterLink` / `<a>`; prefer it over `resolveComponent('NuxtLink')`. A button-styled link is `<VCButton :as="VCLink" :to>`. From `@vuecs/button` 1.4.1 a bare `:disabled` guards such a link (aria-disabled, tabindex -1, click capture), which `<AContentAction>`'s `add-disabled` relies on. The entity index pages' permission-gated edit links instead withhold the target (`:to="... ? url : undefined"`), which stays sound (#3071). Tailwind's `disabled:` never matches an `<a>`; the cue comes from `aria-disabled:*` utilities in `clientWebKitTheme()`. |
| **Breadcrumbs** | `@vuecs/navigation` (4.4.1) | `<VCBreadcrumb :items>` in driver mode, first element of every admin collection and detail page. Built by `apps/client-admin-console/src/composables/breadcrumb.ts`: `useSectionBreadcrumb(section, { add?, children? })` appends at most one leaf and **must run synchronously in `setup()` before the first `await`** (it resolves through `inject()`); detail pages keep it as `breadcrumbBase` and call the plain function `buildEntityBreadcrumb({ base, entity, path, tabs })` after the record fetch. Labels, routes and icons always come from `LayoutSections`. theme-tailwind ships breadcrumb colour only, so `clientWebTheme()` supplies the layout classes; drop that once upstream ships them. |
| **Form controls** | `@vuecs/forms` (4.x) | Entity form SFCs render `<VCForm*>` directly with `@validup/vue`'s `useValidup` and `<IFieldValidation>` (no `buildForm*` shims, #3139). Name fields use `<ANameInput>`, secret fields `<ASecretInput>` (regenerate button in `#groupAppend`). **SSR-safety:** `generateName(seed?)` takes Vue's `useId()` captured once in setup so the name matches across SSR and hydration; `generateSecret()` takes no seed (a secret must not be predictable) and is generated client-side in `onMounted`. More form rules: topics/ui.md -> *vuecs 1.x SFC integration*. |
| **List rendering** | `@vuecs/list` (1.x) | `defineEntityCollectionManager` (`components/utility/entity/collection/module.ts`) composes `<VCList*>` directly and builds queries in the rapiq v2 IR (#3278); see topics/ui.md -> *vuecs 1.x SFC integration* (Collections). Pages construct query props with `defineQuery<T>({...})`. |
| **Tables** | `@vuecs/table` (>= 1.3.0) | `<VCTable :data :columns>` with `TableColumn<Entity>[]` and `#cell-<key>="{ row }"` slots (no annotation, so `row` infers). **Keep `VCTable` globally registered**: the generic component is not assignable to an Options-API `components: {}` slot (TS2769). Alignment via plain `headerClass` / `cellClass` (`clientWebTheme()` drops theme-tailwind's baked `text-left`). See topics/ui.md -> *Table usage*. |
| **Pagination** | `@vuecs/pagination` (2.x) via `<APagination>` | Adapter bridging the collection footer `meta` onto `<VCPagination>`; page changes send only `{ pagination }`, search/sort state stays in the manager. |
| **Overlays** | `@vuecs/overlays` (1.x) | `<VCToaster>` in the admin `components/footer.vue` and the auth console `App.vue`; `useToast()` shimmed in `apps/client-admin-console/src/composables/toast.ts` (`toast.show(string \| { variant, body })`). Confirmations use `useAlertDialog()` (resolves `true`/`false`, SSR `false`) with ONE `<VCAlertDialogProvider>` in the admin `layouts/default.vue` root (the manager is app-level via `app.use(installOverlays)`). `<AEntityDelete>` prompts by default (`withPrompt`, opt out with `:with-prompt="false"`). |
| **Tree** | `@vuecs/tree` (1.x) | `<VCTree>` behind `APathTree`; it selects (string keys, travel into `?path=`), it does not navigate. `parseTreePaths(paths, '/')` builds nodes from the flat path list. Generic, so globally registered (`app.use(installTree)`) like `VCTable`; `@authup/client-web-kit-theme` imports `@vuecs/tree/style.css`, without which every level renders at the margin. |
| **Charts** | `chart.js` (4.x) + `vue-chartjs` (5.x), admin console only | `EventVolumeChart` registers only what it draws. A canvas cannot read css, so colours are theme tokens read by `readThemeToken` (a `.ts` helper: the SFC eslint config declares no browser globals) and re-read on colour-mode flip. Two-series palettes must pass the dataviz validator (primary vs error, not green vs red). |
| **Other** | `@vuecs/{button, elements, countdown, timeago, navigation}` | Used via their `<VC*>` components after `app.use(installX)`. |

**Explicit component imports (preferred):** new or changed code should `import { VC* } from '@vuecs/*'` and register it in a local `components: {}` (or import it for `h()`), rather than relying on global registration: the dependency is visible and props are type-checked locally. `VCButton` and `VCIcon` are swept; migrate others opportunistically. Generic components (`VCTable`, `VCTree`) are the exception and stay global.

**Shared auth chrome and bootstrap fragments** live in the kit; the consoles are thin callers:

- `AAuthApp` (`components/utility/`): the page shell (`VCToastProvider` > `AAuthGadgets` > slot > `VCToaster`). Its `gadgets` slot appends controls to the ONE fixed top-right cluster (the account console's user chip and sign-out), so a page never grows a second top bar.
- `AAccountShell`: account-console content chrome (brand + nav tabs + content card); identity/session controls live in the gadget cluster.
- `AWorkflowDisabledNotice` (`components/workflows/`): the "workflow disabled" block of the four SSR workflow pages.
- `core/vuecs/`: `buildVuecsInstallOptions()` supplies the shared VALUES of `app.use(vuecs, ...)`. **Themes stay a caller argument** (the kit must not depend on the theme packages, which peer the kit) and each consumer keeps its own install ORDER.
- `core/cookie.ts` + `core/color-mode.ts` (#3377): `createCookieRef()` (a `document.cookie` ref; server-side the caller seeds `initial`) and `createColorMode()` over the shared `vc-color-mode` cookie. The `@vuecs/design` peer floor `^1.2.0` is load-bearing: `isColorMode()` must narrow the stored string before `bindColorMode`. The per-app `di.ts` payload modules were deliberately not folded into the kit's `core/{provide,inject}.ts`: different semantics, so folding would be a behaviour change dressed as a dedup.

**Runtime config:** a served console takes its API URL from the config its service injects and falls back to deriving it from its own location (`src/config.ts`; `VITE_API_URL` overrides at build/dev time). That fallback is what makes a standalone dist work, and it is also the silent degradation a moved config marker produces (the shell answers 200 either way). The marker is therefore a constant in the serving service, next to the vite base it must agree with.

### Page placement (client-admin-console)

- **Entity-type collections always get a top-level page** (`/users`, `/roles`, `/keys`, `/events`, `/sessions`, `/paths`, ...), scoped by the header realm switcher (`filter: { realmId: [realmManagementId ?? null, null] }`). Realm-scoped entities do NOT move under `/realms/[id]`: a realm tab would only duplicate the switcher.
- **Detail-page tabs render relations of one specific row**, never entity-type collections: junction associations (`users/[id]/roles`) and 1:n owned children (`users/[id]/sessions`). Such a tab is a parent-scoped lens; the canonical home stays the top-level page.
- **A collection page's action sits in its title row, not in a rail.** `pages/<section>/index.vue` renders `<VCBreadcrumb>`, then a flex row (`items-start`) of `<h1>` + sub title and `<AContentAction>`, then the `<NuxtPage>`. `<AContentAction>` (`packages/client-web-kit/src/components/utility/content-action/`) renders `Add` on the overview route, `Back` on the add route and **nothing elsewhere**. Each page binds `:add-disabled` to `usePermissionCheck({ name: <ENTITY>_CREATE })`. Both urls come from `buildSectionURLs(section)` (`config/layout/sections.ts`), never spelled per page: a moved section with a literal url makes the action render nothing, silently removing the create entry point. `/events` and `/sessions` have no add route. The `.content-wrapper` / `.content-sidebar` / `.content-container` rules in `client-web-theme` `styles/core/body.css` have no call site.
- **The sub title is a description under the heading** (`<p class="sub-title">`), not a qualifier inside it. Collection pages use the `authupApp` `<ENTITY>_DESCRIPTION` keys. Detail pages use `buildRecordHeading(entity)` (`src/composables/record.ts`): heading = `displayName` where there is one; sub line = `description`, else the `name` the heading gave up, else the `id`. It also supplies the breadcrumb crumb, so the two cannot disagree. The entity type never appears (the breadcrumb and sidebar already state it). `sessions/[id]` is not a caller (its heading is a subject). `.sub-title` (`client-web-theme` `styles/root.css`) uses an absolute font size, `--vc-color-fg-muted`, and is clamped to two lines (a record description is free text).
- **Sidebar entries and breadcrumbs read one descriptor map**, `LayoutSections` (`config/layout/sections.ts`, keyed by `LayoutSection`): `defineSectionNavigationItem` builds the sidebar link and `useSectionBreadcrumb` the crumb. Permissions stay out of the descriptor (visibility is a nav concern).
- **`Navigation.reduceItem` must never write back onto its input** (`config/layout/module.ts`): its items are elements of the module-level `LayoutSideDefaultNavigation` constant, so a write-back would keep entries removed for an earlier, narrower session. Reduce onto a copy. A group whose children were all filtered away is dropped when it has no `url` (it would render as a dead leaf).

### vuecs install order

`@vuecs/core` >= 3.1.0 merges install options into an existing manager (tada5hi/vuecs#1591), so a per-package plugin installed before `app.use(vuecs, ...)` does not leave fields unstyled. **Keep the explicit ordering anyway**:

- The consoles sequence installs by hand (`apps/client-admin-console/src/main.ts`, `apps/client-account-console/src/main.ts`, `apps/client-auth-console/src/app.ts`). A Nuxt consumer's vuecs plugin carries `name: 'vuecs'` so others can `dependsOn: ['vuecs']`.
- `packages/client-web-kit/src/module.ts` deliberately does NOT install `@vuecs/forms` or `@vuecs/pagination`; the consumer installs them after `app.use(vuecs, ...)`.
- An explicit `app.use(vuecs, { themes, icons, defaults })` is still required somewhere in the boot chain, or the manager keeps whatever empty config the per-package installs set up.
- A Nuxt consumer's vuecs plugin must `dependsOn: ['authup:kit']`, never `enforce: 'pre'`: the kit's `install()` provides the ilingo locale, and inverting the order makes `injectLocale()` throw, which aborts the plugin chain before `@pinia/nuxt` and surfaces as a misleading SSR "Cannot read properties of undefined (reading 'state')".

### Locale ownership (vuecs owns it, ilingo follows)

`@vuecs/locale` is the **source of truth** for the active UI locale: `vc-locale`-cookie backed, `auto`/browser-resolved, `<html lang>` synced, and it drives `Config['locale']`. This mirrors color mode (`bindColorMode` + `vc-color-mode`). A Nuxt consumer gets it from `@vuecs/nuxt`'s locale plugin (`name: 'vuecs-locale'`, `enforce: 'post'`); the consoles call `installLocale` with a `createCookieRef` source.

- `ALanguageSwitcherDropdown` writes through `useLocaleControl()` (`core/translator/locale.ts`), which prefers `useLocaleManager` and falls back to the ilingo locale ref when vuecs-locale is absent.
- ilingo follows one-way via `syncTranslatorLocaleFromManager(app)` (Nuxt: a post plugin with `dependsOn: ['vuecs-locale']`; consoles: right after `installLocale` + the kit install). There is no reverse bridge. Do **not** re-add a `config: { locale: injectTranslatorLocale() }` feed to `app.use(vuecs, ...)`.
- **The account preference rides the same refs, never a copy.** The store's `preferences: { locale?, colorMode? }` install option takes the app's cookie-backed refs, seeds them from the account's `locale` / `color_mode` claims on every commit, and writes switcher changes back to user attributes. `createCookieRef` hands out ONE ref per cookie name and document, so every `createColorMode()` is the same value. See topics/oauth2-authorize.md -> *The account-level UI preference*.
