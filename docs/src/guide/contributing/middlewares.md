# Middlewares

```typescript
import {
    registerMiddlewares
} from "@authup/server-http";

import { Router } from "routup";
import path from "path";

const app = new Router();

// Register middlewares
registerMiddlewares(router);

// Register controllers
/* ... */

// Register error middleware
/* ... */

router.listen(3010);
```

---

::: warning Important
It is not mandatory to use the provided error middleware, but it
is required to define one, to handle errors thrown handlers (controllers & middlewares) of the request chain.
:::

The error middleware can be registered like shown in the following code snippet.

```typescript
import { errorMiddleware } from '@authup/server-http';
import { Router } from 'routup';

const router = new Router();

// Register middlewares
/* ... */

// Register controllers
/* ... */

// Register error middleware
router.use(errorMiddleware);

router.listen(3010);
```
