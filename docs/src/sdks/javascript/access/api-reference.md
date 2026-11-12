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
    transitions?: PolicyTransitionSink,
};
```

`transitions` receives, from every `date` or `time` policy that evaluated against the
real clock, the next instant its verdict could change. `createPolicyTransitionCollector()`
returns a sink keeping the earliest one under `next`, which is when a cached answer
built from those evaluations stops being current.

`pendingPolicies` controls how a grant whose policy evaluation is **pending** (a required
data key is absent from the bag; see
[Pending & data availability](./policies.md#pending--data-availability)) is treated:

- `'deny'` (default): pending counts as failure; the semantics of a full `evaluate()`.
- `'permit'`: pending counts as pass; this is what `preEvaluate()` passes internally,
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

`isPermissionPolicyBinding(value)` narrows an unknown value (a stored or received
binding) to this type. It checks the shape only: `permission.name` a non-empty string,
`realmId` / `clientId` absent, `null` or a string, `decisionStrategy` and `realmScope`
absent or a known value, `policies` absent or a list of objects carrying a string `type`.
A policy's configuration is its validator's to check.

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
