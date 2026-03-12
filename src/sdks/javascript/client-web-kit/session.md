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
        
        console.log(store.loggedIn); // true
        console.log(store.userId); // xxxx-xxxx-...
        console.log(store.realmId); // xxxx-xxxx-...
        console.log(store.realmName); // xxx
        console.log(store.user); // { name: 'xxx', id: 'xxx', ... }
    }
})
```
