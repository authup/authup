# HTTP

The http sub-modul which depends on the [express]() library, 
contains:
- controllers &
- middlewares

which need to be registered.

## Controllers
The controllers must be registered in the gap of the common- & error-[middlewares](#middlewares).

```typescript
import {
    registerControllers
} from "@authelion/api-core";

import express from "express";
import path from "path";

const app = express();

// Register middlewares
/* ... */

// Register controllers
/* ... */

// Register controllers
registerControllers(app);

// Register error middleware
/* ... */


app.listen(3010);
```

## Middlewares

```typescript
import {
    registerMiddlewares
} from "@authelion/api-core";

import express from "express";
import path from "path";

const app = express();

// Register middlewares
registerMiddlewares(app);

// Register controllers
/* ... */

// Register error middleware
/* ... */

app.listen(3010);
```

---

::: warning Important
It is not mandatory to use the provided error middleware, but it 
is required to define one, to handle errors thrown handlers (controllers & middlewares) of the request chain.
:::

The error middleware can be registered like shown in the following code snippet.

```typescript
import { errorMiddleware } from '@authelion/api-core';
import { express } from 'express';

const app = express();

// Register middlewares
/* ... */

// Register controllers
/* ... */

// Register error middleware
app.use(errorMiddleware);

app.listen(3010);
```
