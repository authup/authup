<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-auth-console</h1>

<p align="center">
    <b>The service that renders Authup's hosted login, consent, registration and password recovery pages.</b><br>
    server-core redirects every page request here; this service renders it and hydrates it over HTTP.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-auth-console"><img src="https://img.shields.io/npm/v/@authup/server-auth-console" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License: AGPL-3.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

A `GET` on one of server-core's page routes (`/authorize`, `/register`, `/activate`, `/password-forgot`, `/password-reset`, `/logout`, `/device`) answers a redirect to this service carrying the request's own query. This service renders the page through the server bundle of [`@authup/client-auth-console`](https://github.com/authup/authup/tree/master/apps/client-auth-console), resolved out of `node_modules`, and serves that bundle's client assets under its own `/assets`, cached as immutable for one year.

It holds no credential, no database and no loopback. It fetches each page's data anonymously from server-core:

| Page | Hydrated from |
|---|---|
| `/authorize` | `GET /authorize/info` with the browser's query, plus the visitor's access token cookie so the first render shows the right step |
| `/register`, `/activate`, `/password-forgot`, `/password-reset` | The feature flags on `GET /`, plus the page's own query |
| `/device` | The feature flags, plus the `user_code` it was called with |
| `/logout` | Nothing: the page drives the end-session call itself |

The [`authup`](https://github.com/authup/authup/tree/master/apps/authup) CLI depends on this package. Install it directly only to run the pages without the CLI, or to compose its handler into a server of your own.

## Installation

```shell
npm install @authup/server-auth-console
```

Node.js `>=26.0.0`. The package is ESM-only and ships the `authup-auth-console` binary. `@authup/client-auth-console` comes with it as a dependency.

## Usage

### With the CLI

```shell
authup start console auth      # this console alone, on authConsole.port
authup start                   # this console on server-core's own listener, at /console/auth
```

Both read `authup.yml` and hand this service its own section. `authup start` also points the service's internal API address at its own listener, unless `internalUrl` is configured.

### Standalone binary

```shell
PUBLIC_URL=https://auth.example.com INTERNAL_URL=http://core:3000 AUTH_CONSOLE_PORT=3020 authup-auth-console
```

The binary reads the environment alone, never `authup.yml`, and tears down on `SIGINT` / `SIGTERM`.

### In your own process

```typescript
import { createApplication } from '@authup/server-auth-console';

const application = createApplication();
await application.setup();
```

`createApplication()` resolves the configuration from the environment, loads the theme and listens. Pass `{ listen: false }` to build it without a listener, or `{ config }` with a `Config` or a function returning one. `createHandler(config)` returns the mountable routup app alone.

### Replace the pages

Set `authConsole.path` (`AUTH_CONSOLE_PATH`) to the directory of a package that fulfills the render contract of `@authup/client-auth-console`: a `dist/client/index.html`, a `dist/client/.vite/ssr-manifest.json` and a `dist/server/server.js` exporting `render` and `CONTRACT_VERSION`. At boot the service refuses a bundle whose `CONTRACT_VERSION` (missing counts as `1`) is not `5`.

## Configuration

Keys are declared once in [`@authup/server-config`](https://github.com/authup/authup/tree/master/packages/server-config). This service's own section is `authConsole`, and it has no `enabled` key: the hosted pages are where tokens are issued, so they cannot be turned off.

| Key | Environment variable | Default | Description |
|---|---|---|---|
| `authConsole.url` | `AUTH_CONSOLE_URL` | `<publicUrl>/console/auth` | Where the pages are published; server-core redirects there. Another path is allowed, another origin is refused |
| `authConsole.path` | `AUTH_CONSOLE_PATH` | `''` | A substituted console package directory, consulted before `node_modules` |
| `authConsole.port` | `AUTH_CONSOLE_PORT` | `3020` | The standalone listener port |
| `authConsole.host` | `AUTH_CONSOLE_HOST` | inherits `host` (`HOST`) | The standalone listener address |
| `publicUrl` | `PUBLIC_URL` | derived from `core.host` and `core.port` | The API address the browser reaches; it goes into the page |
| `internalUrl` | `INTERNAL_URL` | `publicUrl` | The API address this service fetches from |

It also reads `theme.directoryPath` (`THEME_DIRECTORY_PATH`) and `theme.fragmentsEnabled` (`THEME_FRAGMENTS_ENABLED`).

## API

| Export | Kind | Purpose |
|---|---|---|
| `createApplication` | Function | The pages as a runnable service: config, theme and listener |
| `createHandler` | Function | The mountable routup app for a `Config`; an optional `render` replaces the bundle's |
| `createServer` | Function | `createHandler` wrapped in an app of its own, without the module graph |
| `resolveConfig`, `readConfigFromEnv` | Function | Map `authup.yml`-shaped input, or the environment, onto `Config` (async) |
| `CONFIG_SCHEMA` | Constant | The registry of keys this service reads |
| `createRenderPage` | Function | The per-handler renderer over a dist directory |
| `assertRenderContract` | Function | Throw when a bundle's `CONTRACT_VERSION` differs from the service's |
| `resolvePackagePath`, `resolveDistPath` | Function | Locate the console package and its built dist |
| `sanitizeRelativeRedirect` | Function | Accept a `redirect` value only when it is a site-relative path |
| `CONTRACT_VERSION`, `PAGES`, `BASE_PATH`, `VITE_BASE`, `HEALTH_PATH` | Constant | The serving contract with the bundle |
| `Config`, `ConfigInput`, `RenderPage` | Type | The resolved configuration, its input and the renderer signature |

## Notes

- **Two API addresses, on purpose.** `publicUrl` is what the browser reaches; inside a container it may name a port nothing listens on. Set `internalUrl` whenever this service runs where `publicUrl` does not resolve, or `/authorize` and the workflow pages answer `502`.
- **Only the access token is forwarded, and only on `/authorize`.** The refresh token never leaves the browser, and the service never revokes or writes anything during a render.
- **A missing bundle does not fail the boot.** Every page answers an error naming the missing build until `@authup/client-auth-console` is built; a bundle with the wrong contract version does fail the boot.

## License

Made with 💚

Published under the [AGPL-3.0](./LICENSE). A commercial license is available; see [LICENSING.md](https://github.com/authup/authup/blob/master/LICENSING.md).
