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
| core/entities       | Repository port interfaces, service port interfaces, and service implementations (business logic for each entity)                          |
| core/provisioning   | Provisioning business logic: entity types, strategies, synchronizers, entity resolver and junction synchronizer helpers                     |
| core/di             | Dependency injection setup                                                                                                                 |

### 2. adapters/ — External Systems

Adapters connect the core logic to external systems.

| Folder                | Responsibility                                                   |
|-----------------------|------------------------------------------------------------------|
| adapters/database     | Database migrations & entities                                   |
| adapters/http         | Thin HTTP controllers (delegate to core services), middlewares, request helpers (ActorContext bridge) |
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

### Service Pattern (Core Business Logic)

Each entity has a service that encapsulates all business logic: permission checks, validation, realm defaulting, uniqueness checks, and entity persistence. Services are defined in `core/entities/{entity}/`.

#### ActorContext

Services receive an `ActorContext` instead of a raw HTTP request. This decouples business logic from HTTP:

```typescript
// core/entities/actor/types.ts
import type { IPermissionChecker } from '@authup/access';
import type { Identity } from '@authup/core-kit';

export type ActorContext = {
    permissionChecker: IPermissionChecker;
    identity?: Identity;
};
```

The HTTP adapter builds this from the request:

```typescript
// adapters/http/request/helpers/actor.ts
export function buildActorContext(req: Request): ActorContext {
    const permissionChecker = useRequestPermissionChecker(req);
    const identity = useRequestIdentity(req);
    return {
        permissionChecker,
        identity: identity ? identity.raw : undefined,
    };
}
```

#### Service Interface

Defined in `core/entities/{entity}/types.ts` alongside the repository interface:

```typescript
export interface IRoleService {
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<Role>>;
    getOne(idOrName: string, actor: ActorContext): Promise<Role>;
    create(data: Record<string, any>, actor: ActorContext): Promise<Role>;
    update(idOrName: string, data: Record<string, any>, actor: ActorContext): Promise<Role>;
    save(idOrName: string | undefined, data: Record<string, any>, actor: ActorContext, options?: { updateOnly?: boolean }): Promise<{ entity: Role, created: boolean }>;
    delete(id: string, actor: ActorContext): Promise<Role>;
}
```

Interface conventions:
- `data` is always `Record<string, any>` (raw body) — validation happens inside the service
- `actor` is always `ActorContext`
- Return domain types from `@authup/core-kit`, never HTTP response objects
- `save()` is the upsert method for `PUT /:id` — resolves entity, delegates to create or update
- Junction entities (client-permission, role-permission, etc.) only have `getMany`, `getOne`, `create`, `delete` (no update/save)

#### Service Implementation

Services extend `AbstractEntityService` and implement the entity's `I{Entity}Service` interface:

```typescript
// core/entities/role/service.ts
export class RoleService extends AbstractEntityService implements IRoleService {
    protected repository: IRoleRepository;
    protected validator: RoleValidator;

    constructor(ctx: RoleServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new RoleValidator();
    }

    async create(data: Record<string, any>, actor: ActorContext): Promise<Role> {
        await actor.permissionChecker.preCheck({ name: PermissionName.ROLE_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });
        await this.repository.validateJoinColumns(validated);

        // Realm defaulting for non-master realm members
        if (!validated.realm_id && actor.identity) {
            if (!this.isActorMasterRealmMember(actor)) {
                validated.realm_id = this.getActorRealmId(actor) || null;
            }
        }

        await actor.permissionChecker.check({
            name: PermissionName.ROLE_CREATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated }),
        });

        await this.repository.checkUniqueness(validated);

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);
        return entity;
    }
}
```

`AbstractEntityService` provides shared helpers:
- `isActorMasterRealmMember(actor)` — checks if the actor belongs to the master realm
- `getActorRealmId(actor)` — extracts the actor's realm ID from their identity

Service responsibility:
- Permission pre-checks and full checks with `PolicyData`
- Input validation using validators from `@authup/core-kit` (e.g., `RoleValidator`, `UserValidator`)
- Join column validation via `repository.validateJoinColumns()`
- Uniqueness checks via `repository.checkUniqueness()`
- Realm defaulting, built-in entity protection, name-lock enforcement
- Entity creation, merging, and persistence
- Returns domain objects (no HTTP response formatting)

#### Entity-Specific Service Patterns

| Category | Examples | Service Characteristics |
|---|---|---|
| **Simple CRUD** | role, scope, realm, permission | Validator + validateJoinColumns + checkUniqueness + permission checks |
| **Junction** | client-permission, robot-permission, user-permission, client-scope, role-permission | No validator (just UUID fields), validateJoinColumns populates join entities, realm_id extraction from joins |
| **Junction with superset check** | client-role, robot-role, user-role | Service does permission checks + save; controller additionally calls `validateJoinColumns` + `identityPermissionService.isSuperset()` before delegating to service (superset check requires adapter-level `RequestIdentity`) |
| **Attribute** | role-attribute, user-attribute | Per-record permission filtering in `getMany`, managed under parent entity's UPDATE permission |
| **Complex with secrets** | client, robot | Uses `{Entity}CredentialsService` for secret handling, per-record secret filtering in `getMany` |
| **Complex with self-access** | user | Self-edit fallback (strips restricted fields), self-access detection in `getOne`, name-lock protection |
| **Policy** | policy | Built-in protection, parent type validation, uses PERMISSION_* permissions (intentional — policies are managed under permission domain) |

#### Workflow Services

Non-entity workflows live under `core/identity/`:

| Service | Location | Responsibility |
|---|---|---|
| `RegistrationService` | `core/identity/registration/` | User registration (`register`) and account activation (`activate`) |
| `PasswordRecoveryService` | `core/identity/password-recovery/` | Forgot password (`forgotPassword`) and reset password (`resetPassword`) |

