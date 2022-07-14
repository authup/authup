# Ability Manager

This package is shipped with a management system for permissions,
which scales between a **claim based** and **subject/attribute based** authorization.

The data ([AbilityDescriptor(s)]()) to initialize 
the `AbilityManager` can be serialized as json for example and shared between frontend and backend services,
to provide the same features on both sides.

## Define Abilities

The class constructor accepts a **collection** or a **single** ability descriptor as argument.
An ability descriptor describes the permission owned and requires at least the `id` property.

- **Condition(s)**: One or many conditions can be specified using the MongoDB [query language](http://docs.mongodb.org/manual/reference/operator/query/)
- **Fields**: A string array can be provided to limit the permission on specific fields of the subject.

```typescript
import { AbilityDescriptor, AbilityManager } from '@authelion/common';

const items : AbilityDescriptor[] = [
    { id: 'data_add', condition: { size: { $lte: 5 } } },
    { id: 'data_edit', fields: ['value'] }
]

const abilityManager = new AbilityManager(items);
```

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

## Check 

To check if a permission is owned in general without any restrictions (conditions or fields), use the `has()` method of the class instance.

```typescript
import { AbilityDescriptor, AbilityManager } from '@authelion/common';

const items : AbilityDescriptor[] = [
    { id: 'data_add', condition: { size: { $lte: 5 } } },
    { id: 'data_edit', fields: ['value'] }
]

const abilityManager = new AbilityManager(items);

console.log(abilityManager.has('data_add'));
// true

console.log(abilityManager.has('data_drop'));
// false
```

## Verify

To verify a permission **with** condition and field restriction, use the `verify()` method of the class instance.

## Verify Conditions

Conditions will be evaluated, if an object (subject) is provided as **second** argument to the `verify()` method.

```typescript
import { AbilityDescriptor, AbilityManager } from '@authelion/common';

type Data = {
    value: string,
    size: number
}

const items : AbilityDescriptor[] = [
    { id: 'data_add', condition: { size: { $lte: 5 } } }
]

const abilityManager = new AbilityManager(items);

let exampleData : Data = {
    value: '0123456789',
    size: 10
}

console.log(abilityManager.verify('data_add', exampleData));
// false

exampleData = {
    value: '01234',
    size: 5
}

console.log(abilityManager.verify('data_add', exampleData));
// true
```

## Verify Fields

To verify if the permission applies on a specific field of an object (subject), provide the field name as **third** argument to the `verify()` method.

```typescript
import { AbilityDescriptor, AbilityManager } from '@authelion/common';

type Data = {
    value: string,
    size: number
}

const items : AbilityDescriptor[] = [
    { id: 'data_edit', fields: ['value'] }
]

const abilityManager = new AbilityManager(items);

let exampleData : Data = {
    value: '01234',
    size: 5
}

console.log(abilityManager.can('data_edit', exampleData, 'value'));
// true

console.log(abilityManager.can('data_edit', exampleData, 'size'));
// false


```
