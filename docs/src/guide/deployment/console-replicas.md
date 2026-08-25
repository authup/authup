# Console Replicas

`server-core` serves the API and the consoles from one process. Every console
lives under the `/console` prefix, so the two can be split across two replica
sets on the ONE origin: an API set that answers the protocol and the
management API, and a console set that serves the admin and account console
shells. Same image, same binary, same `PUBLIC_URL`, same database, one shared
Redis.

The console set runs the **console role**, `authup-server console`, and the
API set runs `start` with the console flags off. The role is what makes the
split more than routing: a console replica has no management API at all, so a
request for `/users` that reaches it by mistake answers 404 instead of the
row.

## The console role

```bash
authup-server console
authup-server console admin
authup-server console account
authup-server console admin account
```

In a container that is `server/core console [admin|account]`. The process is
the identity provider without its management API. It boots like `start`
minus provisioning (the API replicas own the boot sync) and minus the
background sweeps (a [worker](./worker.md) or the API replicas own those),
and it never applies migrations: like the worker it verifies at startup that
no migration is pending and refuses to boot otherwise, whatever
`MIGRATION_ENABLED` says. `COMPONENTS_ENABLED` is not consulted either; the
role runs no sweeps.

What it serves is everything a request on the identity provider's own
surface can ask for, on any replica:

| Served by a console replica | Not served (404) |
|-----------------------------|------------------|
| The console shells and their assets (`/console/admin/**`, `/console/account/**`) and the console sign-in routes (`/login`, `/callback` under each) | Every entity route the admin console's pages and API integrations drive: `/users`, `/roles`, `/permissions`, `/scopes`, `/policies`, `/keys`, `/trust-anchors`, `/events`, `/session-tokens`, `/identity-provider-accounts` and the junction and attribute routes (`/user-roles`, `/client-permissions`, `/role-attributes`, ...) |
| The hosted auth pages (`/authorize`, `/logout`, `/register`, `/activate`, `/password-forgot`, `/password-reset`) and their assets under `/console/auth/assets/**` | |
| The protocol: `/token` and its sub-paths, `/userinfo`, discovery and JWKS (global and per realm under `/realms/:id`) | |
| What those pages call back on the replica rendering them: `/realms` (the realm pickers), `/identity-providers` (the provider list, the federated login and account-link round-trips), `/clients` and `/client-scopes` (the authorize page's fallbacks), `/consents` (the consent probe), `/authenticators/challenge` and `/users/:id/authenticators` (the second factor and its inline enrollment) | |
| `/sessions` (the consoles sign in and out through `/sessions/@me/introspect` and `DELETE /sessions/@me`) and `GET /` (the image healthcheck) | |

The rule is per controller, not per route: `/realms` stays because the
per-realm discovery documents and the realm pickers live on it, and realm
CRUD comes with it. The exact lists are `IDP_SURFACE_CONTROLLERS` and
`MANAGEMENT_API_CONTROLLERS` in server-core.

The positionals are sugar over the two console flags. `console admin` forces
`ADMIN_CONSOLE_ENABLED=true` and `ACCOUNT_CONSOLE_ENABLED=false`,
`console account` the inverse, `console admin account` both on, and a bare
`console` serves both as configured. With a console forced off its sign-in
routes answer the "not enabled" notice, so a request for the other console
that reaches this set fails visibly. `auth` is refused as a selector: the
auth pages are the identity provider's issuance surface and are served by
every role, this one included.

## The two sets

| Setting | API set | Console set |
|---------|---------|-------------|
| Command | `server/core start` | `server/core console` |
| `ADMIN_CONSOLE_ENABLED` | `false` | (positional or `true`) |
| `ACCOUNT_CONSOLE_ENABLED` | `false` | (positional or `true`) |
| `COMPONENTS_ENABLED` | `false` | not consulted |
| `MIGRATION_ENABLED` | `false` | not consulted |

The console flags on the API set decide that it never renders a console
shell or answers a console sign-in: with a flag off those routes answer a
"not enabled" notice, so a console request that reaches the API set by
mistake fails visibly rather than signing someone in on the wrong set.

The other two flags are the [worker](./worker.md) rules applied to the API
set. So run `authup-server migration run` (container:
`server/core migration run`) once, before either set starts, and let a
single [worker](./worker.md) own the sweeps.

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
else. A console replica would answer every one of those except the entity
routes, so a misrouted request is never signed in on the wrong set.

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

## What stays served everywhere

- **The asset mounts stay.** The console flags gate the shells and the sign-in
  routes, not `/console/admin/assets/*` and `/console/account/assets/*`. A
  replica that has a console's `dist/` installed serves them whatever the
  flag says, on either set. That is harmless (hashed, immutable files) and
  means an asset request that reaches the API set is still answered.
- **The auth pages ride every replica.** `/authorize`, `/logout`,
  `/register`, `/activate`, `/password-forgot`, `/password-reset` and their
  assets under `/console/auth/assets/*` are served by every replica of both
  sets. There is no flag and no selector for them, by design: they are the
  identity provider's own surface (`authorization_endpoint`,
  `end_session_endpoint`, the mail deep links), not a console. The
  `/console/**` rule sends the auth console's assets to the console set while
  the API set renders its pages; both sets carry the bundle, so both answer.
- **`GET /` reports per replica.** The `features` block of the status
  endpoint reflects the console flags of the replica that answered. Through
  the proxy `GET /` lands on the API set and reports `adminConsole: false`
  and `accountConsole: false`; a console replica probed directly (the image
  healthcheck does) reports what it was started with. Harmless, and a quick
  way to check which set a process belongs to.
- **The management API is unmounted on the console set.** That is the role's
  contribution: a request for `/users` that reaches a console replica answers
  404. Everything else on the identity provider's surface is answered like on
  the API set (see the table above).

## Without the role

The split also works with two plain `start` processes, which is what it was
before the role existed. Both sets then run `server/core start`; the API set
sets `ADMIN_CONSOLE_ENABLED=false` and `ACCOUNT_CONSOLE_ENABLED=false`, the
console set leaves them on, and BOTH sets set `COMPONENTS_ENABLED=false` and
`MIGRATION_ENABLED=false` next to the one-off `migration run` and a single
worker: a console replica is then a plain `start` process, and with the
defaults every console replica would run the cron sweeps and race its
siblings for the DDL. Routing, Redis and the SQLite caveat are the same. The
one difference is that the management API stays mounted on the console set,
so a misrouted `/users` is answered there like on the API set.

## Docker Compose

Two services from the same image and the same configuration behind the proxy
above. Redis and the database are shared:

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
        command: server/core console
```

Run `server/core migration run` once before starting either service, and add
a [worker](./worker.md) for the sweeps. Both services keep the image
healthcheck: each opens an HTTP port and answers `GET /`.
