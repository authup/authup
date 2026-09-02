# Introduction

This section will help you to spin up Authup directly on the **host** system.

::: tip Production
For production, the recommended topology is a **container** running the
`server/core` service. See [Docker](./docker) and
[Docker Compose](./docker-compose). The `authup` CLI described here runs that
same service, in the same process; it is the quickstart and bare-metal path to
it.
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
i Server: WritableDirectoryPath: xxx
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

This will launch one service with default settings:
- Backend (server/core): `http://127.0.0.1:3000/`

The consoles are served by that same process:
- Admin console: `http://127.0.0.1:3000/console/admin`
- Account console: `http://127.0.0.1:3000/console/account`

## Process behavior

`authup start` runs `server/core` **in the process you started**. There is no
child process and no supervisor, so there is nothing between you and the
service:

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

The service cannot be named as an argument. `authup start server.core` and
`authup start server/core` are refused: `start` and `worker` take no
positional argument, because the CLI starts exactly one service.

::: warning `client.admin-console` no longer exists
The admin console is served by `server/core` at `<publicUrl>/console/admin`.
`authup start client.admin-console` is refused as an unexpected argument, and a
`client.admin-console` section in the configuration file is not read. Remove
both. See
[Upgrading](./upgrading.md#the-admin-console-is-served-by-server-core).
:::

## Other commands

The CLI carries three more commands, all against the same `server/core`
service:

```shell
# run the background sweeps alone, with no HTTP listener
$ authup worker

# apply / inspect / undo database migrations
$ authup migration run
$ authup migration status
$ authup migration revert

# probe the running API
$ authup healthcheck
```

`authup worker` is the second long-running role. It runs the cron sweeps and
opens no port, so API replicas can hand them over; see
[Worker](./worker.md).

All commands honor `--configDirectory` / `--configFile` (except
`migration generate`, a repository development tool that targets the local
compose databases), and `migration` finds its migration files wherever it is
started from.
