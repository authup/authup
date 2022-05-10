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
  - [Config](#config)
  - [HTTP](#http)
    - [Middlewares](#middlewares)
    - [Controllers](#controllers)
  - [Database](#database)
    - [Entities & Subscribers](#entities--subscribers)
    - [Seeding](#seeding)
    - [Aggregators](#aggregators)
  
## Installation

```sh
npm install @authelion/api-core --save
```

## Usage

This package consists of some submodules (e.g. `http` & `database`). These submodules should
be configured globally.
But the global configuration, can be overwritten when embedding a submodul 🔥.

### Config
All options inherit default values, so it is not required to pass any options at all.

```typescript
import { setConfig } from '@authelion/api-core';

setConfig({
    env: 'development',
    port: 3010,
    database: {
        admin: {
            username: 'admin',
            password: 'start123'
        },
        robot: {
            enabled: true,
            secret: false
        }
    },
    tokenMaxAge: {
        accessToken: 3600, // 1 hour
        refreshToken: 36000 // 10 hours
    },
})
```

### HTTP

The controllers & middlewares, which are part of the http-module,
can be registered as described in the following:

#### Middlewares

```typescript
import {
    registerMiddlewares
} from "@authelion/api-core";

import express from "express";
import path from "path";

const app = express();

// Setup middleware
registerMiddlewares(app);

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
registerControllers(app);

// Register error middleware

app.listen(3010);
```

### Database

#### Entities & Subscribers

All domain entities, which can be managed by the REST-API, must be registered to 
the typeorm DataSource.
In addition to these entities, it is also necessary to include the corresponding subscriber,
to invalidate the entity cache, when caching is enabled.

Therefore, use the utility function `extendDataSourceOptions` to extend the typeorm DataSourceOptions.

```typescript
import {
    extendDataSourceOptions
} from '@authelion/api-core';

import { 
    DataSource,
    DataSourceOptions
} from 'typeorm';

(async () => {
    const options : DataSourceOptions = {
        // ...
    };

    extendDataSourceOptions(options);

    const dataSource = new DataSource(options);
    await dataSource.initialize();
})();
```

#### Seeding

Another import thing to do, is to seed the database with an initial data set ⚡.

The `DatabaseSeeder` populates the database with default entities:
- User: admin
- Role: admin
- Permission(s): user_add, user_edit, ...

and also all possible relations between:
- user - role 
- role - permissions

```typescript
import {
    DatabaseSeeder,
    extendDataSourceOptions
} from '@authelion/api-core';

import {
    DataSource,
    DataSourceOptions
} from 'typeorm';

(async () => {
    const options : DataSourceOptions = {
        // ...
    };

    extendDataSourceOptions(options);

    const dataSource = new DataSource(options);
    await dataSource.initialize();
    
    // ------------------------------------

    const config = await useConfig();
    const seeder = new DatabaseSeeder(config.database.seed);
    
    await seeder.run(connection);
})();
```
### Aggregators

#### OAuth2Token

The last step is to register the `OAuth2Token` aggregator, which is responsible for removing expired 
access- & refresh-tokens 🔥.
The aggregator should be registered on startup of the application.

```typescript
import {
    buildOAuth2TokenAggregator,
    DatabaseSeeder,
    extendDataSourceOptions
} from '@authelion/api-core';

import {
    DataSource,
    DataSourceOptions
} from 'typeorm';

(async () => {
    const options : DataSourceOptions = {
        // ...
    };

    extendDataSourceOptions(options);

    const dataSource = new DataSource(options);
    await dataSource.initialize();

    // ------------------------------------
    
    const { start } = buildOAuth2TokenAggregator();

    await start();
})();
```
