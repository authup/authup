# Console Replicas

Authup is a family of services that ship in one image and one npm package.
`authup start` (container: `server/core start`) runs all of them in one
process: the API and the IdP, plus every enabled console, on one listener.
That is the default and it stays supported.

This page is the other shape. Two replica sets on the ONE origin: an API set
running `authup core`, which answers the protocol and the management API and
mounts no console at all, and a console set running `authup console`, which
serves the console pages and nothing else. Same image, same `PUBLIC_URL`; only
the API set reaches the database and the cache.

## The two roles

| | API set | Console set |
|---|---|---|
| Command | `server/core core` | `server/core console` |
| Serves | the protocol, the management API, the two sign-in routes per static console | the auth, admin and account console pages |
| Listens on | `3000` | `3020` (auth), `3021` (admin), `3022` (account) |
| Database | required | none |
| Redis | required (see below) | none |
| Runs migrations / cron sweeps | per `MIGRATION_ENABLED` / `COMPONENTS_ENABLED` | never, by construction |

`authup console` starts every enabled console in one process, each on its own
port, because each console is its own service: its own package, its own
config section, its own deployment. Name one to serve only that one
(`server/core console admin`).

A console process holds no credential, opens no database or cache connection
and mounts no controller. `COMPONENTS_ENABLED` and `MIGRATION_ENABLED` are
server-core options and do nothing on it, so run `authup migration run`
(container: `server/core migration run`) once before either set starts and let
a single [worker](./worker.md) own the sweeps, exactly as for any multi-replica
deployment.

## The console flags stay on

`ADMIN_CONSOLE_ENABLED` and `ACCOUNT_CONSOLE_ENABLED` are **not** how the split
is made. `core` mounts no console whatever they say, and turning one off on the
API set disables the only console routes that set still owns, so every sign-in
would 404. Leave them at their default (`true`) on both sets and use the roles.

Turn a flag off only to remove that console from the deployment altogether: the
console set then serves no shell for it and the API set answers 404 for its
sign-in.

## Routing

Two rules, in this order:

1. **`/console/<name>/login/start` and `/console/<name>/callback` go to the API
   set** (admin and account; the auth console has no such pair). Those two are
   the cookie-mode sign-in and they are still server-core routes: the
   pending-login cookie has to be issued by the origin that reads it back.
2. **Everything else under `/console/**` goes to the console set**, per console
   port. Everything outside `/console` goes to the API set.

A console service serves its handler at the ROOT of its own listener (`/`,
`/assets/**`, `/theme/**`, `/healthy`) while the browser addresses it under the
console's public path, so **the proxy must strip that prefix**.

Nginx, with one upstream per listener:

```nginx
upstream authup_api          { server 10.0.0.11:3000; server 10.0.0.12:3000; }
upstream authup_auth_console { server 10.0.0.21:3020; }
upstream authup_admin_console   { server 10.0.0.21:3021; }
upstream authup_account_console { server 10.0.0.21:3022; }

server {
    server_name [DOMAIN];
    listen 80;

    # The sign-in pair stays on the API set. Exact matches, so they win over
    # the prefix rules below.
    location = /console/admin/login/start   { proxy_pass http://authup_api; }
    location = /console/admin/callback      { proxy_pass http://authup_api; }
    location = /console/account/login/start { proxy_pass http://authup_api; }
    location = /console/account/callback    { proxy_pass http://authup_api; }

    location /console/auth/ {
        rewrite ^/console/auth(/.*)$ $1 break;
        proxy_set_header Host               $host;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_pass                          http://authup_auth_console;
    }

    location /console/admin/ {
        rewrite ^/console/admin(/.*)$ $1 break;
        proxy_set_header Host               $host;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_pass                          http://authup_admin_console;
    }

    location /console/account/ {
        rewrite ^/console/account(/.*)$ $1 break;
        proxy_set_header Host               $host;
        proxy_set_header X-Forwarded-Proto  $scheme;
        proxy_set_header X-Forwarded-Tls-Client-Cert "";
        proxy_pass                          http://authup_account_console;
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

The same rules as a Kubernetes `Ingress`. `Exact` paths are matched before
`Prefix` ones, and the prefix rewrite is the controller's own (shown for
ingress-nginx):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
    name: authup-console
    annotations:
        nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
    rules:
        - host: auth.example.com
          http:
              paths:
                  - path: /console/admin(/|$)(.*)
                    pathType: ImplementationSpecific
                    backend:
                        service:
                            name: authup-console
                            port:
                                number: 3021
                  - path: /console/account(/|$)(.*)
                    pathType: ImplementationSpecific
                    backend:
                        service:
                            name: authup-console
                            port:
                                number: 3022
                  - path: /console/auth(/|$)(.*)
                    pathType: ImplementationSpecific
                    backend:
                        service:
                            name: authup-console
                            port:
                                number: 3020
```

