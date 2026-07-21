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
    provider,
});

await evaluator.evaluate({
    name: 'user_create',
});
// success (always) - no restrictions/policies

const data = new PolicyData();
data.set('attributes', { name: 'admin' });

await evaluator.evaluate({
    name: 'user_update',
    data,
});
// success

const data2 = new PolicyData();
data2.set('attributes', { name: 'admin', foo: 'bar' });

await evaluator.evaluate({
    name: 'user_update',
    data: data2,
});
// fails - foo is not allowed as attribute name
```

Each method throws a `PermissionError` on denial and resolves on success.

## Pre-Evaluate

`preEvaluate` is the **pre-flight gate**: it runs before the data a policy needs is
fully known (e.g. before the target row is loaded or the request payload is validated).
It is derived from **data availability**: a policy whose required data keys are absent
from the bag stays *pending* and passes the gate — only a policy that settles **false**
with the data available at that point denies. The later `evaluate()` call with the
complete data remains the authority (there, pending counts as a denial).

```typescript
await evaluator.preEvaluate({
    name: 'user_update',
});
// success — the attributeNames policy needs `attributes`,
// which is not available yet: it stays pending and passes the gate

const data = new PolicyData();
data.set('attributes', { name: 'admin', foo: 'bar' });

await evaluator.evaluate({
    name: 'user_update',
    data,
});
// fails — with the data present, the policy settles false
```

This also holds under `invert` and inside composite trees: an unknown child is never
masked to a settled value, so an inverted policy tree cannot produce a spurious denial
at the gate.

`evaluateOneOf` / `preEvaluateOneOf` are variants that pass when **any** of the given
permission names passes (affirmative decision strategy).

## Compile

`compile` is the **query-build** counterpart of `evaluate`: instead of deciding a
single access request, it expresses the permission's restrictions as a condition over
row attributes (a rapiq `ICondition`), so list endpoints can enforce authorization in
the database query itself — keeping pagination and totals exact.

```typescript
const result = await evaluator.compile({ name: 'user_update' });

switch (result.verdict) {
    case 'allow':        // no restriction — every row passes
        break;
    case 'deny':         // no row can pass
        break;
    case 'conditional':  // push result.condition into the row query (WHERE)
        break;
    case 'post':         // not expressible — load rows and evaluate() per row
        break;
}
```

Multiple names compile as a disjunction (`evaluateOneOf` semantics): any unrestricted
name yields `allow`, and a single non-expressible name degrades the whole result to
`post` — pushing only part of a disjunction would wrongly exclude rows.

A `conditional` result is **exact**: a row satisfies the condition if and only if a
full `evaluate()` with that row's attributes would pass. When it cannot be guaranteed,
`compile` returns `post` instead — falling back to per-row evaluation is always sound.
