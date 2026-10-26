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

Any one entry passing admits the page. A bare name checks the global permission definition. A permission owned by a realm or a client is named by an object carrying the owner ids, and both forms may be mixed in one list:

```typescript
definePageMeta({
    requirePermissions: [
        PermissionName.CLIENT_UPDATE,
        { name: 'mtb_query_submit', realmId: '<realm id>' },
        { name: 'mtb_query_read', clientId: '<client id>' },
    ],
});
```
