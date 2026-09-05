# @authup/server-auth-console

[![npm version](https://badge.fury.io/js/@authup%2Fserver-auth-console.svg)](https://badge.fury.io/js/@authup%2Fserver-auth-console)
[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)

The service behind authup's hosted auth pages: `/authorize` (login and
consent), `/register`, `/activate`, `/password-forgot`, `/password-reset` and
`/logout`. A server-core page GET redirects here carrying the request's own
query, so the authorization request is what identifies the flow.

It renders `@authup/client-auth-console` through that package's own render
contract, resolved out of `node_modules`: the SSR bundle per request with the
hydration payload spliced into the template, the bundle's client assets under
its own `/assets`, plus the operator theme and the security headers a login
page needs.

It hydrates ANONYMOUSLY over HTTP and holds no credential, no database and no
loopback: `/authorize` from `GET /authorize/info`, the four workflow pages from
`GET /` plus their own query, and `/logout` from nothing at all, since that page
drives the end-session call itself. Substituting a package that fulfills the
render contract is the supported way to replace the hosted auth UI.

## Usage

`authup start console auth` is the supported route: the `authup` CLI reads
`authup.yml` and hands this service its own section. `authup start` composes it
onto server-core's own listener instead, which is the single-origin deployment.

The `authup-auth-console` bin is the standalone escape hatch, for a deployment
that runs a console without the CLI. It reads the environment alone.

```bash
PUBLIC_URL=https://example.com AUTH_CONSOLE_PORT=3020 authup-auth-console
```

```typescript
import { createApplication } from '@authup/server-auth-console';

const application = createApplication();

await application.setup();
```

`createApplication()` builds this console's own module graph, resolves its
configuration and listens. Pass `{ listen: false }` to be mounted on someone
else's listener, or `{ config }` to hand over a configuration.

## Configuration

Keys are declared once in `@authup/server-config`; this service selects the ones
it reads. Its own section is `authConsole`, and it carries no `enabled` key:
the hosted login, consent and workflow pages are the issuance surface.

| Key | Environment variable | Default |
|---|---|---|
| `url` | `AUTH_CONSOLE_URL` | derived from `publicUrl` |
| `path` | `AUTH_CONSOLE_PATH` | resolve the bundle from `node_modules` |
| `port` | `AUTH_CONSOLE_PORT` | `3020` |
| `host` | `AUTH_CONSOLE_HOST` | inherits the deployment-wide `host` |

It is the one console that fetches server-side, so the API address is two keys:
`publicUrl` (`PUBLIC_URL`) is the browser's and reaches the hydration payload,
`internalUrl` (`INTERNAL_URL`) is the one this service dispatches against and
falls back to `publicUrl`. It also reads `theme.directoryPath`
(`THEME_DIRECTORY_PATH`) and `theme.fragmentsEnabled`
(`THEME_FRAGMENTS_ENABLED`). `resolveConfig()` and `readConfigFromEnv()` both
return a `Promise`.

## License

Made with 💚

Published under the [AGPL-3.0-only License](./LICENSE).
A commercial license is available for organizations that cannot meet the AGPL's conditions.
See [LICENSING.md](../../LICENSING.md) or contact **contact@tada5hi.net**.
