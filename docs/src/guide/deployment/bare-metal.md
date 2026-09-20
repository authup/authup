# Introduction

This section will help you to spin up Authup directly on the **host** system.

::: tip Production
For production, the recommended topology is a **container** running `start`.
See [Docker](./docker) and [Docker Compose](./docker-compose). The `authup`
CLI described here runs the same command, in the same process; it is the
quickstart and bare-metal path to it.
:::

::: tip Wizard
`npm create authup@latest` writes the `package.json` and `authup.yml` the steps
below build by hand, plus a `.env` holding the secrets (`DB_*`,
`USER_ADMIN_PASSWORD`, `SMTP`) that `authup start` loads from the directory it
is started in, with the `authup` dependency pinned to the wizard's own release.
What remains is `npm install`, `npx authup config validate` and `npm start`.
:::

## Requirements
The following guide is based on some shared assumptions:

- Node.js `v22.13` (minimum)
- Min. `2` cores
- Min. `5G` hard disk
- One available port (default: `3000`)

## Step. 1: Create a new project

Create and change into a new directory.

```bash
$ mkdir authup && cd authup
```

Then, initialize with your preferred package manager.

```bash
$ npm init
```

## Step. 2: Installation

Add this package as dependency to the project.

```sh
$ npm install authup --save
```

## Step. 3: Configuration

Follow the instructions for [configuring](./configuration.md) Authup using a
configuration file or via environment variables.

A configuration file is looked up in the directory the CLI is started from.
Place `authup.yml` in the project root, or point the CLI elsewhere with
`--configDirectory <path>` / `--configFile <path>`. The server settings live
under `core`; environment variables always override file values.

A database is optional outside production. With none configured, Authup falls
back to SQLite and writes `db.sqlite` into the directory the CLI was started
from, which is enough to try it out locally. A production environment refuses
SQLite, so point `DB_*` or a `db:` block at PostgreSQL or MySQL for anything
beyond that (see [Database](./configuration-server-core-database.md)).

## Step. 4: Boot up

Add some scripts to `package.json`.

```json
{
  "scripts": {
      "start": "authup start"
  }
}
```

The application setup will be processed on startup, if it has not already happened in
a previous execution.

```shell
$ npm run start
```

The output should be similar to the following:
```shell
i Server: Starting... 
√ Server: Started
i Server: Environment: production
i Server: LogDirectoryPath: xxx
i Server: ProvisioningDirectoryPath: xxx
i Server: URL: http://127.0.0.1:3000
i Server: Docs-URL: http://127.0.0.1:3000/docs/
i Server: Generating documentation...
i Server: Generated documentation.
i Server: Establishing database connection...
i Server: Established database connection.
i Server: Starting oauth2 cleaner...
i Server: Started oauth2 cleaner.
i Server: Starting http server...
i Server: Started http server.
```

Now all should be set up, and you are ready to go :tada:

This will launch the API with default settings:
- Backend (server-core): `http://127.0.0.1:3000/`

The consoles run in that same process, on the same listener:
- Auth console (login, consent, register, password recovery): `http://127.0.0.1:3000/console/auth`
- Admin console: `http://127.0.0.1:3000/console/admin`
- Account console: `http://127.0.0.1:3000/console/account`

## Process behavior

`authup start` runs server-core and every enabled console **in the process
you started**. There is no child process and no supervisor, so there is nothing
between you and the service:

