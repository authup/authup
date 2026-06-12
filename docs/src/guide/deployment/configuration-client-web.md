# Configuration


The UI configuration can be provided using environment variables.

::: code-group
````dotenv [env]
# The application port.
PORT=3000
# The address where the API can be reached.
NUXT_PUBLIC_API_URL=http://localhost:3001
# The public url of the user interface.
NUXT_PUBLIC_PUBLIC_URL=http://localhost:3000
````
:::

::: tip Login redirect allowlist
The login screen redirects through the API's authorization-code flow and back
to this UI's origin. In production, that origin must be trusted by the API —
add `NUXT_PUBLIC_PUBLIC_URL` to the server's
[`ADDITIONAL_ORIGINS`](./configuration-server-core) unless it is already the
API's `PUBLIC_URL` origin. In development, `http://localhost:3000` is trusted
automatically.
:::
