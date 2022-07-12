# Getting started 

This section will help to spin up a basic backend service for authentication & authorization.

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
$ npm install @authelion/api --save
```

## Step. 3: Configuration

::: info Information
In general **no** configuration file is required at all!
All options have either default values or are generated automatically 🔥.
:::

To overwrite the default (generated) config property values,
create a `authelion.config.js` file in the root directory with the following content:

```typescript
module.exports = {
    port: 3002,
    
    admin: {
        username: 'admin';
        password: 'start123'
    },

    selfUrl: 'http://127.0.0.1:3002/',
    webUrl: 'http://127.0.0.1:3000/',
    
    /* ... */
}
```
Another way is e.g. to place an `.env` file in the root-directory or provide these properties
by the system environment.

```text
PORT=3002

ADMIN_USERNAME=admin
ADMIN_PASSWORD=start123

SELF_URL=http://127.0.0.1:3002/
WEB_URL=http://127.0.0.1:3000/
```

## Step. 4: Boot up

Add some scripts to `package.json`.

```json
{
  ...
  "scripts": {
      "setup": "authelion setup",
      "start": "authelion start",
      "upgrade": "authelion upgrade"
  },
  ...
}
```

Setup the authentication & authorization service.

```shell
$ npm run setup
```

Finally, start the service:

```shell
$ npm run start
```

The service will start at `http://localhost:3002`.
