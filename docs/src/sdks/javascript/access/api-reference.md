# System

## `PermissionCheckerCheckContext`

**Type**
```typescript
import { PermissionCheckerCheckOptions, PolicyData } from '@authup/access';

export type PermissionCheckerCheckContext = {
    name: string | string[],
    input?: PolicyData,
    options?: PermissionCheckerCheckOptions
};
```

**References**
- [PolicyData](#policydata)
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
import type { PolicyWithType } from '@authup/access';

export type PermissionItem = {
    name: string,
    clientId?: string | null,
    realmId?: string | null,
    policy?: PolicyWithType,
};
```

## `PolicyData`

**Type**
```typescript
export interface IPolicyData {
    set(key: string, value: unknown) : void;
    has(key: string): boolean;
    get<T = unknown>(key: string) : T;

    isValidated(key: string): boolean;
    setValidated(key: string) : void;

    clone() : IPolicyData
}
```

The `PolicyData` class is a key-value store used to pass contextual data to policy evaluators.
Each built-in policy type uses a specific key to look up its data:

| Key                 | Expected Value                                        | Used By            |
|---------------------|-------------------------------------------------------|--------------------|
| `attributes`        | `Record<string, any>`                                 | Attributes         |
| `date`              | `Date \| string \| number`                            | Date               |
| `time`              | `Date \| string \| number`                            | Time               |
| `identity`          | [IdentityPolicyData](#identitypolicydata)             | Identity           |
| `realmMatch`        | `Record<string, any>`                                 | RealmMatch         |
| `permissionBinding` | [PermissionItem](#permissionitem)                     | PermissionBinding  |

## `IdentityPolicyData`

**Type**
```typescript
export type IdentityPolicyData = {
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
