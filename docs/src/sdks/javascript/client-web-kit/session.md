# Session

Session management is handled via `pinia`. The tokens and the active management
realm are stored as cookies in the browser, so a server-side render can read
them from the request. The user is not stored: `resolve()` derives it from the
token introspection that validates the session anyway, and carries the id, name
and display name that identify the subject.


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
        console.log(store.user); // null | { id: 'xxxx-xxxx-...', name: 'xxx', displayName: 'xxx' | null }
    }
})
```

`status` is presence-derived: `authenticated` means access token, realm and user
are all present (server-side validation stays `resolve()`'s job), while a
refresh-token-only session reads `restoring` until `resolve()` settles it. The
realm and the user are derived from the token introspection, so a restored
session reads `restoring` until `resolve()` has completed that round-trip, and a
session whose subject is not a user never reaches `authenticated`.
The former `loggedIn` flag (a coarse "an access token exists" boolean) is
deprecated — compare `status` against `StoreAuthStatus.AUTHENTICATED` instead.
