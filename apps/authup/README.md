<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">authup</h1>

<p align="center">
    <b>The Authup CLI: start the identity provider, run migrations, and manage a deployment from your terminal.</b><br>
    One binary runs the API, the hosted login pages and both consoles in one process, or any of them alone.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/authup"><img src="https://img.shields.io/npm/v/authup" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License: AGPL-3.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#configuration">Configuration</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why authup?

Authup is several services: the OAuth2 and OpenID Connect server, the hosted login pages, the admin console, the account console and a background worker. Wiring them together yourself means one process manager entry per service, a reverse proxy rule per path and one configuration format per service. The CLI imports every service and runs it in the process you started, so there is no child process and no supervisor between you and the server.

| Concern | Without it | With `authup` |
|---|---|---|
| **Starting** | One process per service, plus a proxy to put them on one origin | `authup start` serves the API and every enabled console on one listener |
| **Scaling** | A different entry point per service | `authup start core`, `start console [name]` and `start worker` run one role each from the same binary |
| **Configuration** | A config format per service | One `authup.yml` for every service, checked by `authup config validate` |
| **Schema** | Hand-run migration scripts | `authup migration run`, `revert` and `status` |
| **Administration** | `curl` with a token you fetched by hand | `authup login` once, then `authup api user list` |

## Installation

```shell
npm install authup
```

Or run it without installing:

```shell
npx authup@latest start
```

Node.js `>=26.0.0`. The package is ESM-only and ships the `authup` binary.

## Usage

### Start a deployment

```shell
authup start
```

`start` serves the API, the OAuth2 and OpenID Connect endpoints and every enabled console on one listener (port `3000` by default):

| Path | What |
|---|---|
| `/` | The API |
| `/console/admin` | The admin console |
| `/console/account` | The account console |
| `/console/auth` | The hosted login, consent, registration and password recovery pages |

With no database configured, Authup outside production falls back to SQLite and writes `db.sqlite` into the current directory. The first boot provisions the `master` realm with the user `admin` and the password `start123` (`USER_ADMIN_PASSWORD` sets another one).

`SIGINT` and `SIGTERM` tear the process down and exit with its outcome. A second signal exits immediately, and a teardown that outlasts 10 seconds is forced.

### Run one role

`start` takes an optional role as its positional argument:

```shell
authup start                   # the API and every enabled console on one listener
authup start core              # the API and the identity provider alone, no console
authup start worker            # the background sweeps alone, plus a health listener
authup start console           # every enabled console, each on its own port
authup start console admin     # one console: admin, account or auth
```

- `worker` serves no API. It answers its own health check on `core.worker.port` (`WORKER_PORT`, which inherits `PORT`), never applies migrations, and refuses to boot while `core.worker.enabled` (`WORKER_ENABLED`) is `false`.
- `console` listens on the console's own port (`3020` auth, `3021` admin, `3022` account by default) and reads no database. Starting a single console that is disabled (`adminConsole.enabled: false`) is refused.
- Every role is checked before anything boots: an unknown role, a console name after `core` or `worker`, an unknown console name and the retired `--worker` flag are all refused with a message.

Running API and console replicas side by side needs Redis. See [console replicas](https://authup.org/guide/deployment/console-replicas) and [worker](https://authup.org/guide/deployment/worker).

### Migrate the database

```shell
authup migration run       # apply every pending migration
authup migration revert    # undo the last applied migration
authup migration status    # list applied and pending migrations
```

`migration` creates the database when it does not exist yet. Any other operation is refused.

### Check a deployment

```shell
authup healthcheck         # exit 0 when the listener on core.port answers, 1 otherwise
authup config validate     # report what does not hold in authup.yml and the environment
authup config schema       # print the JSON Schema of authup.yml
```

`config validate` exits `1` when no configuration file is found, when the file holds options nothing reads, or when a value fails its type.

### Sign in to a deployment

The CLI is also a client of a running deployment. `login` uses the device authorization grant against an OAuth2 client you register for it (one whose grant types list `urn:ietf:params:oauth:grant-type:device_code`):

```shell
authup login --server https://auth.example.com --client cli --realm master
authup whoami
authup logout
```

| Flag | Command | Description |
|---|---|---|
| `--server` | every client command | The API base URL. Defaults to `AUTHUP_SERVER_URL`, then to the server of the last login |
| `--client` | `login` | The client the CLI presents: a UUID, or a name within `--realm`. Remembered per server |
| `--realm` | `login` | The realm a client name resolves in. Defaults to `master` |
| `--scope` | `login` | Space-separated scopes. Defaults to every scope bound to the client |
| `--insecure-storage` | `login` | Keep the tokens in the hosts file instead of the OS keychain |

Tokens go into the OS keychain; the server and client per host are remembered in `$XDG_CONFIG_HOME/authup/hosts.json` (`~/.config/authup/hosts.json`). `logout` revokes both tokens and forgets the host.

### Manage records

Each entity the API serves is a command under `api`, with the verbs that entity supports:

```shell
authup api user list --filter 'name=~ali~' --sort -createdAt --limit 10
authup api user get <id> --include realm
authup api role create --data '{"name":"editor"}'
authup api role update <id> --data @role.json
authup api role delete <id>
authup api event stats --filter 'createdAt=>=2026-10-01T00:00:00.000Z' --group 'bucket(createdAt,day),name' --aggregate count
authup api user schema
```

| Verb | Flags |
|---|---|
| `list` | `--filter`, `--sort`, `--fields`, `--include`, `--limit`, `--offset` |
| `get <id>` | `--fields`, `--include` |
| `create`, `update <id>` | `--data` (`-d`): JSON, `@<path>` for a file, `@-` for stdin |
| `delete <id>` | |
| `stats` | `--filter`, `--group`, `--aggregate` |
| `schema` | |

`--filter` takes the API query language; several conditions are joined by `&` (`name=~ali~&realm.name=master`). Output is the response body as JSON.

### Develop Authup itself

`authup dev` is an experimental variant of `start` for a source checkout of the Authup repository: every console whose package is a source checkout is served through a Vite dev server with hot module replacement. It refuses to start when the environment is production.

## Configuration

Every service reads one `authup.yml`, from the current directory unless `--configDirectory <dir>` or `--configFile <file>` says otherwise:

```yaml
# yaml-language-server: $schema=https://authup.org/schema/config.json
publicUrl: https://auth.example.com

core:
    port: 3000

adminConsole:
    enabled: true
```

- Deployment-wide keys (`publicUrl`, `internalUrl`, `host`, `trustedOrigins`, `db`, `redis`, `smtp`, `theme`) sit at the top level.
- Everything the API reads sits under `core`, each console under `adminConsole`, `accountConsole` or `authConsole`.
- Every key can be set in the environment instead, and the environment wins over the file. `PORT` and `HOST` follow the same rule.

`authup config schema` prints every key with its default and environment variable. The [configuration guide](https://authup.org/guide/deployment/) explains them.

## Notes

- **Change the admin password.** `admin` / `start123` is provisioned on the first boot unless `USER_ADMIN_PASSWORD` is set.
- **SQLite is a fallback, not a choice for production.** It applies only when no database is configured and the environment is not production; production refuses it.
- **A root flag may follow the command.** `--configDirectory` and `--configFile` are accepted before or after `start <role>`.

## License

Made with 💚

Published under the [AGPL-3.0](./LICENSE). A commercial license is available; see [LICENSING.md](https://github.com/authup/authup/blob/master/LICENSING.md).
