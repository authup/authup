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
import type { IPermissionEvaluator } from '@authup/access';
import type { Identity } from '@authup/core-kit';

export type ActorContext = {
    permissionEvaluator: IPermissionEvaluator;
    identity?: Identity;
};
```

- `permissionEvaluator` — evaluates permissions (`evaluate`, `preEvaluate`, `evaluateOneOf`, `preEvaluateOneOf`)
- `identity` — the actor's identity (user, client, robot)

#### RequestPermissionEvaluator

The HTTP adapter provides `RequestPermissionEvaluator` — the concrete `IPermissionEvaluator` implementation for HTTP requests. It wraps the base `PermissionEvaluator` with request-scoped identity/scope enrichment. Set on each request by the authorization middleware.

```typescript
// adapters/http/request/helpers/actor.ts
export function buildActorContext(req: Request): ActorContext {
    const identity = useRequestIdentity(req);
    return {
        permissionEvaluator: useRequestPermissionEvaluator(req),
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
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });
        await this.repository.validateJoinColumns(validated);

        // Realm defaulting — always default to actor's realm
        if (!validated.realm_id && actor.identity) {
            validated.realm_id = this.getActorRealmId(actor) || null;
        }

        await actor.permissionEvaluator.evaluate({
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
| **Junction** | client-permission, robot-permission, user-permission, client-scope, role-permission, permission-policy | Validator (UUID fields), validateJoinColumns populates join entities, duplicate check on unique key, realm_id extraction from joins |
| **Junction with superset check** | client-role, robot-role, user-role, identity-provider-role-mapping | Same as junction + `identityPermissionProvider.isSuperset()` in service to verify actor owns all permissions in target role |
| **Attribute** | role-attribute, user-attribute | Per-record permission filtering in `getMany`, managed under parent entity's UPDATE permission |
| **Complex with secrets** | client, robot | Uses `{Entity}CredentialsService` for secret handling, per-record secret filtering in `getMany` |
| **Complex with self-access** | client, robot, user | Self-edit fallback via `{ENTITY}_SELF_MANAGE` permission with ATTRIBUTE_NAMES policy, self-access detection in `getOne`, name-lock protection (user) |
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

`ProvisionerModule` runs (1) `GraphProvisioningSynchronizer`, (2) backfill via `assignDefaultPolicy` (config-gated, deprecated).

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

## Realm Scoping Model

### Entity Categories

| Category | Entities | `realm_id: null` allowed |
|----------|----------|--------------------------|
| **Global** | permission, role, scope, policy | Yes — system-level building blocks reusable across realms |
| **Realm-bound** | client, robot, user | No — always belong to a specific realm |
| **Junction** | role-permission, user-role, etc. | Inherit realm from parent entities |

### Realm Defaulting

All entity services default `realm_id` to the actor's realm when not provided:

```typescript
if (!validated.realm_id && actor.identity) {
    validated.realm_id = this.getActorRealmId(actor) || null;
}
```

To create a global entity (`realm_id: null`), the caller must explicitly pass `realm_id: null`. The policy engine controls whether the actor is authorized to do so.

### Policy-Based Access Control

There is no special "master realm" bypass. Access control is entirely policy-driven:

- `system.realm-match` policy with `attribute_null_match_all: true` allows any realm to access global entities (`realm_id: null`)
- `system.realm-match` policy with `identity_master_match_all: false` — no special master realm privileges
- `system.realm-bound` policy (ATTRIBUTES type: `{ realm_id: { $ne: null } }`) restricts actors to realm-scoped entities only

### Admin Roles

| Role | Scope | Junction Policy |
|------|-------|-----------------|
| `admin` | All permissions, no restrictions | None |
| `realm_admin` | All permissions except `realm_create`, `realm_update`, `realm_delete` | `system.realm-bound` on each role-permission entry |

## Policy-Permission Model (n:m)

Permissions reference policies through a junction table (`auth_permission_policies`), not a direct FK. Each permission has a `decision_strategy` (default: `unanimous`) controlling how multiple policies are combined.

### Evaluation Layers

```
Layer 1: Permission-level policies (from auth_permission_policies)
  └── system.default (composite, UNANIMOUS)
        ├── system.identity
        ├── system.permission-binding
        └── system.realm-match

Layer 2: Junction-level policy (from role-permission.policy_id, user-permission.policy_id, etc.)
  └── e.g. system.realm-bound
```

Both layers must pass for access to be granted. Layer 1 is evaluated by the `PermissionEvaluator` in `@authup/access`. Layer 2 is evaluated by the server-core `PermissionBindingPolicyEvaluator`.

### PermissionBinding Type

```typescript
// packages/access/src/permission/types.ts
export type PermissionBinding = {
    permission: {
        name: string,
        client_id?: string | null,
        realm_id?: string | null,
        decision_strategy?: string | null,
    },
    policies?: PolicyWithType[],
};
```

A permission binding wraps a permission entity with its associated policies. The permission is uniquely identified by `name + client_id + realm_id`. The `policies` array contains:
- **Permission-level** (Layer 1): n:m policies from `auth_permission_policies` (loaded by `PermissionDatabaseProvider`)
- **Junction-level** (Layer 2): the single junction policy from `role_permission.policy_id` etc. (loaded by `getBoundPermissions()`)

## Security: Permission Assignment

### Superset Check

When assigning a role to an identity or identity-provider (user-role, client-role, robot-role, identity-provider-role-mapping), the service verifies the actor owns all permissions in the target role. The check is **policy-aware**:

1. Merge actor's bindings per permission (using `mergePermissionBindings` with AFFIRMATIVE strategy)
2. Merge target's bindings per permission
3. For each target permission: if actor's merged binding has policies but target's doesn't → fail (actor is more restricted)

An actor with both `admin` (unrestricted) and `realm_admin` (restricted) roles gets unrestricted access — the merge uses AFFIRMATIVE (least restrictive wins).

### Junction Policy Propagation

When creating any permission-binding junction (role-permission, user-permission, client-permission, robot-permission):

1. The service calls `this.identityPermissionProvider.resolveJunctionPolicy(identity, { name, realm_id, client_id })`
2. This loads and merges the actor's bindings for that permission
3. If the merged result has policies, the first policy is set as `policy_id` on the new junction entry
4. If `data.policy_id` is already set explicitly, propagation is skipped

This prevents privilege escalation: a `realm_admin` cannot create unrestricted permission bindings.

### mergePermissionBindings

When merging duplicate permission bindings (same `name + client_id + realm_id`):

- If **any** binding has no policies → merged result has **no policies** (unrestricted)
- If all bindings have policies → each binding's policies are wrapped in a composite with that binding's `decision_strategy` (defaulting to `UNANIMOUS` when `null`/`undefined`), then all composites are combined under an outer AFFIRMATIVE composite (any-one-passes)

## Self-Edit Pattern (declarative field denylists)

Identities (clients, robots, users) can update their own properties via dedicated `*_SELF_MANAGE` permissions, with admin-only fields constrained by an inverted ATTRIBUTE_NAMES policy attached to each permission. There is no hardcoded field-stripping in the services — the access decision is fully data-driven.

### Permissions

| Permission | Identity type | Denylist policy |
|---|---|---|
| `client_self_manage` | client | `system.client-names-self-manage` (`invert: true`) |
| `robot_self_manage` | robot | `system.robot-names-self-manage` (`invert: true`) |
| `user_self_manage` | user (own User columns and own UserAttribute rows) | `system.user-names-self-manage` (`invert: true`) |

Each policy is a built-in `ATTRIBUTE_NAMES` policy with `invert: true`, where `names` enumerates fields a self-edit must REJECT; everything else is permitted. The defaults:

| Policy | Denylist `names` |
|---|---|
| `system.client-names-self-manage` | `active, realm_id, is_confidential, secret_hashed, secret_encrypted` |
| `system.robot-names-self-manage` | `active, realm_id, user_id` |
| `system.user-names-self-manage` | `active, name_locked, status, status_message, realm_id` |

The client denylist additionally blocks `is_confidential` (toggling clears the secret) and the `secret_hashed` / `secret_encrypted` storage flags (downgrading either would persist the secret in plaintext). FK fields like `realm_id` are usually validator-stripped on UPDATE already, but stay in the denylist as defense in depth.

Self-editable fields (e.g. `name`, `display_name`, `email`, `password`, `secret`, `redirect_uri`, etc.) are NOT enumerated — they're permitted by virtue of being absent from the denylist. The validator already strips system-managed columns (`built_in`, `id`, `created_at`, `updated_at`) before they reach the policy, so the denylist only needs to cover what validators let through but admin-only state should still block.

**Trade-off:** denylist semantics are fail-open. A new column added to the entity (e.g. a new `User.role_metadata` field mounted in the validator) is self-editable by default until added to the denylist. When adding admin-only state to an entity, extend the relevant denylist alongside the migration.

### Unified user-namespace policy

`USER_SELF_MANAGE` governs both User column edits and UserAttribute writes. Rationale: a `UserAttribute` row is semantically a single key-value declaration about the user, so its `(name, value)` is mapped to `{ [name]: value }` in `UserAttributeService.create/update` before policy evaluation. The denylist semantic means a user can self-create UserAttributes with arbitrary keys (e.g. `theme`, `language`, `timezone`) — only attribute names that match the denylist are blocked. `UserAttributeService` only takes the self-manage path when the actor lacks `USER_UPDATE`; an admin or other user with `USER_UPDATE` evaluates against `USER_UPDATE` instead and is not subject to the denylist.

UserAttribute names are still filtered against User entity columns by `UserAttributeService.create/update` — any `data.name` that matches a reserved User entity column raises a `BadRequestError`. This prevents confusing rows like `UserAttribute(name='email', value='x')` coexisting with `User.email='y'`. The reserved-name filter and the policy denylist are layered: the policy stops admin-only field names from being declared as UserAttribute keys; the validator-level rejection stops shadowing of normal User columns even when those columns aren't in the denylist.

### Service flow

In `{Client,Robot,User}Service.save()`:

```typescript
let isSelfEdit = false;
if (entity) {
    try {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_UPDATE });
    } catch (e) {
        if (
            !actor.identity ||
            actor.identity.type !== 'client' ||
            actor.identity.data.id !== entity.id
        ) {
            throw e;
        }
        isSelfEdit = true;
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_SELF_MANAGE });
    }
}

// ... validation runs ...

if (isSelfEdit) {
    await actor.permissionEvaluator.evaluate({
        name: PermissionName.CLIENT_SELF_MANAGE,
        input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated }),
    });
}
```

Two-layer rejection:
1. **Validator** silently strips fields it doesn't mount (e.g. `built_in`, `realm_id` on UPDATE) — these never reach the policy.
2. **ATTRIBUTE_NAMES policy** rejects validated fields not in the allowlist (e.g. `active` on a client) — produces a `value_invalid` issue and the request fails.

### preEvaluate auto-exclusion

`preEvaluate` (no input data) automatically skips evaluators that require attributes — `ATTRIBUTES`, `ATTRIBUTE_NAMES`, `REALM_MATCH`. This means binding ATTRIBUTE_NAMES policies to a permission does **not** break gate checks in pre-flight scenarios. The full check happens in the second `evaluate()` call where `validated` data is supplied.

### EA loading on tree roots

`AttributeNamesPolicyValidator` reads the policy's `names` field from extra-attributes (`policy_attributes`). For top-level policies bound directly to permissions, the policy is loaded as the root of a closure-table descendants tree. `EATreeRepository.findDescendantsTree()` calls `extendOneWithEA(entity)` after building the children — without that, the root entity's EA fields stay unloaded and the validator fails with "value_invalid". Both Layer 1 (`PermissionDatabaseProvider`) and Layer 2 (`bindings.ts`) depend on this fix.

## OAuth2 Token Endpoint Authentication

The `/token` endpoint authenticates the calling client according to RFC 6749. Confidential clients MUST present a `client_secret`; public clients identify with `client_id` only.

### Per-grant requirements

| Grant | Client auth requirement |
|---|---|
| `client_credentials` | Authentication is the grant's purpose. Confidential client only — public clients are rejected. |
| `authorization_code` | Confidential client MUST authenticate (RFC §4.1.3). Authenticated `client_id` MUST match the auth code's bound `client_id` — mismatch = `invalid_grant`. |
| `refresh_token` | Confidential client MUST authenticate (RFC §6). If the refresh token's payload has `client_id`, the request MUST authenticate as that client. Authenticated `client_id` MUST match — mismatch = `invalid_grant`. Tokens with no bound client may refresh without auth (legacy/no-client flow). |
| `password` | Confidential client MUST authenticate (RFC §4.3.2). The token's `client_id` claim and the OpenID `aud` claim use the **authenticated** client's id, not any user-side association. |
| `robot_credentials` | Authentication is the grant's purpose (Authup-specific extension). |

### Credential transport

Per RFC 6749 §2.3.1, the server MUST NOT support multiple authentication methods in one request. Authup enforces this:

- Body: `client_id` and `client_secret` form parameters
- Header: `Authorization: Basic base64(client_id:client_secret)`
- Both at once → `invalid_request`

`extractClientCredentialsFromRequest` (`adapters/http/adapters/oauth2/grant-types/utils/credentials.ts`) is the shared helper enforcing this. Used by all grants that authenticate clients.

### `OAuth2ClientAuthenticator`

Single core class (`core/oauth2/client/authenticator.ts`) used by `authorization_code`, `refresh_token`, and `password` grants. Resolves the client by id/name, verifies `is_confidential`, and:
- Confidential: requires `client_secret` and verifies via `ClientCredentialsService.verify`
- Public: returns the client without secret check

Distinct from `ClientAuthenticator` (`core/authentication/entities/client/module.ts`) which is used for `client_credentials` grant — that one rejects public clients outright since they can't authenticate themselves with credentials.

### PKCE for public clients

`/authorize` rejects public clients without `code_challenge` when an authorization code will be issued (RFC 7636 §4.4.1, OAuth 2.1). At `/token`, the code verifier double-checks: if the resolved client is public and the auth code has no challenge stored, reject. Defense in depth in case the authorize-side check was bypassed or the client's `is_confidential` flag changed mid-flow.

`code_challenge_method` defaults to `plain` per RFC 7636 §4.3 — only `S256` triggers SHA-256 verification.

## Provisioning Permissions With Policies

`PermissionProvisioningEntity.relations.policies` is a list of policy names to attach to the permission via the `auth_permission_policies` junction. Used by the default provisioning source to wire `system.default` (security baseline) plus the optional ATTRIBUTE_NAMES allowlist:

```typescript
{
    attributes: { name: PermissionName.CLIENT_SELF_MANAGE, built_in: true },
    relations: {
        policies: [
            SystemPolicyName.DEFAULT,
            SystemPolicyName.CLIENT_NAMES_SELF_MANAGE,
        ],
    },
}
```

`PermissionProvisioningSynchronizer.synchronizePolicies()` resolves each name to a policy ID and inserts the junction. Idempotent — re-runs do not create duplicates. Throws `policy '<name>' not found` if a referenced policy is not provisioned, and `repositories must be wired` if relations are declared but the synchronizer was constructed without `policyRepository`/`permissionPolicyRepository`.
