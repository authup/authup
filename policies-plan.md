# Policy Architecture

## Security Model

Authup implements an allow-by-default authorization model.

- A Permission represents the ability to perform an action.
- Permissions are not restricted by default.
- Policies restrict permissions.
- If no policy is assigned to a permission, the permission is publicly executable.

This applies to:

- authenticated users
- anonymous users
- machine clients

Access restrictions must always be expressed through explicit policies.

## Core Concepts

### Permission

A Permission defines the capability to perform an action within the system.

Examples: `user_read`, `user_update`, `role_delete`, `client_manage`

Permissions are capabilities only. They do not contain access rules.
Restrictions are applied via policies.

A permission may be:

- unrestricted (`policy_id = null` → globally executable)
- restricted via a policy (`policy_id` references a policy)

### Policy

A Policy defines conditions that must be satisfied in order to execute a permission.

Policies are serializable objects stored in the database and evaluated by the Policy Engine.

A policy may inspect:

- user identity
- permission bindings
- realm relationships
- request context
- time constraints
- other attributes

### Policy Evaluators

Each policy type has a dedicated evaluator implemented in `packages/access`.

Existing evaluators (in `packages/access/src/policy/built-in/`):

- `CompositePolicyEvaluator` — bundles child policies with a decision strategy
- `IdentityPolicyEvaluator` — filters by identity type/id
- `RealmMatchPolicyEvaluator` — checks realm matching
- `PermissionBindingPolicyEvaluator` — checks permission ownership binding
- `AttributesPolicyEvaluator` — pattern matching on attributes
- `AttributeNamesPolicyEvaluator` — validates attribute names exist
- `DatePolicyEvaluator` — date range validation
- `TimePolicyEvaluator` — time/day of week validation

Evaluators are registered in `PolicyDefaultEvaluators` (`packages/access/src/policy/constants.ts`).

#### Composite Policies

Policies may be combined using composite policies with decision strategies:

- `UNANIMOUS` — all children must pass
- `AFFIRMATIVE` — at least one child must pass

Example tree:

```
CompositePolicy (UNANIMOUS)
├ IdentityPolicy
├ PermissionBindingPolicy
└ RealmMatchPolicy
```

Composite policies form policy trees, stored via TypeORM's closure-table strategy (`auth_policy_tree`).

## Package Responsibilities

### `packages/access`

Owns the policy framework:

- Policy types and interfaces (`PolicyWithType`, `PolicyBase`, `BuiltInPolicyType`)
- Policy evaluators (one per `BuiltInPolicyType`)
- Policy engine (`PolicyEngine`)
- `PermissionChecker` — orchestrates permission lookup + policy evaluation
- `IPermissionRepository` — port interface for permission lookup
- `PermissionItem` type (includes optional `policy?: PolicyWithType`)
- System policy name constants (new, see below)

### `apps/server-core`

Owns the infrastructure:

- Policy database entity (`PolicyEntity` with `built_in` flag, EA support, tree structure)
- `PolicyRepository` / `PolicyRepositoryAdapter` — database adapter
- `PermissionDatabaseRepository` — implements `IPermissionRepository` from `packages/access`
- Policy synchronization logic (new, in provisioning module)
- HTTP controllers for policy CRUD

## Built-in System Policies

System policies are code-owned policies that define default security restrictions.

Characteristics:

- created and maintained by the system
- `built_in = true` (column already exists on `PolicyEntity`)
- `realm_id = null` (global, not tied to any realm)
- cannot be modified or deleted via the public API
- synchronized to the database on startup

### System Policy Definitions

Define system policy names as constants in `packages/access`:

```typescript
export const SystemPolicyName = {
    DEFAULT: 'system.default',
    IDENTITY: 'system.identity',
    PERMISSION_BINDING: 'system.permission-binding',
    REALM_MATCH: 'system.realm-match',
} as const;
```

