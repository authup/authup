# PermissionEvaluator

This package is shipped with a framework for evaluating and checking permissions.

The PermissionEvaluator can be initialized with various providers.
In the following, the PermissionEvaluator is initialized with the help of the PermissionMemoryProvider.

## Provider

For demonstration purposes, the PermissionMemoryProvider is only initialized with three permissions,
whereby only the first permission is defined with a [policy](./policies.md).


```typescript
import { PermissionMemoryProvider } from '@authup/access';

const items = [
    {
        permission: { name: 'user_update' },
        policies: [
            {
                type: 'attributeNames',
                names: ['name'],
            },
        ],
    },
    {
        permission: { name: 'user_create' },
    },
    {
        permission: { name: 'user_delete' },
    },
]

const provider = new PermissionMemoryProvider(items);
```


## Evaluate

To evaluate if a permission will be granted use the `evaluate` method.
The `evaluate` method accepts an object of type [PermissionEvaluationContext](./api-reference.md#permissionevaluationcontext).

```typescript
import { PermissionEvaluator, PermissionMemoryProvider, PolicyData } from '@authup/access';

const evaluator = new PermissionEvaluator({
    provider: new PermissionMemoryProvider([])
});

evaluator.evaluate({
    name: 'user_create',
});
// success (always) - no restrictions/policies

const input = new PolicyData();
input.set('attributes', { name: 'admin' });

evaluator.evaluate({
    name: 'user_update',
    input,
});
// success

const input2 = new PolicyData();
input2.set('attributes', { name: 'admin', foo: 'bar' });

evaluator.evaluate({
    name: 'user_update',
    input: input2,
});
// fails - foo is not allowed as attribute name
```