plus a second `Ingress` (no rewrite annotation) carrying the four `Exact`
sign-in paths and the `/` catch-all, both backed by the API `Service` on port
`3000`.

`/authorize`, `/token`, `/logout`, `/sessions/@me`, `/userinfo`, the identity
provider callbacks and the entity routes all land on the API set. The six
hosted page GETs (`/authorize`, `/register`, `/activate`, `/password-forgot`,
`/password-reset`, `/logout`) are answered there with a redirect to the auth
console, which the browser then follows into the console set.

## Console options

Every console has the same section, `server.authConsole`, `server.adminConsole`
or `server.accountConsole`, and the same environment prefix (`AUTH_CONSOLE_`,
`ADMIN_CONSOLE_`, `ACCOUNT_CONSOLE_`):

| Option | Env | Default | Read by |
|---|---|---|---|
| `url` | `*_CONSOLE_URL` | `<publicUrl>/console/<name>` | the console service and server-core |
| `enabled` | `*_CONSOLE_ENABLED` | `true` (the auth console has none) | the console service and server-core |
| `port` | `*_CONSOLE_PORT` | `3020` / `3021` / `3022` | the console service |
| `host` | `*_CONSOLE_HOST` | the deployment-wide `host` (`HOST`) | the console service |
| `path` | `*_CONSOLE_PATH` | the installed bundle package | the console service |

`path` points at a substituted console bundle, consulted before the
`node_modules` lookup. `theme.directoryPath` and `theme.fragmentsEnabled`
([Theming](./theming.md)) are read by the console services too, so in a split
deployment the theme directory has to be mounted into the console containers,
not the API ones.

`url` is where a browser reaches that console. Change it to
publish a console under another path, and the service rebases its asset URLs
and links onto it while server-core redirects and lands sign-ins there. The
ORIGIN must stay `PUBLIC_URL`'s own: the consoles authenticate with a
`SameSite=Strict` cookie that is re-checked against `Sec-Fetch-Site:
same-origin`, and the auth console holds the browser session every
`prompt=none` decision reads. A foreign origin is refused when the
configuration resolves.

## Redis is required

The console sign-in crosses two API replicas. `GET
/console/<name>/login/start` parks a pending login in the cache and redirects
to `/authorize`; the consent POST mints an authorization code, also a cache
entry; `GET /console/<name>/callback` then redeems it. Nothing pins those
requests to one replica, so with the default per-process memory cache the
entry exists only in the replica that wrote it and sign-in fails. Point both
sets at the same [Redis](./configuration-server-core-redis.md).

The token blocklist rides the same cache and has the same requirement. The
console set needs no cache configuration at all.

## SQLite cannot split

The split is for the server databases (MySQL and Postgres). A SQLite
deployment keeps one database file per container, the same caveat the
[worker](./worker.md) page states. Keep it in one process.

## Health checks

The image's own `HEALTHCHECK` probes `127.0.0.1:3000`, which a console
container does not bind. Override it per console listener; each answers `GET
/healthy` on its own port.

## Docker Compose

```yaml
services:
    authup-api:
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
        command: server/core core

    authup-console:
        image: authup/authup:latest
        restart: unless-stopped
        environment:
            - PUBLIC_URL=https://auth.example.com
        command: server/core console
        healthcheck:
            test: ["CMD", "wget", "--spider", "--proxy", "off", "http://127.0.0.1:3021/healthy"]
            interval: 10s
```

Run `server/core migration run` once before starting either service, and add a
[worker](./worker.md) for the sweeps. The console service takes no `DB_*` and
no `REDIS`: it reads `PUBLIC_URL` (to derive its own url and the API address
it injects into the console), its own section, and the
[theme](./theming.md) directory when one is configured.
