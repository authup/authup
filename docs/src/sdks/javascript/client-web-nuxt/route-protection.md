# Route Protection

The Nuxt module provides a built-in feature for protecting page components.  
Access restrictions can be defined via `definePageMeta`.  
The following restriction options are available:

## requireLoggedIn

If the `requireLoggedIn` option is enabled, access to the page component is only allowed if the user is logged in.

```typescript
import { defineComponent } from 'vue';
import { definePageMeta } from '#imports';

export default defineComponent({
    //...
    setup() {
        definePageMeta({
            requireLoggedIn: true
        });
    }
    //...
});
```

## requireLoggedOut

If the `requiredLoggedOut` option is enabled, access to the page component is only allowed if the user is not logged in.

```typescript
import { defineComponent } from 'vue';
import { definePageMeta } from '#imports';

export default defineComponent({
    //...
    setup() {
        definePageMeta({
            requireLoggedOut: true
        });
    }
    //...
});
```

## requirePermissions

If the `requirePermissions` option is defined, access to the page component is only allowed if the specified permissions are granted.

```typescript
import { PermissionName } from '@authup/core-kit';
import { defineComponent } from 'vue';
import { definePageMeta } from '#imports';

export default defineComponent({
    //...
    setup() {
        definePageMeta({
            requirePermissions: [
                PermissionName.CLIENT_UPDATE,
            ]
        });
    }
    //...
});
```

