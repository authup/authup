# Policies

The system provides a set of built-in policies that are evaluated by the policy engine by default.
These policy evaluators can be overridden if needed.
In addition, custom evaluators can be added and registered to extend the system’s capabilities.

The following built-in policies are available:
- [Attributes](#attributes)
- [AttributeNames](#attributenames)
- [Date](#date)
- [Identity](#identity)
- [PermissionBinding](#permission-binding)
- [RealmMatch](#realmmatch)
- [Time](#time)

## Attributes

The attributes policy configuration specifies conditions in the form of a MongoDB query, which are evaluated against the input’s attributes property.

**`Config`**
```typescript
export interface AttributesPolicy {
    query: AttributesPolicyQuery<T>
}
```

**`Evaluator`**
```typescript
import { AttributesPolicyEvaluator } from '@authup/access';

const evaluator = new AttributesPolicyEvaluator();
evaluator.evaluate({
    config: {
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
    input: {
        attributes: {
            name: 'Peter',
            age: 15,
        },
    }
})
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

The Attribute Names Policy restricts the set of allowed keys in the input’s attributes property.

**`Config`**
```typescript
export interface AttributeNamesPolicy {
    names: string[],
}
```

**`Evaluator`**
```typescript
import { AttributeNamesPolicyEvaluator } from '@authup/access';

const evaluator = new AttributeNamesPolicyEvaluator();
evaluator.evaluate({
    config: {
        names: ['name', 'age']
    },
    input: {
        attributes: {
            name: 'Peter',
            age: 15,
        },
    }
})
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
import { DatePolicyEvaluator } from '@authup/access';

const evaluator = new DatePolicyEvaluator();
evaluator.evaluate({
    config: {
        start: '2024-04-01',
        end: '2024-05-01',
    },
    input: {
        dateTime: '2024-04-15' // optional
    }
})
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

TODO

## RealmMatch

The RealmMatch Policy requires that the identity’s realm matches one or more realm attributes 
of a resource, or one of the key-value pairs in the resource’s attributes property.

```typescript
export interface RealmMatchPolicy {
    /**
     * Determines how realm-id/name matches are handled.
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
     * Specifies whether the master realm of an identity should match all realm-id/name attributes, including null.
     * If true, the master realm can access any resource regardless of its realm value.
     */
    identityMasterMatchAll?: boolean
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
import { TimePolicyEvaluator } from '@authup/access';

const evaluator = new TimePolicyEvaluator();
evaluator.evaluate({
    config: {
        start: '08:00:00',
        end: '16:00:00',
        interval: 'daily',
        dayOfWeek: 0,
        dayOfMonth: 1,
        dayOfYear: 1,
    },
    input: {
        dateTime: '2024-04-15' // optional
    }
})
```
