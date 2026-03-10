# Hexagonal Repository Migration for server-core

## Context
HTTP handlers in `adapters/http/controllers/entities/` directly call `useDataSource()` and construct TypeORM repositories inline. This violates hexagonal architecture. The goal is to define domain repository ports in `core/`, implement them in `app/modules/database/repositories/`, and pass them via DIP (constructor injection) to HTTP controllers.

## Completed

### Base interface (`core/entities/types.ts`)
`IEntityRepository<T>` now contains all common methods:
- `findMany`, `findOneById`, `findOneByName`, `findOneByIdOrName`, `findOneBy`
- `create`, `merge`, `save`, `remove`, `validateJoinColumns`
- Also exports `EntityRepositoryFindManyResult<T>` (uses `PaginationParseOutput` from `rapiq`)

### Realm (entity #1 — complete)
- **Port:** `core/entities/realm/types.ts` — `IRealmRepository extends IEntityRepository<Realm>` (empty, base is sufficient)
- **Adapter:** `app/modules/database/repositories/realm/repository.ts` — `RealmRepositoryAdapter` wraps `dataSource.getRepository(RealmEntity)`
- **Controller:** `adapters/http/controllers/entities/realm/module.ts` — handlers merged into class methods, receives `IRealmRepository` via constructor context
- **Wiring:** `app/modules/http/modules/controller.ts` — `createRealmController()` async factory, awaited before passing to decorators
- **Index:** `adapters/http/controllers/entities/realm/index.ts` — only exports `module.ts` (no more handler re-exports)
- **Barrel exports:** `core/entities/index.ts`, `app/modules/database/index.ts` updated

### Identity repositories updated
`IEntityRepository` base was expanded, so identity repos needed the new methods:
- `ClientIdentityRepository` — `findOneByIdOrName`, `findOneBy` implemented; CRUD methods throw `Method not implemented.`
- `RobotIdentityRepository` — same pattern
- `UserIdentityRepository` — same pattern

The `Method not implemented.` stubs will be replaced with real implementations when those entities get their full repository adapters.

## Remaining Entities (in order)

### 2. Role
- Uses `isEntityUnique()` → encapsulate in `checkUniqueness()` on the repository
- **Handler files to merge:** `adapters/http/controllers/entities/role/handlers/{read,write,delete}.ts`
- **Existing TypeORM repo:** `RoleRepository extends EARepository<RoleEntity, RoleAttributeEntity>` in `adapters/database/domains/role/repository.ts`
- Role has `getBoundPermissions()`, `getBoundPermissionsForMany()`, `clearBoundPermissionsCache()` — these stay on the database-layer repo, not the port

### 3. Permission
- More complex: write handler uses `PolicyRepository.findDescendantsTree()` and creates `RolePermissionEntity` in a transaction
- Port interface needs extra domain methods: `findPolicyDescendantsTree()`, `assignToAdminRole()`
- **Handler files:** `adapters/http/controllers/entities/permission/handlers/{read,write,delete,check}.ts` (also has `check.ts`)
- No existing custom TypeORM repo class — uses `dataSource.getRepository(PermissionEntity)` directly

### 4. Client
- `ClientCredentialsService` stays in controller (business logic)
- Repository needs to handle `addSelect('client.secret')` for sensitive field loading
- **Existing TypeORM repo:** `ClientRepository extends Repository<ClientEntity>` in `adapters/database/domains/client/repository.ts`
- **Handler files:** `adapters/http/controllers/entities/client/handlers/{read,write,delete}.ts`

### 5. Robot
- Similar to Client
- `RobotSynchronizationService` stays in controller
- Robot write handler has an `integrity.ts` handler too
- **Existing TypeORM repo:** `RobotRepository extends Repository<RobotEntity>` in `adapters/database/domains/robot/repository.ts`
- **Handler files:** `adapters/http/controllers/entities/robot/handlers/{read,write,delete,integrity}.ts`

