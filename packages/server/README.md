[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver)
[![main](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/typescript-auth/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/typescript-auth)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/typescript-auth/badge.svg)](https://snyk.io/test/github/Tada5hi/typescript-auth)

# @typescript-auth/server ☼
This package should be used for server side applications like APIs or microservices.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Middleware](#middleware)
  - [Security](#security)
    - [KeyPair](#keypair) 
    - [Password](#password)
    - [Token](#token)
## Installation

```bash
npm install @typescript-auth/server --save
```

## Usage

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
    authenticateWithCookie: (request: Request, value: unknown) => {
        // check if value is valid ...
        // if not throw exception
        return true;
    },
    authenticateWithAuthorizationHeader: (request: Request, value: AuthorizationHeader) => {
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

### Security

#### KeyPair

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

#### Password

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

#### Token

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
