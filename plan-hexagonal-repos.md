# Hexagonal Repository Migration for server-core

## Context
HTTP handlers in `adapters/http/controllers/entities/` directly call `useDataSource()` (72 files, 166 occurrences) and construct TypeORM repositories inline. This violates hexagonal architecture — the adapter layer is coupled to the database layer. The goal is to define domain repository ports in `core/`, implement them in `app/modules/`, and pass them via DIP (constructor injection) to HTTP controllers.

## Design

### Principles
- **DIP via constructor** — repositories are passed as constructor arguments to controllers. No injection tokens or service locator pattern.
- **Handlers become controller methods** — the separate `handlers/{read,write,delete}.ts` files are merged into the controller class, simplifying the code structure.
- **Domain-specific interfaces** — port interfaces expose meaningful methods, not thin TypeORM wrappers.

### Port Interfaces (`core/entities/`)

**Base interface** in `core/entities/repository.ts`:
```typescript
export interface IEntityRepository<T> {
    findMany(query: Record<string, any>): Promise<{ data: T[]; total: number }>;
    findOne(idOrName: string, options?: { realmId?: string; selects?: string[] }): Promise<T | null>;
    findOneBy(where: Record<string, any>): Promise<T | null>;
    create(data: Partial<T>): T;
    merge(entity: T, data: Partial<T>): T;
    save(entity: T): Promise<T>;
    remove(entity: T): Promise<void>;
    validateJoinColumns(data: Partial<T>): Promise<void>;
    checkUniqueness(data: Partial<T>, existing?: T): Promise<boolean>;
}
```

**Entity-specific interfaces** extend with domain methods where needed:
- `IUserRepository` adds: `extendManyWithEA()`, `extendOneWithEA()`, `getColumnNames()`
- `IPermissionRepository` adds: `findPolicyDescendantsTree()`, `assignToAdminRole()`
- Others: base is sufficient

### Adapter Implementations (`app/modules/database/repositories/`)

Each adapter wraps existing TypeORM repository classes from `adapters/database/domains/` and DataSource:

```typescript
export class UserRepositoryAdapter implements IUserRepository {
    constructor(
        private repository: UserRepository,  // existing EARepository subclass
        private dataSource: DataSource,
    ) {}
    // delegates to this.repository and typeorm-extension helpers internally
}
```

For entities without existing custom repository classes (realm, permission), the adapter wraps `dataSource.getRepository(Entity)`.

### Controller Pattern (DIP via constructor, handlers as methods)

Standalone handler functions are moved into controller methods. The controller receives the repository via constructor.

**Before** (current — thin controller delegates to standalone handler functions):
```typescript
// adapters/http/controllers/entities/user/module.ts
@DController('/users')
export class UserController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(@DRequest() req: any, @DResponse() res: any) {
        return getManyUserRouteHandler(req, res);  // delegates to external function
    }
    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(@DPath('id') id: string, @DRequest() req: any, @DResponse() res: any) {
        return deleteUserRouteHandler(req, res);   // delegates to external function
    }
}

// adapters/http/controllers/entities/user/handlers/read.ts
export async function getManyUserRouteHandler(req: Request, res: Response) {
    const dataSource = await useDataSource();           // direct DB coupling
    const repository = new UserRepository(dataSource);  // constructs repo inline
    const query = repository.createQueryBuilder('user');
    // ... 70 lines of query building, permission checks, EA extension ...
    return send(res, { data, meta: { total, ...pagination } });
}

// adapters/http/controllers/entities/user/handlers/delete.ts
export async function deleteUserRouteHandler(req: Request, res: Response) {
    const dataSource = await useDataSource();
    const repository = new UserRepository(dataSource);
    const entity = await repository.findOneBy({ id });
    // ... permission checks ...
    await repository.remove(entity);
    return sendAccepted(res, entity);
}
```

