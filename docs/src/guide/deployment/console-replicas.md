# Console Replicas

`server-core` serves the API and the consoles from one process. Every console
lives under the `/console` prefix, so the two can be split across two replica
sets on the ONE origin: an API set that answers the protocol and the
management API, and a console set that serves the admin and account console
shells. Same image, same binary, same `PUBLIC_URL`, same database, one shared
Redis.

This page is the flag-only shape of that split. A dedicated
`authup console [admin|account]` role, which additionally leaves the
management API unmounted on the console set, is planned and builds on exactly
this recipe.

## The two sets

Both sets run `server/core start`. What differs is the console flags:

| Setting | API set | Console set |
|---------|---------|-------------|
| `ADMIN_CONSOLE_ENABLED` | `false` | `true` |
| `ACCOUNT_CONSOLE_ENABLED` | `false` | `true` |
| `COMPONENTS_ENABLED` | `false` | `false` |
| `MIGRATION_ENABLED` | `false` | `false` |

The console flags decide which set renders the console shells and answers
their sign-in routes (`/console/admin/login`, `/console/admin/callback` and
the account console's pair). With a flag off those routes answer a "not
enabled" notice, so a console request that reaches the API set by mistake
fails visibly rather than signing someone in on the wrong set.

The other two flags are the [worker](./worker.md) rules applied to both sets.
A console replica is a plain `start` process: with the defaults every console
replica would run the cron sweeps and race its siblings for the DDL. So run
`authup migration run` (container: `server/core migration run`) once,
before either set starts, and let a single [worker](./worker.md) own the
sweeps.

## Routing

The proxy sends `/console/**` to the console set and everything else to the
API set. If you use the [theme directory](./theming.md), route `/theme/**` to
the console set as well and mount the directory on both sets: the API set
renders the auth pages, which reference the theme's files, and the console set
serves them.

Nginx, with two upstreams:

```nginx
upstream authup_api {
    server 10.0.0.11:3000;
    server 10.0.0.12:3000;
}

upstream authup_console {
    server 10.0.0.21:3000;
}

server {
    server_name [DOMAIN];
    listen 80;

    location /console/ {
        proxy_set_header Host               $host;
        proxy_set_header X-Real-IP          $remote_addr;
        proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_pass                          http://authup_console;
    }

    location /theme/ {
        proxy_set_header Host               $host;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_pass                          http://authup_console;
    }

    location / {
        proxy_set_header Host               $host;
        proxy_set_header X-Real-IP          $remote_addr;
        proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_pass                          http://authup_api;
    }
}
```

The same rule as a Kubernetes `Ingress`, with one `Service` per set:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
    name: authup
spec:
    rules:
        - host: auth.example.com
          http:
              paths:
                  - path: /console
                    pathType: Prefix
                    backend:
                        service:
                            name: authup-console
                            port:
                                number: 3000
                  - path: /theme
                    pathType: Prefix
                    backend:
                        service:
                            name: authup-console
                            port:
                                number: 3000
                  - path: /
                    pathType: Prefix
                    backend:
                        service:
                            name: authup-api
                            port:
                                number: 3000
```

`/authorize`, `/token`, `/logout`, `/sessions/@me`, `/userinfo`, the identity
provider callbacks and the entity routes all land on the API set. That is the
whole routing table: one prefix for the consoles, the root for everything
else.

## Redis is required

The split needs a shared cache, so [`REDIS`](./configuration-server-core-redis.md)
must point both sets at the same server. The reason is the sign-in round-trip.
The hosted login page posts the consent to `POST /authorize`, which the proxy
sends to the API set; the authorization code it mints is a cache entry, not a
database row. The browser is then redirected to `/console/<name>/callback`,
which the proxy sends to the console set, and the console replica that
answers it redeems the code through its own `/token`, popping that entry. With
the default per-process memory cache the entry exists only in the API replica
that minted it, and every console sign-in fails.

Sticky sessions do not help. The two requests are on different paths and land
on different sets by design, so no affinity rule can keep them on one
process. The pending-login entry the console's `/login` parks and the token
blocklist ride the same cache and have the same requirement.

## SQLite cannot split

The split is for the server databases (MySQL and Postgres). A SQLite
deployment keeps one database file per container, the same caveat the
[worker](./worker.md) page states: a console container would sign users into a
database the API set never sees. Keep a SQLite deployment in one process.

## What the flags do not do

- **The asset mounts stay.** The console flags gate the shells and the sign-in
  routes, not `/console/admin/assets/*` and `/console/account/assets/*`. A
  replica that has a console's `dist/` installed serves them whatever the
  flag says. That is harmless (hashed, immutable files) and means an asset
  request that reaches the API set is still answered.
- **The auth pages ride every replica.** `/authorize`, `/logout`,
  `/register`, `/activate`, `/password-forgot`, `/password-reset` and their
  assets under `/console/auth/assets/*` are served by every replica of both
  sets. There is no flag for them, by design: they are the identity
  provider's own surface (`authorization_endpoint`, `end_session_endpoint`,
  the mail deep links), not a console. The `/console/**` rule sends the auth
  console's assets to the console set while the API set renders its pages;
  both sets carry the bundle, so both answer.
- **`GET /` reports per replica.** The `features` block of the status
  endpoint reflects the console flags of the replica that answered. Through
  the proxy `GET /` lands on the API set and reports `adminConsole: false`
  and `accountConsole: false`; a console replica probed directly (the image
  healthcheck does) reports `true`. Harmless, and a quick way to check which
  set a process belongs to.
- **The management API stays mounted on the console set.** A request for
  `/users` that reaches a console replica is answered like on the API set.
  The planned console role is what removes it.

## Docker Compose

Two services from the same image and the same configuration, differing only
in the two console flags, behind the proxy above. Redis and the database are
shared:

```yaml
version: '3.8'

services:
    server-core:
        image: authup/authup:latest
        restart: unless-stopped
        environment:
            - PUBLIC_URL=https://auth.example.com
            - DB_TYPE=postgres
            - DB_HOST=postgres
            - DB_PORT=5432
            - DB_USERNAME=postgres
            - DB_PASSWORD=postgres
            - DB_DATABASE=postgres
            - REDIS=redis://redis:6379
            - ADMIN_CONSOLE_ENABLED=false
            - ACCOUNT_CONSOLE_ENABLED=false
            - COMPONENTS_ENABLED=false
            - MIGRATION_ENABLED=false
        command: server/core start

    server-core-console:
        image: authup/authup:latest
        restart: unless-stopped
        environment:
            - PUBLIC_URL=https://auth.example.com
            - DB_TYPE=postgres
            - DB_HOST=postgres
            - DB_PORT=5432
            - DB_USERNAME=postgres
            - DB_PASSWORD=postgres
            - DB_DATABASE=postgres
            - REDIS=redis://redis:6379
            - COMPONENTS_ENABLED=false
            - MIGRATION_ENABLED=false
        command: server/core start
```

Run `server/core migration run` once before starting either service, and add
a [worker](./worker.md) for the sweeps. Both services keep the image
healthcheck: each opens an HTTP port and answers `GET /`.
