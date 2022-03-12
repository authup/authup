# @authelion/api-core 🍀

[![npm version](https://badge.fury.io/js/@authelion%2Fapi-core.svg)](https://badge.fury.io/js/@authelion%2Fapi-core)
[![main](https://github.com/Tada5hi/authelion/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/authelion/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/authelion/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/authelion)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/authelion/badge.svg)](https://snyk.io/test/github/Tada5hi/authelion)

This package should be used as an extension to an existing (express) application and
should therefore only be used on the server-side.

---
**Important NOTE**

The `README.md` is still under construction ☂ at the moment. 
So please stay patient or contribute to it, till it covers all parts ⭐.

---

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [HTTP](#http)
    - [Middlewares](#middlewares)
    - [Controllers](#controllers)
  - [Database](#database)
    - [Entities](#entities)
    - [Seeding](#seeding)
    - [Aggregators](#aggregators)
  
## Installation

```sh
npm install @authelion/api-core --save
```

## Usage

To use this package th `http-` & `database`-module must be configured at minimum.

All other modules and methods are optional 🔥.

### HTTP

The controllers & middlewares, which are part of the http-module,
can be configured as described in the following:

#### Middlewares

```typescript
import {
    registerMiddlewares
} from "@authelion/api-core";

import express from "express";
import path from "path";

const app = express();

// Setup middleware
registerMiddlewares(app, {
    // optional
    writableDirectoryPath: path.join(process.cwd(), 'writable'),
    // required!
    bodyParserMiddleware: true,
    // required!
    cookieParserMiddleware: true,
    // required!
    responseMiddleware: true,
    // optional
    swaggerMiddleware: {
        path: '/docs',
        writableDirectoryPath: path.join(process.cwd(), 'writable'),
    }
});

// Register controllers
// Register error middleware

app.listen(3010);
```

The api endpoints throw errors on failure, which must be handled by an error-middleware.
You can either provide your own error-middleware, or use the existing one:

```typescript
import { errorMiddleware } from '@authelion/api-core';
import { express } from 'express';

const app = express();

// Register middlewares
// Register controllers

app.use(errorMiddleware);

app.listen(3010);
```

The error middleware should be the last middleware in the chain.

#### Controllers

Be aware, that the controllers must be registered after the common middlewares, but before the error middleware.

```typescript
import {
    registerControllers
} from "@authelion/api-core";

import express from "express";
import path from "path";

const app = express();

// Register middlewares

// Register client, role, user, ... controllers
registerControllers(app, {
    redis: true,
    tokenMaxAge: {
        accessToken: 3600, // 1 hour
        refreshToken: 36000 // 10 hours
    },
    selfUrl: 'http://localhost:3010/',
    selfAuthorizeRedirectUrl: 'http://localhost:3000/',
    writableDirectoryPath: path.join(process.cwd(), 'writable'),
});

// Register error middleware

app.listen(3010);
```

### Database

#### Entities
All database domain entities, which can managed by 
the HTTP api, must also be registered for the **typeorm** connection.

To set **all** entities for the connection, use the `setEntitiesForConnectionOptions` utility function.

```typescript
import { 
    setEntitiesForConnectionOptions
} from '@authelion/api-core';

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

#### Seeding

Another import thing to do, is seeding the database with an initial data set ⚡.

The `DatabaseRootSeeder` creates the following default entities:
- User: admin
- Role: admin
- Permission(s): user_add, user_edit, ...

and also all possible relations between:
- user - role 
- role - permissions

```typescript
import { 
    DatabaseRootSeeder, 
    setEntitiesForConnectionOptions
} from "@authelion/api-core";
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
        // extend the default permissions
        permissions: [],

        //default: admin
        userName: 'admin',
        // default: start123
        userPassword: 'start123',
        // reset the user password, if called 2nd time
        userPasswordReset: true,

        // default: auto generated
        robotSecret: 'xxx',
        // reset the robot secret, if called 2nd time
        robotSecretReset: true
    });
    
    await seeder.run(connection);
})();
```
### Aggregators

The last step is to register the `TokenAggregator`, which will remove expired 
access- & refresh-tokens for you.

This will happen on startup. In addition, it will listen for expired token events from the redis store,
to remove the corresponding database entries on runtime 🔥. 

```typescript
import {
    buildTokenAggregator,
    DatabaseRootSeeder, 
    setEntitiesForConnectionOptions
} from "@authelion/api-core";
import {useClient} from "redis-extension";
import {
    createConnection,
    buildConnectionOptions
} from 'typeorm';


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
