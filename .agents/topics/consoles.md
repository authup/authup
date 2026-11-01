# Console services, console login and theming

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

#### Auth Workflow UI (the auth console service) + Status Endpoint

The hosted auth pages render in `@authup/server-auth-console`
(`apps/server-auth-console`) from the `apps/client-auth-console` bundle's
render contract. Never in the admin console, which is an ordinary OAuth2
client with no privileged channel into the IdP. server-core keeps the
protocol: endpoints, issuer and every POST that mints or ends something.

- **Page GETs are a stateless hop.** `/authorize`, `/register`, `/activate`,
  `/password-forgot`, `/password-reset`, `/logout` and `/device` answer a
  redirect to `<authConsoleUrl><page>` with the request's own query verbatim
  (`redirectToAuthConsole`, `adapters/http/controllers/workflows/auth-console.ts`,
  `Cache-Control: no-store` since the query carries hints, tokens, redirects).
  POST on the first five stays the JSON API (`/logout` is the exception
  below); `/device` calls live under
  `/device_authorization/*`. No server-side handle for the pending request:
  a cookie handle clobbers across tabs and a TTL breaks mail-borne
  `redirect=` chains.
- **`/logout` forwards on BOTH methods** (the POST is the OIDC `form_post`
  binding, a navigation). The page's own JSON call is told apart by
  `Content-Type`, compared case-folded (RFC 9110).
- `window.__AUTHUP__` is the one window global every console injects into.
- **`GET /authorize/info`** (`AuthorizeController.buildAuthorizeInfo`, the only
  producer; `client.authorize.getInfo()`) is the `/authorize` page's render
  input: anonymous, `no-store`, takes the page's query (`provider` and the
  closed `error` marker set included), and answers a refused request as 200
  with the refusal under `error`, since the page renders refusals. The shape
  is the complete `payload.data` (`federatedLogin` included). `requestPath`
  is anchored on `/authorize` because it is rendered as the `redirect` back.
  `error` is `AuthorizeInfoError` (sanitized attributes plus `message`), not
  `Error`: `instanceof Error` is false and `name`/`stack` are absent. The
  client side still types it `Error` and the client as `Client`; both are
  casts over an untyped payload, nothing type-checks across the boundary.
- **Splice templates only through `replaceTemplateMarker`**
  (`@authup/server-console-kit`), never `String.prototype.replace` with a
  string replacement: `$&`, `` $` ``, `$'`, `$$` expand in the VALUE, which
  carries raw query input (`?token=$'` breaks the inline script and the page
  dies with "No hydration data set."). No escaping helper can prevent it,
  the expansion happens after serialization. Same rule for the
  `<!--account-config-->` / `<!--admin-config-->` splices.
- **Serving seam.** The bundle is a runtime dependency of the service,
  resolved by `resolvePackagePath` / `resolveDistPath`
  (`apps/server-auth-console/src/resolve.ts`, stateless, substituted
  `distPath` first, else the locter ancestor walk). A dist resolves only
  when `dist/client/index.html` AND `dist/server/server.js` exist. The
  template, ssr-manifest and render entry are memoized per handler inside
  `createRenderPage(distPath)`, never per process, so two handlers never
  share a template. `dist/client/assets` is mounted at the service's
  `/assets` (immutable, one year); `index.html` and `.vite/` are not
  reachable. The service imports only TYPES from `src/contract.ts`. A missing
  bundle answers 500 with an actionable message.
- **No credential of its own; the visitor's session is forwarded on
  `/authorize` only** (handler `session: true`, `readRenderCookies`). Page
  data is anonymous: `/authorize` from `GET /authorize/info`, the workflow
  pages from `GET /`, `/logout` from nothing. No loopback, no database.
  Render rules, each a hazard on its own:
  - never the refresh token: a render cannot hand a rotated pair back, so a
    server refresh makes the browser replay a spent token into family
    revocation;
  - never a revoke: the server guard tears down with
    `logout({ revoke: false, revokeTokens: false })`; browser teardowns keep
    revoking;
  - never a write: no-op cookie writers, no `preferences`;
  - one client per render (`createAPIClient(config)`), since the store puts
    the visitor's bearer on it;
  - MFA status and consent are fetched once server-side and handed over via
    the hydration store (`authup:authorize:mfa:<session>:<user>:<acr>`,
    `authup:authorize:consent:<user>:<client>:<scopes>`). A second
    `GET /authenticators/challenge` mints a second WebAuthn nonce and
    orphans the one in the markup. A federated return hands nothing over.
