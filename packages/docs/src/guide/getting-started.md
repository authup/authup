# Getting started

This section will help to spin up the project **locally**.

## Step. 1: Create a new project

Create and change into a new directory.

```bash
$ mkdir auth-server && cd auth-server
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

::: info Information
In general **no** configuration file is required at all!
All options have either default values or are generated automatically 🔥.
:::

To overwrite the default (generated) config option values,
create a `authup.conf` file in the root directory with the following content:

```text
ui.port=3000
ui.host=127.0.0.1
server.database.adminUsername=admin
server.database.adminPassword=start123
server.http.port=3010
server.http.publicUrl=http://127.0.0.1:3010/
server.http.authorizeRedirectUrl=http://127.0.0.1:3000/
```

This will set custom options for the frontend- & backend-application.

Another way is e.g. to place an `.env` file in the root-directory or provide these properties
by the system environment.

```text
PORT=3010

ADMIN_USERNAME=admin
ADMIN_PASSWORD=start123

PUBLIC_URL=http://127.0.0.1:3010/
AUTHORIZE_REDIRECT_URL=http://127.0.0.1:3000/
```

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
i Server: URL: http://127.0.0.1:3010
i Server: Docs-URL: http://127.0.0.1:3010/docs/
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

This will lunch the following application with default settings:
- Frontend Application: `http://127.0.0.1:3000/`
- Backend Application: `http://127.0.0.1:3010/`
- Docs: `http://127.0.0.1:3010/docs`
