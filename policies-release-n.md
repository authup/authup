# Policy Implementation — Release N (Current)

This document covers everything to implement for the current release.
Use alongside `.agents/*.md` (loaded via `CLAUDE.md`) for general patterns.

## Overview

Transition from implicit in-memory policy fallback to explicit database-backed system policies.
After this release, all permissions have an explicit `policy_id` (or `null` for unrestricted).

## Checklist

### 1. `SystemPolicyName` Constants — `packages/access`

Add to `packages/access/src/policy/built-in/constants.ts` (where `BuiltInPolicyType` lives):

```typescript
export const SystemPolicyName = {
    DEFAULT: 'system.default',
    IDENTITY: 'system.identity',
    PERMISSION_BINDING: 'system.permission-binding',
    REALM_MATCH: 'system.realm-match',
} as const;
```

Re-export via `packages/access/src/policy/index.ts`.

Build `packages/access` after this change.

### 2. Config Option — `apps/server-core`

Add `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT` across these files following existing patterns:

| File | What to add |
|------|-------------|
| `app/modules/config/constants.ts` | `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT` to `ConfigEnvironmentVariableName` enum |
| `app/modules/config/types.ts` | `permissionsDefaultPolicyAssignment: boolean` to `Config` type |
| `app/modules/config/parse.ts` | `permissionsDefaultPolicyAssignment: zod.boolean().optional()` to zod schema |
| `app/modules/config/normalize.ts` | `permissionsDefaultPolicyAssignment: true` as default |
| `app/modules/config/read/env.ts` | Read env with `readBool(ConfigEnvironmentVariableName.PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT)` |

Log a deprecation warning at startup when the option is active (including when defaulted to `true`).

### 3. Policy Provisioning Synchronizer — `apps/server-core`

Create a policy synchronizer in `core/provisioning/synchronizer/policy/`.

Uses `IPolicyRepository` (port interface from `core/entities/policy/types.ts`).

#### Sync logic

**Step 1 — Leaf policies:** For each of `system.identity`, `system.permission-binding`, `system.realm-match`:
- `findOneBy({ name, built_in: true })` (write-path, no EA loading)
- If not found → create with `built_in: true`, `realm_id: null`, correct `type`
- If found → verify type matches, update EA if changed
- For `system.realm-match`, set EA attributes:
  - `attributeName` → `['realm_id']`
  - `attributeNameStrict` → `false`
  - `identityMasterMatchAll` → `true`

**Step 2 — Composite policy:** For `system.default`:
- `findOneBy({ name: 'system.default', built_in: true })`
- If not found → create with `type: composite`, `decisionStrategy: UNANIMOUS`, `built_in: true`
- If found → teardown children from closure table, then rebuild
- Set leaf policies as children via `parent_id` + `saveWithEA()`

**Step 3 — Backfill:** Assign `system.default` to all permissions where:
- `policy_id IS NULL`
- `created_at <= system.default.created_at`

The backfill needs direct query builder or raw DataSource access. Implement as a separate step in `ProvisionerModule.start()` between policy sync and permission sync.

### 4. Wire into `ProvisionerModule`

In `app/modules/provisioning/module.ts`, add policy synchronizer **before** permission synchronizer.

Provisioning order becomes:
1. **System policies** (create/sync the policy tree + backfill)
2. Permissions
3. Roles, users, clients, etc. (unchanged)

### 5. Apply Config Option in Permission Creation

`ProvisionerModule` resolves the `system.default` policy once at startup and injects `defaultPolicyId` into both the controller and the provisioning synchronizer.

**a) Permission HTTP controller** (`adapters/http/controllers/entities/permission/module.ts`):

In the write method, when creating a new permission without `policy_id`:
- If `defaultPolicyId` is set → assign it before `validateJoinColumns`

**b) Permission provisioning synchronizer** (`core/provisioning/synchronizer/permission/module.ts`):

Same logic — if provisioning entity has no `policy_id` and `defaultPolicyId` is set, assign it during creation.

### 6. Remove In-Memory Fallback

In `apps/server-core/src/security/permission/provider/db.ts`:

- Remove `getDefaultPolicy()` method entirely
- Update `findOne()`:
  - If `entity.policy` exists → load policy tree (unchanged)
  - If `entity.policy` is null → return with `policy: undefined` (unrestricted)

### 7. Built-in Policy API Guards

Already implemented (checklist item `[x]`). Verify:
- Update of `built_in = true` policy → `400 Bad Request`
- Delete of `built_in = true` policy → `400 Bad Request`

### 8. Tests

| Area | What to test |
|------|-------------|
| Policy sync | Creates all leaf policies with correct type, `built_in: true`, `realm_id: null` |
| Policy sync | Creates `system.default` composite with correct children, `decisionStrategy: UNANIMOUS` |
| Policy sync | Idempotent — running twice produces same result, no duplicates |
| Policy sync | `system.realm-match` EA attributes correctly set |
| Backfill | Assigns `system.default` to permissions with `policy_id IS NULL` and `created_at <= cutoff` |
| Backfill | Does not touch permissions with `policy_id IS NULL` and `created_at > cutoff` |
| Backfill | Does not touch permissions that already have a `policy_id` |
| Built-in guards | Update/delete of built-in policy returns 400 |
| Built-in guards | Update/delete of non-built-in policy works |
| Evaluation | `findOne()` returns `policy: undefined` when `policy_id` is null |
| Evaluation | `PermissionChecker.check()` allows access when no policy (unrestricted) |
| Evaluation | `PermissionChecker.check()` evaluates policy when present |
| Config | `true` → assigns `system.default` to new permissions without `policy_id` |
| Config | `false` → leaves `policy_id = null` |
| Config | Deprecation warning logged at startup |

## System Policy Tree Reference

```text
system.default (CompositePolicy, UNANIMOUS, built_in: true)
├ system.identity (IdentityPolicy, built_in: true)
├ system.permission-binding (PermissionBindingPolicy, built_in: true)
└ system.realm-match (RealmMatchPolicy, built_in: true)
    EA: attributeName = ['realm_id']
    EA: attributeNameStrict = false
    EA: identityMasterMatchAll = true
```

## Key Interfaces

```typescript
// IPolicyRepository (core/entities/policy/types.ts)
interface IPolicyRepository extends IEntityRepository<Policy> {
    checkUniqueness(data, existing?): Promise<void>;
    saveWithEA(entity, data?): Promise<Policy>;
    deleteFromTree(entity): Promise<void>;
}
```

## Migration Safety

The `system.default` policy's `created_at` timestamp is the natural migration cutoff:
- **First startup after upgrade**: all pre-existing permissions with `policy_id IS NULL` are backfilled
- **Subsequent startups**: new permissions created after upgrade with `policy_id = null` are intentional (allow-by-default model)

No hardcoded dates or migration flags needed.
