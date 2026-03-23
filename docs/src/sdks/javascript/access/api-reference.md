# System

## `PermissionEvaluationContext`

**Type**
```typescript
import { PermissionEvaluationOptions, PolicyData } from '@authup/access';

export type PermissionEvaluationContext = {
    name: string | string[],
    input?: PolicyData,
    options?: PermissionEvaluationOptions
};
```

**References**
- [PolicyData](#policydata)
- [PermissionEvaluationOptions](#permissionevaluationoptions)

## `PermissionEvaluationOptions`

**Type**
```typescript
export type PermissionEvaluationOptions = {
    decisionStrategy?: 'affirmative' | 'unanimous' | 'consensus',
    policiesIncluded?: string[],
    policiesExcluded?: string[],
};
```

## `PermissionBinding`

**Type**
```typescript
import type { PolicyWithType } from '@authup/access';

export type PermissionBinding = {
    permission: {
        name: string,
        client_id?: string | null,
        realm_id?: string | null,
        decision_strategy?: string | null,
    },
    policies?: PolicyWithType[],
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
| `permissionBinding` | [PermissionBinding](#permissionbinding)               | PermissionBinding  |

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
