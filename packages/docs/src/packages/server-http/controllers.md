# Controllers
The controllers must be registered in the gap of the common- & error-[middlewares](./middlewares.md).

```typescript
import {
    registerControllers
} from "@authup/server-http";

import { Router } from "routup";
import path from "path";

const router = new Router();

// Register middlewares
/* ... */

// Register controllers
/* ... */

// Register controllers
registerControllers(router);

// Register error middleware
/* ... */


router.listen(3010);
```
