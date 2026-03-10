# Hexagonal Repository Migration Guide

A step-by-step guide for migrating projects from direct database access in HTTP controllers to hexagonal architecture with Dependency Inversion Principle (DIP). Based on the Authup server-core migration.

## Prerequisites

- TypeScript monorepo with TypeORM
- Controllers that directly call `useDataSource()` and construct repositories inline
- Target: domain ports (interfaces) in core, adapters in infrastructure, constructor injection in controllers

## Architecture Overview

```
core/entities/         — Ports (interfaces): IEntityRepository<T>, per-entity interfaces
app/modules/database/  — Adapters: repository implementations wrapping TypeORM
adapters/http/         — Controllers: receive repository via constructor injection
app/modules/http/      — Wiring: factory methods that construct adapters + controllers
```

## Step 1: Define the Base Repository Interface

Create a base interface that all entity repositories extend:

```typescript
// core/entities/types.ts
export type EntityRepositoryFindManyResult<T> = {
    data: T[],
    meta: PaginationParseOutput & { total: number }
};

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

Use domain interfaces (e.g. `Realm` from core-kit) as the generic parameter, not TypeORM entity classes.

## Step 2: Categorize Entities

Before migrating, classify entities by complexity:

| Category | Examples | Extra Interface Methods |
|---|---|---|
| **Simple CRUD** | realm, scope, role-attribute, user-attribute | None or `checkUniqueness()` |
| **CRUD + uniqueness** | role, scope | `checkUniqueness()` |
| **Junction/association** | client-permission, client-role, robot-role, user-role | None (base is sufficient) |
| **Complex with secrets** | client, robot | `checkUniqueness()`, `findOneWithSecret()` |
| **Complex with EA** | user, policy, identity-provider | `checkUniqueness()`, `saveWithEA()`, `deleteFromTree()`, `findByProtocol()` |

EA = Extra Attributes (key-value pairs stored in a separate table, dynamically loaded onto the entity).

## Step 3: Migration Per Entity

### 3a. Create the Port (Interface)

```
core/entities/{entity}/types.ts
core/entities/{entity}/index.ts   — barrel export
core/entities/index.ts            — add re-export
```

```typescript
// core/entities/role/types.ts
import type { Role } from '@authup/core-kit';
import type { IEntityRepository } from '../types.ts';

export interface IRoleRepository extends IEntityRepository<Role> {
    checkUniqueness(data: Partial<Role>, existing?: Role): Promise<void>;
}
```

### 3b. Create the Adapter

```
app/modules/database/repositories/{entity}/repository.ts
app/modules/database/repositories/{entity}/index.ts   — barrel export
app/modules/database/repositories/index.ts             — add re-export
```

```typescript
// app/modules/database/repositories/role/repository.ts
export class RoleRepositoryAdapter implements IRoleRepository {
    private readonly repository: Repository<RoleEntity>;
    private readonly dataSource: DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.repository = dataSource.getRepository(RoleEntity);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Role>> {
        const qb = this.repository.createQueryBuilder('role');
        qb.groupBy('role.id');
        const { pagination } = applyQuery(qb, query, { /* field/filter/sort config from old handler */ });
        const [entities, total] = await qb.getManyAndCount();
        return { data: entities, meta: { total, ...pagination } };
    }

    // ... other methods delegate to this.repository
}
```

**Key adapter patterns:**

- `findMany()`: Copy the `applyQuery` config exactly from the old handler's `read.ts`
- `findOneByIdOrName()`: Delegate to `findOneById` / `findOneByName` using `isUUID()`
- `findOneBy()`: Delegate to `this.repository.findOneBy(where)` — keep it simple, no EA extension
- `create/merge/save/remove`: Delegate to TypeORM, cast to entity type where needed
- `validateJoinColumns()`: Use `validateEntityJoinColumns(data, { dataSource, entityTarget })`
- `checkUniqueness()`: Use `isEntityUnique({ dataSource, entityTarget, entity, entityExisting })`

### 3c. Rewrite the Controller

Merge all handler files (`read.ts`, `write.ts`, `delete.ts`) into the controller class:

```typescript
// adapters/http/controllers/entities/role/module.ts
export type RoleControllerContext = {
    repository: IRoleRepository,
};

@DController('/roles')
export class RoleController {
    protected repository: IRoleRepository;

    constructor(ctx: RoleControllerContext) {
        this.repository = ctx.repository;
    }

    @DGet('')
    async getMany(@DRequest() req: any, @DResponse() res: any): Promise<any> { /* ... */ }

    @DGet('/:id')
    async get(@DPath('id') id: string, @DRequest() req: any, @DResponse() res: any): Promise<any> { /* ... */ }

    @DPost('')
    async add(@DBody() data: any, @DRequest() req: any, @DResponse() res: any): Promise<any> { /* ... */ }

