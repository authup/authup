# Authentication Hook

The `ClientAuthenticationHook` class can be used together with a [token creator](token-creator.md)
to automatically manage authentication on one or more
[hapic](https://github.com/tada5hi/hapic) based HTTP clients.

If a request fails due to an expired or invalid token (401/403),
the hook automatically refreshes the token using the token creator and retries the request.

## Usage

```typescript
import { ClientAuthenticationHook, createUserTokenCreator } from '@authup/core-http-kit';
import { createClient } from 'hapic';

const client = createClient({
    baseURL: 'http://localhost:3002',
});

const hook = new ClientAuthenticationHook({
    tokenCreator: createUserTokenCreator({
        name: 'admin',
        password: 'start123',
    }, {
        client: { baseURL: 'http://localhost:3010' },
    }),
    timer: true, // auto-refresh before expiry (default: true)
});

// Attach the hook to one or more clients
hook.attach(client);
```

## Methods

| Method | Description |
|---|---|
| `attach(client)` | Register the hook on an HTTP client. Sets the current authorization header and installs the response-error interceptor. |
| `detach(client)` | Remove the hook from a client and clear its authorization header. |
| `isAttached(client)` | Check whether the hook is already registered on a client. |
| `enable()` | Enable the hook (enabled by default). |
| `disable()` | Temporarily disable automatic token refresh. |
| `refresh()` | Manually trigger a token refresh. Returns `Promise<TokenGrantResponse>`. |
| `setAuthorizationHeader(header)` | Manually set an authorization header on all attached clients. |
| `unsetAuthorizationHeader()` | Remove the authorization header from all attached clients. |
| `setTimer(expiresIn)` | Set a timer (in seconds) to auto-refresh before expiry. |
| `clearTimer()` | Cancel the auto-refresh timer. |

## Events

The hook extends `EventEmitter` and emits the following events:

| Event | Payload | Description |
|---|---|---|
| `refreshFinished` | `TokenGrantResponse` | A token refresh completed successfully. |
| `refreshFailed` | `ClientError \| null` | A token refresh failed. |
| `headerSet` | — | The authorization header was set on all clients. |
| `headerRemoved` | — | The authorization header was removed from all clients. |

```typescript
hook.on('refreshFinished', (response) => {
    console.log('New access token:', response.access_token);
});

hook.on('refreshFailed', (error) => {
    console.log('Token refresh failed:', error);
});
```
