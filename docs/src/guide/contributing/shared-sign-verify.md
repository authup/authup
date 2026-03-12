# Sign & Verify

## `signToken`

The method `signToken()` can be used to sign a JWT payload.

**Type**
```ts
import type { JWTClaims } from '@authup/specs';
import type { TokenSignOptions } from '@authup/server-kit';

declare async function signToken(
    claims: JWTClaims,
    context: TokenSignOptions
): Promise<string>;
```

**Example**
```typescript
import { signToken } from '@authup/server-kit';

(async () => {
    const token = await signToken(
        { sub: 'user-id', foo: 'bar' },
        {
            type: 'RSA',
            key: privateKey, // base64-encoded string or CryptoKey
        }
    );
})();
```
**References**
- [TokenSignOptions](#tokensignoptions)

## `extractTokenPayload`

The method `extractTokenPayload()` can be used to extract the payload of a JWT token without verification.
This replaces the old `decodeToken()` function.

**Type**
```typescript
import type { JWTClaims } from '@authup/specs';

declare function extractTokenPayload(token: string): JWTClaims;
```

**Example**
```typescript
import { extractTokenPayload } from '@authup/server-kit';

const payload = extractTokenPayload(tokenString);
console.log(payload);
// { iat: 1642942322, exp: 1642945922, foo: 'bar', ... }
```

## `extractTokenHeader`

The method `extractTokenHeader()` extracts the header of a JWT token without verification.

**Type**
```typescript
import type { JWTHeader } from '@authup/specs';

declare function extractTokenHeader(token: string): JWTHeader;
```

## `verifyToken`

The method `verifyToken()` can be used to decode and verify a JWT token.

**Type**
```ts
import type { OAuth2TokenPayload } from '@authup/specs';
import type { TokenVerifyOptions } from '@authup/server-kit';

declare async function verifyToken(
    token: string,
    context: TokenVerifyOptions
): Promise<OAuth2TokenPayload>;
```

**Example**
```typescript
import { verifyToken } from '@authup/server-kit';

(async () => {
    const payload = await verifyToken(tokenString, {
        type: 'RSA',
        key: publicKey, // base64-encoded string or CryptoKey
    });

    console.log(payload);
    // { iat: 1642942322, exp: 1642945922, sub: '...', ... }
})();
```
**References**
- [TokenVerifyOptions](#tokenverifyoptions)

## `TokenSignOptions`

```typescript
type TokenSignOptions = {
    type: 'RSA',
    algorithm?: 'RS256' | 'RS384' | 'RS512' | 'PS256' | 'PS384' | 'PS512',
    key: string | CryptoKey,
    keyId?: string,
} | {
    type: 'EC',
    algorithm?: 'ES256' | 'ES384',
    key: string | CryptoKey,
    keyId?: string,
} | {
    type: 'oct',
    algorithm?: 'HS256' | 'HS384' | 'HS512',
    key: string | CryptoKey,
    keyId?: string,
};
```

## `TokenVerifyOptions`

```typescript
type TokenVerifyOptions = {
    type: 'RSA',
    algorithms?: ('RS256' | 'RS384' | 'RS512' | 'PS256' | 'PS384' | 'PS512')[],
    key: string | CryptoKey,
} | {
    type: 'EC',
    algorithms?: ('ES256' | 'ES384')[],
    key: string | CryptoKey,
} | {
    type: 'oct',
    algorithms?: ('HS256' | 'HS384' | 'HS512')[],
    key: string | CryptoKey,
};
```
