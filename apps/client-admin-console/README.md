# @authup/client-admin-console 🎨

[![npm version](https://badge.fury.io/js/@authup%2Fclient-admin-console.svg)](https://badge.fury.io/js/@authup%2Fclient-admin-console)
[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)

This is the admin console for Authup, a flexible and secure authentication and
authorization system: a client-only Vue SPA that `@authup/server-core` serves
at `<publicUrl>/console/admin`. The package ships the built `dist/` only; there is no
server process and no binary.

## Usage

Served by server-core (the default): nothing to configure. The server injects
the runtime configuration into the shell per request and authenticates the
console with its opaque session cookie. `ADMIN_CONSOLE_ENABLED=false` turns
the route into a disabled notice; `ADMIN_CONSOLE_PATH` points server-core at a
substituted package directory.

Standalone hosting: serve `dist/` under the `/console/admin` base path (or any other, injected as `basePath`) on any static
host (every deep link must answer with `index.html`), inject the
configuration by replacing the `<!--admin-config-->` marker in `index.html`
with `<script>window.__AUTHUP__ = { apiUrl: 'https://auth.example.com' };</script>`
(optional keys: `basePath`, `clientId`), and list the host's origin in the
server's `TRUSTED_ORIGINS`. On a foreign origin the console signs in through
the browser-side authorization-code flow instead of the session cookie.

## Development

```shell
VITE_API_URL=http://localhost:3001 npm run dev    # vite on http://localhost:3000/console/admin/
npm run build                                       # dist/, what server-core serves
npm run test
```

## License

Made with 💚

Published under the [AGPL-3.0 License](./LICENSE).
A commercial license is available for organizations that cannot meet the AGPL's conditions. See [LICENSING.md](../../LICENSING.md) or contact **contact@tada5hi.net**.
