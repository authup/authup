# Introduction

This section will help you to spin up Authup directly on the **host** system.

::: tip Production
For production, the recommended topology is **containers with one service per
container** — see [Docker](./docker) and [Docker Compose](./docker-compose).
The `authup` CLI described here is the quickstart / bare-metal path: a small
supervisor that runs both services from one command.
:::

## Requirements
The following guide is based on some shared assumptions:

- Node.js `v22.13` (minimum)
- Min. `2` cores
- Min. `5G` hard disk
- Up to two available ports (default: `3000` and `3001`)

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

A configuration file is looked up in the directory the CLI is started from —
place it in the project root, or point the CLI elsewhere with
`--configDirectory <path>` / `--configFile <path>`. With a single
multi-section `authup.conf` (sections `server.core` and `client.web`) one file
configures both services; environment variables always override file values.

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
i UI: Starting...
√ UI: Started
i UI: Listening http://127.0.0.1:3000
i Server: Environment: production
i Server: WritableDirectoryPath: xxx
i Server: URL: http://127.0.0.1:3001
i Server: Docs-URL: http://127.0.0.1:3001/docs/
i Server: UI-URL: http://127.0.0.1:3000
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

This will launch the following applications with default settings:
- Frontend (client/web): `http://127.0.0.1:3000/`
- Backend (server/core): `http://127.0.0.1:3001/`

## Supervisor behavior

`authup start` runs both services as **child processes** and supervises them:

- **Environment passthrough** — the supervisor's environment reaches both
  children in full, so any [server](./configuration-server-core) or
  [UI](./configuration-client-web) environment variable can be set on the
  `authup` process itself.
- **Per-child overrides from the config file** — the `server.core` and
  `client.web` sections of the configuration file are translated into each
  child's own environment (e.g. per-service `PORT`/`HOST`, and the UI's
  `NUXT_PUBLIC_API_URL`, derived from the server section's `publicUrl` when
  not set explicitly).
- **Signal forwarding** — `SIGINT`/`SIGTERM` are forwarded to the children,
  so `Ctrl+C` and service managers (systemd, PM2, ...) shut both services
  down cleanly.
- **Exit code contract** — if a child exits with a failure, the supervisor
  stops the sibling and exits with the first-failing child's exit code, so a
  process manager can restart the stack.

A single service can also be targeted directly:

```shell
$ authup start server/core
$ authup start client/web
```

## Other commands

The `migration` and `healthcheck` commands are forwarded to **server/core
only** (the UI has no database):

```shell
# apply / inspect / undo database migrations
$ authup migration run
$ authup migration status
$ authup migration revert

# probe the running API
$ authup healthcheck
```

All commands honor `--configDirectory` / `--configFile`.
