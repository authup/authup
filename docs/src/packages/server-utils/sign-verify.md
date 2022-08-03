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
            type: 'rsa',
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
export function decodeToken(
    token: string, 
    options: TokenDecodeOptions & { complete: true }
): null | Jwt;

export function decodeToken(
    token: string, 
    options?: TokenDecodeOptions
): JwtPayload | string | null;

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
export async function verifyToken(
    token: string, 
    context: TokenVerifyOptions & { complete: true }
): Promise<string | Jwt>;

export async function verifyToken(
    token: string,
    context: TokenVerifyOptions
): Promise<JwtPayload | string>;

async function verifyToken(
    token: string,
    options?: TokenVerifyOptions
): Promise<JwtPayload | Jwt | string>;
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

## `TokenSignOptions`

```typescript
import { SignOptions } from 'jsonwebtoken';
import { KeyPair, KeyPairOptions } from '@authelion/server-utils';

export type TokenSignOptions = ({
    type: `${KeyType.RSA}` | KeyType.RSA,
    algorithm?: 'RS256' | 'RS384' | 'RS512' |
        'PS256' | 'PS384' | 'PS512',
    keyPair: KeyPair | Partial<KeyPairOptions> | string
} | {
    type: `${KeyType.EC}` | KeyType.EC,
    algorithm?: 'ES256' | 'ES384' | 'ES512',
    keyPair: KeyPair | Partial<KeyPairOptions> | string
} | {
    type: `${KeyType.OCT}` | KeyType.OCT,
    algorithm?: 'HS256' | 'HS384' | 'HS512',
    secret: string | Buffer
}) & Omit<SignOptions, 'algorithm'>;
```

**References**
- [KeyPairOptions](key-pair.md#keypairoptions)

## `TokenVerifyOptions`

```typescript
import { VerifyOptions } from 'jsonwebtoken';
import { KeyType } from '@authelion/common';
import { KeyPair, KeyPairOptions } from '@authelion/server-utils';

export type TokenVerifyOptions = ({
    type: `${KeyType.RSA}` | KeyType.RSA,
    algorithms?: ('RS256' | 'RS384' | 'RS512' |
        'PS256' | 'PS384' | 'PS512')[],
    keyPair: KeyPair | Partial<KeyPairOptions> | string
} | {
    type: `${KeyType.EC}` | KeyType.EC,
    algorithms?: ('ES256' | 'ES384' | 'ES512')[],
    keyPair: KeyPair | Partial<KeyPairOptions> | string
} | {
    type: `${KeyType.OCT}` | KeyType.OCT,
    algorithms?: ('HS256' | 'HS384' | 'HS512')[],
    secret: string | Buffer
}) & Omit<VerifyOptions, 'algorithms'>;
```

**References**
- [KeyPairOptions](key-pair.md#keypairoptions)

## `TokenDecodeOptions`

```typescript
import { DecodeOptions } from 'jsonwebtoken';

type TokenDecodeOptions = DecodeOptions;
```
