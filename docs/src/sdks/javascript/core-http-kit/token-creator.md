# Token Creator

A `TokenCreator` is a function that obtains a token on demand using a specific strategy.
The package provides three built-in creator functions, one for each grant type.

```typescript
type TokenCreator = () => Promise<TokenGrantResponse>;
```

## User Strategy

Uses the OAuth2 password grant to obtain a token with user credentials.

```typescript
import type { TokenCreator } from '@authup/core-http-kit';
import { createUserTokenCreator } from '@authup/core-http-kit';

const creator: TokenCreator = createUserTokenCreator({
    name: 'admin',
    password: 'start123',
    // realmId: 'xxx',
    // realmName: 'xxx',
}, {
    client: { baseURL: 'http://localhost:3010' },
});

const tokenPayload = await creator();
console.log(tokenPayload);
// { access_token: '...', refresh_token: '...', expires_in: 3600, ... }
```

## Robot Strategy

Uses the robot credentials grant to obtain a token.

```typescript
import type { TokenCreator } from '@authup/core-http-kit';
import { createRobotTokenCreator } from '@authup/core-http-kit';

const creator: TokenCreator = createRobotTokenCreator({
    id: 'xxx',
    secret: 'xxx',
}, {
    client: { baseURL: 'http://localhost:3010' },
});

const tokenPayload = await creator();
console.log(tokenPayload);
// { access_token: '...', refresh_token: '...', expires_in: 3600, ... }
```

## Client Strategy

Uses the OAuth2 client credentials grant to obtain a token.

```typescript
import type { TokenCreator } from '@authup/core-http-kit';
import { createClientTokenCreator } from '@authup/core-http-kit';

const creator: TokenCreator = createClientTokenCreator({
    id: 'xxx',
    secret: 'xxx',
}, {
    client: { baseURL: 'http://localhost:3010' },
});

const tokenPayload = await creator();
console.log(tokenPayload);
// { access_token: '...', refresh_token: '...', expires_in: 3600, ... }
```

## Custom Strategy

You can also define a custom token creator by implementing the `TokenCreator` type directly.

```typescript
import type { TokenCreator } from '@authup/core-http-kit';

const creator: TokenCreator = async () => {
    return {
        token_type: 'Bearer',
        access_token: 'xxx',
        refresh_token: 'xxx',
        expires_in: 3600,
    };
};

const tokenPayload = await creator();
console.log(tokenPayload);
// { access_token: '...', refresh_token: '...', expires_in: 3600, ... }
```
