# Introduction

This section will help you to spin up Authup directly on the **host** system.

::: tip Production
For production, the recommended topology is a **container** running the
`server/core` service. See [Docker](./docker) and
[Docker Compose](./docker-compose). The `authup` CLI described here is the
quickstart / bare-metal path: a small supervisor around the same service.
:::

## Requirements
The following guide is based on some shared assumptions:

- Node.js `v22.13` (minimum)
- Min. `2` cores
- Min. `5G` hard disk
- One available port (default: `3001`)

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
Place it in the project root, or point the CLI elsewhere with
`--configDirectory <path>` / `--configFile <path>`. A multi-section
`authup.conf` carries the settings under `server.core`; environment variables
always override file values.

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
i Server: URL: http://127.0.0.1:3001
i Server: Docs-URL: http://127.0.0.1:3001/docs/
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
- Backend (server/core): `http://127.0.0.1:3001/`

The consoles are served by that same process:
- Admin console: `http://127.0.0.1:3001/console/admin`
- Account console: `http://127.0.0.1:3001/console/account`

## Supervisor behavior

`authup start` runs `server/core` as a **child process** and supervises it:

- **Environment passthrough**: the supervisor's environment reaches the child
  in full, so [server](./configuration-server-core) environment variables can
  be set on the `authup` process itself. The exception is the overrides
  below, which the supervisor always sets and which therefore win over an
  inherited value.
- **Overrides**: `PORT` and `HOST` are always set for the child, from the
  `server.core` section of the configuration file or, when it names none,
  from the defaults (`3001` and `0.0.0.0`).
- **Signal forwarding**: `SIGINT`/`SIGTERM` are forwarded to the child, so
  `Ctrl+C` and service managers (systemd, PM2, ...) shut the service down
  cleanly.
- **Exit code contract**: the supervisor exits with the child's exit code, so
  a process manager can restart it.

The service can also be named explicitly:

```shell
$ authup start server/core
```

::: warning `client.admin-console` no longer starts anything
The admin console is served by `server/core` at `<publicUrl>/console/admin`. The CLI
still accepts `authup start client.admin-console` and a `client.admin-console`
section in the configuration file, but both only print a deprecation warning;
a selector naming the console alone exits without starting anything. Remove them.
See [Upgrading](./upgrading.md#the-admin-console-is-served-by-server-core).
:::

## Other commands

The `migration` and `healthcheck` commands are forwarded to `server/core`:

```shell
# apply / inspect / undo database migrations
$ authup migration run
$ authup migration status
$ authup migration revert

# probe the running API
$ authup healthcheck
```

All commands honor `--configDirectory` / `--configFile`.
