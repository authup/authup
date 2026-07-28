# Configuration

The UI is distributed as a **prebuilt** Nuxt/Nitro server bundle (npm package and
docker image alike). That distinction matters for environment variables:

- Plain names like `API_URL`, `PUBLIC_URL` or `COOKIE_DOMAIN` are read **at build
  time** only — they are compiled into the bundle when building the app from source
  and have **no effect** on the published bundle.
- At **runtime**, the prebuilt bundle honors Nuxt's runtime-config names
  (`NUXT_PUBLIC_*`) plus Nitro's server binding variables.

## Runtime environment variables

::: code-group
````dotenv [env]
# The application port (NITRO_PORT also works).
PORT=3000
# The bind address (NITRO_HOST also works).
HOST=0.0.0.0
# The address where the API can be reached.
NUXT_PUBLIC_API_URL=http://localhost:3001
# The public url of the user interface.
NUXT_PUBLIC_PUBLIC_URL=http://localhost:3000
# Optional: widen the session cookie domain (e.g. .example.com).
NUXT_PUBLIC_COOKIE_DOMAIN=
````
:::

If `NUXT_PUBLIC_API_URL` is not set, the UI falls back to `http://localhost:3001`
(the API's default address).

::: warning Cookie domain
Do **not** point `NUXT_PUBLIC_COOKIE_DOMAIN` at a domain shared with the API's
hosted auth pages (the `/authorize` login/consent UI): both surfaces use identical
session cookie names, so a shared cookie domain has them overwriting each other's
session state. Leave the cookie host-scoped unless you share it between your *own*
applications only.
:::

## Configuration file (via the `authup` CLI)

When the UI is launched through the [`authup` quickstart CLI](./bare-metal) instead
of directly, it can also be configured through the shared multi-section
configuration file — the CLI reads the `client.web` section and passes the values
to the UI process as the appropriate runtime environment variables:

::: code-group
````dotenv [authup.conf]
client.web.port=3000
client.web.host=0.0.0.0
client.web.apiUrl=http://localhost:3001
client.web.publicUrl=http://localhost:3000
````

````dotenv [authup.client.web.conf]
port=3000
host=0.0.0.0
apiUrl=http://localhost:3001
publicUrl=http://localhost:3000
````
:::

When `apiUrl` is not set, the CLI derives it from the `server.core` section's
`publicUrl`, so a single multi-section file keeps both services aligned.
Environment variables override file values.

::: tip Login redirect allowlist
The login screen redirects through the API's authorization-code flow and back
to this UI's origin. In production, that origin must be trusted by the API —
add the UI origin (`NUXT_PUBLIC_PUBLIC_URL`) to the server's
[`TRUSTED_ORIGINS`](./configuration-server-core) unless it is already the
API's `PUBLIC_URL` origin. In development, `http://localhost:3000` is trusted
automatically.
:::
