<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-account-console</h1>

<p align="center">
    <b>The service that serves the Authup account console with its runtime configuration and theme.</b><br>
    Run it alone with <code>authup start console account</code>, or let <code>authup start</code> put it on the API's port.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-account-console"><img src="https://img.shields.io/npm/v/@authup/server-account-console" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License: AGPL-3.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

The account console, where users manage their profile, password, authenticators, sessions, connected accounts and applications, is a static single-page app, built by [`@authup/client-account-console`](https://github.com/authup/authup/tree/master/apps/client-account-console). This service resolves that bundle out of `node_modules` and serves it:

- the shell on every request, with the runtime configuration spliced into its `<!--account-config-->` marker (the app reads it as `window.__AUTHUP__`), and the same shell for every client-side route;
- the bundle's `assets/` under its own `/assets`, cached as immutable for one year, every asset URL rebased onto the path the console is published at;
- the operator theme and the security headers a console page needs, plus a health route at `/healthy`.

It holds no credential and reads no database. The two cookie-mode login routes (`/console/account/login/start` and `/console/account/callback`) stay on server-core, because the pending-login cookie has to be issued on the origin that reads it back.

The [`authup`](https://github.com/authup/authup/tree/master/apps/authup) CLI depends on this package. Install it directly only to run the console without the CLI, or to compose its handler into a server of your own.

## Installation

```shell
npm install @authup/server-account-console
```

Node.js `^22.13.0 || ^23.5.0 || >=24.0.0`. The package is ESM-only and ships the `authup-account-console` binary. `@authup/client-account-console` comes with it as a dependency.

## Usage

### With the CLI

```shell
authup start console account     # this console alone, on accountConsole.port
authup start                   # this console on server-core's own listener, at /console/account
```

Both read `authup.yml` and hand this service its own section. This is the supported route.

### Standalone binary

```shell
PUBLIC_URL=https://auth.example.com ACCOUNT_CONSOLE_PORT=3022 authup-account-console
```

The binary reads the environment alone, never `authup.yml`, and tears down on `SIGINT` / `SIGTERM`.

### In your own process

```typescript
import { createApplication } from '@authup/server-account-console';

const application = createApplication();
await application.setup();
```

`createApplication()` resolves the configuration from the environment, loads the theme and listens. Pass `{ listen: false }` to build it without a listener (its app is then registered for a caller to mount), or `{ config }` with a `Config` or a function returning one.

To mount the console on an existing routup app, build the handler yourself:

```typescript
import { createHandler, readConfigFromEnv } from '@authup/server-account-console';

const config = await readConfigFromEnv();
router.use('/console/account', await createHandler(config));
```

## Configuration

Keys are declared once in [`@authup/server-config`](https://github.com/authup/authup/tree/master/packages/server-config). This service's own section is `accountConsole`:

| Key | Environment variable | Default | Description |
|---|---|---|---|
| `accountConsole.url` | `ACCOUNT_CONSOLE_URL` | `<publicUrl>/console/account` | Where the console is published. Another path is allowed, another origin is refused |
| `accountConsole.enabled` | `ACCOUNT_CONSOLE_ENABLED` | `true` | Off, the console renders a disabled notice and server-core's login routes answer `404` |
| `accountConsole.path` | `ACCOUNT_CONSOLE_PATH` | `''` | A substituted console package directory, consulted before `node_modules` |
| `accountConsole.port` | `ACCOUNT_CONSOLE_PORT` | `3022` | The standalone listener port |
| `accountConsole.host` | `ACCOUNT_CONSOLE_HOST` | inherits `host` (`HOST`) | The standalone listener address |

It also reads `publicUrl` (`PUBLIC_URL`, the API address it hands to the browser, derived from `core.host` and `core.port` when unset), `trustedOrigins` (`TRUSTED_ORIGINS`) for the `ref` check below, and `theme.directoryPath` (`THEME_DIRECTORY_PATH`) and `theme.fragmentsEnabled` (`THEME_FRAGMENTS_ENABLED`).

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
| `resolveRef` | Function | Validate a `ref` value against a list of trusted origins |
| `REF_MAX_LENGTH` | Constant | The longest `ref` accepted (`2000`) |
| `BASE_PATH`, `VITE_BASE`, `CONFIG_MARKER`, `PACKAGE_NAME`, `HEALTH_PATH` | Constant | The serving contract with the bundle |

## Notes

- **`ref` is checked on the server.** A `?ref=<url>` query names the application the visitor came from and becomes the console's back link. It is injected only when it is an http(s) URL of at most 2000 characters on `publicUrl`'s origin or one of `trustedOrigins`; anything else is dropped silently.
- **The marker and the base path are the bundle's contract.** A substituted package must carry `<!--account-config-->` in its `index.html` and be built with the Vite base `/console/account/`. Without the marker the app falls back to deriving the API URL from its own location; with another base the shell loads and every asset `404`s.
- **An asset miss is a `404`, not the shell.** A request under `/assets` that matches no file never falls through to the HTML shell.

## License

Made with 💚

Published under the [AGPL-3.0](./LICENSE). A commercial license is available; see [LICENSING.md](https://github.com/authup/authup/blob/master/LICENSING.md).