The full tree definition (structure + configuration) lives in `apps/server-core` in the provisioning module, since it involves database-specific concerns (EA, tree sync).

### Default Composite Policy

The `system.default` policy replaces the current in-memory fallback in `PermissionDatabaseRepository.getDefaultPolicy()`.

Structure:

```
system.default (CompositePolicy, UNANIMOUS)
├ system.identity (IdentityPolicy)
├ system.permission-binding (PermissionBindingPolicy)
└ system.realm-match (RealmMatchPolicy)
    attributeName: ['realm_id']
    attributeNameStrict: false
    identityMasterMatchAll: true
```

### Per-Permission Custom Policies

Permissions may reference:

- `system.default` — the standard restriction (most permissions)
- A custom policy — for permissions needing different restrictions
- `null` — unrestricted (publicly executable)

The system only manages built-in policies. Users can create and assign custom policies via the API.

### Built-in Policy API Constraints

Policies with `built_in = true`:

- Cannot be updated via HTTP API
- Cannot be deleted via HTTP API
- Can only be modified by the startup synchronization process

The policy controller must enforce this by checking `built_in` before update/delete operations.

## Migration Strategy

The transition from implicit defaults to explicit policy assignment must avoid a security gap.

### Current Behavior

`PermissionDatabaseRepository.findOne()` (line 72-74 in `db.ts`):
- If `entity.policy` exists → load policy tree from database
- If `entity.policy` is null → return hardcoded `getDefaultPolicy()` (Identity + PermissionBinding + RealmMatch)

This means all permissions currently behave as restricted even though `policy_id = null` in the database.

### Migration Steps

**Step 1: Create system policies in database**

Add a policy provisioning synchronizer that runs during startup provisioning, *before* permission synchronization.

1. Create `system.identity` policy (type: `identity`, `built_in: true`)
2. Create `system.permission-binding` policy (type: `permissionBinding`, `built_in: true`)
3. Create `system.realm-match` policy (type: `realmMatch`, `built_in: true`, with EA attributes)
4. Create `system.default` composite policy (type: `composite`, `built_in: true`, `decisionStrategy: UNANIMOUS`)
5. Set composite children via closure table

**Step 2: Backfill existing permissions**

On startup, assign `system.default` to all permissions where:
- `policy_id IS NULL`
- `created_at <= system.default.created_at`

The `system.default` policy's own `created_at` timestamp acts as the natural migration cutoff:

- **First startup after upgrade**: `system.default` is created (`created_at = now`). All pre-existing permissions with `policy_id IS NULL` have `created_at <= now` and are backfilled.
- **Subsequent startups**: `system.default` already exists with a past `created_at`. Permissions created after that with `policy_id = null` are not touched — they were intentionally created under the new allow-by-default model.

No hardcoded date or migration flag needed. The cutoff is self-calibrating.

**Step 3: Remove the in-memory fallback**

Remove `getDefaultPolicy()` from `PermissionDatabaseRepository`.

The `findOne()` method becomes:
- If `entity.policy` exists → load policy tree → return with policy
- If `entity.policy` is null → return without policy (unrestricted)

### Default Policy on Permission Creation (Transitional)

When a new permission is created via the API without `policy_id` in the payload, the behavior is controlled by a configuration option:

- Config key: `permissions.defaultPolicyAssignment`
- Env variable: `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT`
- Type: `boolean`, default: `true`
- Location: `app/modules/config/`

Behavior:

- `true` → automatically assign `system.default` to the permission
- `false` → leave `policy_id = null` (permission is unrestricted)

This applies to both API-created and provisioned permissions. Built-in permissions already have `policy_id` set via the backfill, so the config only affects user-defined permissions created without an explicit `policy_id`.

The permission synchronizer resolves the default policy by looking it up by name (`SystemPolicyName.DEFAULT`) rather than receiving an ID — no data flow between synchronizers needed.