### 6. User (most complex)
- EA support: `extendManyWithEA()`, `extendOneWithEA()` from `UserRepository extends EARepository`
- `getColumnNames()` for OAuth2 scope attribute resolution (uses `repository.metadata.columns`)
- Password handling via `UserCredentialsService` stays in controller
- Self-token handling (`isSelfToken()`) stays in controller
- **Existing TypeORM repo:** `UserRepository extends EARepository<UserEntity, UserAttributeEntity>` in `adapters/database/domains/user/repository.ts`
- **Handler files:** `adapters/http/controllers/entities/user/handlers/{read,write,delete}.ts`

## Pattern (follow Realm as reference)

### Per entity, create:
```
core/entities/{entity}/types.ts               — I{Entity}Repository extends IEntityRepository<{Entity}>
core/entities/{entity}/index.ts               — barrel export
app/modules/database/repositories/{entity}/repository.ts  — {Entity}RepositoryAdapter implements I{Entity}Repository
app/modules/database/repositories/{entity}/index.ts       — barrel export
```

### Per entity, modify:
```
adapters/http/controllers/entities/{entity}/module.ts  — merge handlers into class, add constructor(repository)
adapters/http/controllers/entities/{entity}/index.ts   — remove handler re-exports
app/modules/http/modules/controller.ts                 — add async createXxxController() factory
app/modules/database/repositories/index.ts             — add re-export
core/entities/index.ts                                 — add re-export
```

### Per entity, dead code after migration:
```
adapters/http/controllers/entities/{entity}/handlers/   — entire directory
```

### Controller pattern:
- Constructor receives repository via context object (e.g. `{ repository: I{Entity}Repository, options?: ... }`)
- Handler logic from `handlers/read.ts` → `getMany()`, `get()` methods
- Handler logic from `handlers/write.ts` → `add()`, `edit()`, `put()` delegate to private `write()` method
- Handler logic from `handlers/delete.ts` → `drop()` method
- Return types: `Promise<any>` (send/sendAccepted/sendCreated return void)
- Permission checks, validation, business logic stay in controller

### Wiring pattern:
- `HTTPControllerModule` gets async factory: `async createXxxController()`
- Factory calls `await useDataSource()`, constructs adapter, constructs controller
- Instance is awaited before the `decorators({ controllers: [...] })` call
- Use `const xxxController = await this.createXxxController(container);` at top of `mount()`

### Repository adapter pattern:
- Constructor takes `DataSource`
- Internal TypeORM repo: `this.repository = dataSource.getRepository(XxxEntity)` (or `new XxxRepository(dataSource)` for entities with custom repos)
- `findMany()`: uses `createQueryBuilder` + `applyQuery()` with entity-specific field/filter/sort config, returns `EntityRepositoryFindManyResult<T>`
- `findOneByIdOrName()`: UUID detection via `isUUID()`, query builder with conditional where
- `findOneBy()`: delegates to `this.repository.findOneBy(where)`
- `create/merge/save/remove`: delegate to TypeORM repository
- `validateJoinColumns()`: calls `validateEntityJoinColumns(data, { dataSource, entityTarget })`
- `checkUniqueness()`: calls `isEntityUnique({ dataSource, entityTarget, entity, entityExisting })`

## Key Reference Files
- **Completed realm controller:** `adapters/http/controllers/entities/realm/module.ts`
- **Completed realm adapter:** `app/modules/database/repositories/realm/repository.ts`
- **Base interface:** `core/entities/types.ts` (IEntityRepository + EntityRepositoryFindManyResult)
- **Controller wiring:** `app/modules/http/modules/controller.ts`
- **Existing TypeORM repos:** `adapters/database/domains/{user,client,role,robot,policy}/repository.ts`

## Constraints
- No injection tokens or service locator — DIP via constructor arguments only
- Repository interface names must NOT contain "HTTP" (e.g. `IRealmRepository`, not `IRealmHTTPRepository`)
- Adapter classes named `{Entity}RepositoryAdapter` (e.g. `RealmRepositoryAdapter`)
- Controller method `findOneByIdOrName()` (not `findOne()`)
- `findMany()` returns `EntityRepositoryFindManyResult<T>` with `{ data, meta: { total, ...pagination } }`
- All file paths below are relative to `apps/server-core/src/`

## Verification
- `npm run build` — all packages compile (build passes as of last change)
- `npm run test` — existing tests pass
- Verify no remaining `useDataSource()` calls in migrated controller files
