# Sign & Verify

## `signToken`

The method `signToken()` can be used to sign a payload.

**Type**
```ts
async function signToken(
    payload: string | object | Buffer | Record<string, any>,
    options?: TokenSignOptions
): Promise<string>;
```

**Example**
```typescript
import {
    signToken
} from "@authelion/server-utils";

(async () => {
    const token : Record<string, any> = {foo: 'bar'};
    const tokenSigned = await signToken(
        token, 
        {
            expiresIn: 3600
        }
    );
});
```
**References**
- [TokenSignOptions](#tokensignoptions)

## `decodeToken`

The method `decodeToken()` can be used to decode the payload of a JWT token without verification.

**Type**
```typescript
async function decodeToken(
    token: string,
    options?: TokenDecodeOptions,
): Promise<string | Record<string, any> | null>;
```

**Example**
```typescript
import {
    decodeToken
} from "@authelion/server-utils";

(async () => {
    const tokenSigned = '...';
    const tokenVerified = await decodeToken(tokenSigned);

    console.log(tokenVerified);
    // {iat: 1642942322, exp: 1642945922, foo: 'bar', ... }
});
```
**References**
- [TokenSignOptions](#tokensignoptions)

## `verifyToken`

The method `decodeToken()` can be used to decode and verify a JWT token.

**Type**
```ts
async function verifyToken(
    token: string,
    options?: TokenVerifyOptions
): Promise<string | Record<string, any> | null>;
```
**Example**
```typescript
import {
    signToken
} from "@authelion/server-utils";

(async () => {
    const tokenSigned = '...';
    const tokenVerified = await verifyToken(tokenSigned);

    console.log(tokenVerified);
    // {iat: 1642942322, exp: 1642945922, foo: 'bar', ... }
});
```
**References**
- [TokenSignOptions](#tokensignoptions)

## `TokenBaseOptions`

```typescript
import { KeyPairOptions } from '@authelion/server-utils';

type TokenBaseOptions = {
    keyPair?: Partial<KeyPairOptions>,
    secret?: string
};
```

**References**
- [KeyPairOptions](key-pair.md#keypairoptions)

## `TokenSignOptions`

```typescript
import { SignOptions } from 'jsonwebtoken';
import { TokenBaseOptions } from '@authelion/server-utils';

type TokenSignOptions = TokenBaseOptions & SignOptions;
```

**References**
- [TokenBaseOptions](#tokenbaseoptions)

## `TokenVerifyOptions`

```typescript
import { VerifyOptions } from 'jsonwebtoken';
import { TokenBaseOptions } from '@authelion/server-utils';

type TokenVerifyOptions = TokenBaseOptions & VerifyOptions;
```

**References**
- [TokenBaseOptions](#tokenbaseoptions)

## `TokenDecodeOptions`

```typescript
import { DecodeOptions } from 'jsonwebtoken';
import { KeyPairOptions } from '@authelion/server-utils';

type TokenDecodeOptions = DecodeOptions;
```

**References**
- [KeyPairOptions](key-pair.md#keypairoptions)
