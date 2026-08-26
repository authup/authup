# Admin Console

The admin console is the administration surface: realms, clients, users,
roles, permissions, policies, keys, sessions and the audit event log. It is a
client-side single-page application (the `@authup/client-admin-console`
package) that `server-core` serves on the IdP origin at `<publicUrl>/console/admin`
by default, the same way it serves the
[account console](./account-console.md) at `<publicUrl>/console/account`.

It is no longer a service of its own. Earlier releases shipped it as a
separate Nuxt server with its own port and its own environment variables; a
deployment now runs `server/core` alone. See
[Upgrading](./upgrading.md#the-admin-console-is-served-by-server-core) for what
to remove from an existing setup.

## Sign-in

The console shares an origin with the API, so it signs in through the server.
`GET /console/admin/login` starts an authorization-code flow with PKCE against the
per-realm `admin-console` system client (see
[Provisioning](./provisioning.md#per-realm-system-clients)) and
`GET /console/admin/callback` redeems the code. The browser keeps an opaque,
`HttpOnly` session cookie; no OAuth2 token is handed to the page's
JavaScript. The account console authenticates the same way, and both surfaces
share the single session on that origin.

Binding an access policy to a realm's `admin-console` client
(`accessPolicyId`) restricts who may newly sign in to the console. It gates
admission (the authorization-code flow and code redemption), not tokens that
were already issued. See the tip in
[Provisioning](./provisioning.md#per-realm-system-clients).

## Configuration

The console reads no configuration of its own. Two `server-core` options
control it:

::: code-group
````dotenv [.env]
# Serve the console at <publicUrl>/console/admin.
ADMIN_CONSOLE_ENABLED=true
# Package directory of a substituted console.
ADMIN_CONSOLE_PATH=
````

````dotenv [authup.server.core.conf]
adminConsoleEnabled=true
adminConsolePath=
````
:::

`adminConsoleEnabled` (default `true`) turns the surface off. The routes then
serve a localized "not enabled" notice instead of the console, so stale links
do not dead-end, and the sign-in routes (`/console/admin/login`, `/console/admin/callback`)
answer the same notice instead of starting a login. The flag is also reported
in the `features` block of the public status endpoint (`GET /`).

`adminConsolePath` replaces the served package. It points at a directory
holding a built `dist/`, whose `index.html` must carry the
`<!--admin-config-->` marker; the marker is checked at boot for a package you
actually substituted. Empty resolves `@authup/client-admin-console` from
`node_modules`. See
[Replacing a console](./theming.md#replacing-a-console). For branding alone,
use the [theme directory](./theming.md) instead: it needs no build.

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
| `NUXT_PUBLIC_PUBLIC_URL` | The console has no public URL of its own. It lives at `<publicUrl>/console/admin`. |
| `NUXT_PUBLIC_COOKIE_DOMAIN` | The console is same-origin with the API, so there is no cookie domain to widen. |
| `NUXT_PUBLIC_CLIENT_ID` | The client is `admin-console`. A fork injects `clientId` in `window.__AUTHUP__`. |
| `NUXT_HOST`, `NUXT_PORT` | There is no second process to bind. |

The plain build-time names `PUBLIC_URL`, `COOKIE_DOMAIN` and `CLIENT_ID` are
gone with them. Note that `PUBLIC_URL` is unrelated to the console and stays a
[`server/core` option](./configuration-server-core): it is the public URL of
the server, and the console's own address derives from it.

The `client.admin-console` section of a configuration file and the
`authup.client.admin-console.conf` file are no longer read either, and
`authup start client.admin-console` is refused: `authup start` takes no
positional argument, because it starts exactly one service.
