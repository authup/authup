# System

## `PermissionCheckerCheckContext`

**Type**
```typescript
import { PermissionCheckerCheckOptions } from '@authup/access';

export type PermissionCheckerCheckContext = {
    name: string | string[],
    input?: PolicyInput,
    options?: PermissionCheckerCheckOptions
};
```

**References**
- [PolicyInput](#policyinput)
- [PermissionCheckerCheckOptions](#permissioncheckercheckoptions)

## `PermissionCheckerCheckOptions`

**Type**
```typescript
export type PermissionCheckerCheckOptions = {
    decisionStrategy?: 'affirmative' | 'unanimous' | 'consensus',
    policiesIncluded?: string[],
    policiesExcluded?: string[],
};
```

## `PermissionItem`

**Type**
```typescript
export type PermissionItem = {
    name: string,
    clientId?: string | null,
    realmId?: string | null,
    policy?: Record<string, any>,
};
```

## `PolicyInput`

**Type**
```typescript
import { PermissionItem, PolicyIdentity } from '@authup/access';

export type PolicyInput = {
    /**
     * Permission for which the policy is evaluated.
     */
    permission?: PermissionItem,

    /**
     * Identity of the executing party.
     */
    identity?: PolicyIdentity,

    /**
     * Attributes
     */
    attributes?: Record<string, any>,

    /**
     * The dateTime to use for time & date policy.
     */
    dateTime?: Date | number | string,

    /**
     * Extra Data
     */
    [key: string]: any
};
```

**References**
- [PolicyIdentity](#policyidentity)
- [PermissionItem](#permissionitem)

## `PolicyIdentity`

**Type**
```typescript
export type PolicyIdentity = {
    /**
     * user, client, robot
     */
    type: string,
    /**
     * UUID
     */
    id: string,
    /**
     * Client associated with identity.
     */
    clientId?: string | null,
    /**
     * Realm id associated with identity.
     */
    realmId?: string | null,
    /**
     * Realm name associated with identity.
     */
    realmName?: string | null
};
```
