# @typescript-auth/server-utils 🛡

[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver-utils.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver-utils)
[![main](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/typescript-auth/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/typescript-auth)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/typescript-auth/badge.svg)](https://snyk.io/test/github/Tada5hi/typescript-auth)

The main propose of this package, is to provide general utilities for authorization & authentication.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [KeyPair](#keypair)
  - [Sign/Verify](#sign--verify)
  - [Hash](#hash)

## Installation

```bash
npm install @typescript-auth/server-utils --save
```

## Usage

### KeyPair

Create a private `pkcs8` key and `spki` public key.
The `useKeyPair` method will automatically create, a key pair in the specified directory if it
doesn't already exist.

```typescript
import path from 'path';
import {
    createKeyPair,
    useKeyPair,
    KeyPairOptions
} from "@typescript-auth/server";

const keyPairOptions: KeyPairOptions = {
    directory: path.join(__dirname, 'writable')
}

(async () => {
    await createKeyPair(keyPairOptions);

    const keyPair = await useKeyPair(keyPairOptions);
    
    console.log(keyPair);
    // {privateKey: 'xxx', publicKey: 'xxx'}
})();
```

### Sign & Verify

The `signToken` and `verifyToken` provide a simple way to sign and verify a token (default: `RS256`). 
A private- & public-key will be automatically generated if none already exists. 

```typescript
import path from 'path';
import {
    KeyPairOptions,
    signToken,
    verifyToken
} from "@typescript-auth/server-utils";


const keyPairOptions: KeyPairOptions = {
    directory: path.join(__dirname, 'writable')
}

(async () => {
    const token : Record<string, any> = {foo: 'bar'};
    const tokenSigned = await signToken(token, {
        options: {
            expiresIn: 3600
        },
        keyPairOptions
    });
    
    const tokenVerified = await verifyToken(tokenSigned);
    
    console.log(tokenVerified);
    // {iat: 1642942322, exp: 1642945922, foo: 'bar', ... }
})();
```

### Hash

To simply hash and verify a password with the password hashing-function **bcrypt** based on the Blowfish cipher,
use the methods `hash` & `compare`.

```typescript
import {
    hash,
    compare
} from "@typescript-auth/server-utils";


(async () => {
    const hashed = await hash('start123', 10); // 10 rounds
    let isValid = await compare('start123', hashed);
    console.log(isValid);
    // true
    
    isValid = await compare('star1234', hashed);
    console.log(isValid);
    // false
})();
```
