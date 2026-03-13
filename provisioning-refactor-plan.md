# Provisioning Hexagonal Architecture Refactor

## Goal

Migrate provisioning synchronizers from direct TypeORM `Repository<T>` usage to core entity repository port interfaces (`I{Entity}Repository`), aligning with the project's hexagonal architecture.

## Current State

Provisioning synchronizers in `app/modules/provisioning/synchronizer/` are tightly coupled to TypeORM:

- Contexts accept `Repository<T>` from TypeORM
- Synchronizers use TypeORM-specific operators: `In()`, `IsNull()`
- Synchronizers call TypeORM methods: `findBy()`, `findOneBy()`, `create()`, `merge()`, `save()`

The provisioning sources (`sources/default/`, `sources/file/`) do **not** depend on TypeORM — they produce plain provisioning entity objects. Only the synchronizers are coupled.

### Current File Layout

```
app/modules/provisioning/
  module.ts                         ← ProvisionerModule (orchestration + wiring)
  types.ts                          ← IProvisioningSource, shared types
  synchronizer/
    base.ts                         ← IProvisioningSynchronizer, BaseProvisioningSynchronizer
    permission/module.ts, types.ts
    role/module.ts, types.ts
    client/module.ts, types.ts
    user/module.ts, types.ts
    robot/module.ts, types.ts
    realm/module.ts, types.ts
    scope/module.ts, types.ts
    root/module.ts, types.ts        ← GraphProvisioningSynchronizer
  entities/                         ← provisioning entity types
  strategy/                         ← strategy types, normalize, validator
  sources/
    default/module.ts               ← DefaultProvisioningSource
    file/module.ts                  ← FileProvisioningSource
    composite/module.ts             ← CompositeProvisioningSource
```

### Current DI Wiring Pattern

`ProvisionerModule.start()` resolves TypeORM repositories from the DI container using entity classes as keys, then passes them directly to synchronizer constructors:

```typescript
// current: app/modules/provisioning/module.ts
async start(container: IDIContainer): Promise<void> {
    const permissionSynchronizer = new PermissionProvisioningSynchronizer({
        repository: container.resolve<Repository<Permission>>(PermissionEntity),
    });

    const roleSynchronizer = new RoleProvisioningSynchronizer({
        repository: container.resolve<Repository<Role>>(RoleEntity),
        permissionRepository: container.resolve<Repository<Permission>>(PermissionEntity),
        rolePermissionRepository: container.resolve<Repository<RolePermission>>(RolePermissionEntity),
    });
    // ... etc
}
```

The DI container (`IDIContainer`) uses a simple resolve/register pattern. Entity classes (e.g., `PermissionEntity`) are used as DI keys and resolve to TypeORM `Repository<T>` instances. See `core/di/types.ts` for the interface.

## Architecture After Refactor

```
core/provisioning/                          ← NEW: business logic
  synchronizer/
    base.ts                                 ← IProvisioningSynchronizer, BaseProvisioningSynchronizer
    permission/module.ts, types.ts
    role/module.ts, types.ts
    client/module.ts, types.ts
    user/module.ts, types.ts
    robot/module.ts, types.ts
    realm/module.ts, types.ts
    scope/module.ts, types.ts
    root/module.ts, types.ts
    policy/module.ts, types.ts              ← from policies plan
    index.ts                                ← barrel export
  entities/                                 ← moved from app/modules/provisioning/entities/
  strategy/                                 ← moved from app/modules/provisioning/strategy/
  types.ts                                  ← IProvisioningSource + shared types

app/modules/provisioning/                   ← orchestration only
  module.ts                                 ← ProvisionerModule wires adapters to core synchronizers
  sources/                                  ← source implementations (default, file, composite)
```

## Gap Analysis: Port Interface vs Synchronizer Needs

### Base Port Interface (current)

```typescript
// core/entities/types.ts
export interface IEntityRepository<T extends ObjectLiteral = ObjectLiteral> {
    findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<T>>;
    findOneById(id: string): Promise<T | null>;
    findOneByName(name: string, realm?: string): Promise<T | null>;
    findOneByIdOrName(idOrName: string, realm?: string): Promise<T | null>;
    findOneBy(where: Record<string, any>): Promise<T | null>;
    create(data: Partial<T>): T;
    merge(entity: T, data: Partial<T>): T;
    save(entity: T): Promise<T>;
    remove(entity: T): Promise<void>;
    validateJoinColumns(data: Partial<T>): Promise<void>;
}
```

