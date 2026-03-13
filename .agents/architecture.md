# Architecture

## Hexagonal Architecture

The project follows hexagonal architecture (ports & adapters), separating core business logic from external systems via well-defined interfaces.

- **Hexagonal Architecture**: Logic separated across packages.
- **Dependency Inversion Principle (DIP)**: Adapters in server-core use DIP to inject implementations from core and app (infrastructure). No injection tokens or service locator — use DIP via constructor arguments directly.
- **TypeScript & ESM**: All packages use TypeScript with strict typing and modern ES module syntax.

## apps/server-core

The server-core package contains the server-side logic, organized into three layers:

### 1. core/ — Domain & Business Logic

The core folder contains the system's business logic. It defines ports (interfaces) and implements logic for authentication, OAuth2 flows, and identity management.

| Folder              | Responsibility                                                                                                                             |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| core/oauth2         | Implements OAuth2 flows (Password, Client Credentials, Refresh Token, etc.). Ports define interfaces for token handling and authorization. |
| core/identity       | Core logic for user and client management, roles, permissions, and policies. Ports define interfaces for entity repositories.              |
| core/authentication | Authentication logic such as password validation                                                                                           |
| core/ldap           | LDAP integration logic                                                                                                                     |
| core/mail           | Email sending logic                                                                                                                        |
| core/entities       | Repository port interfaces (IEntityRepository\<T\>, per-entity I{Entity}Repository)                                                       |
| core/provisioning   | Provisioning business logic: entity types, strategies, synchronizers, entity resolver and junction synchronizer helpers                     |
| core/di             | Dependency injection setup                                                                                                                 |

### 2. adapters/ — External Systems

Adapters connect the core logic to external systems.

| Folder                | Responsibility                                                   |
|-----------------------|------------------------------------------------------------------|
| adapters/database     | Database migrations & entities                                   |
| adapters/http         | Controllers, middlewares implementations that use core services. |
| adapters/shared       | Shared adapters such as LDAP                                     |

### 3. app/modules/ — Orchestration & Bootstrapping

Modules wire together adapters, ports, and core logic. Configure app startup, register adapters, and set up dependency injection.

| Folder                       | Responsibility                                                                                             |
|------------------------------|------------------------------------------------------------------------------------------------------------|
| app/modules/config           | Reads environment variables and configuration files                                                        |
| app/modules/database         | Implement repositories based on adapters/database typeorm (entities & repositories), bootstrap connections |
| app/modules/http             | Configure and initialize controllers with concrete implementations                                         |
| app/modules/authentication   | Authentication feature wiring                                                                              |
| app/modules/identity         | Identity management wiring                                                                                 |
| app/modules/oauth2           | OAuth2 flow wiring                                                                                         |
| app/modules/ldap             | LDAP integration                                                                                           |
| app/modules/mail             | Email service                                                                                              |
| app/modules/components       | Background components (OAuth2 cleanup, database unique entries)                                            |
| app/modules/cache            | Caching (Redis)                                                                                            |
| app/modules/logger           | Logging (Winston)                                                                                          |
| app/modules/vault            | Secret management                                                                                          |
| app/modules/runtime          | Runtime lifecycle                                                                                          |
| app/modules/swagger          | API documentation generation                                                                               |
| app/modules/provisioning     | Wires repository adapters to core provisioning synchronizers; hosts provisioning sources (default, file, composite) |

## Repository Pattern (Ports & Adapters)

### Port Interfaces

Defined in `core/entities/`, these are the contracts that adapters must implement:

```typescript
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

Per-entity interfaces extend the base:

```typescript
export interface IRoleRepository extends IEntityRepository<Role> {
    checkUniqueness(data: Partial<Role>, existing?: Role): Promise<void>;
}
```

Port interface names follow `I{Entity}Repository` (no "HTTP" or "Database" prefix).

### Entity Categories

| Category | Examples | Extra Interface Methods |
|---|---|---|
| **Simple CRUD** | realm, scope, role-attribute, user-attribute | None or `checkUniqueness()` |
| **CRUD + uniqueness** | role, scope | `checkUniqueness()` |
| **Junction/association** | client-permission, client-role, robot-role, user-role | None (base is sufficient) |
| **Complex with secrets** | client, robot | `checkUniqueness()`, `findOneWithSecret()` |
| **Complex with EA** | user, policy, identity-provider | `checkUniqueness()`, `saveWithEA()`, `deleteFromTree()`, `findByProtocol()` |

EA = Extra Attributes (key-value pairs stored in a separate table, dynamically loaded onto the entity).

### Adapter Implementation

Adapters live in `app/modules/database/repositories/` and are named `{Entity}RepositoryAdapter`:

```typescript
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
        const { pagination } = applyQuery(qb, query, { /* field/filter/sort config */ });
        const [entities, total] = await qb.getManyAndCount();
        return { data: entities, meta: { total, ...pagination } };
    }
    // ... other methods delegate to this.repository
}
```

Key adapter patterns:
- `findMany()`: Copy the `applyQuery` config from the old handler
- `findOneByIdOrName()`: Delegate to `findOneById` / `findOneByName` using `isUUID()`
- `findOneBy()`: Delegate to `this.repository.findOneBy(where)`
- `create/merge/save/remove`: Delegate to TypeORM, cast to entity type where needed
- `validateJoinColumns()`: Use `validateEntityJoinColumns(data, { dataSource, entityTarget })`
- `checkUniqueness()`: Use `isEntityUnique({ dataSource, entityTarget, entity, entityExisting })`

### Controller Pattern

Controllers receive repositories via constructor injection. Handler files (`read.ts`, `write.ts`, `delete.ts`) are merged into controller class methods:

```typescript
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

