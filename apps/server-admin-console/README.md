# @authup/server-admin-console

[![npm version](https://badge.fury.io/js/@authup%2Fserver-admin-console.svg)](https://badge.fury.io/js/@authup%2Fserver-admin-console)
[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)

The service behind authup's admin console.

It serves the built bundle of `@authup/client-admin-console`, resolved out of
`node_modules`: the shell per request with the runtime configuration spliced
into its `<!--admin-config-->` marker (the SPA reads it as `window.__AUTHUP__`),
the bundle's `assets/` under its own `/assets`, every asset URL rebased onto the
path the console is actually published at, plus the operator theme and the
security headers a console page needs. Client-side routing owns the sub-paths,
so a nested route answers the same shell.

It holds no credential and reads no database. The two cookie-mode login routes
(`/console/admin/login/start` and `/console/admin/callback`) stay on the API,
because the pending-login cookie must be issued on the origin that reads it back.

## Usage

`authup start console admin` is the supported route: the `authup` CLI reads
`authup.yml` and hands this service its own section. `authup start` composes it
onto server-core's own listener instead, which is the single-origin deployment.

The `authup-admin-console` bin is the standalone escape hatch, for a deployment
that runs a console without the CLI. It reads the environment alone.

```bash
PUBLIC_URL=https://example.com ADMIN_CONSOLE_PORT=3021 authup-admin-console
```

```typescript
import { createApplication } from '@authup/server-admin-console';

const application = createApplication();

await application.setup();
```

`createApplication()` builds this console's own module graph, resolves its
configuration and listens. Pass `{ listen: false }` to be mounted on someone
else's listener, or `{ config }` to hand over a configuration.

## Configuration

Keys are declared once in `@authup/server-config`; this service selects the ones
it reads. Its own section is `adminConsole`:

| Key | Environment variable | Default |
|---|---|---|
| `url` | `ADMIN_CONSOLE_URL` | derived from `publicUrl` |
| `enabled` | `ADMIN_CONSOLE_ENABLED` | `true` |
| `path` | `ADMIN_CONSOLE_PATH` | resolve the bundle from `node_modules` |
| `port` | `ADMIN_CONSOLE_PORT` | `3021` |
| `host` | `ADMIN_CONSOLE_HOST` | inherits the deployment-wide `host` |

It also reads `publicUrl` (`PUBLIC_URL`), the API address it hands to the
browser, `accountConsole.url` for the "Manage account" link, and the theme keys
`theme.directoryPath` (`THEME_DIRECTORY_PATH`) and `theme.fragmentsEnabled`
(`THEME_FRAGMENTS_ENABLED`). `resolveConfig()` and `readConfigFromEnv()` both
return a `Promise`.

## License

Made with 💚

Published under the [AGPL-3.0-only License](./LICENSE).
A commercial license is available for organizations that cannot meet the AGPL's conditions.
See [LICENSING.md](../../LICENSING.md) or contact **contact@tada5hi.net**.
