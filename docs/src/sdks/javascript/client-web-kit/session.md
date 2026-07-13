# Session

Session management is handled via `pinia`, and session-related data is stored as cookies in the browser.


## Login

To log a user into the application, use the `login` method provided by the injected store.  
Pass the user credentials and an optional `realmId` to authenticate the user.

```typescript
import { injectStore } from '@authup/client-web-kit';
import { defineComponent } from 'vue';

export default defineComponent({
    setup() {
        const store = injectStore();
        
        const submit = async () => {
            await store.login({
                name: '',
                password: '',
                realmId: '', // optional
            });
        }
        
        // ...
        
        return {
            submit
        }
    }
})
```

## Logout

To log the user out and clear the session, call the `logout` method from the injected store.
This will remove the session cookies and reset the authentication state.

```typescript
import { injectStore } from '@authup/client-web-kit';
import { defineComponent } from 'vue';

export default defineComponent({
    setup() {
        const store = injectStore();
        
        const submit = async () => {
            await store.logout();
        }
        
        // ...
        
        return {
            submit
        }
    }
})
```

## Meta

To retrieve meta information about the session, import the pinia store with the function `injectStore`.

```typescript
import { injectStore } from '@authup/client-web-kit';
import { defineComponent } from 'vue';

export default defineComponent({
    setup() {
        const store = injectStore();
        
        console.log(store.status); // 'unauthenticated' | 'authenticating' | 'restoring' | 'authenticated'
        console.log(store.lastAuthOrigin); // 'login' | 'exchange' | 'restore' | null
        console.log(store.userId); // xxxx-xxxx-...
        console.log(store.realmId); // xxxx-xxxx-...
        console.log(store.realmName); // xxx
        console.log(store.user); // { name: 'xxx', id: 'xxx', ... }
    }
})
```

`status` is presence-derived: `authenticated` means access token, realm and user
are all present (server-side validation stays `resolve()`'s job), while a
refresh-token-only session reads `restoring` until `resolve()` settles it.
The former `loggedIn` flag (a coarse "an access token exists" boolean) is
deprecated — compare `status` against `StoreAuthStatus.AUTHENTICATED` instead.
