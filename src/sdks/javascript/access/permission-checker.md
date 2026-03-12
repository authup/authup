# PermissionChecker

This package is shipped with a framework for evaluating and checking permissions.

The PermissionChecker can be initialized with various providers.
In the following, the PermissionChecker is initialized with the help of the PermissionMemoryProvider.

## Provider

For demonstration purposes, the PermissionMemoryProvider is only initialized with three permissions,
whereby only the first permission is defined with a [policy](./policies.md).


```typescript
import { PermissionMemoryProvider } from '@auhtup/access';

const items = [
    {
        name: 'user_update',
        policy: {
            type: 'attributeNames',
            names: ['name'],
        },
    },
    {
        name: 'user_create',
    },
    {
        name: 'user_delete',
    },
]

const provider = new PermissionMemoryProvider(items);
```


## Check 

To check if a permission will be granted use the `check` method. 
The `check` method accepts an object of type [PermissionCheckerCheckOptions](./api-reference.md#permissioncheckercheckoptions).

```typescript
import { PermissionChecker, PermissionMemoryProvider } from '@authup/access';

const checker = new PermissionChecker({ 
    provider: new PermissionMemoryProvider([])
});

checker.check({
    name: 'user_create',
    input: {
        attributes: {
            name: 'admin'
        }
    }
});
// success (allways) - no restrictions/policies

checker.check({ 
    name: 'user_update',
    input: {
        attributes: {
            name: 'admin'
        }
    }
});
// success

checker.check({ 
    name: 'user_update',
    input: {
        attributes: {
            name: 'admin',
            foo: 'bar'
        }
    }
});
// fails - foo is not allowed as attribute name
```
