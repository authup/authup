# Introduction

This section will help you to spin up Authup directly on the **host** system.

::: tip Production
For production, the recommended topology is a **container** running the
`server/core` service. See [Docker](./docker) and
[Docker Compose](./docker-compose). The bare-metal path described here runs
the very same service, started from its own binary.
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
$ npm install @authup/server-core --save
```

The package ships one binary, `authup-server`.

## Step. 3: Configuration

Follow the instructions for [configuring](./configuration.md) Authup using a
configuration file or via environment variables.

A configuration file is looked up in the directory the command is started
from. Place it in the project root, or point elsewhere with
`--configDirectory <path>` / `--configFile <path>`. A multi-section
`authup.conf` carries the settings under `server.core`; a per-component
`authup.server.core.conf` carries them flat.

**An environment variable always beats the file value**, `PORT` and `HOST`
included. A platform that injects `PORT` therefore decides the listen port
even when the file names one.

## Step. 4: Boot up

Add some scripts to `package.json`.

```json
{
  "scripts": {
      "start": "authup-server start"
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

## Signals and exit codes

`authup-server start` is the service itself, not a supervisor, so a process
manager (systemd, PM2, ...) supervises it directly.

- `SIGINT` / `SIGTERM` tear the application down and exit `0` once the
  teardown succeeded, and `1` when it fails.
- A **second** signal while a teardown is already running exits `1`
  immediately.
- A teardown that has not finished after **10 seconds** is forced: the
  process writes a line naming the timeout and exits `1`.

The same contract applies to every long-running command, so `worker` and
`console` answer a container stop exactly like `start` does.

## Other commands

```shell
# apply / inspect / undo database migrations
$ authup-server migration run
$ authup-server migration status
$ authup-server migration revert

# probe the running API
$ authup-server healthcheck

# run the background sweeps alone, without an HTTP listener
$ authup-server worker

# serve the consoles alone, without the management API
$ authup-server console
```

See [Worker](./worker.md) for the background role and
[Console Replicas](./console-replicas.md) for serving the consoles from their
own replica set.

All commands honor `--configDirectory` / `--configFile`.
