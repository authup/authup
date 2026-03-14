# Policy Implementation — Release N (Current)

This document covers the current release policy implementation.
Use alongside `.agents/*.md` (loaded via `CLAUDE.md`) for general patterns.

## Overview

Transition from implicit in-memory policy fallback to explicit database-backed system policies.
After this release, all permissions have an explicit `policy_id` (or `null` for unrestricted).

## Implementation Status

### 1. `SystemPolicyName` Constants — `packages/access` ✅

Added to `packages/access/src/policy/built-in/constants.ts`:

```typescript
export const SystemPolicyName = {
    DEFAULT: 'system.default',
    IDENTITY: 'system.identity',
    PERMISSION_BINDING: 'system.permission-binding',
    REALM_MATCH: 'system.realm-match',
} as const;
```

Re-exported via `packages/access/src/policy/index.ts`.

**Reminder:** Rebuild `packages/access` after any change to this package.

### 2. Config Option — `apps/server-core` ✅

`PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT` added across all config files:

| File | Status |
|------|--------|
| `app/modules/config/constants.ts` | ✅ Enum entry |
| `app/modules/config/types.ts` | ✅ `permissionsDefaultPolicyAssignment: boolean` |
| `app/modules/config/parse.ts` | ✅ Zod schema entry |
| `app/modules/config/normalize.ts` | ✅ Default: `true` |
| `app/modules/config/read/env.ts` | ✅ Env reading |

Deprecation warning logged at startup when active.

### 3. Policy Provisioning Synchronizer — `apps/server-core` ✅

`core/provisioning/synchronizer/policy/module.ts` — `PolicyProvisioningSynchronizer`

Uses `IPolicyRepository` + `IPermissionRepository` (port interfaces).

#### Implemented sync logic

- Root-first approach: `system.default` (composite) declared with children inline
- `synchronize()`: find-by-name → create or merge+update (including `parent_id`/`parent` for reattachment)
- `synchronizeChildren()`: syncs declared children, then runs `cleanupStaleChildren()`
- **Stale child cleanup**: children in DB but not in declaration are:
  - **Deleted** if no permission references them (`deleteFromTree`)
  - **Detached** if referenced by permissions (`parent_id = null`, `built_in = false` → becomes standalone user-owned policy)

System policy definitions are inlined in `DefaultProvisioningSource` (`app/modules/provisioning/sources/default/module.ts`), returned as `policies` in the `RootProvisioningEntity`.

### 4. Wired into `ProvisionerModule` ✅

`app/modules/provisioning/module.ts`:

1. **Resolve `defaultPolicyId`** — If `permissionsDefaultPolicyAssignment` is enabled, looks up `system.default` from DB (exists from previous runs; `undefined` on first startup). Logs deprecation warning.
2. **Root sync** — Delegates to `GraphProvisioningSynchronizer.synchronize(data)` which processes: policies → permissions → roles → scopes → realms.
3. **Backfill** — If config enabled: `UPDATE permissions SET policy_id = :defaultId WHERE policy_id IS NULL` (covers first-startup and pre-existing permissions).

`permissionRepository` is created once and shared across synchronizers.

### 5. Default Policy Assignment in Permission Creation ✅

`ProvisionerModule` resolves `system.default` once at startup, injects `defaultPolicyId` into:

**a) Permission HTTP controller** (`adapters/http/controllers/entities/permission/module.ts`):
- Assigns `defaultPolicyId` before `validateJoinColumns` (create path only)
- Uses `typeof data.policy_id === 'undefined'` to distinguish omitted vs explicit `null`

**b) Permission provisioning synchronizer** (`core/provisioning/synchronizer/permission/module.ts`):
- Assigns `defaultPolicyId` during creation only when `policy_id` is `undefined` (not `null`)

### 6. In-Memory Fallback Removed ✅

`apps/server-core/src/security/permission/provider/db.ts`:
- `getDefaultPolicy()` removed entirely
- `findOne()`: loads policy tree from DB via `findDescendantsTree`, returns `policy: undefined` when no policy assigned

### 7. Built-in Policy API Guards ✅

