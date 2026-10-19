<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/client-account-console</h1>

<p align="center">
    <b>The Authup account console: a Vue single-page app where users manage their own account.</b><br>
    A built bundle with no process of its own, served by @authup/server-account-console or by any static host.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/client-account-console"><img src="https://img.shields.io/npm/v/@authup/client-account-console" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License: AGPL-3.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#runtime-configuration">Configuration</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

The package ships `dist/` and nothing else: no server, no binary. [`@authup/server-account-console`](https://github.com/authup/authup/tree/master/apps/server-account-console) depends on it and serves it at `<publicUrl>/console/account`, which is what `authup start` does. Its pages cover the profile, the password, authenticators (TOTP, recovery codes, email codes, passkeys), connected external accounts, sessions and the applications a user has granted access to.

Link your users to `<publicUrl>/console/account?ref=<your app's URL>`: the console renders a back link to the application they came from.

Install the package directly only to host the console on another static host, or to substitute a fork of it through `accountConsole.path`.

## Installation

```shell
npm install @authup/client-account-console
```

The bundle is under `node_modules/@authup/client-account-console/dist`.

## Usage

### Served by Authup

Nothing to configure. The service injects the runtime configuration into the shell on every request, validates `ref` against the trusted origins, and the console signs in with an `HttpOnly` session cookie on the API's own origin, so no token is held in JavaScript.

- `ACCOUNT_CONSOLE_ENABLED=false` makes the console render a disabled notice and turns its server-side login off.
- `ACCOUNT_CONSOLE_PATH` points the service at a substituted package directory instead of this one.

### Hosted on its own

1. Serve `dist/` under `/console/account/`, the base the bundle was built with, and answer every deep link with `index.html`.
2. Replace the `<!--account-config-->` marker in `index.html` with the configuration:

   ```html
   <script>window.__AUTHUP__ = { apiUrl: 'https://auth.example.com' };</script>
   ```

3. Add the host's origin to the server's `TRUSTED_ORIGINS`, so the per-realm `account-console` client accepts the redirect back.

On a foreign origin the session cookie cannot be presented, so the console signs in through the authorization code flow with PKCE in the browser instead.

## Runtime configuration

`window.__AUTHUP__` may carry:

| Key | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | `string` | the page's origin plus any prefix in front of `/console/account` | The API base URL |
| `basePath` | `string` | `/console/account` | The router base |
| `ref` | `string` | none | The back-link target. The app never reads `ref` from its own URL, so a static host that wants one validates it and injects it here |
| `cookieSession` | `boolean` | `false` | Set by the serving service: it implements the cookie-mode login routes. Applies only when `apiUrl` is the page's own origin |
| `features.accountConsole` | `boolean` | `true` | `false` renders the disabled notice |

## Development

From the repository root, `npm run dev` serves this console through Vite with hot module replacement at `http://localhost:3000/console/account`, on the API's own origin.

On its own, against a running Authup server:

```shell
VITE_API_URL=http://localhost:3000 npm run dev    # Vite on http://localhost:5173/console/account/
npm run build                                       # dist/, what the service serves
```

Outside production `http://localhost:5173` is a trusted origin by default, so the sign-in redirect works without configuration. The port is strict, so only one console's standalone dev server can run at a time; run the other through `npm run dev` at the root.

## Notes

- **A missing marker fails silently.** Without `<!--account-config-->` replaced, the console still loads and derives the API URL from its own location, which is only right when it is served on the API's origin.
- **The asset base is fixed at build time.** `index.html` references its assets under `/console/account/`. The service rewrites those references for any other published path; a static host serving the bundle elsewhere has to do the same or rebuild with another Vite base.

## License

Made with 💚

Published under the [AGPL-3.0](./LICENSE). A commercial license is available; see [LICENSING.md](https://github.com/authup/authup/blob/master/LICENSING.md).
