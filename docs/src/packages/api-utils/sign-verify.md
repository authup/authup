# Sign & Verify

## `signToken`

The method `signToken()` can be used to sign a payload.

**Type**
```ts
async function signToken(
    payload: string | object | Buffer | Record<string, any>,
    context?: TokenSignContext
): Promise<string>;
```

**Example**
```typescript
import {
    signToken
} from "@authelion/api-utils";

(async () => {
    const token : Record<string, any> = {foo: 'bar'};
    const tokenSigned = await signToken(
        token, 
        {
            options: {
                expiresIn: 3600
            }
        }
    );
});
```
**References**
- [TokenSignContext](#tokensigncontext)

## `decodeToken`

The method `decodeToken()` can be used to decode the payload of a JWT token without verification.

**Type**
```typescript
async function decodeToken(
    token: string,
    context?: TokenDecodeContext,
): Promise<string | Record<string, any>>;
```

**Example**
```typescript
import {
    decodeToken
} from "@authelion/api-utils";

(async () => {
    const tokenSigned = '...';
    const tokenVerified = await decodeToken(tokenSigned);

    console.log(tokenVerified);
    // {iat: 1642942322, exp: 1642945922, foo: 'bar', ... }
});
```
**References**
- [TokenSignContext](#tokensigncontext)

## `verifyToken`

The method `decodeToken()` can be used to decode and verify a JWT token.

**Type**
```ts
async function verifyToken(
    token: string,
    context?: TokenVerifyContext
): Promise<string | Record<string, any>>;
```
**Example**
```typescript
import {
    signToken
} from "@authelion/api-utils";

(async () => {
    const tokenSigned = '...';
    const tokenVerified = await verifyToken(tokenSigned);

    console.log(tokenVerified);
    // {iat: 1642942322, exp: 1642945922, foo: 'bar', ... }
});
```
**References**
- [TokenSignContext](#tokensigncontext)

## `TokenBaseContext`

```typescript
type TokenBaseContext<T> = {
    options?: T,
    secret?: string
};
```

**References**
- [KeyPairContext](key-pair.md#keypaircontext)

## `TokenSignContext`

```typescript
import { SignOptions } from 'jsonwebtoken';
import { KeyPairContext, TokenBaseContext } from '@authelion/api-utils';

type TokenSignContext = TokenBaseContext<SignOptions> & {
    keyPair?: Partial<KeyPairContext>
};
```

**References**
- [KeyPairContext](key-pair.md#keypaircontext)
- [TokenBaseContext](#tokenbasecontext)

## `TokenVerifyContext`

```typescript
import { VerifyOptions } from 'jsonwebtoken';
import { KeyPairContext, TokenBaseContext } from '@authelion/api-utils';

type TokenVerifyContext = TokenBaseContext<VerifyOptions> & {
    keyPair?: Partial<KeyPairContext>
};
```

**References**
- [KeyPairContext](key-pair.md#keypaircontext)
- [TokenBaseContext](#tokenbasecontext)

## `TokenDecodeContext`

```typescript
import { VerifyOptions } from 'jsonwebtoken';
import { KeyPairContext, TokenBaseContext } from '@authelion/api-utils';

type TokenDecodeContext = TokenBaseContext<DecodeOptions>;
```

**References**
- [KeyPairContext](key-pair.md#keypaircontext)
- [TokenBaseContext](#tokenbasecontext)
