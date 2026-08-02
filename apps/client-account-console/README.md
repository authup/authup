# @authup/client-account-console 👤

[![npm version](https://badge.fury.io/js/@authup%2Fclient-account-console.svg)](https://badge.fury.io/js/@authup%2Fclient-account-console)
[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)

This is the account console for Authup: the end-user self-service surface
(profile, password, authenticators, sessions, application consents).

It is a client-only single-page application. The authup server
(`@authup/server-core`) depends on this package and serves the built
bundle at `<publicUrl>/account`; the same bundle can be hosted standalone
on any static host. See the deployment guide for details, including the
runtime configuration contract (`window.__AUTHUP_ACCOUNT__` via the
`<!--account-config-->` marker in `index.html`).

## Development

The dev server needs a running authup server to talk to.

1. Start (or pick) an authup server and allow the dev origin, so the
   per-realm `account-console` OAuth2 client accepts the sign-in
   round-trip from the vite origin:

   ```sh
   TRUSTED_ORIGINS=localhost:5173 authup-server start
   ```

   From the repository, after `npm run build`:

   ```sh
   TRUSTED_ORIGINS=localhost:5173 npm run cli -w apps/server-core -- start
   ```

2. Run the dev server with the API URL injected:

   ```sh
   VITE_API_URL=http://localhost:3001 npm run dev
   ```

   (`VITE_API_URL` can also live in a local `.env.local`. Without it the
   app assumes it is served by the authup origin itself and derives the
   API URL from its own location, which is wrong under the vite dev
   server.)

3. Open <http://localhost:5173/account> — the app is mounted under its
   canonical `/account` base path in dev too.

Sign-in leaves the dev origin for the server's hosted login and returns
with an authorization code, so the full flow works against the real API.

## Build

```sh
npm run build
```

Emits the static bundle to `dist/` (the artifact this package ships).

## License

Made with 💚

Published under the [AGPL-3.0 License](./LICENSE).
A commercial license is available for organizations that cannot meet the AGPL's conditions —
see [LICENSING.md](../../LICENSING.md) or contact **contact@tada5hi.net**.