- **Environment**: the process environment is the server's environment. Every
  [server](./configuration-server-core) variable can be set on the `authup`
  process itself, and none of them is overridden. `PORT` and `HOST` follow the
  ordinary [precedence](./configuration.md#layers-precedence): an environment
  variable beats the value in the configuration file.
- **Signals**: `SIGINT`/`SIGTERM` tear the application down and exit with the
  outcome, so `Ctrl+C` and service managers (systemd, PM2, ...) shut the
  service down cleanly. A second signal exits immediately, and a teardown that
  outlasts 10 seconds is forced.
- **Exit code**: the exit code is the server's own, so a process manager can
  restart it.

The one positional argument `start` takes is a role: `core`, `worker` or
`console`, the last followed by an optional console name. A package cannot be
named. `authup start server.core` and `authup start server/core` are refused
as an unknown role before anything boots, and so is a name after a role that
takes none (`authup start core admin`).

::: warning `client.admin-console` no longer exists
The admin console is served by `@authup/server-admin-console` at
`<publicUrl>/console/admin`, composed into `authup start`.
`authup start client.admin-console` is refused as an unknown role, and a
`client.admin-console` section in the configuration file is not read. Remove
both. See [Upgrading](./upgrading.md).
:::

## Other commands

The CLI carries more commands. The roles of `start` split what a plain
`start` does into separate processes (see
[Console Replicas](./console-replicas.md) and [Worker](./worker.md)); the
rest act on the same deployment:

```shell
# the API and the IdP alone, mounting no console
$ authup start core

# one console service, or every enabled one, each on its own port
$ authup start console
$ authup start console admin

# run the background sweeps alone, with no HTTP listener
$ authup start worker

# apply / inspect / undo database migrations
$ authup migration run
$ authup migration status
$ authup migration revert

# probe the running API
$ authup healthcheck
```

`worker` is the role with no listener. It runs the cron sweeps and opens no
port, so API replicas can hand them over, and it refuses to start while
`core.worker.enabled` is false. See [Worker](./worker.md).

Deployment commands honor `--configDirectory` / `--configFile`, and `migration`
finds its migration files wherever it is started from. The `migration`
operations are `run`, `revert` and `status`; `generate` is a repository
development tool that exists only in server-core's dev CLI
(`npm run cli -w apps/server-core -- migration generate`).

## Login and API requests

Use a public OAuth2 client (`authMethod: none`) in the realm you want to manage.
Its `grantTypes` must explicitly include
`urn:ietf:params:oauth:grant-type:device_code`; include `refresh_token` to keep
using the login after the access token expires. A null grant allowlist does
not enable the device flow. Supply the client's UUID, not a client secret.
The signed-in user's permissions still govern every API request.

```shell
# Local server (default http://localhost:3000/)
authup login --client-id <client-uuid>
authup api users list --query 'page[limit]=10'

# Remote server; --server <url> overrides AUTHUP_SERVER_URL
export AUTHUP_SERVER_URL=https://auth.example.com/
authup login --client-id <client-uuid>
# Open the printed URL in a browser and approve the displayed code.
authup api request 'users?filter[name]=alice'
authup api request users --method POST --data '{"name":"alice","realmId":"<realm-uuid>"}'
authup api request users/<user-uuid> --method POST --data '{"displayName":"Alice"}'
authup api request users/<user-uuid> --method DELETE
authup logout
```

For resource operations, name the resource and operation under `api`:

```shell
authup api users list --query 'page[limit]=10'
authup api users get <user-uuid>
authup api users create --data '{"name":"alice","realmId":"<realm-uuid>"}'
authup api users update <user-uuid> --data '{"displayName":"Alice"}'
authup api users delete <user-uuid>
```

Supported resources are `users`, `clients`, `realms`, `roles`, `permissions`,
`policies` and `scopes`. `list`/`get` accept `--query`; `create`/`update` require
a JSON object in `--data`. These commands share authentication and request
handling with `api request`; use `api request` for other endpoints and workflow operations.

`--scope 'scope-a scope-b'` requests explicit scopes during login. Client scope
restrictions and user permissions are enforced by the server as usual.
API paths are relative to the configured base URL, including any path prefix;
quote query strings so the shell does not interpret brackets. `--method` (`-X`)
defaults to GET; `--data` (`-d`) takes JSON for POST, PUT, PATCH or DELETE.
Successful responses go to stdout as JSON (no output for HEAD or 204).
Progress and errors go to stderr; failures exit nonzero. Requests time out
after 30 seconds and do not follow redirects. Remote servers require HTTPS;
HTTP is accepted for localhost, 127.0.0.1 and [::1].

The default credential store is the OS keychain through `@napi-rs/keyring`:
macOS Keychain, Windows Credential Manager, or Linux Secret Service. Linux
requires a running Secret Service (for example GNOME Keyring or KWallet);
the CLI does not use the temporary kernel keyring. Each normalized server
URL has a separate entry under the `authup` service.

If the keychain is unavailable, use `--credential-store=file` explicitly,
or set `AUTHUP_CREDENTIAL_STORE=file` for all client commands:

```shell
export AUTHUP_CREDENTIAL_STORE=file
authup login --client-id <client-uuid>
authup api users list
authup logout
```

Keychain errors never silently switch to file storage. File storage uses
`$XDG_CONFIG_HOME/authup/credentials` (fallback `~/.config/authup/credentials`)
with a private directory (0700) and **unencrypted token files** (0600) on
POSIX; Windows access follows the user's filesystem ACLs. Select the same
store for login, requests and logout. Stores are independent; logout removes
the entry from the selected store only.

The CLI refreshes expiring access tokens and saves rotated refresh tokens
before sending an API request. Failed mutations are never automatically replayed.

Only one command per server runs at a time, to prevent refresh-token races.
Ctrl-C releases the lock; after a forced kill or crash, remove the stale lock
named in the error once no command is running. `logout` removes the local
login only; revoke the session on the server to invalidate its tokens.

These client commands select their target through `--server` or
`AUTHUP_SERVER_URL`; they do not read `authup.yml`. `healthcheck` and
`config validate` remain independent of login.