### Missing Method: `findManyBy()`

Synchronizers need a simple filtered query returning `T[]` without pagination. This does not exist on the port interface.

Current TypeORM usage that requires it:

```typescript
// From RoleProvisioningSynchronizer — uses In() and IsNull()
permissions.push(...await this.permissionRepository.findBy({
    name: In(input.relations.globalPermissions),
    realm_id: IsNull(),
    client_id: IsNull(),
}));
```

### Proposed Addition

```typescript
export interface IEntityRepository<T extends ObjectLiteral = ObjectLiteral> {
    // ... existing methods ...
    findManyBy(where: Record<string, any>): Promise<T[]>;
}
```

### Adapter Implementation for `findManyBy()`

The adapter translates port-level conventions to TypeORM operators:

```typescript
// In each {Entity}RepositoryAdapter:
import { In, IsNull } from 'typeorm';

async findManyBy(where: Record<string, any>): Promise<T[]> {
    const translated: Record<string, any> = {};
    for (const [key, value] of Object.entries(where)) {
        if (value === null) {
            translated[key] = IsNull();
        } else if (Array.isArray(value)) {
            translated[key] = In(value);
        } else {
            translated[key] = value;
        }
    }
    return this.repository.findBy(translated);
}
```

This translation logic is identical across all adapters. Extract a shared helper to avoid duplication:

```typescript
// app/modules/database/repositories/helpers.ts (or similar)
import { In, IsNull } from 'typeorm';

export function translateWhereConditions(where: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(where)) {
        if (value === null) {
            result[key] = IsNull();
        } else if (Array.isArray(value)) {
            result[key] = In(value);
        } else {
            result[key] = value;
        }
    }
    return result;
}
```

Then each adapter:

```typescript
async findManyBy(where: Record<string, any>): Promise<T[]> {
    return this.repository.findBy(translateWhereConditions(where));
}
```

### Null/Array Convention Summary

| Port interface (caller) | Adapter translates to | TypeORM |
|---|---|---|
| `realm_id: null` | `IsNull()` | `WHERE realm_id IS NULL` |
| `name: ['a', 'b']` | `In(['a', 'b'])` | `WHERE name IN ('a', 'b')` |
| `realm_id: 'uuid'` | `'uuid'` (passthrough) | `WHERE realm_id = 'uuid'` |

Also apply the same translation to `findOneBy()` for consistency — synchronizers use patterns like `realm_id: input.attributes.realm_id || IsNull()` in `findOneBy()` calls too.

## Existing Adapters That Need `findManyBy()`

All 20 adapters in `app/modules/database/repositories/`:

| Adapter | Port Interface |
|---|---|
| `ClientRepositoryAdapter` | `IClientRepository` |
| `ClientPermissionRepositoryAdapter` | `IClientPermissionRepository` |
| `ClientRoleRepositoryAdapter` | `IClientRoleRepository` |
| `ClientScopeRepositoryAdapter` | `IClientScopeRepository` |
| `IdentityProviderRepositoryAdapter` | `IIdentityProviderRepository` |
| `IdentityProviderRoleMappingRepositoryAdapter` | `IIdentityProviderRoleMappingRepository` |
| `PermissionRepositoryAdapter` | `IPermissionRepository` |
| `PolicyRepositoryAdapter` | `IPolicyRepository` |
| `RealmRepositoryAdapter` | `IRealmRepository` |
| `RobotRepositoryAdapter` | `IRobotRepository` |
| `RobotPermissionRepositoryAdapter` | `IRobotPermissionRepository` |
| `RobotRoleRepositoryAdapter` | `IRobotRoleRepository` |
| `RoleRepositoryAdapter` | `IRoleRepository` |
| `RoleAttributeRepositoryAdapter` | `IRoleAttributeRepository` |
| `RolePermissionRepositoryAdapter` | `IRolePermissionRepository` |
| `ScopeRepositoryAdapter` | `IScopeRepository` |
| `UserRepositoryAdapter` | `IUserRepository` |
| `UserAttributeRepositoryAdapter` | `IUserAttributeRepository` |
| `UserPermissionRepositoryAdapter` | `IUserPermissionRepository` |
| `UserRoleRepositoryAdapter` | `IUserRoleRepository` |

