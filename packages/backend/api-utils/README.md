# @authelion/api-utils 🛡

[![npm version](https://badge.fury.io/js/@authelion%2Fapi-utils.svg)](https://badge.fury.io/js/@authelion%2Fapi-utils)
[![main](https://github.com/Tada5hi/authelion/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/authelion/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/authelion/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/authelion)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/authelion/badge.svg)](https://snyk.io/test/github/Tada5hi/authelion)

The main propose of this package, is to provide general utilities for authorization & authentication.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [KeyPair](#keypair)
  - [Sign/Verify](#sign--verify)
  - [Hash](#hash)

## Installation

```bash
npm install @authelion/api-utils --save
```

## Usage

### KeyPair

The following context parameters are all optional and will inherit default values,
if not otherwise specified.
```typescript
import {
    DSAKeyPairOptions,
    ECKeyPairOptions,
    RSAKeyPairOptions,
    RSAPSSKeyPairOptions,
} from 'crypto';

type KeyPairContext = {
    /**
     * default: 'rsa'
     */
    type: 'rsa' | 'rsa-pss' | 'dsa' | 'ec',
    /**
     * default: {
     *     modulusLength: 2048,
     *     privateKeyEncoding: {
     *         type: 'pkcs8',
     *         format: 'pem'
     *     },
     *     publicKeyEncoding: {
     *         type: 'spki',
     *         format: 'pem'
     *     }
     * }
     */
    options?: RSAKeyPairOptions<'pem', 'pem'> | 
        RSAPSSKeyPairOptions<'pem', 'pem'> |
        DSAKeyPairOptions<'pem' | 'pem'> |
        ECKeyPairOptions<'pem', 'pem'>,
    /**
     * default: process.cwd()
     */
    directory?: string,
    /**
     * default: 'private'
     */
    privateName?: string,
    /**
     * default: pem
     */
    privateExtension?: string,
    /**
     * default: 'public' 
     */
    publicName?: string,
    /**
     * default: pem
     */
    publicExtension?: string,
    /**
     * default: undefined
     */
    passphrase?: string,
    /**
     * default: true
     */
    save?: boolean
}
```

The `useKeyPair` method will
- create a key-pair, if it does not already exist
- use an internal runtime cache, if the key was once loaded before during runtime

```typescript
import path from 'path';
import {
    useKeyPair,
    KeyPairContext
} from "@authelion/server";

const context: KeyPairContext = {
    directory: path.join(__dirname, 'writable'),
}

(async () => {
    const keyPair = await useKeyPair(context);
    
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
    KeyPairContext,
    signToken,
    verifyToken
} from "@authelion/api-utils";


const keyPair: KeyPairContext = {
    directory: path.join(__dirname, 'writable')
}

(async () => {
    const token : Record<string, any> = {foo: 'bar'};
    const tokenSigned = await signToken(token, {
        options: {
            expiresIn: 3600
        },
        keyPair
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
} from "@authelion/api-utils";


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
