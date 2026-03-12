# Introduction

This section will help you to spin up Authup directly on the **host** system.

## Requirements
The following guide is based on some shared assumptions:

- NodeJs `v16` (minimum)
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

Follow the instructions for [configuring](./configuration.md) Authup using a configuration file or via environment variables.
In case of a configuration file, place it in the root directory.

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

This will lunch the following application with default settings:
- Frontend (client/web): `http://127.0.0.1:3000/`
- Backend (server/core): `http://127.0.0.1:3001/`