## Synchronizer Migration Details

### Before/After: Simple Synchronizer (Permission)

**Before** (TypeORM coupled):

```typescript
// app/modules/provisioning/synchronizer/permission/types.ts
import type { Permission } from '@authup/core-kit';
import type { Repository } from 'typeorm';

export type PermissionProvisioningSynchronizerContext = {
    repository: Repository<Permission>,
};
```

```typescript
// app/modules/provisioning/synchronizer/permission/module.ts
import type { Permission } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { IsNull } from 'typeorm';

export class PermissionProvisioningSynchronizer extends BaseProvisioningSynchronizer<PermissionProvisioningEntity> {
    protected repository: Repository<Permission>;

    async synchronize(input: PermissionProvisioningEntity) {
        let attributes = await this.repository.findOneBy({
            name: input.attributes.name,
            realm_id: input.attributes.realm_id || IsNull(),
            client_id: input.attributes.client_id || IsNull(),
        });
        // ... create/merge/save using this.repository
    }
}
```

**After** (port interface):

```typescript
// core/provisioning/synchronizer/permission/types.ts
import type { IPermissionRepository } from '../../../entities/index.ts';

export type PermissionProvisioningSynchronizerContext = {
    repository: IPermissionRepository,
};
```

```typescript
// core/provisioning/synchronizer/permission/module.ts
import type { IPermissionRepository } from '../../../entities/index.ts';

export class PermissionProvisioningSynchronizer extends BaseProvisioningSynchronizer<PermissionProvisioningEntity> {
    protected repository: IPermissionRepository;

    async synchronize(input: PermissionProvisioningEntity) {
        let attributes = await this.repository.findOneBy({
            name: input.attributes.name,
            realm_id: input.attributes.realm_id || null,
            client_id: input.attributes.client_id || null,
        });
        // ... create/merge/save using this.repository (same method names)
    }
}
```

### Before/After: Complex Synchronizer (Role — Permission Discovery)

**Before** (TypeORM coupled):

```typescript
// app/modules/provisioning/synchronizer/role/types.ts
import type { Permission, Role, RolePermission } from '@authup/core-kit';
import type { Repository } from 'typeorm';

export type RoleProvisioningSynchronizerContext = {
    repository: Repository<Role>,
    permissionRepository: Repository<Permission>,
    rolePermissionRepository: Repository<RolePermission>,
};
```

```typescript
// Key section from role/module.ts
import { In, IsNull } from 'typeorm';

// Wildcard: find all global permissions
permissions.push(...await this.permissionRepository.findBy({
    realm_id: IsNull(),
    client_id: IsNull(),
}));

// Named: find specific permissions
permissions.push(...await this.permissionRepository.findBy({
    name: In(input.relations.globalPermissions),
    realm_id: IsNull(),
    client_id: IsNull(),
}));

// Create junction entity
let rolePermission = await this.rolePermissionRepository.findOneBy({
    role_id: attributes.id,
    permission_id: permission.id,
});
if (!rolePermission) {
    rolePermission = this.rolePermissionRepository.create({ ... });
    await this.rolePermissionRepository.save(rolePermission);
}
```

**After** (port interface):

```typescript
// core/provisioning/synchronizer/role/types.ts
import type { IPermissionRepository, IRolePermissionRepository, IRoleRepository } from '../../../entities/index.ts';

export type RoleProvisioningSynchronizerContext = {
    repository: IRoleRepository,
    permissionRepository: IPermissionRepository,
    rolePermissionRepository: IRolePermissionRepository,
};
```

