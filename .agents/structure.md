# Project Structure

The project is a monorepo using TypeScript and ESM modules.
It follows hexagonal architecture principles, separating core business logic, adapters, and interfaces.

## Applications

| Name                                      | Type        | Description                                                                                           |
|-------------------------------------------|-------------|-------------------------------------------------------------------------------------------------------|
| [authup](../apps/authup)                  | CLI         | The operator CLI and the one binary an ordinary deployment runs. It imports the service packages and runs them **in process**: `migration` composes the `defineCLIMigrationCommand` helper server-core exports, so that command body stays with the service and a downstream embedder can reuse it; `start` (every role, `src/commands/start.ts`) is the CLI's own command over server-core's application factories (`createApplication`, `createWorkerApplication`, `HTTPModule({ mount })`) plus the three console services' `createApplication`, because composing a listener is the CLI's job and no single service holds every piece; `healthcheck` (`src/commands/healthcheck.ts`) is its own probe over `@authup/server-config`; and `config` (`validate` / `schema`, `src/commands/config.ts`) is its own because both subcommands are about the WHOLE `authup.yml`. No spawn, no supervisor, no config forcing (plan 101 D1). The process the operator starts IS the server, so signals, the exit code and the environment reach it directly, and `PORT`/`HOST` follow the ordinary precedence (environment beats the configuration file, one `authup.yml`). **It is also the only place that knows about all four config registries**: `src/console/config.ts` holds server-core's plus the three console services', hands each service its own resolved section (`readConsoleConfigs`, resolving path keys against server-core's `rootPath` so one document means the same thing to every service it configures), and `config validate` / `config schema` run against `@authup/server-config`'s whole-document registry, so a console's key is neither reported as unread nor missing from the emitted JSON Schema (which the docs workflow publishes as `docs/src/public/schema/config.json`, generated per deploy rather than committed). Root args `--configDirectory` / `--configFile` reach every subcommand, nested ones included (citty runs the root `setup` before it recurses), and `start` declares the pair itself as well, because citty re-parses a subcommand with only its own arg defs and a root flag placed after `start worker` would otherwise be read as the next positional. `start` takes ONE positional, the role (`core`, `worker` or `console`, the last followed by an optional console name), and validates it by hand in its own `setup` before anything boots: an unknown role (the retired `authup start server.core` selector shape), a name after `core` or `worker`, an unknown console name and the retired `--worker` flag (declared as a tombstone so citty's non-strict parse cannot swallow it, refused with a message naming `start worker`) are all refused. The root `setup` refuses a stray positional on `dev` alone, through the parametrized `assertNoStrayPositionals(args, new Set(['dev']))`; see architecture.md → *Process topology* for the citty facts behind that shape. **`dev`** (`src/commands/dev.ts`, plan 102) is EXPERIMENTAL: `start` with every console whose package resolves to a SOURCE checkout (a `vite.config.ts` next to it, no config key) served through a vite dev server with hot module replacement instead of its built `dist/`, all still landing through server-core's own `mount` hook at the one origin, so login exercises the cookie-session credential a served console uses in production rather than the standalone browser-PKCE flow. It REFUSES to start when the resolved environment is production, and its vite servers deny the database, `authup.yml`, `.env` and `writable/` over `/@fs/` plus vite's process-spawning `__open-in-editor` endpoint, because they ride the API's own listener rather than loopback. It additionally runs `server-core` from TypeScript via an `authup-source` export condition, which is workspace-only (a published install ships no `src/`) and deliberately carries authup's own name rather than the public `development` one, which vite and vitest set by default and which therefore broke every downstream consumer; see architecture.md → *Development mode*. |
| [client-account-console](../apps/client-account-console) | Application | The account console BUNDLE: a client-only Vite/Vue SPA (no SSR, since auth-gated content cannot server-render) for end-user self-service (profile, password, authenticators, connected accounts, sessions, applications). `@authup/server-account-console` depends on the package and serves its built `dist/` with per-request runtime-config injection; the same dist is hostable standalone on any static host (see architecture.md → *Account Console*). No binary, no process, a static bundle. Accepts an optional `ref` query parameter naming the application the visitor came from (validated by the serving service against the trusted app origins), rendered as a back link and carried across every route and the login round-trip. |
| [client-admin-console](../apps/client-admin-console)          | Application | The admin console BUNDLE: a client-only Vite/Vue SPA (plan 081; no Nuxt, no server process, no binary) in the account-console shape. `@authup/server-admin-console` depends on the package and serves its built `dist/` with per-request runtime-config injection (`<!--admin-config-->` marker -> `window.__AUTHUP__`), authenticating it with the opaque `HttpOnly` session credential (plan 088 Stage 2, whose two server-side routes stay on the API: `GET /console/admin/login/start` and `GET /console/admin/callback`); the same dist is hostable standalone on any static host, where it falls back to the browser-side auth-code + PKCE flow. The former Nuxt `pages/` tree lives on under `src/pages/` unchanged in layout: `src/router.ts` is the explicit route table carrying every former `definePageMeta` as route `meta` (`requireLoggedIn` / `requireLoggedOut` / `requirePermissions` / `layout`), `src/guard.ts` the `router.beforeEach` port of `client-web-nuxt`'s `RoutingInterceptor` (plus the cookie-mode rules), `src/App.vue` a `<Suspense>` around the layout switch so the 12 `async setup()` detail pages stay as they were. Auth entry pages (`/login`, `/login/callback`, `/logout`) carry `meta.layout: 'auth'` and render in the chrome-less `src/layouts/auth.vue`. Self-service lives in the account console: `/settings/*` is a redirect stub mapping each retired path onto its account console route and attaching this console's location as `ref`. |
| [client-auth-console](../apps/client-auth-console) | Application | The auth console BUNDLE: the Vite-built Vue SSR app behind the hosted auth workflow pages (`/authorize` login+consent, `/register`, `/activate`, `/password-forgot`, `/password-reset`, `/logout`, plus the federated callback's custom-scheme interstitial at `/identity-providers/:id/authorize-in`, which nothing renders since plan 094). `@authup/server-auth-console` depends on the package, renders each request through its built `dist/server/server.js` (per-request hydration payload; client assets under `dist/client/`, mounted by that service at its own `/assets`), and resolves it through the same node_modules ancestor walk the static consoles use (plan 083). The render contract (`src/contract.ts`: `render(RenderContext) => RenderResult`) is the supported customization seam: substitute the package to reskin the hosted auth UI instead of forking anything. It reads `config.basePath` (where the SERVICE is published) separately from `config.baseURL` (the API), which were one value while server-core rendered these pages itself. Architecturally inseparable from the IdP origin (plan 078), so never hosted standalone; unlike its console siblings it has NO per-realm OAuth2 client row, because it IS the IdP surface (see conventions.md → *Workspace Naming*). No binary, no process. |
| [server-account-console](../apps/server-account-console) | Service | The service behind the account console: it serves `@authup/client-account-console`'s built `dist/` over `defineStaticConsole` from `@authup/server-console-kit`, and is a thin declaration of which dist it serves, which config marker that dist carries (`<!--account-config-->`), which vite base it was built with (`/console/account/`) and which `authup.yml` section configures it (`accountConsole`). It mounts the bundle's `assets/` at its own `/assets` (immutable, one year, every name carries a content hash), validates the request-reflected `ref` against the trusted app origins before it reaches the page, and serves the operator theme's `assets/` under its own base. `createHandler` is the mountable half (`authup start` composes it onto server-core's listener), `createServer` plus the `authup-account-console` bin the standalone half. AGPL-3.0-only, like every app. |
| [server-admin-console](../apps/server-admin-console) | Service | The same shape for the admin console (`@authup/client-admin-console`, `<!--admin-config-->`, vite base `/console/admin/`, section `adminConsole`), differing only in the wildcard shell route its nested client-side routes need (`/users/<id>/roles`) and in the declaration itself. The mechanism is the kit's, so a package per console costs nothing (plan 101 resolved question 8) and buys three things: config ownership is one section per package, an account-console-only deployment never installs the admin dist, and the three packages map one-to-one onto the three `authup start console` names. |
| [server-auth-console](../apps/server-auth-console) | Service | The SSR service behind the hosted auth pages (plan 101 D2-2). It renders `@authup/client-auth-console` through the package's own render contract and hydrates **anonymously** over HTTP: `/authorize` from `GET /authorize/info` (D2-1), the four workflow pages from the public feature flags plus their own query, and `/logout` from nothing at all, since that page drives the end-session call itself. No credential, no loopback, no database. Since D2-3 it carries its own config registry (`authConsole`) and applies the operator theme like its static siblings, which closes the one release window in which the auth pages rendered unthemed. `createHandler` / `createServer` / the `authup-auth-console` bin, same two halves as the static services. |
| [server-core](../apps/server-core)        | Service     | A service that forms the backbone of the server-side ecosystem: the OAuth2/OIDC protocol surface and the management API, and nothing that renders a page. Since plan 101 D2-3 it serves **no console at all**: the six hosted page GETs redirect to `@authup/server-auth-console` carrying the request's own parameters, and the two static consoles are served by their own services. What stays under `/console/<name>` is the server half of cookie mode alone, `GET /console/<name>/login/start` and `GET /console/<name>/callback` (plan 101 invariant 3: those are sessions, keys and cache, and the pending-login cookie has to be issued on the origin that reads it back). It ships no binary of its own (plan 101 D1): the `authup` CLI imports it and runs it in process, and its `HTTPModule` splits BUILD from LISTEN (`new HTTPModule({ listen: false })`, then `http.listen(container)`) so the CLI can compose console handlers onto the same listener without server-core learning that consoles exist. The split exists because mount ORDER is load-bearing: after the controllers so a console's wildcard shell route cannot shadow a protocol route, before the error middleware so it inherits the error handling, and before the listener accepts anything. It carries a second long-running shape next to `start`, worker mode (`authup start worker`, plans 095/096/097), which runs the background cron sweeps alone, with no HTTP listener and no migrations, so API replicas can hand them over via `core.worker.enabled: false` (see architecture.md → *Deployment Topology*). `src/cli/` stays as dev-only tooling and as the `defineCLI*Command` source the CLI composes. |

