# Policies

The system provides a set of built-in policies that are evaluated by the policy engine by default.
These policy evaluators can be overridden if needed.
In addition, [custom evaluators](#custom-policy-evaluators) can be added and registered to extend the system's capabilities.

The following built-in policies are available:
- [Attributes](#attributes)
- [AttributeNames](#attributenames)
- [Date](#date)
- [Identity](#identity)
- [PermissionBinding](#permission-binding)
- [RealmMatch](#realmmatch)
- [Time](#time)

Every policy configuration additionally accepts `invert?: boolean`, which flips the
evaluation outcome (allow ⇄ deny). Inversion applies only to genuine outcomes — a
policy that could not be evaluated (see
[Pending & data availability](#pending--data-availability)) is never inverted.

## Pending & data availability

Policy evaluation is **tri-state**: a policy settles *true*, settles *false*, or stays
**pending** when the data it needs is not present in the `PolicyData` bag yet. Each
evaluator declares its data needs via `requires(value)` — for example, the attributes
evaluator requires the `attributes` key. When a required key is absent, the engine
returns:

```typescript
{
    success: false,   // fail-closed: consumers that ignore `pending` treat it as a deny
    pending: true,
}
```

Composite policies treat pending children as *unknown*: they are never counted toward
the decision and never masked to a settled value, and `invert` is never applied to a
pending result. This is what makes pre-flight checks
([`preEvaluate`](./permission-checker.md#pre-evaluate)) safe: a policy that cannot be
evaluated yet does not deny at the gate — it is re-evaluated later with the full data.

## Attributes

The attributes policy configuration specifies conditions in the form of a MongoDB query, which are evaluated against the `attributes` key in the policy data.

**`Config`**
```typescript
export interface AttributesPolicy {
    query: AttributesPolicyQuery<T>
}
```

**`Evaluator`**
```typescript
import { AttributesPolicyEvaluator, PolicyData, definePolicyEvaluationContext } from '@authup/access';

const evaluator = new AttributesPolicyEvaluator();

const data = new PolicyData();
data.set('attributes', {
    name: 'Peter',
    age: 15,
});

evaluator.evaluate(
    {
        query: {
            name: {
                $regex: /t/,
            },
            age: {
                $lt: 18,
                $gt: 12,
            },
        }
    },
    definePolicyEvaluationContext({ data }),
)
```

One or many conditions can be specified using the MongoDB [query language](http://docs.mongodb.org/manual/reference/operator/query/)

The list of supported operators:

1. [$eq] and [$ne]\
   Check if the object value is equal to the specified value. `$ne` means `not $eq`.
2. [$lt] and [$lte]\
   Check if the object value is less than the specified value. Can be used for `Date`s, numbers and strings. `$lte` is a combination of `$lt` and `$eq`, so it's an inclusive check.
3. [$gt] and [$gte]\
   Check if the object value is greater than the specified value. Can be used for `Date`s, numbers and strings. `$gte` is a combination of `$gt` and `$eq`, so it's an inclusive check.
4. [$in] and [$nin]\
   Checks if the object's property is of the specified array values. Can be used for single value and for arrays as well. If object's property is an array it checks for intersection. `$nin` means `not $in`
5. [$all]\
   Checks if the object's property contain all elements from the specified array. Can be used for arrays only.
6. [$size]\
   Checks if the array length is equal to the specified value. Can be used for arrays only.
7. [$regex]\
   Allows to test object's property value using [regular expression](https://en.wikipedia.org/wiki/Regular_expression). Can be used for strings only.
8. [$exists]\
   Checks if the property exists in the object.
9. [$elemMatch]\
   Checks nested elements shape. Use `$elemMatch` operator to specify multiple criteria on the elements of an array such that at least one array element satisfies all the specified criteria.
   If you specify only a single condition in the `$elemMatch` expression, `$elemMatch` is not necessary. See [Specify Multiple Conditions for Array Elements](https://docs.mongodb.com/manual/tutorial/query-arrays/#specify-multiple-criteria-for-array-elements) for details.

[$eq]: https://docs.mongodb.com/manual/reference/operator/query/eq
[$ne]: https://docs.mongodb.com/manual/reference/operator/query/ne
[$lt]: https://docs.mongodb.com/manual/reference/operator/query/lt
[$lte]: https://docs.mongodb.com/manual/reference/operator/query/lte
[$gt]: https://docs.mongodb.com/manual/reference/operator/query/gt
[$gte]: https://docs.mongodb.com/manual/reference/operator/query/gte
[$in]: https://docs.mongodb.com/manual/reference/operator/query/in
[$nin]: https://docs.mongodb.com/manual/reference/operator/query/nin
[$all]: https://docs.mongodb.com/manual/reference/operator/query/all
[$size]: https://docs.mongodb.com/manual/reference/operator/query/size
[$regex]: https://docs.mongodb.com/manual/reference/operator/query/regex
[$elemMatch]: https://docs.mongodb.com/manual/reference/operator/query/elemMatch
[$exists]: https://docs.mongodb.com/manual/reference/operator/query/exists

## AttributeNames

The Attribute Names Policy restricts the set of allowed keys in the `attributes` key of the policy data.

**`Config`**
```typescript
export interface AttributeNamesPolicy {
    names: string[],
}
```

**`Evaluator`**
```typescript
import { AttributeNamesPolicyEvaluator, PolicyData, definePolicyEvaluationContext } from '@authup/access';

const evaluator = new AttributeNamesPolicyEvaluator();

const data = new PolicyData();
data.set('attributes', {
    name: 'Peter',
    age: 15,
});

evaluator.evaluate(
    {
        names: ['name', 'age']
    },
    definePolicyEvaluationContext({ data }),
)
```

## Date

The Date Policy is used to define a policy that is only valid within a specific time period.
You can specify both a start and end date, or just one of them.

**`Config`**
```typescript
export interface DatePolicy {
    start?: string | Date | number,

    end?: string | Date | number,
}
```

**`Evaluator`**
```typescript
import { DatePolicyEvaluator, PolicyData, definePolicyEvaluationContext } from '@authup/access';

const evaluator = new DatePolicyEvaluator();

const data = new PolicyData();
data.set('date', '2024-04-15'); // optional

evaluator.evaluate(
    {
        start: '2024-04-01',
        end: '2024-05-01',
    },
    definePolicyEvaluationContext({ data }),
)
```


## Identity
The Identity Policy ensures that only identities of a specific type (`types`) are accepted during policy evaluation.

**`Config`**
```typescript
export interface IdentityPolicy {
    /**
     * Set of allowed identity types.
     */
    types?: string[],
}
```

## Permission Binding

The PermissionBinding Policy verifies that the acting identity actually **holds** the
permission being evaluated — the binding rides the `permissionBinding` key of the
policy data. Authup's server attaches this policy to every managed permission through
the built-in `system.permission-binding` policy, whose server-side evaluator also
enforces each grant's realm reach (`realmScope`) and optional junction policy. The
package-level evaluator is a structural placeholder for standalone (client-side) use,
where the provider only yields permissions the identity already owns.

**`Config`**
```typescript
export interface PermissionBindingPolicy {
    invert?: boolean
}
```

## RealmMatch

The RealmMatch Policy requires that the identity's realm matches one or more realm attributes
of a resource, or one of the key-value pairs in the resource's attributes property.

It operates in one of two modes:

- **Scope mode** (`scope` set): matches the resource realm supplied under the
  `realmMatch` policy-data key against the identity's realm using a coarse,
  actor-relative reach — `own` (identity's own realm only), `ownOrNull` (own realm or
  global/null resources), `any`, `none`. When no `realmMatch` key is present, the
  policy does not apply and passes neutrally. This mode powers the `realmScope`
  column on permission grants.
- **Attribute mode** (no `scope`): matches one or more keys of the `attributes`
  policy-data bag (by default `realmId` / `realmName` and variants) against the
  identity's realm id or name.

```typescript
export interface RealmMatchPolicy {
    /**
     * Determines how realm-id/name matches are handled (attribute mode).
     */
    decisionStrategy?: 'affirmative' | 'unanimous' | 'consensus',

    /**
     * Specifies the name(s) of the realm-id/name attribute(s) used for matching.
     * Can be a single attribute name or an array of attribute names.
     */
    attributeName?: string | string[],

    /**
     * Only match if the attribute is strict equal to the name.
     */
    attributeNameStrict?: boolean,

    /**
     * Determines if resources with null realm-id/name value should match all identity realms.
     * If true, any identity realm can access resources with null realm-id/name values.
     */
    attributeNullMatchAll?: boolean,

    /**
     * Coarse, actor-relative realm reach. When set, the evaluator runs in scope mode.
     */
    scope?: 'none' | 'own' | 'ownOrNull' | 'any'
}
```

## Time

The Time Policy works similarly to the [Date](#date) Policy.
In addition to specifying a start and end time (or omitting one), it also supports defining an interval.

**`Config`**
```typescript
export interface TimePolicy {
    /**
     * Format: HH:MM
     */
    start?: string | number | Date,

    /**
     * Format HH:MM
     */
    end?: string | number | Date,

    /**
     * Interval: daily, weekly, monthly, yearly
     */
    interval?: `${TimePolicyInterval}`,

    /**
     *  0 (Sunday) - 6 (Saturday)
     */
    dayOfWeek?: number,

    /**
     * 1 - 31
     */
    dayOfMonth?: number,

    /**
     * 1 - 365
     */
    dayOfYear?: number,
}

```

**`Evaluator`**
```typescript
import { TimePolicyEvaluator, PolicyData, definePolicyEvaluationContext } from '@authup/access';

const evaluator = new TimePolicyEvaluator();

const data = new PolicyData();
data.set('time', '2024-04-15'); // optional

evaluator.evaluate(
    {
        start: '08:00:00',
        end: '16:00:00',
        interval: 'daily',
        dayOfWeek: 0,
        dayOfMonth: 1,
        dayOfYear: 1,
    },
    definePolicyEvaluationContext({ data }),
)
```

## Custom Policy Evaluators

A policy type is defined by an evaluator implementing `IPolicyEvaluator` and registered
on the policy engine under its type name:

```typescript
export interface IPolicyEvaluator {
    /**
     * PolicyData keys this policy needs before it can settle.
     * When any returned key is absent from the bag, the engine returns a
     * pending result instead of invoking evaluate().
     */
    requires?(value: Record<string, any>): string[];

    /**
     * Express the policy as a condition over row attributes (rapiq ICondition)
     * instead of waiting for the row — enables WHERE pushdown. Only attempted
     * on pending subtrees when the evaluation context sets `withConditions`.
     * Return null when the configuration is not expressible; it then stays
     * a per-row post-check.
     */
    toCondition?(value: Record<string, any>, context: PolicyEvaluationContext): Promise<ICondition | null>;

    /**
     * Execute the policy with specific data and a given context.
     */
    evaluate(value: Record<string, any>, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult>;
}
```

```typescript
import { PolicyDefaultEvaluators, PolicyEngine } from '@authup/access';

const engine = new PolicyEngine(PolicyDefaultEvaluators);
engine.registerEvaluator('ipRange', new IpRangePolicyEvaluator());
```

Guidelines:

- **Declare `requires()`.** Without it, the evaluator runs at the pre-flight gate even
  when its data is missing and must handle that itself; with it, the engine keeps the
  policy pending until the data arrives.
- **Never invert a non-evaluation.** Apply `invert` only to genuine outcomes; neutral
  passes (policy does not apply) and pending results stay as they are.
- **`toCondition` must be exact.** A row satisfies the returned condition if and only
  if the policy would settle true with that row as its attributes. When in doubt,
  return `null` — a per-row check is always sound.