```typescript
// Key section from role/module.ts — no TypeORM imports
// Wildcard: find all global permissions
permissions.push(...await this.permissionRepository.findManyBy({
    realm_id: null,
    client_id: null,
}));

// Named: find specific permissions
permissions.push(...await this.permissionRepository.findManyBy({
    name: input.relations.globalPermissions,   // array → adapter translates to In()
    realm_id: null,                             // null → adapter translates to IsNull()
    client_id: null,
}));

// Create junction entity — same API, just through port interface
let rolePermission = await this.rolePermissionRepository.findOneBy({
    role_id: attributes.id,
    permission_id: permission.id,
});
if (!rolePermission) {
    rolePermission = this.rolePermissionRepository.create({ ... });
    await this.rolePermissionRepository.save(rolePermission);
}
```

### Before/After: ProvisionerModule Wiring

**Before** (resolves TypeORM repos):

```typescript
// app/modules/provisioning/module.ts
import type { Repository } from 'typeorm';
import { PermissionEntity, RoleEntity, RolePermissionEntity } from '../../../adapters/database/index.ts';

const roleSynchronizer = new RoleProvisioningSynchronizer({
    repository: container.resolve<Repository<Role>>(RoleEntity),
    permissionRepository: container.resolve<Repository<Permission>>(PermissionEntity),
    rolePermissionRepository: container.resolve<Repository<RolePermission>>(RolePermissionEntity),
});
```

**After** (creates adapters, passes port interfaces):

```typescript
// app/modules/provisioning/module.ts
import type { Repository } from 'typeorm';
import { PermissionEntity, RoleEntity, RolePermissionEntity, RealmEntity } from '../../../adapters/database/index.ts';
import { RoleRepositoryAdapter } from '../../database/repositories/role/repository.ts';
import { PermissionRepositoryAdapter } from '../../database/repositories/permission/repository.ts';
import { RolePermissionRepositoryAdapter } from '../../database/repositories/role-permission/repository.ts';
import { RoleProvisioningSynchronizer } from '../../../core/provisioning/synchronizer/role/module.ts';

const roleRepository = new RoleRepositoryAdapter({
    repository: container.resolve<Repository<Role>>(RoleEntity),
    realmRepository: container.resolve<Repository<Realm>>(RealmEntity),
});
const permissionRepository = new PermissionRepositoryAdapter({
    repository: container.resolve<Repository<Permission>>(PermissionEntity),
    realmRepository: container.resolve<Repository<Realm>>(RealmEntity),
});
const rolePermissionRepository = new RolePermissionRepositoryAdapter(
    container.resolve<Repository<RolePermission>>(RolePermissionEntity),
);

const roleSynchronizer = new RoleProvisioningSynchronizer({
    repository: roleRepository,
    permissionRepository,
    rolePermissionRepository,
});
```

Note: some adapters require additional dependencies in their constructor (e.g., `ScopeRepositoryAdapter` needs a `realmRepository`). Check each adapter's constructor context type. The adapters already exist — they just need to be instantiated here instead of in the controller factory.

## Implementation Steps

### Phase 1: Extend Port Interfaces

1. Add `findManyBy(where: Record<string, any>): Promise<T[]>` to `IEntityRepository<T>` in `core/entities/types.ts`
2. Create shared `translateWhereConditions()` helper in `app/modules/database/repositories/`
3. Implement `findManyBy()` in all 20 `{Entity}RepositoryAdapter` classes using the shared helper
4. Also update `findOneBy()` in all adapters to use `translateWhereConditions()` for consistency

**Files to modify:**
- `apps/server-core/src/core/entities/types.ts` — add method to interface
- `apps/server-core/src/app/modules/database/repositories/*/repository.ts` — all 20 adapters
- New: `apps/server-core/src/app/modules/database/repositories/helpers.ts` — shared translator

### Phase 2: Move Provisioning Core to `core/provisioning/`

1. Create `core/provisioning/` directory structure
2. Move `synchronizer/base.ts` → `core/provisioning/synchronizer/base.ts`
3. Move `entities/` → `core/provisioning/entities/`
4. Move `strategy/` → `core/provisioning/strategy/`
5. Move `IProvisioningSource` type from `types.ts` → `core/provisioning/types.ts`
6. Keep source implementations (default, file, composite) in `app/modules/provisioning/sources/`
7. Add barrel `index.ts` exports at each level
8. Update all import paths in `app/modules/provisioning/module.ts` and source files

