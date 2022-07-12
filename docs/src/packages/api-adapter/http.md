# HTTP

The http express middleware should be injected at the beginning of the  chain. 

Besides, validating the authorization header, the `setupHTTPMiddleware` also extends the request 
with general information (realm, abilities, ...) and information about the corresponding robot or user of the token.

## Configuration

The `setupHTTPMiddleware` method, accepts a configuration object for the http- and redis-client.
The redis client, if enabled, is used to cache verification responses from the backend service.

```typescript
import express from 'express';
import { setupHTTPMiddleware } from '@authelion/api-adapter';
import { createClient } from 'redis-extension';
import axios from 'axios';

// create http client
const http = axios.create({
    baseURL: 'http://localhost:3002/'
});

// create redis client
const redis = createClient({connectionString: 'redis://127.0.0.1'});

// setup express server
const app = expres();

// setup socket middleware for socket server
app.use(setupHTTPMiddleware({
    redis,
    http,
    /* ... */
}));

app.listen(3000);
```

For more details check out, the [API Reference]().