This is a **transitional option** with a two-release lifecycle:

- **Release N** (next release): Option is introduced, defaults to `true`. Preserves backwards-compatible behavior. Operators can opt into the pure allow-by-default model by setting it to `false`. A deprecation warning is logged at startup when the option is active (including when defaulted).
- **Release N+1**: Option is removed. Permissions created without `policy_id` are always unrestricted. Explicit policy assignment is enforced by the model.

### Ordering

Provisioning must run in this order:

1. System policies (create/sync the policy tree)
2. Permissions (backfill + sync)
3. Roles, users, clients, etc. (unchanged)

## Policy Synchronization

### Startup Sync Workflow

Runs during provisioning, before permission sync.

**Step 1:** Load system policy definitions from code.

**Step 2:** For each leaf policy (identity, permission-binding, realm-match):
- Find by name where `built_in = true`
- If not found → create with EA attributes
- If found → verify type matches, update EA attributes if changed

**Step 3:** For the composite policy (system.default):
- Find by name where `built_in = true`
- If not found → create, then set children via closure table
- If found → rebuild children (teardown + rebuild is simpler than diffing closure tables + EA)

### Sync Strategy: Teardown + Rebuild for Composites

Diffing a closure table + EA tree is complex and error-prone. For built-in composite policies:

1. Delete existing child references from closure table
2. Ensure all leaf policies exist (created in Step 2)
3. Re-insert child references into closure table

This is safe because:
- Built-in policies are code-owned, so the code is the source of truth
- Leaf policies keep their IDs (found by name), so foreign key references remain valid
- Only the tree structure is rebuilt, not the leaf policy data

## Permission Evaluation Workflow

After migration, the `PermissionChecker` (in `packages/access`) follows this flow:

1. Resolve requested permission via `IPermissionRepository.findOne()`
2. If permission not found → `NOT_FOUND`
3. If `permission.policy` is undefined → `ALLOW` (unrestricted)
4. If `permission.policy` exists → `policyEngine.evaluate(policy, context)`
5. Result: `true` → `ALLOW`, `false` → `FORBIDDEN`

This is already how `PermissionChecker.check()` works (see `packages/access/src/permission/checker/module.ts` lines 135-143) — no changes needed in the checker.

## Testing

### Policy Synchronization

- Policy sync creates all leaf policies (`system.identity`, `system.permission-binding`, `system.realm-match`) with correct type, `built_in = true`, `realm_id = null`
- Policy sync creates `system.default` composite with correct children and `decisionStrategy: UNANIMOUS`
- Policy sync is idempotent (running twice produces the same result, no duplicate policies)
- `system.realm-match` EA attributes are correctly set (`attributeName`, `attributeNameStrict`, `identityMasterMatchAll`)

### Backfill

- Backfill assigns `system.default` to permissions with `policy_id IS NULL` and `created_at <= system.default.created_at`
- Backfill does not touch permissions with `policy_id IS NULL` and `created_at > system.default.created_at`
- Backfill does not touch permissions that already have a `policy_id`

### Built-in Policy Guards

- Update of a built-in policy via API returns `400 Bad Request`
- Delete of a built-in policy via API returns `400 Bad Request`
- Update/delete of non-built-in policies still works

### Permission Evaluation

- `PermissionDatabaseRepository.findOne()` returns `policy: undefined` when `policy_id` is null
- `PermissionChecker.check()` allows access when permission has no policy (unrestricted)
- `PermissionChecker.check()` evaluates policy when permission has one

### Config Option

- `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT=true` assigns `system.default` to new permissions without `policy_id`
- `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT=false` leaves `policy_id = null`
- Deprecation warning is logged at startup when the option is active

## Implementation Details

Note: General patterns for repositories, controllers, EA, and wiring are documented in `.agents/*.md` (loaded via `CLAUDE.md`). This section covers only feature-specific details.

### 1. `SystemPolicyName` Constants

