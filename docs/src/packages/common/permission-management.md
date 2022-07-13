# Permission Management

To manage permissions, this package is shipped with a management system for permissions.

The `AbilityManager` class provides an easy way to group permissions for a client (user/robot) session.
The permissions to initialize the class can simply be shared between frontend and backend services.

It easily scales between a **claim based** and **subject/attribute based** authorization.

## Configuration

The constructor accepts a **collection** as well a **single** configuration object as argument.

```typescript
import { AbilityItemConfig, AbilityManager } from '@authelion/common';

const items : AbilityItemConfig[] = [
    { id: 'data_add' },
    { id: 'data_edit' }
]

const abilityManager = new AbilityManager(items);
```

## Check & Verify

To check if an action can be performed for a subject, use the `can()` method of the `AbilityManager` instance.

```typescript
import { AbilityItemConfig, AbilityManager } from '@authelion/common';

const items : AbilityItemConfig[] = [
    { id: 'data_add' },
    { id: 'data_edit' }
]

const abilityManager = new AbilityManager(items);

console.log(abilityManager.can('add', 'data'));
// true

console.log(abilityManager.can('drop', 'data'));
// false
```

## Conditional Permissions

## Restricting fields access
