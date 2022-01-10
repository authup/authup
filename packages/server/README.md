[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver)
[![main](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/typescript-auth/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/typescript-auth)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/typescript-auth/badge.svg)](https://snyk.io/test/github/Tada5hi/typescript-auth)

# @typescript-auth/server ⚔
This package can be used as simple standalone `server` or as an `extension` to an existent (express) resource API and
should therefore only be used for backend- applications & microservices.

---
**Important NOTE**

The `Readme.md` is under construction ☂ at the moment. So please stay patient, till it is available ⭐.

---

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Server](#server)
  - [Extension](#extension)
- [Utils](#utils)
  - [KeyPair](#keypair) 
  - [Middleware](#middleware)
  - [Password](#password)
  - [Token](#token)
## Installation

```sh
npm install @typescript-auth/server --save
```

## Usage

### Server

#### Config

---
**NOTE**

You do not need to set up a configuration file at all. 
All options have either default values or are generated automatically 🔥.

---

To overwrite the default (generated) config property values, create a `server.config.js` file in the root directory with the following content:

```typescript
module.exports = {
    env: process.NODE_ENV, // development, production, test
    port: 3010,

    adminUsername: 'admin',
    adminPassword: 'start123',

    root: process.cwd(),
    writableDirectory: 'writable',

    selfUrl: 'http://localhost:3010/',

    swaggerDocumentation: true,

    tokenMaxAge: 3600,
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
    // required!
    bodyParser: true,
    // required!
    cookieParser: true,
    // required!
    response: true,
    // required!
    auth: {
        writableDirectoryPath: path.join(process.cwd(), 'writable'),
    },
    // optional :)
    swaggerDocumentation: {
        docsPath: '/docs',
        writableDirectoryPath: path.join(process.cwd(), 'writable'),
    }
});

// Register client, role, user, ... controllers
registerControllers(app, {
    controller: {
        oauth2Provider: {
            redirectUrl: 'http://localhost:3000/',
        },
        token: {
            maxAge: 3600, // 1hour
        },
    },
    selfUrl: 'http://localhost:3010/',
    writableDirectoryPath: path.join(process.cwd(), 'writable'),
});

// This middleware is required, to handle thrown errors by controllers
app.use(errorMiddleware);

app.listen(3010);
```

To register the domain entities for a typeorm connection, follow the following steps.

Therefore, install the package directly if not already happened with the following command:

```shell
npm install --save @typesript-auth/domains
```
After that, export the entity classes individually from the `@typescript-auth/domains` package.

```typescript
export {
    Client,
    ClientPermission,
    ClientRole,
    OAuth2Provider,
    OAuth2ProviderAccount,
    OAuth2ProviderRole,
    Permission,
    Realm,
    Role,
    RolePermission,
    Token,
    User,
    UserPermission,
    UserRole
} from '@typescript-auth/domains';
```

## Utils

### KeyPair

Create a private `pkcs8` key and `spki` public key.
The `useSecurityKeyPair` method will automatically create, a key pair in the specified directory if it 
doesn't already exist.

```typescript
import path from 'path';
import {
    createSecurityKeyPair,
    useSecurityKeyPair,
    SecurityKeyPairOptions
} from "@typescript-auth/server";

const keyPairOptions: SecurityKeyPairOptions = {
    directory: path.join(__dirname, 'writable')
}

(async () => {
    await createSecurityKeyPair(keyPairOptions);

    const keyPair = await useSecurityKeyPair(keyPairOptions);
    
    console.log(keyPair);
    // {privateKey: 'xxx', publicKey: 'xxx'}
})();
```

### Middleware
The auth middleware targets `express` backend applications.
You can simply register handlers for an `Authorization`-header or `cookie` value.

```typescript
import express, {Request} from 'express';
import {
    AuthorizationHeader,
    setupAuthMiddleware
} from "@typescript-auth/server";


const app = express();

// register middleware

app.use(setupAuthMiddleware({
    authenticateWithCookie: (
        request: Request, 
        value: unknown
    ) => {
        // check if value is valid ...
        // if not throw exception
        return true;
    },
    authenticateWithAuthorizationHeader: (
        request: Request, 
        value: AuthorizationHeader
    ) => {
        // check if value is valid ...
        // if not throw exception
        console.log(value);
        // {type: 'Bearer', token: 'xxx'}
        // {type: 'Basic', username: 'xxx', password: 'xxx}
        // {type: 'X-API', key: 'xxx'}
        return true;
    }
}))
```

### Password

The `hashPassword` and `verifyPassword` method make user password-
generation & -verification easy.

```typescript
import {
    hashPassword,
    verifyPassword
} from "@typescript-auth/server";


(async () => {
    const hashed = await hashPassword('start123', 10); // 10 rounds
    let isPassword = await verifyPassword('start123', hashed);
    console.log(isPassword);
    // true
    
    isPassword = await verifyPassword('star1234', hashed);
    console.log(isPassword);
    // false
})();
```

### Token

To create Bearer token for authentication and authorization, simply use the methods `createToken` and
`verifyToken` like described below.

```typescript
import path from 'path';
import {
    createToken,
    verifyToken,
    SecurityKeyPairOptions
} from "@typescript-auth/server";

const keyPairOptions: SecurityKeyPairOptions = {
    directory: path.join(__dirname, 'writable')
}

(async () => {
    const token = await createToken(
        {
            userId: 'xxx',
        },
        3600, // 1 hour
        keyPairOptions
    );
    console.log(token);
    // xxxxxxxxxxxxxxxxx

    const payload = await verifyToken(token, keyPairOptions);
    console.log(payload);
    // {userId: 'xxx'}
})();
```
