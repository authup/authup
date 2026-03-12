# HTTP Interceptor

The interceptor method, can be used for a [token creator](token-creator.md) strategy, 
a request interceptor to mount a
[hapic](https://github.com/tada5hi/hapic) based http client. 

If the request fails due to a non-existent, expired or invalid token, 
a new token is set using the token creator strategy. 

## Hapic 

```typescript
import { mountClientResponseErrorTokenHook } from '@auhtup/core-http-kit';
import { createClient } from 'hapic';

const client = createClient({
    baseURL: 'http://localhost:3002'
});

mountClientResponseErrorTokenHook(client, {
    /**
     * Authup API URL
     */
    baseUrl: 'http://localhost:3010',
    tokenCreator: {
        type: 'user',
        name: 'admin',
        password: 'start123'
    }
});

```