**After** (handler logic moved into controller methods, repository injected via constructor):
```typescript
// adapters/http/controllers/entities/user/module.ts
@DTags('user')
@DController('/users')
export class UserController {
    constructor(protected repository: IUserRepository) {}

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(@DRequest() req: any, @DResponse() res: any): Promise<User[]> {
        // logic from getManyUserRouteHandler moved here
        const { data, total } = await this.repository.findMany(useRequestQuery(req));

        const permissionChecker = useRequestPermissionChecker(req);
        const identity = useRequestIdentity(req);
        const filtered: User[] = [];
        let filteredTotal = total;
        for (const entity of data) {
            if (identity?.type === 'user' && identity.id === entity.id) {
                filtered.push(entity);
                continue;
            }
            try {
                await permissionChecker.checkOneOf({ ... });
                filtered.push(entity);
            } catch (e) { filteredTotal--; }
        }

        await this.repository.extendManyWithEA(filtered);
        return send(res, { data: filtered, meta: { total: filteredTotal } });
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(@DPath('id') id: string, @DRequest() req: any, @DResponse() res: any) {
        // logic from deleteUserRouteHandler moved here
        const id = useRequestParamID(req);
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.USER_DELETE });
        // ... self-deletion check ...
        const entity = await this.repository.findOneBy({ id });
        if (!entity) throw new NotFoundError();
        await permissionChecker.check({ name: PermissionName.USER_DELETE, input: new PolicyData({ ... }) });
        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;
        return sendAccepted(res, entity);
    }

    // Similarly for add(), edit(), put(), get()
}
```

The `handlers/` directory is deleted entirely — all logic lives in the controller class.

### Wiring in HTTPControllerModule

`app/modules/http/modules/controller.ts` constructs repositories and passes them to controllers:

```typescript
// Before:
UserController,  // bare class reference

// After:
this.createUserController(),  // factory method

// Factory:
async createUserController() {
    const dataSource = await useDataSource();
    const repository = new UserRepositoryAdapter(
        new UserRepository(dataSource), dataSource
    );
    return new UserController(repository);
}
```

This follows the existing pattern of `createAuthorize(container)`, `createToken(container)` etc., but passes the repository directly instead of resolving from a DI container.

## Migration Order (simplest → most complex)

### 1. Realm
- No EARepository, no `isEntityUnique`, already has partial constructor injection
- **New:** `core/entities/realm/types.ts`, `app/modules/database/repositories/realm/repository.ts`
- **Modify:** `adapters/http/controllers/entities/realm/module.ts` (merge handlers in, add constructor)
- **Delete:** `adapters/http/controllers/entities/realm/handlers/` (logic moved to controller)
- **Modify:** `app/modules/http/modules/controller.ts` (add `createRealmController()`)

### 2. Role
- Uses `isEntityUnique()` → encapsulated in `checkUniqueness()`
- Same file pattern as Realm

### 3. Permission
- Adds `findPolicyDescendantsTree()`, `assignToAdminRole()` domain methods
- Transaction handling for admin role assignment moves into repository

### 4. Client
- `ClientCredentialsService` stays in controller method (not repository concern)
- Repository handles `addSelect('client.secret')` in `findOne()`

### 5. Robot
- Similar to Client. `RobotSynchronizationService` stays in controller.

### 6. User (most complex)
- EA support (`extendManyWithEA`, `extendOneWithEA`)
- `getColumnNames()` for OAuth2 scope attribute resolution
- Password handling stays in controller (business logic, not data access)

## Files Per Entity

**New files (3):**
```
core/entities/{entity}/types.ts               (port interface)
core/entities/{entity}/index.ts               (barrel export)
app/modules/database/repositories/{entity}/repository.ts  (adapter)
```

**Modified files (2):**
```
adapters/http/controllers/entities/{entity}/module.ts  (merge handlers, add constructor)
app/modules/http/modules/controller.ts                 (add factory method)
```

**Deleted files (3-4):**
```
adapters/http/controllers/entities/{entity}/handlers/read.ts
adapters/http/controllers/entities/{entity}/handlers/write.ts
adapters/http/controllers/entities/{entity}/handlers/delete.ts
adapters/http/controllers/entities/{entity}/handlers/index.ts
```

## Shared/One-Time Files

**New:**
```
core/entities/repository.ts              (base interface)
app/modules/database/repositories/index.ts        (barrel)
app/modules/database/repositories/{entity}/index.ts  (barrels)
```

**Modified:**
```
core/entities/index.ts                        (re-export base interface)
core/index.ts                                 (re-export)
adapters/http/controllers/entities/{entity}/index.ts  (update exports, remove handler re-exports)
```

## Key Reference Files
- `core/oauth2/client/types.ts` — example port interface pattern
- `app/modules/oauth2/repositories/client/repository.ts` — example adapter wrapping `Repository<Client>`
- `app/modules/http/modules/controller.ts` — where factory methods go (existing: `createAuthorize()`, `createToken()`)
- `adapters/database/domains/user/repository.ts` — existing `UserRepository extends EARepository` to wrap
- `adapters/http/controllers/entities/user/handlers/{read,write,delete}.ts` — logic to merge into controller

## Verification
- `npm run build` — all packages compile
- `npm run test` — existing tests pass
- Verify no remaining `useDataSource()` calls in modified controller files
- Each entity's CRUD endpoints work via API
