# Introduction

This section will help you to spin up Authup directly on the **host** system.

::: tip Production
For production, the recommended topology is a **container** running `start`.
See [Docker](./docker) and [Docker Compose](./docker-compose). The `authup`
CLI described here runs the same command, in the same process; it is the
quickstart and bare-metal path to it.
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

All commands honor `--configDirectory` / `--configFile`, and `migration`
finds its migration files wherever it is started from. The `migration`
operations are `run`, `revert` and `status`; `generate` is a repository
development tool that exists only in server-core's dev CLI
(`npm run cli -w apps/server-core -- migration generate`).
