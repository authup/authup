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

System policy definitions in `app/modules/provisioning/system-policies.ts` — `buildSystemPolicyProvisioningEntities()`.

### 4. Wired into `ProvisionerModule` ✅

`app/modules/provisioning/module.ts` runs in phases:

1. **Phase 1** — Policy sync (`PolicyProvisioningSynchronizer`)
2. **Phase 1b** — Backfill: `UPDATE permissions SET policy_id = :defaultId WHERE policy_id IS NULL AND created_at <= :cutoff`
3. **Phase 1c** — Resolve `defaultPolicyId` from config + DB lookup; log deprecation warning
4. **Phase 2** — Permissions, roles, realms, etc. (unchanged, receives `defaultPolicyId`)

`permissionRepository` is created in Phase 1 and reused in Phase 2.

### 5. Default Policy Assignment in Permission Creation ✅

`ProvisionerModule` resolves `system.default` once at startup, injects `defaultPolicyId` into:

**a) Permission HTTP controller** (`adapters/http/controllers/entities/permission/module.ts`):
- Assigns `defaultPolicyId` before `validateJoinColumns` (create path only)

**b) Permission provisioning synchronizer** (`core/provisioning/synchronizer/permission/module.ts`):
- Assigns `defaultPolicyId` during creation if no `policy_id` provided

### 6. In-Memory Fallback Removed ✅

`apps/server-core/src/security/permission/provider/db.ts`:
- `getDefaultPolicy()` removed entirely
- `findOne()`: loads policy tree from DB via `findDescendantsTree`, returns `policy: undefined` when no policy assigned

### 7. Built-in Policy API Guards ✅

Already implemented in `adapters/http/controllers/entities/policy/module.ts`:
- Update of `built_in = true` policy → `400 Bad Request`
- Delete of `built_in = true` policy → `400 Bad Request`

### 8. Tests ❌ TODO

No dedicated policy provisioning tests exist yet. The existing provisioning test (`test/unit/modules/provisioning.spec.ts`) covers overall provisioning but not policy-specific scenarios.

| Area | What to test | Status |
|------|-------------|--------|
| Policy sync | Creates all leaf policies with correct type, `built_in: true`, `realm_id: null` | ❌ |
| Policy sync | Creates `system.default` composite with correct children, `decisionStrategy: UNANIMOUS` | ❌ |
| Policy sync | Idempotent — running twice produces same result, no duplicates | ❌ |
| Policy sync | `system.realm-match` EA attributes correctly set | ❌ |
| Policy sync | Stale child without permission references is deleted | ❌ |
| Policy sync | Stale child with permission references is detached (`parent_id = null`, `built_in = false`) | ❌ |
| Backfill | Assigns `system.default` to permissions with `policy_id IS NULL` and `created_at <= cutoff` | ❌ |
| Backfill | Does not touch permissions with `policy_id IS NULL` and `created_at > cutoff` | ❌ |
| Backfill | Does not touch permissions that already have a `policy_id` | ❌ |
| Built-in guards | Update/delete of built-in policy returns 400 | ✅ (in `policy/module.spec.ts`) |
| Built-in guards | Update/delete of non-built-in policy works | ✅ (in `policy/module.spec.ts`) |
| Evaluation | `findOne()` returns `policy: undefined` when `policy_id` is null | ❌ |
| Evaluation | `PermissionChecker.check()` allows access when no policy (unrestricted) | ❌ |
| Evaluation | `PermissionChecker.check()` evaluates policy when present | ❌ |
| Config | `true` → assigns `system.default` to new permissions without `policy_id` | ❌ |
| Config | `false` → leaves `policy_id = null` | ❌ |
| Config | Deprecation warning logged at startup | ❌ |

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

### Files changed

| File | Change |
|------|--------|
| `packages/access/src/policy/built-in/constants.ts` | `SystemPolicyName` constants |
| `apps/server-core/src/app/modules/config/*` | Config option across 5 files |
| `apps/server-core/src/core/provisioning/entities/policy/` | `PolicyProvisioningEntity` type (new) |
| `apps/server-core/src/core/provisioning/synchronizer/policy/` | `PolicyProvisioningSynchronizer` (new) |
| `apps/server-core/src/core/provisioning/synchronizer/permission/` | `defaultPolicyId` support |
| `apps/server-core/src/app/modules/provisioning/system-policies.ts` | System policy definitions (new) |
| `apps/server-core/src/app/modules/provisioning/module.ts` | Phase 1/1b/1c wiring |
| `apps/server-core/src/adapters/http/controllers/entities/permission/module.ts` | `defaultPolicyId` in controller |
| `apps/server-core/src/app/modules/http/modules/controller.ts` | Wiring `defaultPolicyId` to controller |
| `apps/server-core/src/security/permission/provider/db.ts` | Removed `getDefaultPolicy()` fallback |

## Migration Safety

The `system.default` policy's `created_at` timestamp is the natural migration cutoff:
- **First startup after upgrade**: all pre-existing permissions with `policy_id IS NULL` are backfilled
- **Subsequent startups**: new permissions created after upgrade with `policy_id = null` are intentional (allow-by-default model)

No hardcoded dates or migration flags needed.