These services own their own validation (inline validators, not from `@authup/core-kit`), and accept `Record<string, any>` raw data.

Workflow services receive options via their context type:

```typescript
export type RegistrationServiceOptions = {
    registrationEnabled?: boolean,
    emailVerificationEnabled?: boolean,
};

export type PasswordRecoveryServiceOptions = {
    passwordRecoveryEnabled?: boolean,
    emailVerificationEnabled?: boolean,
};
```

Feature gates check these options before proceeding (e.g. `if (!this.options.registrationEnabled) throw ...`). Options are wired from app config in `app/modules/http/modules/controller.ts`.

**Mail rollback pattern:** When a service persists an entity and then sends an email (e.g. registration activation), wrap the mail call in try/catch. On failure, remove the entity and throw — don't leave orphaned records.

### Thin Controller Pattern (HTTP Adapter)

Controllers are thin HTTP adapters. They extract input from the request, build an `ActorContext`, delegate to the service, and format the HTTP response:

```typescript
export type RoleControllerContext = {
    service: IRoleService,
};

@DController('/roles')
export class RoleController {
    protected service: IRoleService;

    constructor(ctx: RoleControllerContext) {
        this.service = ctx.service;
    }

    @DGet('')
    async getMany(@DRequest() req: any, @DResponse() res: any): Promise<any> {
        const actor = buildActorContext(req);
        const { data, meta } = await this.service.getMany(useRequestQuery(req), actor);
        return send(res, { data, meta });
    }

    @DPost('')
    async add(@DBody() data: any, @DRequest() req: any, @DResponse() res: any): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.create(useRequestBody(req), actor);
        return sendCreated(res, entity);
    }

    @DDelete('/:id')
    async drop(@DPath('id') id: string, @DRequest() req: any, @DResponse() res: any): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.delete(useRequestParamID(req), actor);
        return sendAccepted(res, entity);
    }
}
```

Controller conventions:
- Return type is always `Promise<any>`
- **No business logic** — no permission checks, no validation, no entity manipulation
- Extract body via `useRequestBody(req)` from `@routup/basic/body`
- Extract query via `useRequestQuery(req)` from `@routup/basic/query`
- Build actor via `buildActorContext(req)`
- Delegate all work to `this.service.*()` methods
- Format response with `send()`, `sendCreated()`, `sendAccepted()` from `routup`

Exceptions where controllers retain some logic:
- **Superset junction controllers** (client-role, robot-role, user-role): Call `repository.validateJoinColumns()` and `identityPermissionService.isSuperset()` before delegating to service, because the superset check requires adapter-specific `RequestIdentity`
- **Self-access resolution** (client, robot, user): Resolve `@me`/`@self` tokens to actual IDs before delegating
- **Infrastructure concerns** (robot): Robot synchronization after save/delete uses infrastructure-level singletons

### Wiring (Module Layer)

Factory methods in `app/modules/http/modules/controller.ts` wire repositories, services, and controllers:

```typescript
createRoleController(container: IDIContainer) {
    const dataSource = container.resolve<DataSource>(DatabaseInjectionKey.DataSource);
    const repository = new RoleRepositoryAdapter(dataSource);
    const service = new RoleService({ repository });
    return new RoleController({ service });
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
  - `default/`: Built-in defaults (system policies, admin user, system client, all permissions/scopes)
  - `file/`: Loads `.json`, `.yaml`, `.ts`, `.js` files from a directory
  - `composite/`: Merges multiple sources with dedup by composite key (`name:realm_id:client_id`)
- **app/modules/provisioning/module.ts**: `ProvisionerModule` — creates shared repository adapter instances and wires them to synchronizers

### Synchronization Order

`ProvisionerModule` delegates to `GraphProvisioningSynchronizer`, then runs backfill (config-gated).

`GraphProvisioningSynchronizer` processes in order: policies → permissions → roles → scopes → realms.
`RealmProvisioningSynchronizer` processes per realm: clients → permissions → roles → users → robots → scopes.

### File Structure

```text
core/entities/
  types.ts                          — IEntityRepository<T>, EntityRepositoryFindManyResult<T>
  service.ts                        — AbstractEntityService base class
  actor/types.ts                    — ActorContext type definition
  actor/index.ts                    — barrel export
  {entity}/types.ts                 — I{Entity}Repository, I{Entity}Service interfaces
  {entity}/service.ts               — {Entity}Service implements I{Entity}Service (business logic)
  {entity}/index.ts                 — barrel export
  index.ts                          — barrel re-exports all entities

core/identity/
  registration/types.ts             — IRegistrationService interface
  registration/service.ts           — RegistrationService (register + activate)
  password-recovery/types.ts        — IPasswordRecoveryService interface
  password-recovery/service.ts      — PasswordRecoveryService (forgot + reset)

app/modules/database/repositories/
  {entity}/repository.ts            — {Entity}RepositoryAdapter implements I{Entity}Repository
  {entity}/index.ts                 — barrel export
  index.ts                          — barrel re-exports all adapters

adapters/http/controllers/entities/
  {entity}/module.ts                — Thin controller class (HTTP adapter only)
  {entity}/index.ts                 — exports module.ts only

adapters/http/controllers/workflows/
  register/module.ts                — Thin RegisterController → IRegistrationService
  activate/module.ts                — Thin ActivateController → IRegistrationService
  password-forgot/module.ts         — Thin PasswordForgotController → IPasswordRecoveryService
  password-reset/module.ts          — Thin PasswordResetController → IPasswordRecoveryService

adapters/http/request/helpers/
  actor.ts                          — buildActorContext(req) bridge function

app/modules/http/modules/
  controller.ts                     — Factory methods: creates repositories, services, and controllers

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