Already implemented in `adapters/http/controllers/entities/policy/module.ts`:
- Update of `built_in = true` policy → `400 Bad Request`
- Delete of `built_in = true` policy → `400 Bad Request`

### 8. Tests ✅

Policy provisioning tests in `test/unit/modules/policy-provisioning.spec.ts` (11 tests):

| Area | What to test | Status |
|------|-------------|--------|
| Policy sync | Creates all leaf policies with correct type, `built_in: true`, `realm_id: null` | ✅ |
| Policy sync | Creates `system.default` composite with correct children, `decisionStrategy: UNANIMOUS` | ✅ |
| Policy sync | Idempotent — running twice produces same result, no duplicates | ✅ |
| Policy sync | `system.realm-match` EA attributes correctly set | ✅ |
| Policy sync | Stale child without permission references is deleted | ✅ |
| Policy sync | Stale child with permission references is detached (`parent_id = null`, `built_in = false`) | ✅ |
| Backfill | Assigns `system.default` to permissions with `policy_id IS NULL` (config-gated) | ✅ |
| Backfill | Does not touch permissions that already have a `policy_id` | ✅ |
| Built-in guards | Update/delete of built-in policy returns 400 | ✅ (in `policy/module.spec.ts`) |
| Built-in guards | Update/delete of non-built-in policy works | ✅ (in `policy/module.spec.ts`) |
| Config | `defaultPolicyId` set → assigns `system.default` to new permissions | ✅ |
| Config | `defaultPolicyId` not set → leaves `policy_id = null` | ✅ |
| Config | Explicit `policy_id: null` not overridden by `defaultPolicyId` | ✅ |

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

## Key Implementation Details

### Closure table requirement

TypeORM's closure table (`auth_policy_tree`) requires the `parent` relation (not just `parent_id`) to be set on child entities before `save()`. Without it, `findDescendantsTree()` returns `children: []`.

### PolicyProvisioningEntity

The `PolicyProvisioningEntity` type uses `extraAttributes` (not `ea`) for extra attributes passed to `saveWithEA()`.

### Files changed

| File | Change |
|------|--------|
| `packages/access/src/policy/built-in/constants.ts` | `SystemPolicyName` constants |
| `apps/server-core/src/app/modules/config/*` | Config option across 5 files |
| `apps/server-core/src/core/provisioning/entities/policy/` | `PolicyProvisioningEntity` type (new) |
| `apps/server-core/src/core/provisioning/entities/root/types.ts` | Added `policies` field to `RootProvisioningEntity` |
| `apps/server-core/src/core/provisioning/synchronizer/policy/` | `PolicyProvisioningSynchronizer` (new) |
| `apps/server-core/src/core/provisioning/synchronizer/permission/` | `defaultPolicyId` support |
| `apps/server-core/src/app/modules/provisioning/sources/default/module.ts` | System policy definitions inlined |
| `apps/server-core/src/app/modules/provisioning/sources/composite/module.ts` | Added `policies` merging |
| `apps/server-core/src/core/provisioning/synchronizer/root/` | Added `policySynchronizer` to `GraphProvisioningSynchronizer` |
| `apps/server-core/src/app/modules/provisioning/module.ts` | Wiring: defaultPolicyId resolution, root sync, backfill |
| `apps/server-core/src/adapters/http/controllers/entities/permission/module.ts` | `defaultPolicyId` in controller |
| `apps/server-core/src/app/modules/http/modules/controller.ts` | Wiring `defaultPolicyId` to controller |
| `apps/server-core/src/security/permission/provider/db.ts` | Removed `getDefaultPolicy()` fallback |
| `apps/server-core/test/unit/modules/policy-provisioning.spec.ts` | Policy provisioning tests (new) |

## Migration Safety

Backfill is config-gated by `permissionsDefaultPolicyAssignment` (default: `true`, deprecated):
- **When enabled**: all permissions with `policy_id IS NULL` get assigned `system.default` after each sync
- **When disabled**: permissions without `policy_id` are intentional (allow-by-default model)
- **Migration path**: set `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT=false` to opt into allow-by-default
