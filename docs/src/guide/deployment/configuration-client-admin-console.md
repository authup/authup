# Admin Console

The admin console is the administration surface: realms, clients, users,
roles, permissions, policies, keys, sessions and the audit event log. It is a
client-side single-page application (the `@authup/client-admin-console`
package) served by `@authup/server-admin-console` on the IdP origin at
`<publicUrl>/console/admin` by default, the same way the
[account console](./account-console.md) is served at
`<publicUrl>/console/account`.

The bundle and the service that serves it are two packages. `authup start`
runs that service in its own process alongside the API, on the API's listener,
so a default deployment is still one container and one port; `authup console
admin` runs it alone, on its own port, for a
[split deployment](./console-replicas.md). Earlier releases shipped the console
as a Nuxt server with its own environment variables, all of which are gone; see
[Upgrading](./upgrading.md) for what to remove from an existing setup.

## Sign-in

The console shares an origin with the API, so it signs in through the server.
`GET /console/admin/login/start` starts an authorization-code flow with PKCE against
the per-realm `admin-console` system client (see
[Provisioning](./provisioning.md#per-realm-system-clients)) and
`GET /console/admin/callback` redeems the code. Those two are the only
`/console/admin` paths the API answers; everything else under it is the console
service. The browser keeps an opaque,
`HttpOnly` session cookie; no OAuth2 token is handed to the page's
JavaScript. The account console authenticates the same way, and both surfaces
share the single session on that origin.

Binding an access policy to a realm's `admin-console` client
(`accessPolicyId`) restricts who may newly sign in to the console. It gates
admission (the authorization-code flow and code redemption), not tokens that
were already issued. See the tip in
[Provisioning](./provisioning.md#per-realm-system-clients).

## Configuration

The console has its own section, `server.adminConsole`, in the one
[configuration file](./configuration.md). Two of its options are the ones a
single-container deployment ever needs; `url`, `port` and `host` matter for a
[split deployment](./console-replicas.md) and are documented there.

::: code-group
````dotenv [.env]
# Serve the console at <publicUrl>/console/admin.
ADMIN_CONSOLE_ENABLED=true
# Package directory of a substituted console.
ADMIN_CONSOLE_PATH=
````

````yaml [authup.yml]
server:
  adminConsole:
    enabled: true
    path: ''
````
:::

`server.adminConsole.enabled` / `ADMIN_CONSOLE_ENABLED` (default `true`) turns the
surface off. Both sides read it: `authup start` then mounts no admin console at
all, and the API's two sign-in routes (`/console/admin/login/start`,
`/console/admin/callback`) answer `404` rather than minting a session for a
console nothing serves. `authup console admin` refuses to start for the same
reason. The flag is also reported in the `features` block of the public status
endpoint (`GET /`).

`server.adminConsole.path` / `ADMIN_CONSOLE_PATH` replaces the served package. It
points at a directory
holding a built `dist/`, whose `index.html` must carry the
`<!--admin-config-->` marker and whose assets must be built for the
`/console/admin/` vite base. Neither is verified at boot: a shell without the
marker still answers `200`, and the console silently falls back to deriving its
API URL from its own origin. Empty resolves `@authup/client-admin-console` from
`node_modules`. See
[Replacing a console](./theming.md#replacing-a-console). For branding alone,
use the [theme directory](./theming.md) instead: it needs no build.

EXPERIMENTAL: point it at a source checkout instead, and `authup dev` (see the
[Quick Start](../development/quick-start.md) guide) serves it from source
with hot module replacement rather than reading `dist/`.

## Standalone hosting

The console is an ordinary OAuth2 relying party, so the same built bundle can
be hosted on any static host or another origin instead of (or in addition to)
the embedded serving. The npm package ships `dist/` only: there is no binary
and no process to run.

1. Take the `dist/` directory of the `@authup/client-admin-console` package
   and serve it under a path of your host, `/console/admin` by default. Routing happens in the
   browser, so every path below that base has to serve the same `index.html`.
2. Inject the runtime configuration by replacing the `<!--admin-config-->`
   marker in `index.html` (or by any script that runs before the app bundle):

   ```html
   <script>
   window.__AUTHUP__ = {
       "apiUrl": "https://auth.example.com",
       "basePath": "/console/admin"
   };
   </script>
   ```

   `apiUrl` is the authup server's public URL. Without injected
   configuration the app assumes it is served by (or proxied to) the authup
   origin itself and derives the API URL from its own location. When you
   build the bundle from source, `VITE_API_URL` bakes the value in at build
   time instead. The optional `clientId` defaults to `admin-console`; set it
   only for a fork that registers its own OAuth2 client.
3. Register the host's origin in the authup server's
   [`TRUSTED_ORIGINS`](./configuration-server-core). The per-realm
   `admin-console` client's redirect and post-logout allowlists derive from
   that origin set, so the sign-in and sign-out round-trips are permitted on
   the next start.

On a foreign origin the server-side session cookie does not apply: it is
`SameSite=Strict` and scoped to the API's own origin. The console then uses
the browser-side authorization-code flow with PKCE and keeps its tokens in
JavaScript. That is decided at runtime from the injected configuration, not
configured.

## Retired environment variables

The console had its own runtime configuration while it ran as a server. None
of the following is read any more, and none has a successor:

| Variable | Why it is gone |
|---|---|
| `NUXT_PUBLIC_API_URL`, `API_URL`, `API_URL_SERVER` | The API is the serving origin, or `window.__AUTHUP__.apiUrl` when hosted standalone. |
| `NUXT_PUBLIC_PUBLIC_URL` | `ADMIN_CONSOLE_URL`, which defaults to `<publicUrl>/console/admin` and may change the path but not the origin. |
| `NUXT_PUBLIC_COOKIE_DOMAIN` | The console is same-origin with the API, so there is no cookie domain to widen. |
| `NUXT_PUBLIC_CLIENT_ID` | The client is `admin-console`. A fork injects `clientId` in `window.__AUTHUP__`. |
| `NUXT_HOST`, `NUXT_PORT` | `ADMIN_CONSOLE_HOST` / `ADMIN_CONSOLE_PORT`, the listener `authup console` binds. |

The plain build-time names `PUBLIC_URL`, `COOKIE_DOMAIN` and `CLIENT_ID` are
gone with them. Note that `PUBLIC_URL` is unrelated to the console and stays a
[`server/core` option](./configuration-server-core): it is the public URL of
the server, and the console's own address derives from it.

The `client.admin-console` section of the configuration file is no longer read
either, and `authup start client.admin-console` is refused: `start` takes no
positional argument. The command that does is `authup console [admin|account|auth]`,
which serves a console rather than selecting a package.
