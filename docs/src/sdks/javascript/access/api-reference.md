# System

## `PermissionEvaluationContext`

**Type**
```typescript
import { PermissionEvaluationOptions, PolicyData } from '@authup/access';

export type PermissionEvaluationContext = {
    name: string | string[],
    realmId?: string | null,
    clientId?: string | null,
    data?: PolicyData,
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
    pendingPolicies?: 'deny' | 'permit',
};
```

`pendingPolicies` controls how a grant whose policy evaluation is **pending** (a required
data key is absent from the bag — see
[Pending & data availability](./policies.md#pending--data-availability)) is treated:

- `'deny'` (default) — pending counts as failure; the semantics of a full `evaluate()`.
- `'permit'` — pending counts as pass; this is what `preEvaluate()` passes internally,
  so the pre-flight gate only denies on policies that settle false with the data
  available at that point.

## `PermissionPolicyBinding`

**Type**
```typescript
import type { BasePolicy } from '@authup/access';

export type PermissionPolicyBinding = {
    permission: {
        name: string,
        clientId?: string | null,
        realmId?: string | null,
        decisionStrategy?: string | null,
    },
    policies?: BasePolicy[],
    /**
     * Relative realm reach of this grant (none/own/ownOrNull/any).
     * Absent coerces to the most restrictive `own` (fail-closed).
     */
    realmScope?: 'none' | 'own' | 'ownOrNull' | 'any',
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
| `permissionBinding` | [PermissionPolicyBinding](#permissionpolicybinding)   | PermissionBinding  |

## `IdentityPolicyData`

**Type**
```typescript
export type IdentityPolicyData = {
    /**
     * user, client
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