    @DDelete('/:id')
    async drop(@DPath('id') id: string, @DRequest() req: any, @DResponse() res: any): Promise<any> { /* ... */ }
}
```

**Controller patterns:**
- Return type is always `Promise<any>` (send/sendCreated/sendAccepted return void)
- Permission checks, validation, and business logic stay in the controller
- Replace `useDataSource()` + `new Repository()` calls with `this.repository.xxx()`
- For write operations with validation: `validator.run()` → `validateJoinColumns()` → `checkUniqueness()` → `save()`

### 3d. Wire in the Module

```typescript
// app/modules/http/modules/controller.ts
createRoleController(dataSource: DataSource) {
    const repository = new RoleRepositoryAdapter(dataSource);
    return new RoleController({ repository });
}
```

In `mount()`, call factories and pass instances to `decorators({ controllers: [...] })`.

### 3e. Delete Dead Code

Remove the entire `handlers/` directory for the migrated entity.

## Step 4: Handle Special Cases

### Entities with Extra Attributes (EA)

Entities like user, policy, and identity-provider use `EARepository` which stores dynamic key-value pairs in a separate table.

**Critical rule: separate read-path vs write-path EA loading.**

- `findOneById()` / `findOneByName()`: Call `extendOneWithEA()` after loading (these serve read endpoints)
- `findOneBy()`: Do NOT call `extendOneWithEA()` (used by write endpoints that load-then-update; EA on the entity would be overwritten by `saveOneWithEA`)
- `findMany()`: Call `extendManyWithEA()` after loading
- `saveWithEA()`: Do NOT call `extendOneWithEA()` after save (the adapter's `saveOneWithEA` already puts EA fields back on the entity object)

```typescript
// Correct pattern for EA entities
async findOneById(id: string): Promise<User | null> {
    const entity = await this.findOneBy({ id });
    if (entity) {
        await this.repository.extendOneWithEA(entity);
    }
    return entity;
}

async findOneBy(where: Record<string, any>): Promise<User | null> {
    return this.repository.findOneBy(where);  // NO extendOneWithEA
}
```

**Why:** `saveOneWithEA` separates EA fields from the entity, saves the entity, saves EA, then puts EA keys back. If `findOneBy` extends with old EA, those old values end up on the entity and get re-saved, overwriting new values.

### Entities with `select: false` Columns

Columns like `email`, `password`, `secret` with `select: false` in TypeORM are only included when explicitly requested (e.g. `?fields[]=+email`).

For entities that need field selection on single reads, add a dedicated method:

```typescript
export interface IUserRepository extends IEntityRepository<User> {
    findOne(id: string, query?: Record<string, any>, realm?: string): Promise<User | null>;
}
```

The adapter implements this with `applyQuery` on a query builder (same field config as `findMany`), enabling the controller to pass request query parameters.

### Entities with Create Using EA

When creating entities with extra attributes (e.g. policy with custom `bar: 'baz'`):

```typescript
// WRONG: create() strips EA fields
entity = this.repository.create(data);
await this.repository.saveWithEA(entity);  // bar is lost

// CORRECT: pass data directly, saveWithEA splits entity/EA internally
await this.repository.saveWithEA(data as Policy);
return sendCreated(res, data);
```

### Name Clashes

If other modules already have repository classes/interfaces with similar names (e.g. an identity module's `IdentityProviderRepositoryAdapter`), rename the old one to avoid export collisions from barrel files.

### Junction Entities

These are the simplest — the base `IEntityRepository` is usually sufficient:

```typescript
export interface IClientPermissionRepository extends IEntityRepository<ClientPermission> {}
```

## Step 5: Batch Migration

After completing 2-3 entities manually as references, batch the rest:

1. Group by complexity category
2. Run parallel agents/workers for independent entities
3. After all files are created, fix TypeScript errors systematically:
   - `@ts-expect-error` placement for `applyQuery` relation options
   - Return type annotations (`Promise<any>`)
   - Import path corrections
   - Name clash resolution
4. Run full test suite
5. Delete all dead handler directories

## Step 6: Verification Checklist

- [ ] `npx tsc --noEmit` — zero new errors in the migrated package
- [ ] All tests pass
- [ ] No `useDataSource()` calls remain in migrated controller files
- [ ] No imports from deleted `handlers/` directories
- [ ] Barrel exports updated in all index.ts files
- [ ] Pre-existing identity/auth modules still compile (check for name clashes)

## File Structure After Migration

```
core/entities/
  types.ts                          — IEntityRepository<T>, EntityRepositoryFindManyResult<T>
  {entity}/types.ts                 — I{Entity}Repository extends IEntityRepository<Entity>
  {entity}/index.ts                 — barrel export
  index.ts                          — barrel re-exports all entities

app/modules/database/repositories/
  {entity}/repository.ts            — {Entity}RepositoryAdapter implements I{Entity}Repository
  {entity}/index.ts                 — barrel export
  index.ts                          — barrel re-exports all adapters

adapters/http/controllers/entities/
  {entity}/module.ts                — Controller class with constructor injection
  {entity}/utils/                   — Validators, helpers (unchanged)
  {entity}/index.ts                 — exports module.ts only

app/modules/http/modules/
  controller.ts                     — Factory methods, wiring
```

## Constraints

- No injection tokens or service locator — DIP via constructor arguments only
- Port interface names: `I{Entity}Repository` (no "HTTP" or "Database" prefix)
- Adapter class names: `{Entity}RepositoryAdapter`
- Use domain interfaces (from core-kit) in ports, TypeORM entity classes only in adapters
- `findMany()` returns `EntityRepositoryFindManyResult<T>` with `{ data, meta: { total, ...pagination } }`
