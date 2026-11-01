# File map (server-core and console services)

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

### File Structure

Only entries whose location or role is not obvious from the directory name.
Per-entity folders follow `{entity}/types.ts` (ports), `{entity}/service.ts`,
`{entity}/module.ts` (controller) and `{entity}/repository.ts` (adapter).

```text
packages/server-kit/src/core/
  types.ts, service.ts, actor/       : IEntityRepository, AbstractEntityService, ActorContext

packages/server-console-kit/src/
  html.ts                           : the shell helpers. replaceTemplateMarker is the ONLY way to splice a
                                      value into a page template ($-expansion trap)
  static-console.ts                 : defineStaticConsole: per-console closure, all state instance-scoped
  application/                      : createApplication (ConfigModule + ThemeModule + HTTPModule over orkos)
  types.ts                          : includes the structural ConsoleLogger (never import server-kit here)
  theme/contract/                   : PORTABLE: no node/http imports (themeAssetExtension exists to avoid
                                      node:path). parseThemeManifest rejects unknown keys explicitly, since
                                      validup strips them
  theme/module.ts, apply.ts, assets.ts : ThemeProvider, applyTheme, createThemeAssetsHandler (hand-written,
                                      realpath per request)

apps/server-{admin,account}-console/src/
  config.ts                         : CONFIG_SCHEMA, resolveConfig, readConfigFromEnv
  constants.ts                      : vite base, base path, package name, config marker (must match the bundle)
  handler.ts / server.ts / bin.ts   : createHandler (mountable), createServer (uncalled), the bin

apps/server-auth-console/src/
  render.ts                         : createRenderPage(distPath) (per-handler memo), assertRenderContract
  payload.ts                        : anonymous page reads, readRenderCookies, createAPIClient (base apiUrl,
                                      transport dials apiInternalUrl)
  resolve.ts                        : resolvePackagePath / resolveDistPath (pure, no memo)
  redirect.ts                       : sanitizeRelativeRedirect (open-redirect guard)

apps/server-core/src/
  core/oauth2/introspection/module.ts : resolveIntrospectionSubject, shared by POST /token/introspect and
                                      GET /sessions/@me/introspect
  core/oauth2/console-login/        : IConsoleLoginStore, pending-login TTL and cookie name. Adapter:
                                      app/modules/oauth2/repositories/console-login/ (cache blob)
  core/oauth2/session-credential/   : createSessionSecret, session cookie name, secret length, refresh throttle
  app/modules/database/repositories/entity/ : EntityRepositoryAdapter + its options
  adapters/database/subscriber/     : EntitySubscriber base + buildEntityDestinations
  adapters/http/controllers/workflows/
    auth-console.ts                 : redirectToAuthConsole, the one hop every hosted page GET takes
    account/, admin/                : the two cookie-mode routes per console (serve no page)
    console-login/module.ts         : ConsoleLogin, shared by both controllers
  adapters/http/constants.ts        : ADMIN_/ACCOUNT_CONSOLE_PATH and _SEGMENT (mounts, cookie scopes,
                                      callback URLs). No auth-console segment: reached via config.authConsoleUrl
  adapters/http/internal-client/    : createInternalHttpClient + toDialableOrigin (baseURL stays publicUrl)
  adapters/http/request/helpers/same-origin.ts : isSameOriginRequest, the gate for every cookie surface
  adapters/http/middleware/built-in/
    authorization/issuance.ts       : isOAuth2IssuancePath, the routes a cookie credential may never reach
    internal-http-client.ts         : per-request handoff of the loopback client factory
  app/modules/http/modules/controller.ts : the factory methods wiring repositories, services, controllers
```