- **Rate limits on a split deployment**
  (`adapters/http/middleware/built-in/rate-limit.ts`). Stage one bounds
  failed authentications per source address
  (`RATE_LIMIT_FAILED_AUTHENTICATION_MAX`, 300/min), counting only what a
  guess produces (`isFailedAuthentication`: an `invalid_client` 401, or a 401
  to a request with `Authorization` other than `expired_token` /
  `inactive_token`). Expired, revoked and disabled-key tokens are not
  counted: NAT networks renew constantly and would lock out. The code reaches
  the limiter via `setRequestErrorCode` from the error middleware, which must
  stay on the same router. It uses `@routup/rate-limit`'s
  `skipSuccessfulRequest` (reserve then return) so parallel bursts are
  bounded; counting after the response was rejected for that reason
  (routup/plugins#846). Stage two budgets per identity or anonymous address
  (`core.rateLimitUserMax` 15000, `rateLimitClientMax` 300000,
  `rateLimitAnonymousMax` 1200; a numeric `max` in `core.middlewareRateLimit`
  replaces all three). The address is the `trustProxy` one with any trailing
  port dropped, else every connection gets a fresh bucket. The console
  forwards no visitor address, so all its anonymous calls share its ONE
  address; refused forwarded bearers would push it over stage one, hence
  `createSessionForwardingGuard` (`apps/server-auth-console/src/session.ts`,
  per handler): forwarding stops for the rest of a minute once refused plus
  in-flight reach `SESSION_FORWARDING_REJECTED_MAX` (100), reserving before
  forwarding. Composed `authup start` is loopback and skipped. Real fix
  (forwarding the visitor address) needs a trust contract that does not
  exist yet.
- **Two API addresses** (#3550). `Config.apiUrl` is the browser's (payload
  `baseURL`, cookie path); `Config.apiInternalUrl` is what the render
  transport dials, from the root key `internalUrl` (`INTERNAL_URL`), which
  resolves to `publicUrl`. `publicUrl` need not resolve inside the
  deployment (port mappings, ingress-only hostnames, self-signed TLS); the
  tell is that `/logout` renders while the other pages 502. The composed
  roles override an unset value with server-core's own listen address
  (`applyInternalApiUrl` / `buildInternalUrl`,
  `apps/authup/src/console/api-url.ts`); `internalUrl === publicUrl` counts as
  unset on purpose. The derived address has NO path (server-core mounts
  root-relative); a configured one may. The swap is at the TRANSPORT
  (`createRebasedTransport(apiUrl, apiInternalUrl)`, `@authup/core-http-kit`),
  never on `baseURL`: the client feeds rendered hrefs (identity provider
  buttons) and error messages, which hydration never corrects (#3662). It
  matches the base as a string prefix on a segment boundary; parsing the url
  first would resolve an unencoded `../` and dial the public address.
  server-core's internal client is not pointed at the key (it uses its real
  listen address); the static consoles never read it.
- **Flow continuity.** Workflow links carry a same-origin `redirect` back to
  the authorize request; `sanitizeRelativeRedirect`
  (`apps/server-auth-console/src/redirect.ts`) rejects absolute and
  protocol-relative values.
- **Feature flags and `GET /`.** Pages render a localized disabled notice,
  never a 404 (stale mail links). The service reads the flags from
  `GET /` (`StatusController`, `StatusResponse`:
  `{ version, date, publicUrl, features, endpoints, consoles }`, built once
  at boot in `createStatusController`). `docs` / `openapi` are null while
  `middlewareSwagger` is off; a disabled console is null; the auth console is
  always present. `internalUrl` and `mtlsPublicUrl` never appear.
- **Sub-path deployment.** A service's public path is the path of
  `<name>Console.url` (`getURLBasePath`); it feeds the router base,
  `useBasePath()` and the asset rebase. `redirect` / `requestPath` stay
  prefix-free; the prefix is applied only when rendered as an href.
- **Asset rebasing REPLACES the vite base, never prefixes it**
  (`rebaseAssetURLs(html, viteBase, assetBasePath)`). Prefixing only works
  when the service sits at exactly its vite base and 404s every asset
  elsewhere. The smoke split scenario publishes consoles at path-less urls to
  catch it.
- **Kit forms** (`packages/client-web-kit/src/components/workflows/`) are
  pure: `injectHTTPClient()`, `done`/`failed` emits, permissive validators
  (server is authoritative). Auth chrome CSS lives in
  `@authup/client-web-kit-theme`; kit components ship no `<style>`.

#### The internal HTTP client (loopback self-calls)

`HTTPInjectionKey.InternalHttpClient` (`createInternalHttpClient`,
`adapters/http/internal-client/`, handed out per request under
`INTERNAL_HTTP_CLIENT_FACTORY_STORE_KEY`) has one consumer: the console
login's code redemption in `ConsoleLogin`. Its transport
(`createRebasedTransport`) rewrites requests for `publicUrl` onto the own
listen ORIGIN (`toDialableOrigin`, wildcard to loopback, resolved per
request), so self-calls skip the proxy and its TLS. `baseURL` stays
`publicUrl`, which keeps the replayed `redirect_uri` byte-equal at `/token`
(RFC 6749 4.1.3). Registered `lifetime: 'transient'`; a registration made
before `HTTPModule.setup` wins (test seam).

### Account Console (`/console/account`)

Bundle `apps/client-account-console` (client-only SPA, no SSR: auth-gated
content cannot server-render) served at runtime by
`apps/server-account-console`. server-core serves neither, only the two
cookie-mode routes.

- **Serving** (`apps/server-account-console/src/handler.ts`, one
  `defineStaticConsole` instance): routes `''` + `'/*page'`, shell read per
  request, config spliced into `<!--account-config-->`, lang/color-mode
  stamped, `/console/account/` vite base rebased, theme and security headers
  applied. Only a positive bundle resolution is cached. An asset request
  reaching the shell route answers 404, not HTML (a module script served as a
  document is a blank console with no error).
- **Runtime config** (`src/config.ts`): a standalone host injects
  `window.__AUTHUP__` (`apiUrl`, optional `basePath`, its own validated
  `ref`); with nothing injected the API url is derived same-origin. Standalone
  origins must be in `TRUSTED_ORIGINS`.
- **`ref` back link.** The service validates `ref` against its own origin
  plus `trustedOrigins` (`buildAppOrigins`, `<origin>/**` `isSimpleMatch`
  after URL canonicalization) and drops anything else. The app renders only
  from the in-memory holder (`src/ref.ts`) seeded from that config; it must
  never read `route.query.ref` back (bypasses the allowlist).
  `sessionStorage` `authup:account:ref` carries it across the `/authorize`
  round-trip only. The admin console links here via `useAccountConsoleURL()`.
- **Session cookies are scoped to the deployment base path** (#3495,
  `resolveCookiePath` in the kit's `core/console/`). Root-scoped cookies
  collide with a host app embedding authup under the same origin and trip
  refresh replay detection, revoking every session. Path-less and
  cross-origin deployments keep `/`.
- **`accountConsole.enabled`** (`ACCOUNT_CONSOLE_ENABLED`, default true) is
  read by both sides: the service injects it into `features` (shell renders
  `AWorkflowDisabledNotice`), server-core answers 404 on the two cookie-mode
  routes and reports it on `GET /`.
- **Browser-side login** (standalone cross-origin only; a served console
  uses cookie mode, below): auth-code + PKCE against the per-realm
  `account-console` client, never reuse of a lingering kit session. A failed
  exchange appends `error=invalid_grant`, which suppresses the auto re-kick
  (no unattended loop); a code with no saved request is dropped. The exchange
  reuses the hosted login's session row. Per-app attribution is
  `auth_session_tokens.client_id`; `auth_sessions.client_id` is the subject
  FK and is never written by the authorize flow. `access_denied` renders a
  denial card that wins over an authenticated state.
- **A failed page load is a state, not a toast** (#3482): `usePageError()`
  (`src/pages/utils.ts`) plus `PageError.vue` with Retry; action failures
  keep toasting. Rules:
  - every 401 runs `store.logout()`, never Retry. A 401 reaching `capture()`
    is one the kit hook could not renew; a refresh token still in the store
    proves nothing (a successful refresh whose replay 401s leaves a rotated
    one), and Retry would loop refresh/replay/rotate (#3487). Depends on
    `JWT_*` mapping to 401.
  - the panel shows one localized line, never the error message (hapic
    messages carry the request url, subject uuid and filter).
  - the per-session token inventory flags failures per row but still runs
    the 401 rule through `capture`'s optional sink.
- **No actor-scoped state in the response**: the payload is operator config
  plus the validated `ref` echo.
- **Packaging.** Bundle and service are both in the CLI's
  `test:smoke:packed` workspace list, or a packed install reaches for the
  registry.

#### Console session credential (cookie mode)

A console on the API's ORIGIN holds no OAuth2 token in JavaScript. It
presents an opaque `HttpOnly` cookie naming its `auth_sessions` row; every
token the login produced is revoked in the redeeming request. It depends on
origin, not process (`isSameOriginRequest` compares against `publicUrl`), so
the split topology works unchanged.

- **The cookie carries `auth_sessions.secret`, never `id`** (`id` is public
  as `sid`). `secret` is nullable, unique, `select: false`, read only by
  `ISessionRepository.findOneBySecret`, set at callback, nulled on sign-out.
  A durable column, not a cache blob: a cached multi-day credential breaks on
  multi-replica deployments without Redis. The 5-minute pending login IS a
  cache blob (`IConsoleLoginStore`, single-use `cache.pop`).
- **The column stores `sha256(cookie)`** (`hashSessionSecret`,
  `core/oauth2/session-credential/module.ts`), so a table read yields no
  replayable cookie. Unkeyed on purpose: the input is about 248 bits, and a
  key would have to be global since the realm is unknown at lookup.
- **Three gates, all required** (`isSameOriginRequest`,
  `adapters/http/request/helpers/same-origin.ts`): `SameSite=Strict`;
  `Origin` equal to publicUrl's origin on state-changing methods;
  `Sec-Fetch-Site: same-origin`, failing closed when absent (a sibling
  subdomain is same-site, so `SameSite` alone admits it). The middleware
  treats a failure as anonymous; callback and sign-out assert. An origin
  mismatch is logged once naming both values (otherwise: console loads, then
  silently 401s). **`trustedOrigins` must not be consulted**: it would need
  `SameSite=None` and is a much larger trust.
- **Cookie name.** https at host root uses `__Host-authup_session`
  (`buildSessionCookieName`, `adapters/http/cookie/session.ts`) and never
  reads the plain name, so a sibling host cannot plant a same-named cookie.
  http or sub-path deployments cannot use the prefix; there sibling hosts
  stay inside the trust boundary.
- **The `Authorization` header always wins**; the cookie is not read when a
  header is present.
- **INVARIANT: cookie auth never reaches the OAuth2 issuance surface**
  (`isOAuth2IssuancePath`: `/authorize`, `/token*`, `/logout`,
  `/device_authorization*`). Otherwise origin script mints a full token pair
  via the auto-consenting `account-console` client. The match runs on
  `event.path` before routing and normalizes like routup (case, one trailing
  slash, repeated slashes). Account-link routes are deliberately not denied.
  `HTTPOAuth2IdentityGrantType` is unregistered but would mint from the
  request identity; the deny-list keeps wiring it safe. Do not narrow it.
- **Residual, stated accurately.** XSS on the IdP origin can act as the user
  and leave with a portable credential: `POST /users/@me` sets a password
  without the current one, and `CLIENT_CREATE` allows a self-made confidential
  client. No deny-list can close this. `HttpOnly` keeps TOKENS out of script,
  not the account; do not claim more in docs or release notes.
- **Routes.** `GET /console/<name>/login/start` (PKCE + state behind a
  5-minute `SameSite=Lax` login cookie, Lax because the return may cross an
  external IdP) and `GET /console/<name>/callback` stay on server-core: the
  pending-login cookie must be issued on the origin that reads it. A split
  deployment routes those two exact paths to the API set. The kick URL comes
  from `buildConsoleLoginURL`. The callback requires
  `Sec-Fetch-Site: same-origin` (else login CSRF into the attacker's
  account), validates `state` before consuming the pending entry (a second
  tab must not burn the first), maps `error` through a closed set, and
  revokes BOTH tokens. Cookie `maxAge` is the remaining lifetime in SECONDS;
  path is `getURLBasePath(publicUrl) || '/'`, never a hard-coded `/`.
  Hydration is `GET /sessions/@me/introspect`, sign-out `DELETE /sessions/@me`.
- **`GET /sessions/@me/introspect`** shares `resolveIntrospectionSubject`
  (`core/oauth2/introspection/`) with `POST /token/introspect`, projecting
  `getForToken`, so it cannot disagree with an in-process evaluation. Both
  set `no-store` and `Vary: Cookie`.
- **Sign-out** is `DELETE /sessions/@me`, issued by `store.logout()` before
  `cleanup()`. The kit does NOT clear the path-`/` token cookies: they are the
  hosted auth console's SSO session that `prompt=none` / `select_account`
  depend on.
- **Lifetime slides**: the cookie branch calls `SessionManager.refresh()` on
  a throttle (cookie mode has no refresh grant). Session writes never
  re-create a row: `update(session, patch)` is a conditional UPDATE of the
  moved columns only; zero affected rows drops the cache entry and throws
  `JWTError.expired()` (`invalid_grant` at `/token`). The cache entry is
  written BEFORE the UPDATE so a concurrent revoke cannot be resurrected.
- **CORS**: `Allow-Credentials` only for publicUrl's origin (`cors.ts`);
  `Allow-Origin` keeps reflecting.
- **`cookieSession` = capability AND applicability.** The service injects
  the capability (the routes exist; a newer dist against an older server
  would navigate to a 404). `resolveConsoleRuntimeConfig` (kit
  `core/console/`) ANDs it with `isSameOriginApiUrl(apiUrl, origin)`, since a
  foreign API refuses the Strict cookie. Either alone is silently fatal. No
  config key. In cookie mode `installStore` seeds none of the token cookies:
  a seeded bearer would win over the cookie branch. The auth hook is still
  installed (its inject throws otherwise) but inert.
- **Permission checks** use verdicts from `POST /authorization/check` sent
  with the cookie. The recompute watch keys on `status` and
  `permissionRevision`, never token presence (which never flips in cookie
  mode and would latch every verdict false). No automatic 401 teardown; each
  console's 401 rule and guard cover it. A browser without Fetch Metadata can
  never authenticate (intended fail-closed).

### Admin Console (`/console/admin`)

Second static console (`apps/client-admin-console`, served by
`apps/server-admin-console`), same shape as the account console:
`src/config.ts` (`apiUrl`, `basePath` default `/console/admin`, `clientId`
default `admin-console`, `cookieSession`, `features`), same cookie-mode rule.

- **One serving factory**: `defineStaticConsole({ packageName, marker,
  viteBase, cwd, distPath? })`. All state is instance-scoped and the
  substitution is a definition field, never a mutator, so two handlers never
  share a resolution. `serve(event, { basePath, assetBasePath, theme,
  config })` takes a built config and the theme provider.
- **One login class**: `ConsoleLogin`
  (`adapters/http/controllers/workflows/console-login/`), parameterized by
  `{ clientName, segment, consoleUrl, refusalPath? }`. Login cookie scope and
  callback derive from the segment on the API origin; landing and refusal
  targets from the path of `<name>Console.url`. Admin sets
  `refusalPath: 'login'` because its root guard would drop the `?error=`
  marker. server-core must answer 404 for every console page; re-adding
  serving there would let whichever mount comes first win silently.
- **Shell route is a wildcard** (`''` + `'/*page'`, nested routes). The
  segment is `ADMIN_CONSOLE_SEGMENT` / `ACCOUNT_CONSOLE_SEGMENT`
  (`adapters/http/constants.ts`); the `/console` prefix is shared by spelling
  only, there is no prefix constant. Config: `adminConsole.enabled`
  (`ADMIN_CONSOLE_ENABLED`, declared for the service and server-core; off
  also 404s the kick and callback), `.path`, `.url`, `.port`, `.host`. The
  marker `<!--admin-config-->` and vite base `/console/admin/` must match the
  bundle: a mismatched vite base serves the shell and 404s every asset with
  no error (the smoke runner follows the first script to catch it).
- **Routing.** `src/router.ts` is an explicit table with route `meta`
  (`requireLoggedIn` / `requireLoggedOut` / `requirePermissions` /
  `layout`). `createRoutingGuard` (`src/guard.ts`) applies gates over
  `route.matched` so children inherit protection. Cookie mode: a failed or
  settled-`RESTORING` resolve logs out with `revoke: false`; a `?code=` is
  never exchanged. **The gates never call `logout()`**: in cookie mode that
  is `DELETE /sessions/@me` on the row every surface shares. A permission
  denial goes back, or home when that would loop.
- **Chunk-load recovery** (`installChunkLoadRecovery`,
  `src/chunk-recovery.ts`) does one full load per target per document,
  marked in `sessionStorage` `authup:admin:chunk-recovery`; `main.ts` clears
  the marker after mounting on a resolved navigation. Without the marker a
  persistently 404ing asset loops.
- **Post-login destination** rides `sessionStorage` `authup:admin:redirect`
  (`src/redirect.ts`), validated as a site-relative path, because the server
  callback lands on the console root. Standalone hosting keeps it in the
  callback URI's query (#3476).
- **`<Suspense>`** in `src/App.vue` keeps the detail pages' `async setup()`.
  Runtime asset urls are chunk-relative via `renderBuiltUrl` (js and css),
  because the server rebases `index.html` only.
- **No Nuxt.** No `NUXT_PUBLIC_*` / `API_URL` / `COOKIE_DOMAIN` / `CLIENT_ID`
  variables; runtime config is injected. `@authup/client-web-nuxt` stays the
  integration for downstream apps (hub).

## Console Theming (`themeDirectoryPath`)

**EXPERIMENTAL**: layout, manifest fields and config keys may change; the
manifest `version` is the detection hook. Not up for change: the trust
boundary and the `--authup-*` token names.

The mechanism is `@authup/server-console-kit` `src/theme/`; each console
service creates its own provider. server-core has no theme. Config
`theme.directoryPath` (`THEME_DIRECTORY_PATH`, default `''` = off), resolved
against server-core's `rootPath` by the CLI. Unset means no provider, no
route, byte-identical pages.

- **Layout**: `theme.json` + `assets/` + `fragments/`. The HTTP mount root is
  `<root>/assets`, so manifest and fragments are unreachable by construction.
- **Precedence**: tokens go into `<style>@layer authup-theme{...}</style>`
  before `</head>`; an undeclared layer is appended last and beats
  `@layer authup` and `@layer base` without `!important`. **Never an inline
  `style` on `<html>`**: it would freeze the brand when `.dark` flips
  client-side. Operator `theme.css` is unlayered and beats everything,
  including the bundle's dark rules.
- **Inject before `</head>`, not via a marker**, so already-published
  bundles get themed. Use `injectHeadContent` / `stampDocumentTitle`
  (function-replacement form, same `$'` trap).
- **`theme/contract/` must stay free of node and routup imports** (browser
  editor and CLI validator reuse it); that is why `themeAssetExtension`
  exists instead of `node:path`. The kit's `tsconfig.build.json` pins
  `"types": ["node"]` because nothing auto-discovers node globals there.
- **Token grammar, never an allowlist**: `THEME_TOKEN_NAME_PATTERN`
  (`^--[a-z][a-z0-9-]*$`), values at most 256 chars without `} < > ; @ \`,
  `/*` or `url(` / `expression(`. An allowlist would live where it cannot
  bind to `client-web-kit-theme` and rot.
- **`logo` / `logoDark` are manifest fields** (need `url()`).
  `buildThemeHead` emits `--authup-{auth,account}-logo-image` and
  `-logo-mark-visibility`; the kit theme paints the image on the mark's
  `<svg>` and hides only its children (hiding the svg drops the background).
  `logoDark` goes into `.dark`. Needs the kit theme CSS of the consuming
  bundle, so not applied to old published bundles.
- **`favicon` replaces the bundle's icon**: `applyTheme` strips the shell's
  icon links (`removeFaviconLinks`) first, since browsers pick among several
  arbitrarily.
- **Theme assets use a hand-written handler** (`theme/assets.ts`), mounted
  under each console's base (`THEME_ASSET_MOUNT_PATH`). Not `@routup/assets`:
  it serves path suffixes, probes `.html`, and has no realpath containment.
  Symlinks must be followed (ConfigMap volumes), so containment is
  realpath-per-request. Content types come from a map the extension
  allowlist derives from; SVG gets `THEME_ASSET_CSP` (sandboxed, active
  content).
- **Failure posture**: an invalid manifest fails the boot (`.strict()`, every
  issue listed); one that becomes invalid later keeps the last good value and
  logs. A broken logo must never take down the login page. Boot logs an
  inventory because the usual failure is silence.
- **Trust boundary.** Filesystem equals operator trust. CSS on `/authorize`
  can overlay consent buttons (`frame-ancestors` does not help), so themes
  stay filesystem-only forever; any per-realm source may carry DATA only (a
  theme name, a token map through the same validator), never CSS or markup.
  The theme directory must not be process-writable (same reason
  `logDirectoryPath` is the only written directory and
  `provisioningDirectoryPath` is read-only; conventions.md ->
  *Configuration Naming*).
- **`theme.fragmentsEnabled`** (`THEME_FRAGMENTS_ENABLED`, default false):
  `fragments/head.html`, spliced last, verbatim. No sanitizer (a partial one
  invites treating fragments as safe). Head only: body markup next to consent
  buttons is a better forgery primitive.
- **Live reload**: manifest and fragment mtime-revalidated with a 1s debounce;
  assets per request with a weak ETag. Kubernetes needs a whole-volume mount
  (`subPath` is frozen until restart).
- **Per-instance**: the provider lives in the handler closure and is passed
  to `serve()`, so two apps in one process never share a theme.

### Console substitution (`<name>Console.path`)

`authConsole.path` (`AUTH_CONSOLE_PATH`), `accountConsole.path`
(`ACCOUNT_CONSOLE_PATH`) and `adminConsole.path` (`ADMIN_CONSOLE_PATH`) name
package directories consulted before the node_modules walk. Each is declared
by the service that reads it and reaches the code as a definition field
(`distPath`) or factory argument (`createRenderPage(distPath)`), never a
mutator.

- **`authup dev`** (EXPERIMENTAL) serves a substituted path through vite with
  HMR when it is a source checkout (a `vite.config.ts` present, no config
  key).
- **Contracts.** The auth bundle exports `CONTRACT_VERSION` (missing = 1,
  currently 5; history in `apps/client-auth-console/src/contract.ts`; the
  floor only rises). A static console's contract is its marker plus vite
  base, constants in the serving service: a wrong marker silently degrades to
  same-origin API derivation, a wrong vite base 404s every asset.
- **Boot assert** (`assertRenderContract`,
  `apps/server-auth-console/src/render.ts`, run by `createHandler`): refuses
  to start unless the bundle's version equals the service's own
  `CONTRACT_VERSION` (`src/constants.ts`, typed `typeof` the bundle's so a
  one-sided bump fails the build). It runs for default and substituted
  bundles (caret ranges can skew). Skipped for an unresolved dist (stays a
  per-request error) and for a substituted `render` (`authup dev`).