### Phase 3: Migrate Synchronizers (One at a Time)

For each synchronizer:

1. Update context type in `types.ts`: replace `Repository<T>` with `I{Entity}Repository`
2. Update module code:
   - Remove `import { In, IsNull } from 'typeorm'`
   - Remove `import type { Repository } from 'typeorm'`
   - Replace `IsNull()` → `null`
   - Replace `In([...])` → `[...]`
   - Replace `findBy()` → `findManyBy()`
   - `findOneBy()`, `create()`, `merge()`, `save()` — same method names, no change needed
3. Move from `app/modules/provisioning/synchronizer/{entity}/` to `core/provisioning/synchronizer/{entity}/`
4. Add barrel export in `core/provisioning/synchronizer/{entity}/index.ts`
5. Update imports in `app/modules/provisioning/module.ts`

**Recommended migration order** (simplest first):
1. `PermissionProvisioningSynchronizer` — simplest, only `findOneBy` + `create/merge/save`
2. `ScopeProvisioningSynchronizer` — same pattern as Permission
3. `RealmProvisioningSynchronizer` — delegates to child synchronizers, no direct queries
4. `RoleProvisioningSynchronizer` — first complex one, uses `findManyBy` + arrays
5. `ClientProvisioningSynchronizer` — similar to Role but more junction entities
6. `UserProvisioningSynchronizer` — most complex, 6 repository dependencies
7. `RobotProvisioningSynchronizer` — similar to User
8. `GraphProvisioningSynchronizer` (root) — orchestration only, update context types

### Phase 4: Update Wiring in `ProvisionerModule`

Update `app/modules/provisioning/module.ts`:

1. Import synchronizers from `core/provisioning/synchronizer/`
2. Import repository adapters from `app/modules/database/repositories/`
3. Instantiate adapters from resolved TypeORM repos (see before/after example above)
4. Pass adapters to synchronizer constructors
5. Remove direct TypeORM entity imports that are no longer needed

### Phase 5: Build, Lint, Test

1. `npm run build -w apps/server-core`
2. `npx eslint --fix` on all changed files
3. `npm run test --workspace=apps/server-core` — existing provisioning tests must pass

## Adapter Constructor Dependencies

When instantiating adapters in `ProvisionerModule`, be aware of their constructor requirements:

| Adapter | Constructor Context |
|---|---|
| `PermissionRepositoryAdapter` | `{ repository, realmRepository }` |
| `RoleRepositoryAdapter` | `{ repository, realmRepository }` |
| `ScopeRepositoryAdapter` | `{ repository, realmRepository }` |
| `ClientRepositoryAdapter` | `{ repository, realmRepository }` |
| `UserRepositoryAdapter` | `{ repository: UserRepository, realmRepository }` (note: uses EA-aware `UserRepository`, not plain `Repository<User>`) |
| `RobotRepositoryAdapter` | `{ repository, realmRepository }` |
| `RealmRepositoryAdapter` | `repository` (plain `Repository<Realm>`) |
| Junction adapters (e.g., `ClientPermissionRepositoryAdapter`) | `repository` (plain `Repository<T>`) |

Some adapters internally create other adapters (e.g., `ScopeRepositoryAdapter` creates `RealmRepositoryAdapter` internally). This is the existing pattern — don't change it during this refactor.

## Testing

- Each migrated synchronizer should produce the same provisioning result as before
- `findManyBy()` adapter must correctly handle:
  - `null` → `IsNull()`
  - `['a', 'b']` → `In(['a', 'b'])`
  - `'value'` → passthrough
- `findOneBy()` with translated conditions must work for `null` values
- Existing provisioning tests should pass without changes after migration
- Run full test suite: `npm run test --workspace=apps/server-core`

## Notes

- The new policy synchronizer (from `policies-plan.md`) should be written directly against `IPolicyRepository` — it does not need migration
- This refactor is independent of the policy work and can be done in a separate release
- Sources remain in `app/modules/` because they depend on infrastructure (file system, DI container)
- Do **not** refactor adapter constructors or internal adapter wiring during this task — only the synchronizer → adapter boundary changes
