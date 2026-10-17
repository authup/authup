<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/client-admin-console</h1>

<p align="center">
    <b>The Authup admin console: a Vue single-page app for managing realms, users, clients, roles and permissions.</b><br>
    A built bundle with no process of its own, served by @authup/server-admin-console or by any static host.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/client-admin-console"><img src="https://img.shields.io/npm/v/@authup/client-admin-console" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License: AGPL-3.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#runtime-configuration">Configuration</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

The package ships `dist/` and nothing else: no server, no binary. [`@authup/server-admin-console`](https://github.com/authup/authup/tree/master/apps/server-admin-console) depends on it and serves it at `<publicUrl>/console/admin`, which is what `authup start` does. The landing page is a dashboard over the security event log; the sections cover realms, users, clients, paths, roles, permissions, policies, scopes, identity providers, keys, trusted CAs, sessions and events. Self-service (profile, password, second factors) lives in the account console, which this console links to.

Install it directly only to host the console on another static host, or to substitute a fork of it through `adminConsole.path`.

## Installation

```shell
npm install @authup/client-admin-console
```

The bundle is under `node_modules/@authup/client-admin-console/dist`.

## Usage

### Served by Authup

Nothing to configure. The service injects the runtime configuration into the shell on every request and the console signs in with an `HttpOnly` session cookie on the API's own origin, so no token is held in JavaScript.

- `ADMIN_CONSOLE_ENABLED=false` makes the console render a disabled notice and turns its server-side login off.
- `ADMIN_CONSOLE_PATH` points the service at a substituted package directory instead of this one.

### Hosted on its own

1. Serve `dist/` under `/console/admin/`, the base the bundle was built with, and answer every deep link (`/console/admin/users/<id>`) with `index.html`.
2. Replace the `<!--admin-config-->` marker in `index.html` with the configuration:

   ```html
   <script>window.__AUTHUP__ = { apiUrl: 'https://auth.example.com' };</script>
   ```

3. Add the host's origin to the server's `TRUSTED_ORIGINS`, so the per-realm `admin-console` client accepts the redirect back.

On a foreign origin the session cookie cannot be presented, so the console signs in through the authorization code flow with PKCE in the browser instead.

## Runtime configuration

`window.__AUTHUP__` may carry:

| Key | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | `string` | the page's origin plus any prefix in front of `/console/admin` | The API base URL |
| `basePath` | `string` | `/console/admin` | The router base |
| `accountConsoleUrl` | `string` | `<apiUrl>/console/account` | Where "Manage account" links to |
| `clientId` | `string` | `admin-console` | The OAuth2 client the browser-side sign-in uses |
| `cookieSession` | `boolean` | `false` | Set by the serving service: it implements the cookie-mode login routes. Applies only when `apiUrl` is the page's own origin |
| `features.adminConsole` | `boolean` | `true` | `false` renders the disabled notice |

## Development

From the repository root, `npm run dev` serves this console through Vite with hot module replacement at `http://localhost:3000/console/admin`, on the API's own origin.

On its own:

```shell
VITE_API_URL=http://localhost:3000 npm run dev    # Vite on http://localhost:5173/console/admin/
npm run build                                       # dist/, what the service serves
```

Outside production `http://localhost:5173` is a trusted origin by default, so the sign-in redirect works without configuration. The port is strict: when it is taken, Vite fails instead of moving to another one.

## Notes

- **A missing marker fails silently.** Without `<!--admin-config-->` replaced, the console still loads and derives the API URL from its own location, which is only right when it is served on the API's origin.
- **The asset base is fixed at build time.** `index.html` references its assets under `/console/admin/`. The service rewrites those references for any other published path; a static host serving the bundle elsewhere has to do the same or rebuild with another Vite base.

## License

Made with 💚

Published under the [AGPL-3.0](./LICENSE). A commercial license is available; see [LICENSING.md](https://github.com/authup/authup/blob/master/LICENSING.md).