Add to `packages/access/src/policy/built-in/constants.ts` (where `BuiltInPolicyType` lives) and re-export via `packages/access/src/policy/index.ts`:

```typescript
export const SystemPolicyName = {
    DEFAULT: 'system.default',
    IDENTITY: 'system.identity',
    PERMISSION_BINDING: 'system.permission-binding',
    REALM_MATCH: 'system.realm-match',
} as const;
```

Build `packages/access` after this change since `apps/server-core` depends on it.

### 2. Config Option

Add `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT` following the existing pattern across 4 files:

**`app/modules/config/constants.ts`** — add to `ConfigEnvironmentVariableName` enum:
```typescript
PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT = 'PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT',
```

**`app/modules/config/types.ts`** — add to `Config` type:
```typescript
/**
 * Auto-assign system.default policy to new permissions without policy_id.
 * Transitional option — will be removed in next major release.
 * default: true
 */
permissionsDefaultPolicyAssignment: boolean,
```

**`app/modules/config/parse.ts`** — add to zod schema:
```typescript
permissionsDefaultPolicyAssignment: zod.boolean().optional(),
```

**`app/modules/config/normalize.ts`** — add default in the return object:
```typescript
permissionsDefaultPolicyAssignment: true,
```

**`app/modules/config/read/env.ts`** — add env reading:
```typescript
const permissionsDefaultPolicyAssignment = readBool(ConfigEnvironmentVariableName.PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT);
if (typeof permissionsDefaultPolicyAssignment !== 'undefined') {
    options.permissionsDefaultPolicyAssignment = permissionsDefaultPolicyAssignment;
}
```

### 3. Policy Synchronizer

The new policy synchronizer uses `IPolicyRepository` (port interface). Key methods needed:

- `findOneByName(name)` — find existing policy by name (returns with EA loaded)
- `findOneBy({ name, built_in: true })` — find without EA (for write path)
- `create(data)` → `save(entity)` — create new policy
- `saveWithEA(entity, eaData)` — save with extra attributes + update closure table

The `IPolicyRepository` port (in `core/entities/policy/types.ts`) exposes:
```typescript
interface IPolicyRepository extends IEntityRepository<Policy> {
    checkUniqueness(data, existing?): Promise<void>;
    saveWithEA(entity, data?): Promise<Policy>;
    deleteFromTree(entity): Promise<void>;
}
```

`saveWithEA()` internally calls `saveOneWithEA()` (persists EA key-value pairs to `auth_policy_attributes`) and `updateClosureTable()` (maintains `auth_policy_tree`).

For the `system.realm-match` policy, the EA attributes stored are:
- `attributeName` → `['realm_id']` (serialized by the `PolicyAttributeEntity` value transformer)
- `attributeNameStrict` → `false`
- `identityMasterMatchAll` → `true`

To set `parent_id` on leaf policies (linking them to the composite), set `parent_id` on the entity before calling `saveWithEA()`. The closure table is updated automatically.

### 4. `PermissionDatabaseRepository` After-State

File: `apps/server-core/src/security/permission/provider/db.ts`

Remove `getDefaultPolicy()` entirely. Change `findOne()`:

```typescript
async findOne(options: PermissionGetOptions): Promise<PermissionItem | null> {
    // ... existing where/cache logic unchanged ...

    if (entity) {
        let policy: PolicyWithType | undefined;
        if (entity.policy) {
            policy = await this.policyRepository.findDescendantsTree(entity.policy);
        }
        // No else — policy stays undefined (unrestricted)

        return {
            name: entity.name,
            realmId: entity.realm_id,
            clientId: entity.client_id,
            policy,
        };
    }

    return null;
}
```

### 5. Permission Write Path — Applying Config Option

The config option applies in two places:

**a) Permission HTTP controller** (`adapters/http/controllers/entities/permission/module.ts`):