Controller conventions:
- Return type is always `Promise<any>`
- Permission checks, validation, and business logic stay in the controller
- Replace `useDataSource()` + `new Repository()` calls with `this.repository.xxx()`
- Use `findOneByIdOrName()` (not `findOne()`)
- For write operations: `validator.run()` → `validateJoinColumns()` → `checkUniqueness()` → `save()`

### Wiring (Module Layer)

Factory methods in `app/modules/http/modules/controller.ts` wire adapters to controllers:

```typescript
createRoleController(dataSource: DataSource) {
    const repository = new RoleRepositoryAdapter(dataSource);
    return new RoleController({ repository });
}
```

### Extra Attributes (EA) Entities

Entities like user, policy, and identity-provider store dynamic key-value pairs in a separate table.

**Critical rule: separate read-path vs write-path EA loading.**

- `findOneById()` / `findOneByName()`: Call `extendOneWithEA()` after loading (read endpoints)
- `findOneBy()`: Do NOT call `extendOneWithEA()` (write endpoints that load-then-update)
- `findMany()`: Call `extendManyWithEA()` after loading
- `saveWithEA()`: Do NOT call `extendOneWithEA()` after save

## Provisioning Architecture

The provisioning system declaratively synchronizes entities (permissions, roles, users, etc.) into the database on startup. It follows the same hexagonal pattern: core logic in `core/provisioning/`, wiring in `app/modules/provisioning/`.

### Layers

- **core/provisioning/entities/**: Provisioning entity types and validators (what can be provisioned)
- **core/provisioning/strategy/**: Strategy types (`createOnly`, `merge`, `replace`, `absent`) and normalization
- **core/provisioning/synchronizer/**: Business logic that applies strategies and manages relations
  - `entity-resolver.ts`: `ProvisioningEntityResolver<T>` — resolves Permission/Role entities by name with wildcard support and scope filtering (global, realm, client)
  - `junction-synchronizer.ts`: `ProvisioningJunctionSynchronizer<T>` — ensures junction entries (e.g. RolePermission, UserRole) exist between owner and target entities
  - `{entity}/module.ts`: Per-entity synchronizer composing resolver + junction helpers
- **app/modules/provisioning/sources/**: Data sources that produce `RootProvisioningEntity`
  - `default/`: Built-in defaults (admin user, system client, all permissions/scopes)
  - `file/`: Loads `.json`, `.yaml`, `.ts`, `.js` files from a directory
  - `composite/`: Merges multiple sources with dedup by composite key (`name:realm_id:client_id`)
- **app/modules/provisioning/module.ts**: `ProvisionerModule` — creates shared repository adapter instances and wires them to synchronizers

### Synchronization Order

`GraphProvisioningSynchronizer` processes: permissions → roles → scopes → realms.
`RealmProvisioningSynchronizer` processes per realm: clients → permissions → roles → users → robots → scopes.

### File Structure

```text
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
  {entity}/utils/                   — Validators, helpers
  {entity}/index.ts                 — exports module.ts only

app/modules/http/modules/
  controller.ts                     — Factory methods, wiring

core/provisioning/
  entities/{entity}/types.ts        — Provisioning entity types and validators
  strategy/                         — Strategy enum, types, normalize, validator
  synchronizer/entity-resolver.ts   — ProvisioningEntityResolver<T>
  synchronizer/junction-synchronizer.ts — ProvisioningJunctionSynchronizer<T>
  synchronizer/{entity}/module.ts   — Per-entity synchronizer
  synchronizer/{entity}/types.ts    — Synchronizer context type

app/modules/provisioning/
  module.ts                         — ProvisionerModule (wiring)
  sources/default/module.ts         — DefaultProvisioningSource
  sources/file/module.ts            — FileProvisioningSource
  sources/composite/module.ts       — CompositeProvisioningSource (merge + dedup)
```
