# Sign & Verify

## `signToken`

The method `signToken()` can be used to sign a payload.

**Type**
```ts
import {
    TokenSignOptions
} from '@authelion/server-utils';

async function signToken(
    payload: string | object | Buffer | Record<string, any>,
    options?: TokenSignOptions
): Promise<string>;
```

**Example**
```typescript
import {
    signToken
} from '@authelion/server-utils';

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
import {
    TokenDecodeOptions
} from '@authelion/server-utils';
import { Jwt, JwtPayload } from 'jsonwebtoken';

export function decodeToken(
    token: string, 
    options: TokenDecodeOptions & { complete: true }
): null | Jwt;

export function decodeToken(
    token: string, 
    options?: TokenDecodeOptions
): JwtPayload | string | null;

function decodeToken(
    token: string,
    options?: TokenDecodeOptions,
): string | JwtPayload | null;
```

**Example**
```typescript
import {
    decodeToken
} from "@authelion/server-utils";

(async () => {
    const tokenSigned = '...';
    const tokenVerified = decodeToken(tokenSigned);

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
import {
    TokenVerifyOptions
} from '@authelion/server-utils';
import { Jwt, JwtPayload } from 'jsonwebtoken';

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

:::info Hint
The type is simplified for better readability.
:::

```typescript
import { KeyPair, KeyPairOptions } from '@authelion/server-utils';
import { SignOptions } from 'jsonwebtoken';

export type TokenSignOptions = ({
    type: 'rsa',
    algorithm?: 'RS256' | 'RS384' | 'RS512' |
        'PS256' | 'PS384' | 'PS512',
    keyPair: KeyPair | Partial<KeyPairOptions> | string
} | {
    type: 'ec',
    algorithm?: 'ES256' | 'ES384' | 'ES512',
    keyPair: KeyPair | Partial<KeyPairOptions> | string
} | {
    type: 'oct',
    algorithm?: 'HS256' | 'HS384' | 'HS512',
    secret: string | Buffer
}) & Omit<SignOptions, 'algorithm'>;
```

**References**
- [KeyPair](key-pair.md#keypair)
- [KeyPairOptions](key-pair.md#keypairoptions)

## `TokenVerifyOptions`

:::info Hint
The type is simplified for better readability.
:::

```typescript
import { KeyType } from '@authelion/common';
import { KeyPair, KeyPairOptions } from '@authelion/server-utils';
import { VerifyOptions } from 'jsonwebtoken';

export type TokenVerifyOptions = ({
    type: 'rsa',
    algorithms?: ('RS256' | 'RS384' | 'RS512' |
        'PS256' | 'PS384' | 'PS512')[],
    keyPair: KeyPair | Partial<KeyPairOptions> | string
} | {
    type: 'ec',
    algorithms?: ('ES256' | 'ES384' | 'ES512')[],
    keyPair: KeyPair | Partial<KeyPairOptions> | string
} | {
    type: 'oct',
    algorithms?: ('HS256' | 'HS384' | 'HS512')[],
    secret: string | Buffer
}) & Omit<VerifyOptions, 'algorithms'>;
```

**References**
- [KeyPair](key-pair.md#keypair)
- [KeyPairOptions](key-pair.md#keypairoptions)

## `TokenDecodeOptions`

```typescript
import { DecodeOptions } from 'jsonwebtoken';

type TokenDecodeOptions = DecodeOptions;
```