In the `write()` method, after validation and before save, if creating a new permission and `policy_id` is not set:

```typescript
if (!entity && !data.policy_id) {
    const config = container.resolve<Config>(ConfigInjectionKey);
    if (config.permissionsDefaultPolicyAssignment) {
        const defaultPolicy = await this.policyRepository.findOneByName(SystemPolicyName.DEFAULT);
        if (defaultPolicy) {
            data.policy_id = defaultPolicy.id;
        }
    }
}
```

The controller needs `IPolicyRepository` added to its context. Alternatively, resolve the default policy ID once at startup and pass it into the controller context.

**b) Permission provisioning synchronizer** (`app/modules/provisioning/synchronizer/permission/module.ts`):

Same logic — if `policy_id` is not set on the provisioning entity attributes and config is `true`, look up and assign `system.default`.

### 6. Backfill Implementation

In the policy synchronizer, after creating/syncing system policies:

```typescript
// After system.default is created/found:
const defaultPolicy = await this.repository.findOneByName(SystemPolicyName.DEFAULT);
if (defaultPolicy) {
    // Backfill: assign to all permissions created before or at the same time as the default policy
    await permissionRepository.createQueryBuilder('permission')
        .update()
        .set({ policy_id: defaultPolicy.id })
        .where('policy_id IS NULL')
        .andWhere('created_at <= :cutoff', { cutoff: defaultPolicy.created_at })
        .execute();
}
```

Note: This backfill needs direct query builder access. Since the policy synchronizer uses `IPolicyRepository`, it will need the permission repository passed in its context too. Alternatively, the backfill can be a separate step in `ProvisionerModule.start()` between policy sync and permission sync, using a raw query via the DataSource.

### 7. Wiring in `ProvisionerModule`

In `app/modules/provisioning/module.ts`, add the policy synchronizer before the permission synchronizer:

```typescript
// After data is loaded from sources:
const policyRepository = new PolicyRepositoryAdapter({
    repository: new PolicyRepository(dataSource),
    realmRepository: container.resolve<Repository<Realm>>(RealmEntity),
});

const policySynchronizer = new PolicyProvisioningSynchronizer({
    repository: policyRepository,
});
await policySynchronizer.synchronize();

// Then backfill permissions...
// Then existing permission/role/client/etc. synchronization...
```

## Implementation Checklist

### `packages/access`

- [ ] Add `SystemPolicyName` constants

### `apps/server-core`

- [ ] Add policy provisioning synchronizer using `IPolicyRepository` port (not TypeORM directly)
- [ ] Wire policy synchronizer into `ProvisionerModule.start()` — run before permission sync
- [ ] Update permission synchronizer to look up `SystemPolicyName.DEFAULT` and assign to permissions with `policy_id = null` (backfill)
- [x] Enforce `built_in` check in policy HTTP controller (block update/delete of built-in policies)
- [ ] Add `PERMISSIONS_DEFAULT_POLICY_ASSIGNMENT` config option in `app/modules/config/`
- [ ] Apply config option in permission creation (API controller + provisioning)
- [ ] Log deprecation warning at startup when config option is active
- [ ] Remove `getDefaultPolicy()` from `PermissionDatabaseRepository`
- [ ] Update `PermissionDatabaseRepository.findOne()` to return `policy: undefined` when `policy_id` is null
- [ ] Add tests for policy sync, backfill, built-in guards, evaluation, and config option

## Summary

- Permissions represent capabilities
- Policies restrict capabilities
- Permissions are public unless restricted via an explicit policy
- Policy framework (types, evaluators, engine) lives in `packages/access`
- Policy infrastructure (database, sync, provisioning) lives in `apps/server-core`
- System policies are code-owned, `built_in = true`, synced on startup
- Migration assigns `system.default` to all existing permissions before removing the in-memory fallback
- Composite policy sync uses teardown + rebuild strategy
- Provisioning order: policies → permissions → everything else
