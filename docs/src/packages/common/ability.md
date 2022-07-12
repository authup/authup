# Ability

The Ability management system, provides an easy way to check and set permissions for user/robot sessions.
It can be used on frontend- & backend-applications.

It easily scales between a claim based and subject/attribute based authorization.

## AbilityConfig

The AbilityManager is populated by AbilityConfig items.
Each item has at minimum an `id` parameter, which uniquely identifies a permission.

```typescript
import { AbilityConfig } from '@authelion/common';

const item : AbilityConfig = {
    id: 'user_add'
};
```

To get an insight of a full list of options, which can be passed as property, check out the [API Reference]().


## AbilityManager

```typescript
import {
    AbilityManager,
    buildAbilityMetaFromName,
    AbilityConfig
} from "@authelion/common";

type User = {
    id: number;
    name: string;
    age: number;
}

const config: AbilityConfig<User>[] = [
    {
        id: 'user_add', 
        condition: {
            age: {$gt: 20}
        }
    },
    {
        id: 'user_drop'
    }
];

const manager = new AbilityManager(config);

console.log(manager.can('add', 'user', {age: 40}));
// true

console.log(manager.can('add', 'user', {age: 18}))
// false

console.log(manager.can('drop','user'));
// true
```