## Packages & Libraries

| Name                                            | Type        | Description                                                                                               |
|-------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------|
| [access](../packages/access)                    | Library     | A package for evaluating permissions and policies.                                                        |
| [client-web-kit](../packages/client-web-kit)    | Library     | A package containing reusable components, composition aids and utilities for the web application. Its pinia auth store (plan 045) exposes a presence-derived `status` (`unauthenticated \| authenticating \| restoring \| authenticated` — AUTHENTICATED means token+realm+user present, validation stays `resolve()`'s job; a refresh-token-only store reads RESTORING, UNAUTHENTICATED means no session artifact at all) and `lastAuthOrigin` (`login \| exchange \| restore`, app-instance-lifetime); sessions are staged across the network round-trips and committed in one synchronous block (a failed login/exchange reverts and best-effort-revokes the staged tokens; an internal generation counter keeps an interleaved logout final; the auth hook and the store's own refresh drop background-refresh responses whose source refresh token / generation is no longer current). `loggedIn`, the raw token/realm setters, and the lifecycle dispatcher events are `@deprecated` working shims — emission semantics frozen; new code reads `status`/`lastAuthOrigin`. Server rendering rides one optional seam, `install({ hydrationStore })` (`core/hydration/`): with it, collections load inside `onServerPrefetch` and hand their rows (plus resolved permission verdicts, and translations an I/O-backed ilingo store refused to resolve synchronously) to the hydrating client; without it the kit performs no server-side loads at all. See architecture.md → *SSR data handoff*. |
| [client-web-kit-theme](../packages/client-web-kit-theme)| Library | Kit-level vuecs theme — composes `@vuecs/theme-tailwind` with the element overrides `@authup/client-web-kit`'s components need. **Also owns all of `@authup/client-web-kit`'s component CSS** (the kit itself ships zero `<style>` blocks): CSS lives under `assets/css/` (`index.css` entry + `styles/{tokens,picker,account,auth,realm,login}.css` partials; `auth.css` = the logged-out chrome — `AAuthShell` aurora/card, `AAuthGadgets`, `AAuthBackLink`; `account.css` = the `AAccountShell` logged-in account-console chrome (`--authup-account-*` tokens); `realm.css` = the `ARealmGrid` realm chooser; kit structural classes are `a-`-prefixed per the vuecs themable-component convention, and rules sit in `@layer components` so consumer Tailwind utilities can override single properties). Kit-theme tokens reference ONLY `--vc-*` aliases / neutral literals — never app-theme brand vars; `@authup/client-web-theme` rebinds `--authup-auth-accent{,-alt}` / `--authup-auth-logo-background` onto periwinkle/rose/slate from its `@layer base`. `tokens.css` declares overridable `--authup-<component>-*` design tokens in `@layer authup` (vuecs-style — placed before `base` in the layer order so a consumer's `@layer base { :root }` or unlayered `:root` override wins); the partials consume those tokens, which default to `--vc-color-*` semantic aliases (so dark mode tracks for free). The `--authup-{auth,account}-logo-image` / `-logo-mark-visibility` pairs are the operator-logo seam the console services' theming feature drives (architecture.md → *Console Theming*): the image paints onto the built-in mark's own `<svg>` box while only the mark's CHILDREN are hidden (`visibility` on the svg itself would take the background with it), so a logo swap needs no size token and no component change; both default inert. The CSS ships **raw** (`files: ["assets", "dist"]`, `exports.style` + `./index.css` → `./assets/css/index.css`) — the consumer's Tailwind resolves the `tailwindcss`/`@vuecs/*` imports and runs the JIT; tsdown only builds the theme factory (`src/index.ts` → `dist/index.mjs`). **Element-key typing:** `ThemeElements` in `@vuecs/core` is an EMPTY interface filled per component package via module augmentation, so both theme packages type-import every component package whose element keys they style (`import type {} from '@vuecs/button'` etc., devDependency-only — the imports are elided from the emitted `.d.ts`); without those imports the keys compile UNCHECKED in the theme's own build (excess-property checking vanishes against the empty interface) and error in any consumer that loads other augmentations but not that component's. Do NOT bundle the CSS: rolldown's CSS pipeline strips bare `@layer a, b, …;` statements, which silently breaks the cascade order. The `@source` hops inside `assets/css/index.css` are written to resolve from both `packages/client-web-kit-theme/assets/css` (workspace) and `node_modules/@authup/client-web-kit-theme/assets/css` (published); `@authup/client-web-kit` is an optional peerDependency so pnpm places the kit adjacent for them. |
| [client-web-nuxt](../packages/client-web-nuxt)  | Library     | A package for the integration in a nuxt web application.                                                  |
| [client-web-theme](../packages/client-web-theme)| Library     | Authup app theme for vuecs components, built on `@vuecs/theme-tailwind` (extends `@authup/client-web-kit-theme`). CSS lives under `assets/css/` (`index.css` + `styles/**` partials) and ships raw (`files: ["assets", "dist"]`, `exports.style` + `./index.css` → `./assets/css/index.css`). Its entry imports the kit theme via the bare `@import "@authup/client-web-kit-theme";`, and the apps import this package via `@import "@authup/client-web-theme";` — Tailwind v4 resolves CSS imports through node resolution honoring the `style` exports condition (the apps' `@authup/* → src` Vite/Nuxt aliases do NOT apply to Tailwind's CSS import resolution — verified empirically; don't switch these to relative paths). |
| [core-kit](../packages/core-kit)                | Library     | A package providing functions, interfaces and utilities for the core service.                             |
| [core-http-kit](../packages/core-http-kit)      | Library     | A package providing a http client with different sub api clients for resources and workflows. Entity **record** responses are the `{ data, meta }` envelope (`EntityRecordResponse`; `EntityRecordResponse` is a deprecated alias of it) and query-capable GETs carry the endpoint's queryable vocabulary under `meta.schema` (rapiq `SchemaDescription`, issue #1649). That description names its sort vocabulary `meta.schema.sorts` since rapiq 2.1.0 (tada5hi/rapiq#906 made `sorts` the canonical spelling on every developer-authored surface): the key was `sort`. The build-input / schema-option / `Schema` property surfaces kept `sort` as a deprecated alias, but `describe()` deliberately did **not** — `sort` is gone from `meta.schema`, so this is a wire-visible rename API consumers must follow. The URL parameter is unchanged (`?sort=-name`). The OIDC userinfo endpoint is the dedicated flat `GET /userinfo` (`userinfoEndpoint` in the `Client` config). Entity-type-string dispatch goes through the derived registry (`pickEntityAPI(client, type)`; `ClientEntityAPIKey = keyof IClient & keyof EntityTypeMap`, so a sub-API named after an `EntityTypeMap` key joins automatically) — the cast-free `ClientEntityAPIRegistry` assignment inside the helper is the compile-time proof that each entity-keyed sub-API serves its `EntityTypeMap` record type (record-type drift fails this package's build). The dispatch surface `EntityAPIDispatch<T>` is deliberately per-verb optional (sessions/events are read(+delete)-only, junctions carry no update), so dispatch callers — the kit's entity record/collection managers, `AEntityDelete`, `APermissionPolicyBindingButton` — guard per method instead of `as any`-indexing the client (#3087). |
| [core-realtime-kit](../packages/core-realtime-kit)| Library   | A package for the core socket service.                                                                    |
| [errors](../packages/errors)                    | Library     | `AuthupError` (extends `BaseError` from `@ebec/core`), error-code constants, built-in subclasses (`BadRequestError`, `EntityNotFoundError`, ...), code→HTTP-status mapping, and `Symbol.for(...)`-keyed duck guards. Error JSON carries the `@instanceof` marker chain as a string list (`BaseError.toJSON()` since `@ebec/core` 1.2.0, tada5hi/ebec#448; `AuthupError.toJSON()` re-stamps it after the `data` spread so a data key can't displace it), and every duck guard's fast path is `matchesInstanceof` (symbol **or** serialized-string chain, re-exported from `@ebec/core`) — so guards keep the inheritance match for JSON-rehydrated errors (#3042); new guard modules must use `matchesInstanceof`, never raw `hasInstanceof`. `isAuthupError` lets a PRESENT chain decide alone (marker in the chain, symbol or string form); its shape slow path (`isBaseError` + `issues` array) runs only for chain-less legacy JSON. The cut is load-bearing since rapiq 2.2: `ParseError.inputRejected(issues)` is an `@ebec/core` `BaseError` carrying `issues`, so the shape alone would claim it and `sanitizeError` would return it unmapped (`code: inputRejected` on the wire instead of `bad_request`). |
| [i18n](../packages/i18n)                        | Library     | Framework-agnostic translation catalogs + locale registry. `CATALOGS` is an ilingo `CatalogNode` (built via ilingo's `defineCatalog`/`defineLocale`/`defineNamespace`/`defineTranslations` helpers, locale → namespace → translations) consumed directly by `MemoryStore({ data: CATALOGS })`. Also exports namespace/key enums (`TranslatorTranslation*`), `LOCALES`/`LocaleCode`/`DEFAULT_LOCALE`/`isLocale`, the `NamespaceTranslations<K>` mapped type for compile-time key completeness, and the `authupError` namespace mapping `@authup/errors` `ErrorCode`s to localized messages (B1: validup-issue-shaped, `IssueDataByCode`-augmented). **Generic UI vocabulary is split across four namespaces** — `ENTITY` (`authupEntity`), `FIELD` (`authupField`), `ACTION` (`authupAction`), `COMMON` (`authupCommon`); every `TranslatorTranslationNamespace` value carries an `authup` prefix (e.g. `ENTITY = 'authupEntity'`, matching the pre-existing `ERROR = 'authupError'`) so a host app embedding `client-web-kit` can't collide with its own catalogs. Per-locale catalog modules mirror the split one-file-per-namespace (`catalogs/{en,de,fr,es}/{entity,field,action,common,client,app,error,vuecs}.ts`; the old `default.ts` is gone). All four locales in `LOCALES` (`en`, `de`, `fr`, `es`) are fully authored in `CATALOGS`; the locale-parity test enforces exact per-namespace key parity across every authored locale, and the `LanguageSwitcherDropdown` UI iterates `LOCALES` (rendering each `nativeName`) so adding a locale to the registry surfaces it in the switcher automatically. **Entity nouns are ilingo plural nodes** (`definePlural({ one, other })` under `authupEntity`): the call site selects the form via `count` (`count: 1` → singular, any other → plural) instead of a separate `*S` key. The `authupMail` namespace (`TranslatorTranslationMailKey`, `catalogs/{en,de,fr,es}/mail.ts`) holds transactional mail copy (subjects, intros, CTA labels, hints; ilingo `{{var}}` placeholders) consumed **server-side** by `apps/server-core`'s mail template renderer. Pure data, zero Vue; consumed by `client-web-kit`'s ilingo install and `server-core`'s mail renderer. |
| [kit](../packages/kit)                          | Library     | A package containing general (context independent) utilities.                                             |
| [specs](../packages/specs)                      | Library     | A package containing constants, interfaces, utils, ... for different specifications.                      |
| [server-adapter-kit](../packages/server-adapter-kit)| Library   | Core token verification logic, caching, and shared types for server adapters.                             |
| [server-adapter-node](../packages/server-adapter-node)| Library | A Node `IncomingMessage` middleware adapter for token verification.                                       |
| [server-adapter-socket-io](../packages/server-adapter-socket-io)| Library | A socket.io middleware adapter for token verification.                                                |
| [server-adapter-web](../packages/server-adapter-web)| Library   | A transport-neutral Web `Request` adapter primitive for token verification.                                |
| [server-config-kit](../packages/server-config-kit)| Library   | The declarative configuration schema mechanism. A REGISTRY is a plain object mapping every key of a config type onto its zod type, its description, its default and (optionally) the environment variable name plus the reader that turns a raw string into a value; the package owns the declaration shape (`Schema` / `SchemaInput`, whose mapped `-?` form is the compile-time exhaustiveness guard: a config key with no entry fails the build), the environment readers (`readEnvString`/`readEnvBool`/`readEnvBoolStrict`/`readEnvInt`/`readEnvArray`/`readEnvBoolOrString`/`readEnvRaw`), and the seven passes over such a registry: `readSchemaFromEnv` (environment), `readSchemaFromFileTree` (a parsed configuration document, each key read at the absolute dotted `path` its entry declares, or the one `defineSchema`'s `pathPrefix` derived from the section it was declared in), `buildSchemaDefaults` (defaults, function-valued ones called and arrays copied per call), `mountSchema` (one optional validup mount per key, a child container per section), `mergeSchemaData` (layer the passes: defaults, then file, then environment), `resolveSchemaData` (run each entry's `resolve`) and `buildSchemaJSONSchema` (a draft-07 document shaped like the configuration file, carrying the description, the static default and the env name under `x-authup-env`). A registry is SHAPED like the config it describes, so a section is a nested registry and its keys are read into a nested value; the passes that work in DOCUMENT space (the file read, the unknown-path scan, the JSON Schema) flatten it instead, since every entry carries an absolute path. **`mergeSchemaData` is what a caller composes with, never a spread**: a later pass carrying one key of a section would replace the whole section and take every other key's file value and default with it. An entry's `resolve` is how a key DERIVES from the document: it receives what the merge produced plus a `get(path)` that reaches any other key by its absolute document path, resolving that one first if it derives too. Lazy and memoized rather than topologically sorted, so declaration order never matters; a cycle throws naming the chain. That is where normalization lives, which is what lets every service compute the same answers from the same file: the issuer from the core listener keys, the canonicalized trusted origins, each console's url, every path made absolute against `rootPath`. Reference is by PATH, never by entry object: `defineSchema` clones an entry when it stamps a prefix, and a service composes its selection by spreading, which flattens sections. WHICH keys exist is the caller's registry, never this package's business. One folder per concern (the server-kit layout): `schema/` declares a registry and tells one from an entry, `entry/` is the single-key primitive (its guards and its environment read), `source/` is where a VALUE comes from (`defaults.ts`, `file.ts`, `env.ts`, in precedence order, plus the `merge.ts` that layers them and the `resolve.ts` that derives over the result), and `json-schema/` + `validation/` are the two things a registry is turned into. It declares **no `@authup/*` dependency at all** (`envix`, `validup`, `@validup/zod`, `zod` only) and sits at the foundation layer: the three `@authup/server-*-console` service packages read config without depending on server-core and without inheriting server-kit's tail (native `@node-rs/bcrypt` and `jsonwebtoken`, `winston`, `redis`, the socket.io emitter, `@rapiq/core`). Pinned by `packages/server-config-kit/test/unit/dependencies.spec.ts`. Plan 101 stage C. For authup that caller is `@authup/server-config` (see the row below), which declares the whole document once and lets each service select from it; `composeSchemas` existed here to reconcile several registries and went away with the last of them. |
| [server-config](../packages/server-config)| Library | **Every key of `authup.yml`, declared exactly once**, in the section it belongs to: `deployment/` (`env`, `host`, `rootPath`, `publicUrl`, `trustedOrigins`, `db`, `redis`, `smtp`), `theme/`, `core/` (`core.*`, 47 keys) and one per console (`<name>Console.*`). A section declares its keys in the vocabulary of the service it configures (`url`, `port`, `host`) and spells no location at all: `defineSchema`'s `pathPrefix` derives each one from the section, so a key cannot land where its section does not own, and the document NESTS the sections rather than qualifying their names. A service declares nothing and SELECTS: it spreads its OWN section flat (those keys are already its vocabulary) and keeps every other section under the key the document nests it at, so it cannot mis-spell a path, an environment variable or a reader. That is what retired `composeSchemas`. The one key that reaches outside its section is `host`: every listener's own defaults to `''` (unset) and `resolve`s to the deployment-wide `host` (env `HOST`, declared once at the root) unless it names its own, so one line binds server-core and all three consoles, while `port` deliberately has no counterpart because three listeners cannot share one. Normalization lives here too, as each key's `resolve`, which is what lets a console compute the derived `publicUrl`, the canonicalized `trustedOrigins` and its own url without asking server-core for them. The document's TYPES are authup's own (`DatabaseConnectionOptions`, `RedisConnectionOptions`, `SMTPConnectionOptions`, `MiddlewareOptions`) rather than typeorm's, server-kit's and six `@routup/*` packages', because a leaf every console imports cannot carry that tail; the zod types were already loose, so the published JSON Schema is unchanged and server-core casts at the boundary. `expandToOrigins`, `isValidTrustProxyListEntry`, `CERTIFICATE_SOURCES` and `EVENT_LOG_RETENTION_DAYS_DEFAULT` travel with the keys that need them. |
| [server-console-kit](../packages/server-console-kit)| Library | The page-serving mechanism every console service shares, and the only home the console-shell helpers have. Three groups: the **html helpers** (`readUIClientPreferences` over the shared `vc-locale` / `vc-color-mode` cookies, `stampHtmlAttributes`, `replaceTemplateMarker`, `injectHeadContent`, `stampDocumentTitle`, `applyUIPageHeaders`, `rebaseAssetURLs`, `serializeInlineScriptJSON`); **`defineStaticConsole`**, one closure per console AND per handler, which resolves the console package (a substituted `distPath` first, else the node_modules ancestor walk from the `cwd` anchor the caller declares), reads the shell per request, splices the runtime config into the marker, stamps, rebases and themes it; and the whole **theme subsystem** (`ThemeProvider` with its mtime revalidation and memoized head, `applyTheme`, `createThemeAssetsHandler`, and `theme/contract/` which imports nothing from node or routup so a browser theme editor or a CLI validator can share it verbatim). `replaceTemplateMarker` is the reason this is a package rather than a copy per service: a string replacement re-interprets `$&`, `` $` ``, `$'` and `$$` in the VALUE, the values spliced into a console shell carry raw request input, and that trap already broke `/authorize` once, so the helper that defends it must exist exactly once. `createApplication` composes a console's own module graph straight from orkos (`ConfigModule` + `HTTPModule`, keyed by `InjectionKey`), so a console is a runnable SERVICE rather than a handler someone else mounts: `authup start console` and the per-console bin start the same thing, config is resolved once and shared through the container, a pre-registered token wins over the module that would register it (the test seam server-core has), and teardown runs in reverse dependency order. Composed from orkos rather than through a builder on purpose: server-core's `ApplicationBuilder` is thirteen named slots over thirteen of its own modules, a console has two, and a builder for two would be a factory for one product. `eldin` and `orkos` are dependencies for it, and every consumer must DECLARE the kit rather than bundle it: `TypedToken` ids are `Symbol(name)`, so a second inlined copy of the package is a second set of tokens that resolve against nothing. Every piece of state `defineStaticConsole` holds is instance-scoped (098 C4): the predecessor carried a `setPackagePath` mutator, and two handlers in one process would then share a resolution. The logger is a structural `ConsoleLogger` declared here rather than imported from `@authup/server-kit`, since that package pulls native bcrypt/jsonwebtoken bindings, winston, redis and the socket.io emitter, and a package that serves static files has no business inheriting any of it (a server-kit `Logger` satisfies the shape anyway). `tsconfig.build.json` pins `"types": ["node"]`: no dependency emits a `/// <reference types="node" />`, so the node globals are not auto-discovered the way they are in the workspaces that pull typeorm or vite. Apache-2.0 by the blanket `packages/` rule, which is the licensing consequence plan 101 D2-2 accepted deliberately. |
| [server-kit](../packages/server-kit)            | Library     | Cryptographic algorithms, shared server-side primitives (`IEntityRepository`, `ActorContext`, `AbstractEntityService`), and reusable service abstractions. Layout mirrors PrivateAIM/hub's server-kit: one top-level folder per concern (`cache/`, `core/`, `crypto/`, `domain-event/`, `logger/`, `redis/`, `utils/`), each with `module.ts` (factory/class) + `types.ts` + `index.ts`. **No singletons** — `useLogger`/`setLoggerFactory` and the vault module (singleton + `@hapic/vault` re-export) are gone (`singa` dep dropped; vault consumers use `@hapic/vault` directly); services are created via factories (`createLogger`, `createNoopLogger`, `createRedisClient`) and passed down via constructor/context args (DIP). `Logger` is a winston-shaped structural type (`error/warn/info/http/verbose/debug`), so consumers don't depend on winston. `DomainEventPublisher` (ctx `{ logger? }`) aggregates `IDomainEventHandler`s (`DomainEventRedisHandler`, `DomainEventSocketHandler` under `domain-event/handlers/`; optional `dispose?()` for resource-owning handlers, invoked via `DomainEventPublisher.dispose()` in `DatabaseModule.teardown`) and exposes `publish` + `safePublish` (catch + log — event-bus failures must not fail the originating DB transaction). |
| [server-test-kit](../packages/server-test-kit)  | Library     | Generic server-side test fakes (`FakeEntityRepository`, `FakePermissionEvaluator`, actor factories). devDep-only; consumed by `apps/server-core`'s test suite and any future server-side app's tests. |

## Package Dependency Layers

Changes to a lower-layer package affect all packages above it. Build order follows these layers.
Internal `@authup/*` dependencies are declared in each package's `package.json` (dependencies, devDependencies, peerDependencies) — always consult those for the authoritative dependency graph.

```
Foundation (no internal @authup deps):
  kit, errors, server-config-kit (envix, validup, @validup/zod, zod only; a service
                      package must be able to read config without inheriting
                      server-core's or server-kit's tail)

Layer 1:
  server-config     → core-kit, kit, server-config-kit (every key of authup.yml,
                      declared once; a service selects rather than declares.
                      No native-binding dependency, so a console importing it
                      inherits nothing of server-core's tail)
  specs             → kit, errors
  core-realtime-kit → kit
  i18n              → errors (+ ilingo runtime dep; validup is an optional peer — its `declare module` augmentation is re-exposed in the emitted .d.ts)
  server-console-kit → errors, kit (+ locter, validup, @validup/zod, zod, @routup/basic;
                      routup is a peerDependency: the helpers take an IAppEvent and the
                      consumer owns the App. Deliberately NOT server-kit, whose native
                      bcrypt/jsonwebtoken bindings, winston, redis and socket.io emitter
                      have no business in a package that serves static files)

Layer 2:
  access            → kit, errors
  core-kit          → kit, errors, specs
  server-kit        → access, core-kit, kit, specs, core-realtime-kit, @rapiq/core (the IQuery port type in IEntityRepository.findMany is re-exposed in server-kit's public .d.ts, so it is a dependency)

Layer 3:
  core-http-kit     → access, kit, core-kit, specs (errors is devDep-only — test)
  server-adapter-kit → kit, errors, specs, core-kit, core-http-kit, server-kit
  server-test-kit   → access, core-kit, kit, server-kit, @rapiq/core (consumed devDep-only; server-kit and @rapiq/core are runtime dependencies — their types are re-exposed by the fakes' public .d.ts)

Layer 4:
  server-adapter-node      → server-adapter-kit
  server-adapter-socket-io → server-adapter-kit (errors is devDep-only — test)
  server-adapter-web       → server-adapter-kit (errors is devDep-only — test)

Application libraries:
  client-web-kit    → access, kit, core-kit, core-http-kit, core-realtime-kit, errors, i18n, specs
  client-web-nuxt   → access, kit, client-web-kit

Apps:
  client-account-console → client-web-kit, kit, core-kit, core-http-kit, i18n, specs (all build-time only —
                      the published artifact is the static dist/)
  client-auth-console → client-web-kit, kit, core-kit, i18n (build-time only) + core-http-kit (a RUNTIME
                      dependency: the published render-contract types, src/contract.ts, re-expose IClient)
  client-admin-console → access, client-web-kit, kit, core-kit, core-http-kit, i18n, specs (all build-time
                      only — the published artifact is the static dist/; client-web-nuxt is NOT a dependency
                      any more, it stays the Nuxt integration for downstream apps such as hub)
  server-core       → access, i18n, kit, core-kit, core-http-kit, errors, server-config-kit,
                      server-console-kit, server-kit, specs (+ ilingo runtime dep)
                      (NO console package is a dependency any more: the three client-*-console dists,
                       @routup/assets and vite all left with the console serving in plan 101 D2-3, which
                       is ~28 MB of dist a server-core-only install never pulls in. The `authup` CLI depends
                       on every service, so a `start core` process still has them on disk; it never LOADS
                       them, since that role reads no console config and resolves no bundle. server-console-kit
                       survives for one import, the shared vc-locale cookie name useRequestLocale reads)
  server-account-console → client-account-console (RUNTIME: the built dist/ it serves), kit,
                      server-config-kit, server-console-kit (+ routup, @routup/assets, @routup/basic,
                      @ebec/http, zod)
  server-admin-console → client-admin-console (RUNTIME, same shape), kit, server-config-kit,
                      server-console-kit (+ the same routup set)
  server-auth-console → client-auth-console (RUNTIME: the SSR bundle it renders), core-http-kit (it
                      calls the API anonymously), errors, kit, server-config-kit, server-console-kit
                      (+ locter, routup, @routup/assets, @routup/basic, zod)
                      (NOT server-core, in any of the three: a console reaching into it would drag the
                       native crypto bindings, winston and redis into a static file server, and
                       server-core reaching the other way would drag a console dist into an API-only
                       deployment. Every config key they read is declared once in server-config)
  authup (CLI)      → server-core, server-account-console, server-admin-console, server-auth-console,
                      server-config-kit, errors, kit
                      (an in-process CLI: it IMPORTS every service and runs its factories, so all four
                       are ordinary runtime dependencies. It is the only workspace that depends on all
                       of them, which is exactly what makes it the place the four config registries meet)
```

## Separation of Concerns

- **Domain logic** → core-kit
- **API clients** → core-http-kit
- **UI components** → client-web-kit

## UI Stack (`apps/client-admin-console`, `apps/client-auth-console`, `packages/client-web-kit`)

| Layer | Package(s) | Notes |
|---|---|---|
| **Theming** | `@vuecs/core` (3.x) + `@vuecs/theme-tailwind` (6.x) via `@authup/client-web-theme` | Theme manager + Tailwind v4 class strings. `@authup/client-web-theme` composes `tailwindTheme()` and ships a single CSS entry (`@authup/client-web-theme/index.css`) that pulls in `tailwindcss`, `@vuecs/design` (OKLCH semantic tokens), `@vuecs/theme-tailwind` (Tailwind ↔ vc-color rebind). The Bootstrap-compat `@layer components` block (`.btn`, `.row`/`.col`, `.alert`, `.badge`, `.nav`/`.navbar`, `.dropdown*`, `.modal-*`, `.fade`) has been **fully retired** — every call site now renders a `<VC*>` component (`.dropdown*` → `<VCDropdownMenu>`, `.modal-*` → `<VCModal>`); only a thin `.vc-pagination` override of theme-tailwind's button rounding remains. |
| **Icons** | `@vuecs/icon` + `@vuecs/icons-font-awesome` | Iconify-backed `<VCIcon>` + the FA Solid name preset. **Icon DATA is bundled at build time, per app** (issue #3345): both apps run `@nuxt/icon`'s standalone vite plugin (`NuxtIconBundle` from `@nuxt/icon/vite`, a devDependency; used in `apps/client-auth-console/vite.config.ts`, `apps/client-admin-console/vite.config.ts` and `apps/client-account-console/vite.config.ts`) and import `virtual:nuxt-icon-bundle/register` in their bootstrap. The plugin scans source for `<collection>:<name>` literals and registers the found subset through `addIcon` from `@iconify/vue`, the same global store `<VCIcon>` resolves against, so no component changes were needed. This replaced the kit's `registerIconCollections()` (now `@deprecated`, kept for consumers that cannot run a build-time scan), which registered both full FA6 collections: 1,902 icons for the 54 / 74 actually rendered. Measured: the SSR auth UI 804 → 385 KB gzip, client-admin-console 911 → 497 KB gzip. **The glob list is load-bearing and fails silently** (a path that stops matching yields an empty icon slot, not a build error), so it must keep covering `packages/client-web-kit/src` (kit components + the identity-provider preset tables) and `node_modules/@vuecs/icons-font-awesome/dist/*.mjs` (the vuecs behavioral defaults: pagination arrows, submit-button, alert, collapse chevrons, whose names appear in no authup source file), plus `.ts` on top of the plugin's default `.vue`/`.jsx`/`.tsx`. Pinned by `apps/client-auth-console/test/unit/icons.spec.ts`, which asserts against that app's own built client entry (it moved out of server-core's suite with the rendering, plan 101 D2-3, and reads the dist directly rather than through a resolver). Note `@iconify/vue` resolves icons client-side, so SSR'd pages carry empty `<svg>` shells either way; a rendered page cannot verify bundling. Old `fa-solid fa-X` CSS class strings on plain `<i>` are still in use for legacy templates — both paths coexist. **Do not use `<VCButton>`'s `icon-left` / `iconLeft` prop** — render an explicit `<VCIcon>` in the button's `#leading` slot (template) or `{ leading: () => h(VCIcon, { name }) }` (render fn). VCButton renders `iconLeft` through `<VCIcon>` internally anyway, so output is identical; the one exception is `useSubmitButton()`'s composable-derived `iconLeft` (`AFormSubmit` / `LoginForm`), which stays. |
| **Links** | `@vuecs/link` (2.x) | `<VCLink>` picks `NuxtLink` / `RouterLink` / a plain `<a>` at render time, so kit and app code share one link element. Prefer it over `resolveComponent('NuxtLink')`, which only resolves under Nuxt. A button-styled link is `<VCButton :as="VCLink" :to="...">`. **A bare `:disabled` guards such a link from `@vuecs/button` 1.4.1 on:** `VCButton` still declares `disabled` as its own prop, so it never reaches `VCLink`, but a disabled non-native `as` target is now rendered with `aria-disabled="true"`, `tabindex="-1"` and an `onClickCapture` handler running `preventDefault` + `stopPropagation` + `stopImmediatePropagation`, so activation cannot reach the router. Up to and including 1.4.0 it stamped `aria-disabled="true"` alone (no click guard, no focus removal; tada5hi/vuecs#1699), which is the state the two shapes below were written against. `<AContentAction>` binds its `add-disabled` prop straight onto `:disabled` and relies on the guard; `packages/client-web-kit/test/unit/components/utility/content-action.spec.ts` pins it against a real `createMemoryHistory` router, asserting that the enabled action navigates on click while the disabled one leaves `router.currentRoute` on the overview route (an attribute-only assertion would pass either way). The ten entity index pages whose edit link is permission-gated keep **withholding the target** instead: ``:to="hasEditPermission ? `/users/${row.id}` : undefined"`` makes `VCLink` fall back to an href-less `<a>` whose click is `preventDefault`ed and which cannot be tab-focused (issue #3071). They were not swept, and the shape stays sound: an `<a>` with no target is not activatable however `disabled` is handled. Tailwind's `disabled:` variant matches the `:disabled` pseudo-class only and still never an `<a>`, so the visual cue comes from the `aria-disabled:*` utilities `clientWebKitTheme()` appends to the button root. |
| **Breadcrumbs** | `@vuecs/navigation` (4.4.1) | `<VCBreadcrumb :items>` in driver mode over `BreadcrumbItem[]` (`label` plus optional `to` / `icon`). The driver defaults `current` to the last index and still renders a crumb carrying `to` as a link with `aria-current="page"` (W3C APG), so a route on the final crumb is fine; the leaf crumbs the composables append (`add`, a detail tab) deliberately carry none and render as the page node. The compound parts (`VCBreadcrumbList` / `Item` / `Link` / `Page` / `Separator` / `Ellipsis`), `useBreadcrumbLeaf` and the registry mode are unused. Rendered as the first element of all 12 client-admin-console collection pages and all 12 detail pages, `class="mb-2"`, above the title row. The trail is assembled by the app composable `apps/client-admin-console/src/composables/breadcrumb.ts`: `useSectionBreadcrumb(section, { add?, children? })` returns a `ComputedRef<BreadcrumbItem[]>` holding `Home > Section` and appends at most ONE leaf, the declared child whose `url` equals the current `route.path` (both normalized for a trailing slash), so `{ add: true }` (passed by the ten sections carrying a `pages/<section>/index/add.vue`) shows the `Add` crumb only while the add route is open. **It must run synchronously in `setup()`, before the first `await`**: the label lookups and `useRoute()` resolve through `inject()`, which no longer sees the component once the setup context is lost. Detail pages therefore call it next to their `useRoute()` and keep the result as `breadcrumbBase`, since their record is only known after the record fetch is awaited (an `async setup()` under the app-level `<Suspense>`). `buildEntityBreadcrumb({ base, entity, path, tabs })` is a plain function rather than a composable for exactly that reason: the page hands it already-resolved values, and it appends the record crumb plus, when `path` matches one of the page's own tab items, that tab (skipping the label-less back arrow and the tab that IS the record route, since neither adds a level). Section route / icon / label always come from `LayoutSections`, never spelled out per page. **Theme:** `@vuecs/theme-tailwind` 6.4.1 gives the breadcrumb elements colour and typography only (`breadcrumb.classes.list` and `breadcrumbItem.classes.root` are the empty string; link / page / separator carry no display or gap), so `clientWebTheme()` supplies the LAYOUT (`flex flex-wrap items-center gap-1.5 m-0 p-0 list-none` on the list and the matching inline-flex / gap classes on item, link, page, separator and ellipsis, mirroring `@vuecs/navigation`'s own stylesheet). Without that override the `<ol>` renders one crumb per line; drop it once theme-tailwind ships breadcrumb layout classes. `@vuecs/navigation` is a `@authup/client-web-theme` devDependency for the element-key `import type {}` augmentation, the same rule the `@vuecs/button` / `@vuecs/table` imports there follow. |
| **Form controls** | `@vuecs/forms` (4.x) | `<VCFormGroup>` / `<VCFormInput>` / `<VCFormTextarea>` / `<VCFormCheckbox>` / `<VCFormSelect>`. Authup's entity form SFCs (`components/entities/**/A*Form.vue`) render these components directly, binding each field through `@validup/vue`'s `useValidup` and `@ilingo/validup-vue`'s `<IFieldValidation>` (see `ARoleForm.vue`); the former `buildForm*` render-function shims (`core/form/builders.ts`) were retired in #3139. Entity **name** fields use `<ANameInput>` (`packages/client-web-kit/src/components/utility/ANameInput.vue`) instead of a bare `<VCFormInput>`: it wraps `VCFormInput` with a "regenerate" button rendered in the `#groupAppend` input-group slot that emits a slug-safe `generateName()` (from `@authup/kit`) through the normal `update:modelValue` channel. Drop-in for `v-model` / `:model-value` + `@update:model-value`; pass `:disabled` for built-in / name-locked / master entities (the append button is then omitted). Entity **secret** fields (client) use the sibling `<ASecretInput>` (`packages/client-web-kit/src/components/utility/ASecretInput.vue`), same `#groupAppend` regenerate layout but emitting a crypto-strong `generateSecret()` (from `@authup/kit`). **SSR-safety contract for generated defaults:** `generateName(seed?)` accepts an optional seed — entity forms pass Vue's hydration-stable `useId()` so the prefilled name matches across the SSR and client render passes (no hydration mismatch). `generateSecret()` deliberately takes **no** seed (a secret must not be derived from a predictable value); forms therefore generate the initial secret client-side only, inside `onMounted`, leaving the field empty during SSR. Both are captured once in `setup` (`const nameSeed = useId()`), never inside a function re-invoked later. |
| **List rendering** | `@vuecs/list` (1.x) | Compound `<VCList>` / `<VCListBody>` / `<VCListItem>` / `<VCListLoading>` / `<VCListEmpty>`. `defineEntityCollectionManager`'s renderer in `client-web-kit/src/components/utility/entity/collection/module.ts` composes these directly. Since #3278 the collection/record managers compose queries in the **rapiq v2 IR** (`defineQuery`/`mergeQueries`; every parameter including filters goes through `mergeQueries`, which is conjunctive since rapiq beta.19, so an injected realm/owner scope cannot be displaced by search or pagination input; `queryFilters` context hooks may return an `ICondition` for compound OR searches; `ListMeta` carries pagination UI state only) — see architecture.md → vuecs 1.x SFC integration → Collections. Pages construct query props via `defineQuery<T>({...})` from `@rapiq/core`. |
| **Tables** | `@vuecs/table` (≥ 1.3.0) | `<VCTable>` directly. `:data` + `:columns` (`TableColumn<Entity>[]`) drives auto-render; consumer-side `#cell-<key>` / `#header-<key>` slot templates are dispatched onto each cell by `composeTableInner` (tada5hi/vuecs#1592). Since 1.3.0 (tada5hi/vuecs#1601) `<VCTable>` is **generic over Row** — type the columns `TableColumn<Entity>[]` and write cell slots as `#cell-<key>="{ row }"` (no annotation) so `row` infers as the entity (the old `{ row: any }` widening is retired). Keep `VCTable` **globally registered** — the generic component can't be registered in the Options-API `components: {}` (see architecture.md → Table usage). Centered headers use plain `headerClass: 'text-center'` — `clientWebTheme()` overrides `tableHeadCell.classes.root` to drop theme-tailwind's baked `text-left`, so consumer alignment classes win without Tailwind v4's `!important` suffix. Cells follow the same shape via `cellClass`. |
| **Pagination** | `@vuecs/pagination` (2.x) via `<APagination>` adapter | `client-web-kit/src/components/utility/pagination/APagination.ts` bridges the collection footer contract (`meta` = `{ total, pagination: { limit, offset }, busy }`) onto `<VCPagination>`; page changes call `load({ pagination: { limit, offset } })` only — search/sort state is retained inside the collection manager, not round-tripped through `meta`. |
| **Overlays** | `@vuecs/overlays` (1.x) | `<VCToaster>` mounted in `apps/client-admin-console/src/components/footer.vue` and in the SSR auth UI's `apps/client-auth-console/src/App.vue` (inside its `<VCToastProvider>`; the `/authorize` page surfaces `AAuthorize`'s forwarded login-form `failed` emit as an error toast via `useToast().add(...)`); `useToast()` shimmed in `apps/client-admin-console/src/composables/toast.ts` to preserve the bvnext-style `toast.show(string \| { variant, body })` call surface. `<VCDropdownMenuItem>` resolved opportunistically in `<AEntityDelete>` (replaces the bvnext `BDropdownItem` fallback). **Confirmation prompts** ride the `@vuecs/overlays` ≥1.2.0 **AlertDialog** compound + `useAlertDialog()` (imperative `(options?) => Promise<boolean>`; `true`=confirm / `false`=cancel-or-Escape, SSR resolves `false`). A single `<VCAlertDialogProvider>` host is mounted at the `apps/client-admin-console/src/layouts/default.vue` root — the app-level `AlertDialogManager` is auto-provided by `app.use(installOverlays)` (in `src/main.ts`), so one host drains confirmations from every page (no per-page provider, not Reka-context-scoped like `<VCToastProvider>`). `<AEntityDelete>` routes its destructive delete through `useAlertDialog({ tone: 'error', … })`, gated by a `withPrompt` prop (**default on**; opt out per call site with `:with-prompt="false"`); the localized title/description come from the `authupApp` `DELETE_CONFIRM_TITLE` / `DELETE_CONFIRM_DESCRIPTION` keys (entity noun interpolated from the `authupEntity` namespace, `count: 1`), reusing the existing `authupAction` `DELETE` (confirm) / `ABORT` (cancel) labels. AlertDialog styling comes from `@vuecs/theme-tailwind`'s `alertDialog` element (both authup themes `extend(tailwindTheme())`), so no authup theme override is needed. |
| **Other** | `@vuecs/{button, elements, countdown, timeago, navigation}` | Each used via its globally-registered `<VC*>` components after `app.use(installX)`. |

**Explicit component imports (preferred):** new/changed kit or app code should `import { VC* } from '@vuecs/*'` + register in a local `components: {}` (or import for `h()`), rather than relying on the consumer's global `app.use(installX)` registration. This makes the dependency visible, type-checks props locally, and catches latent prop-type bugs that global / `resolveComponent('VC*')` lookups hide. `VCButton` and `VCIcon` were swept to explicit imports across kit + app (the global `app.use(vuecs, …)` registration stays as a fallback); the other `<VC*>` (VCTimeago, VCTable, VCFormGroup, VCList, VCModal, …) are still mostly global — migrate them opportunistically when a file is touched.

**Shared auth chrome + bootstrap fragments (plan 078).** The two UI apps
(`apps/client-admin-console`, and the SSR auth app
`apps/client-auth-console`) used to hand-mirror each other's auth-page shell
and vuecs bootstrap, guarded only by "mirrors client-admin-console" comments. The common parts now live in the kit and
both sides are thin callers:

- `AAuthApp` (`components/utility/`) — the shared page shell
  (`VCToastProvider` > `AAuthGadgets` > slot > `VCToaster`), consumed by
  `apps/client-auth-console/src/App.vue`, `apps/client-admin-console/src/layouts/auth.vue`
  and `apps/client-account-console/src/App.vue`. A `gadgets` slot (passed
  through into `AAuthGadgets` after color-mode + language) lets a host
  append its own controls to the ONE fixed top-right cluster — the account
  console adds its user chip (`.a-auth-gadget--static`) + icon-only
  sign-out there, so the page never grows a second top bar.
- `AAccountShell` (`components/utility/`) — the account-console content
  chrome (brand + nav tabs from an `AAccountShellNavItem[]` prop + content
  card slot; identity/session controls deliberately live in the gadget
  cluster above, and from md-width up the brand row aligns onto the gadget
  line), consumed by `apps/client-account-console`'s shell page (plan 080).
- `AWorkflowDisabledNotice` (`components/workflows/`) — the "workflow disabled"
  alert + back-link block the four SSR workflow pages
  (register / activate / password-forgot / password-reset) each copy-pasted.
- `core/vuecs/` — `registerIconCollections()` (Iconify FA6 solid + brands) and
  `buildVuecsInstallOptions()` (the FA icon preset + translator-wired
  submit-button defaults) supply the shared VALUES of the
  `app.use(vuecs, …)` call. **Themes stay a caller argument** — the kit must
  not depend on the theme packages (the kit theme peers the kit) — and each
  consumer keeps its own sequencing: Nuxt's ordered plugins on one side, the
  manual choreography in `apps/client-auth-console/src/app.ts` on the other. The install ORDER is
  load-bearing (see the plugin-order trap below); only the values are shared.
- `core/cookie.ts` + `core/color-mode.ts` (issue #3377) — `createCookieRef()`
  (a `document.cookie`-backed `Ref<string>`, the non-Nuxt counterpart of
  `useCookie()`; server-side there is no `document`, so the caller seeds the
  value via `initial`) and `createColorMode()` on top of it (the shared
  `vc-color-mode` cookie feeding `bindColorMode` from `@vuecs/design`). Both
  consoles held byte-identical copies. `@vuecs/design` is a kit
  peerDependency for this — every console already declared it, since the
  theme CSS pulls it in regardless. The range is `^1.2.0` and that floor is
  load-bearing: the persisted cookie value is a `string`, so it must be
  narrowed by `isColorMode()` before it can satisfy `bindColorMode`, and
  that guard only exists from 1.2.0 (tada5hi/vuecs#1701). Without the
  narrowing a foreign stored value would round-trip onto the `<html>` class.
  The per-app `di.ts` payload provide/inject modules were deliberately left
  alone: they share a shape, not a body (different symbol, payload type and
  function names per app), and the kit's own `core/{provide,inject}.ts`
  carry DIFFERENT semantics (idempotent first-wins provide, undefined-not-throw
  inject), so folding them together would be a behavior change dressed as a
  dedup.

The default backend URL is one exported constant, `API_URL_DEFAULT`
(`@authup/core-http-kit`, `http://localhost:3001`) — it belongs to the HTTP
client whose `baseURL` it fills, not to `@authup/kit` (which stays free of
service context). Consumed by the `client-web-nuxt` fallback (which had
drifted to a nonexistent `:3010`). A served console takes its API URL from
the runtime config its service injects, and falls back to deriving it from
its own location when nothing was injected (`src/config.ts` in each; a
`VITE_API_URL` at build/dev time overrides it). The fallback is what makes a
standalone-hosted dist work, and it is also the silent degradation a missing
config marker produces: the shell answers 200 either way, so a bundle whose
marker moved simply stops being configured. The marker is therefore spelled as
a constant in the service that serves it, next to the vite base it must agree
with.

### Page placement — top-level pages vs detail tabs (client-admin-console)

**Entity-type collections always get a top-level page** (`/users`, `/roles`,
`/keys`, `/events`, `/sessions`, …), scoped to the active realm by the header realm
switcher (`filter: { realmId: [realmManagementId ?? null, null] }` — active
realm + global rows). The realm switcher makes the realm context global
chrome, so realm-scoped entities do NOT move under `/realms/[id]` — a realm
tab would only duplicate the switcher (settled 2026-07-14, plan 071: keys
went top-level for exactly this reason; events stay top-level because audit
review is inherently cross-realm anyway).

**Detail-page tabs render relations of one specific row**, never entity-type
collections: junction-table associations (`users/[id]/roles` via
`user_role`, `roles/[id]/permissions` via `role_permission`) and 1:n
children owned by the row (`users/[id]/sessions`, `users/[id]/authenticators`
— subject-owned records; also surfaced under `settings/*` for the own-user
view). A tab like `users/[id]/sessions` is a parent-scoped *lens* over a
collection, not its canonical home. Sessions' canonical home is the top-level
`/sessions` page (subject names via gated includes); the per-user tab remains
the parent-scoped lens.

**A collection page's action sits in its title row, not in a rail.** Each
`pages/<section>/index.vue` used to wrap its `<NuxtPage>` in a
`.content-wrapper` grid whose `.content-sidebar` held a vertical
`<VCNavItems variant="pills" orientation="vertical">` of two links, "overview"
and "add". That rail is gone from all 12 sections: a page now renders
`<VCBreadcrumb>`, then a flex row (`items-start`, so the action aligns to the
top of a two-line block) carrying a column of `<h1>` plus sub title on the
left and `<AContentAction>` on the right, then the `<NuxtPage>` at full width.
The two sections with no add route render the same column without the flex
row. `<AContentAction>`
(`packages/client-web-kit/src/components/utility/content-action/`) takes
`overview-url` + `add-url` and dispatches on `route.path` (trailing slash
normalized on both sides): the overview route renders a primary `Add` button
pointing at the add route, the add route renders a neutral outline `Back`
button pointing back at the overview route, and **any other route renders
nothing**, so a section that later grows a second list route (an approval
queue, a nested lens) does not inherit the button. Each page binds
`:add-disabled` to its own `usePermissionCheck({ name: <ENTITY>_CREATE })`.
Both urls come from `buildSectionURLs(section)` (`config/layout/sections.ts`),
never spelled out per page: that helper owns the `/add` suffix for its two
consumers, the breadcrumb's `Add` leaf and this component's prop pair. The
coupling is worth the indirection because the failure is silent. A section
whose `url` moved while a page still carried the literal would leave
`<AContentAction>` matching neither route, and it renders NOTHING in that
case, so the create form would lose its last entry point with no error now
that the rail is gone.
`/events` and `/sessions` have no add route, so their one-item rail is simply
dropped: they keep the breadcrumb and a plain title with no action button. A
detail page's own `<VCNavItems variant="pills">` tab rail is a different
control and stays. The `.content-wrapper` / `.content-sidebar` /
`.content-container` rules are still declared in
`packages/client-web-theme/assets/css/styles/core/body.css` and now have no
call site left in the console.

**The sub title is a description under the heading, not a qualifier inside
it.** It used to be a `<span class="sub-title ms-1">` inside the `<h1>`
holding one word, so a page read "Clients Management" on one line. It is now a
`<p class="sub-title">` under the heading, and the word was replaced by copy
that says what the section holds: collection pages take one of the twelve
`authupApp` `<ENTITY>_DESCRIPTION` keys (authored in all four locales, e.g.
"Applications that authenticate against Authup").

Detail pages answer the same question about one record, through
`buildRecordHeading(entity)` (`src/composables/record.ts`). The heading leads with
the record's `displayName` where it has one, and the line under it walks a
ladder whose every rung carries something the heading is not already showing:
the record's own `description` (only client, role, scope, permission, policy
and realm have the column), else the `name` the heading gave up when a display
name took its place, else the `id`. The helper also supplies the record's
BREADCRUMB crumb, so the crumb and the `<h1>` cannot disagree. The entity type
deliberately does not appear: it is what the breadcrumb and the sidebar already
state, so the provisioned `master` realm (no display name, no description) read
"Realm" under a heading that said "master". Nine detail pages carried `DETAILS`
as their only `authupApp` key and lost their whole `translationsApp` block when
that line stopped being a translation. `sessions/[id]` is deliberately not a
caller: its heading is a subject (`subjectName ?? entity.sub`), not a name.
`.sub-title` is styled
in `packages/client-web-theme/assets/css/styles/root.css`: standing on its own
line it needs an absolute `font-size` (the old `.65em` resolved against the
`text-4xl` heading, and would now resolve against the body), and it is
`--vc-color-fg-muted` rather than `--authup-rose` because prose under a
heading should recede rather than compete with it. It is clamped to two lines:
a section description is authored short, but a record's is free text from a
textarea, and an unclamped paragraph would push the detail page's tab rail
down.

**Sidebar entries and page breadcrumbs read one descriptor map.**
`LayoutSections` (`apps/client-admin-console/src/config/layout/sections.ts`) holds
each top-level section's `name` / `url` / `icon` / `i18n`, keyed by the
`LayoutSection` enum. `defineSectionNavigationItem` builds the sidebar link
from it (each entry then declares only its access rules) and
`useSectionBreadcrumb` reads it for the section crumb, so the two surfaces
cannot spell a route, icon or label differently. Permissions deliberately stay
out of the descriptor: which entries a session may see is a nav concern, not
the identity of the section.

**`Navigation.reduceItem` must never write back onto its input**
(`apps/client-admin-console/src/config/layout/module.ts`). The items it receives
are the elements of the module-level `LayoutSideDefaultNavigation` constant, so
the localized name and the filtered children go onto a copy
(`{ ...item, name }`). The previous in-place assignment wrote the reduced list
back onto the constant, and since the sidebar re-runs `getSideItems()` from its
`:watch` on every session change, a later resolve under wider permissions (a
login, a realm switch) could not restore what an earlier one had removed. A
group whose children were all filtered away is now dropped when it carries no
`url` of its own, because a childless group renders as a leaf and would
otherwise sit in the sidebar as a dead entry. No entry in the current constant
carries `children`, so that branch guards grouped entries added later.

`@vuecs/core` ≥ 3.1.0 (`installThemeManager`) now **merges install
options into the existing manager** rather than dropping them on second
install (see tada5hi/vuecs#1591). So the previous "first-install-wins"
trap is gone: if a per-package plugin (`installForms`,
`installPagination`, ...) runs before the consumer's
`app.use(vuecs, { themes: [...], icons: [...] })`, the second call still
merges the themes / icons into the already-created manager. Form fields
no longer render unstyled just because the install order shifted.

Even so, **keep the explicit ordering**:

- A Nuxt consumer's `vuecs` plugin should carry `name: 'vuecs'` so other
  Nuxt plugins that touch vuecs APIs directly can `dependsOn: ['vuecs']`.
  The three authup consoles are plain Vite apps and sequence the installs
  by hand in their bootstrap (`apps/client-admin-console/src/main.ts`,
  `apps/client-account-console/src/main.ts`, `apps/client-auth-console/src/app.ts`).
- `packages/client-web-kit/src/module.ts` still deliberately does NOT
  install `@vuecs/forms` or `@vuecs/pagination` — both are installed by
  the consumer app, where it's clear they get the full theme config.
- The trap is defused, not removed: a malformed sequence where the
  consumer never calls `app.use(vuecs, ...)` at all still leaves the
  manager with whatever empty-config per-package installs first set up.
  An explicit `app.use(vuecs, { themes, icons, defaults })` somewhere in
  the boot chain is still required for the app to actually pick up
  authup's theme overrides.

`packages/client-web-kit/src/module.ts` deliberately does NOT install
`@vuecs/forms` or `@vuecs/pagination` — both are installed by the
consumer app's bootstrap (`src/main.ts` in the admin and account consoles,
`apps/client-auth-console/src/app.ts`), AFTER `app.use(vuecs, ...)`.

A Nuxt consumer (a downstream app on `@authup/client-web-nuxt`, such as hub)
must run its own vuecs plugin with `dependsOn: ['authup:kit']` so it runs
AFTER the kit plugin: the kit's `install()` calls `installTranslator()`,
which provides the ilingo locale via `app.provide(LocaleSymbol, ...)`.
Using `enforce: 'pre'` there would invert the order and make
`injectLocale()` throw — that throw aborts the plugin chain before
`@pinia/nuxt`'s setup runs, and the pinia plugin's already-registered
`app:rendered` hook then reads `nuxtApp.$pinia` as undefined and fails SSR
with a misleading "Cannot read properties of undefined (reading 'state')".
The kit's `install()` only registers `app.component(...)`s (it does not
render them), so installing the vuecs theme manager afterwards is still in
time for the first page render.

### Locale ownership (vuecs owns it, ilingo follows)

`@vuecs/locale` is the **source of truth** for the active UI locale —
cookie-backed (`vc-locale`), `auto`/browser-resolved, `<html lang>`
synced, and it drives `Config['locale']` (so `@vuecs/timeago` etc.
follow). This mirrors color-mode (`@vuecs/design`'s `bindColorMode` +
the `vc-color-mode` cookie). A Nuxt consumer gets it from `@vuecs/nuxt`'s
locale plugin (enabled by default; `name: 'vuecs-locale'`,
`enforce: 'post'`); the three authup consoles call `installLocale` with a
`vc-locale`-cookie-backed source (`createCookieRef`) in their bootstrap.

- The **language switcher** (`ALanguageSwitcherDropdown`) writes vuecs
  via `useLocaleControl()` (`packages/client-web-kit/src/core/translator/locale.ts`),
  which prefers `@vuecs/locale`'s `useLocaleManager` and **falls back to
  the ilingo locale ref** when vuecs-locale isn't installed (so the kit
  component still works for downstream consumers without it).
- **ilingo follows vuecs one-way** via `syncTranslatorLocaleFromManager(app)`:
  a Nuxt consumer runs it in a post plugin (`dependsOn: ['vuecs-locale']`);
  the consoles call it right after `installLocale` + the kit install. There is no reverse bridge — the switcher writing
  vuecs already persists + resolves. Do **not** re-add a
  `config: { locale: injectTranslatorLocale() }` feed in the consumer
  `app.use(vuecs, ...)`: the locale plugin owns `Config['locale']`.
