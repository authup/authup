<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-admin-console</h1>

<p align="center">
    <b>The service that serves the Authup admin console with its runtime configuration and theme.</b><br>
    Run it alone with <code>authup start console admin</code>, or let <code>authup start</code> put it on the API's port.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-admin-console"><img src="https://img.shields.io/npm/v/@authup/server-admin-console" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License: AGPL-3.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

The admin console is a static single-page app, built by [`@authup/client-admin-console`](https://github.com/authup/authup/tree/master/apps/client-admin-console). This service resolves that bundle out of `node_modules` and serves it:

- the shell on every request, with the runtime configuration spliced into its `<!--admin-config-->` marker (the app reads it as `window.__AUTHUP__`), and the same shell for every client-side route (`/users/<id>/roles`);
- the bundle's `assets/` under its own `/assets`, cached as immutable for one year, every asset URL rebased onto the path the console is published at;
- the operator theme and the security headers a console page needs, plus a health route at `/healthy`.

It holds no credential and reads no database. The two cookie-mode login routes (`/console/admin/login/start` and `/console/admin/callback`) stay on server-core, because the pending-login cookie has to be issued on the origin that reads it back.

The [`authup`](https://github.com/authup/authup/tree/master/apps/authup) CLI depends on this package. Install it directly only to run the console without the CLI, or to compose its handler into a server of your own.

## Installation

```shell
npm install @authup/server-admin-console
```

Node.js `^22.13.0 || ^23.5.0 || >=24.0.0`. The package is ESM-only and ships the `authup-admin-console` binary. `@authup/client-admin-console` comes with it as a dependency.

## Usage

### With the CLI

```shell
authup start console admin     # this console alone, on adminConsole.port
authup start                   # this console on server-core's own listener, at /console/admin
```

Both read `authup.yml` and hand this service its own section. This is the supported route.

### Standalone binary

```shell
PUBLIC_URL=https://auth.example.com ADMIN_CONSOLE_PORT=3021 authup-admin-console
```

The binary reads the environment alone, never `authup.yml`, and tears down on `SIGINT` / `SIGTERM`.

### In your own process

```typescript
import { createApplication } from '@authup/server-admin-console';

const application = createApplication();
await application.setup();
```

`createApplication()` resolves the configuration from the environment, loads the theme and listens. Pass `{ listen: false }` to build it without a listener (its app is then registered for a caller to mount), or `{ config }` with a `Config` or a function returning one.

To mount the console on an existing routup app, build the handler yourself:

```typescript
import { createHandler, readConfigFromEnv } from '@authup/server-admin-console';

const config = await readConfigFromEnv();
router.use('/console/admin', await createHandler(config));
```

## Configuration

Keys are declared once in [`@authup/server-config`](https://github.com/authup/authup/tree/master/packages/server-config). This service's own section is `adminConsole`:

| Key | Environment variable | Default | Description |
|---|---|---|---|
| `adminConsole.url` | `ADMIN_CONSOLE_URL` | `<publicUrl>/console/admin` | Where the console is published. Another path is allowed, another origin is refused |
| `adminConsole.enabled` | `ADMIN_CONSOLE_ENABLED` | `true` | Off, the console renders a disabled notice and server-core's login routes answer `404` |
| `adminConsole.path` | `ADMIN_CONSOLE_PATH` | `''` | A substituted console package directory, consulted before `node_modules` |
| `adminConsole.port` | `ADMIN_CONSOLE_PORT` | `3021` | The standalone listener port |
| `adminConsole.host` | `ADMIN_CONSOLE_HOST` | inherits `host` (`HOST`) | The standalone listener address |

It also reads `publicUrl` (`PUBLIC_URL`, the API address it hands to the browser, derived from `core.host` and `core.port` when unset), `accountConsole.url` for the "Manage account" link, and `theme.directoryPath` (`THEME_DIRECTORY_PATH`) and `theme.fragmentsEnabled` (`THEME_FRAGMENTS_ENABLED`).

## API

| Export | Kind | Purpose |
|---|---|---|
| `createApplication` | Function | The console as a runnable service: config, theme and listener |
| `createHandler` | Function | The mountable routup app for a `Config` |
| `createServer` | Function | `createHandler` wrapped in an app of its own, without the module graph |
| `resolveConfig` | Function | Validate an `authup.yml`-shaped input and map it onto `Config` (async) |
| `readConfigFromEnv` | Function | `resolveConfig` over the environment (async) |
| `CONFIG_SCHEMA` | Constant | The registry of keys this service reads |
| `Config`, `ConfigInput` | Type | The resolved configuration and the document-shaped input |
| `BASE_PATH`, `VITE_BASE`, `CONFIG_MARKER`, `PACKAGE_NAME`, `HEALTH_PATH` | Constant | The serving contract with the bundle |

## Notes

- **The marker and the base path are the bundle's contract.** A substituted package must carry `<!--admin-config-->` in its `index.html` and be built with the Vite base `/console/admin/`. Without the marker the app falls back to deriving the API URL from its own location; with another base the shell loads and every asset `404`s.
- **An asset miss is a `404`, not the shell.** A request under `/assets` that matches no file never falls through to the HTML shell.

## License

Made with 💚

Published under the [AGPL-3.0](./LICENSE). A commercial license is available; see [LICENSING.md](https://github.com/authup/authup/blob/master/LICENSING.md).
