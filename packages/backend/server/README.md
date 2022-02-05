# @typescript-auth/server ⚔

[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver)
[![main](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/typescript-auth/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/typescript-auth)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/typescript-auth/badge.svg)](https://snyk.io/test/github/Tada5hi/typescript-auth)

This package can be used as simple standalone `server` or as an `extension` to an existent (express) resource API and
should therefore only be used for backend- applications & microservices.

---
**Important NOTE**

The `Readme.md` is under construction ☂ at the moment. So please stay patient, till it is available ⭐.

---

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Standalone](#standalone)
    - [Config](#config)
    - [Setup](#setup)
    - [Start](#start)
  - [Extension](#extension)
    - [HTTP](#http)
    - [Database](#database)
    - [Aggregators](#aggregators)
  
## Installation

```sh
npm install @typescript-auth/server --save
```

## Usage

### Standalone

#### Config

In general no configuration file is required at all!
All options have either default values or are generated automatically 🔥.
To overwrite the default (generated) config property values, create a `server.config.js` file in the root directory with the following content:

```typescript
module.exports = {
    env: process.NODE_ENV, // development, production, test
    port: 3010,

    adminUsername: 'admin',
    adminPassword: 'start123',
    
    // robotSecret: '', // 

    root: process.cwd(),
    writableDirectory: 'writable',

    selfUrl: 'http://localhost:3010/',

    swaggerDocumentation: true,

    tokenMaxAge: {
        accessToken: 3600, // 1 hour
        refreshToken: 36000 // 10 hours
    },
}
```
The above example shows the (generated) property values if non are specified explicit.

#### Setup
If no option is specified, all options are by default `true` as long no
other option is explicit specified.
In the following shell snippet all options are manually set to `true`.
```shell
auth-server setup \
  --keyPair=true \
  --database=true \
  --databaseSeeder=true \
  --documentation=true
```

#### Start

To start the authentication- & authorization-server simply execute the command: 

```
auth-server start
```

### Extension
Controllers & middlewares can be configured like described for an existing express application.

#### HTTP
```typescript
import {
    errorMiddleware,
    registerControllers,
    registerMiddlewares
} from "@typescript-auth/server";

import express from "express";
import path from "path";

const app = express();

// Setup middleware
registerMiddlewares(app, {
    // optional
    writableDirectoryPath: path.join(
        process.cwd(), 
        'writable'
    ),
    // required!
    bodyParserMiddleware: true,
    // required!
    cookieParserMiddleware: true,
    // required!
    responseMiddleware: true,
    // optional :)
    swaggerMiddleware: {
        path: '/docs',
        writableDirectoryPath: path.join(
            process.cwd(), 
            'writable'
        ),
    }
});

// Register client, role, user, ... controllers
registerControllers(app, {
    redis: true,
    tokenMaxAge: {
        accessToken: 3600, // 1 hour
        refreshToken: 36000 // 10 hours
    },
    selfUrl: 'http://localhost:3010/',
    selfAuthorizeRedirectUrl: 'http://localhost:3000/',
    writableDirectoryPath: path.join(
        process.cwd(), 
        'writable'
    ),
});

// This middleware is required, to handle thrown errors by controllers
app.use(errorMiddleware);

app.listen(3010);
```

#### Database
To register the domain entities for the **typeorm** connection, 
simply set **all** entities for the connection options, with a utility function.

```typescript
import { setEntitiesForConnectionOptions } from "@typescript-auth/server";
import { 
    createConnection, 
    buildConnectionOptions
} from 'typeorm';

(async () => {
    const connectionOptions = await buildConnectionOptions();

    setEntitiesForConnectionOptions(connectionOptions);

    const connection = await createConnection(connectionOptions);
})();
```

---

Another important thing, is to seed the database. To do that, run the database seeder after
registering the domain entities and creating a connection ⚡.

```typescript
import { DatabaseRootSeeder, setEntitiesForConnectionOptions } from "@typescript-auth/server";
import { 
    createConnection,
    buildConnectionOptions 
} from 'typeorm';

(async () => {
    const connectionOptions = await buildConnectionOptions();

    setEntitiesForConnectionOptions(connectionOptions);
    const connection = await createConnection(connectionOptions);
    
    // ------------------------------------

    const seeder = new DatabaseRootSeeder({
        userName: 'admin',
        userPassword: 'start123',
    });
    
    await seeder.run(connection);

    
})();
```
#### Aggregators

The last step after registering the http (controllers & middleware)- & database-module, is
to start the token aggregator.
The aggregator will remove all expired database tokens (access_tokens & refresh_tokens) from the database on startup.
In addition, it will listen for expired token events from the redis store, to remove the corresponding database entries. 

```typescript
import {DatabaseRootSeeder, setEntitiesForConnectionOptions} from "@typescript-auth/server";
import {
    createConnection,
    buildConnectionOptions
} from 'typeorm';
import {buildTokenAggregator} from "@typescript-auth/server/src";
import {useClient} from "redis-extension";

(async () => {
    const connectionOptions = await buildConnectionOptions();

    setEntitiesForConnectionOptions(connectionOptions);
    const connection = await createConnection(connectionOptions);

    // ------------------------------------

    // init redis client
    const redis = useClient();
    
    const { start } = buildTokenAggregator(redis);

    await start();
})();
```
