# PermissionChecker

This package is shipped with a framework for evaluating and checking permissions.

The PermissionChecker can be initialized with various repositories.
In the following, the PermissionChecker is initialized with the help of the PermissionMemoryRepository.

## Repository

For demonstration purposes, the PermissionMemoryRepository is only initialized with three permissions,
whereby only the first permission is defined with a [policy](./policies.md).


```typescript
import { PermissionMemoryRepository } from '@authup/access';

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

const repository = new PermissionMemoryRepository(items);
```


## Check

To check if a permission will be granted use the `check` method.
The `check` method accepts an object of type [PermissionCheckerCheckContext](./api-reference.md#permissioncheckercheckoptions).

```typescript
import { PermissionChecker, PermissionMemoryRepository, PolicyData } from '@authup/access';

const checker = new PermissionChecker({
    repository: new PermissionMemoryRepository([])
});

checker.check({
    name: 'user_create',
});
// success (always) - no restrictions/policies

const input = new PolicyData();
input.set('attributes', { name: 'admin' });

checker.check({
    name: 'user_update',
    input,
});
// success

const input2 = new PolicyData();
input2.set('attributes', { name: 'admin', foo: 'bar' });

checker.check({
    name: 'user_update',
    input: input2,
});
// fails - foo is not allowed as attribute name
```
