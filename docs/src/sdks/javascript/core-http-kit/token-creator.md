# Token Creator

The TokenCreator is a mechanism to create a generator
function that creates a token on demand using a (predefined) strategy.

The following strategies are built in and can be used as follows.

## User Strategy

```typescript
import type { TokenCreator } from '@auhtup/core-http-kit';
import { createTokenCreator } from '@auhtup/core-http-kit';

const creator : TokenCreator = createTokenCreator({
    type: 'user',
    name: 'admin',
    password: 'start123'
    // realmId: 'xxx',
    // realmName: 'xxx'
});

const tokenPayload = await creator();
console.log(tokenPayload);
// { access_token: '...', refresh_token: '...', expires_in: '...', ... }
```

## Robot Strategy

```typescript
import type { TokenCreator } from '@auhtup/core-http-kit';
import { createTokenCreator } from '@auhtup/core-http-kit';

const creator : TokenCreator = createTokenCreator({
    type: 'robot',
    id: 'xxx',
    secret: 'xxx'
});

const tokenPayload = await creator();
console.log(tokenPayload);
// { access_token: '...', refresh_token: '...', expires_in: '...', ... }
```

## RobotInVault Strategy

```typescript
import type { TokenCreator } from '@auhtup/core-http-kit';
import { createTokenCreator } from '@auhtup/core-http-kit';

const creator : TokenCreator = createTokenCreator({
    type: 'robotInVault',
    name: 'SYSTEM',
    vault: 'start123@http://127.0.0.1:8090/v1/'
});

const tokenPayload = await creator();
console.log(tokenPayload);
// { access_token: '...', refresh_token: '...', expires_in: '...', ... }
```

## Custom Strategy
```typescript
import type { TokenCreator } from '@auhtup/core-http-kit';

const creator : TokenCreator = async () => {
    return {
        token_type: 'Bearer',
        access_token: 'xxx',
        refresh_token: 'xxx',
        expires_in: 'xxx',
    };
};

const tokenPayload = await creator();
console.log(tokenPayload);
// { access_token: '...', refresh_token: '...', expires_in: '...', ... }
