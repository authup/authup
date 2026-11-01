# Architecture

## Hexagonal Architecture

The project follows hexagonal architecture (ports & adapters), separating core business logic from external systems via well-defined interfaces.

- **Hexagonal Architecture**: Logic separated across packages.
- **Dependency Inversion Principle (DIP)**: Adapters in server-core use DIP to inject implementations from core and app (infrastructure). No injection tokens or service locator. Use DIP via constructor arguments directly.
- **TypeScript & ESM**: All packages use TypeScript with strict typing and modern ES module syntax.

### Naming split

Entity/domain properties and the management API (request payloads, responses, and
the rapiq filter/sort/field vocabulary) are **camelCase**. The physical **DB column
names stay snake_case**, pinned per column by an explicit
`@Column({ name: 'realm_id' })` on every camelCase property (and
`@JoinColumn({ name })` on every relation). Deliberately NOT a global naming
strategy: an explicit name is immune to a transform edge-case silently mismapping a
future column (a divergence the `synchronize()`-based sqlite tests would not catch,
since they stay self-consistent) and to a single global point of failure. TypeORM
still translates camelCase property paths (`role.realmId`, `entity.createdAt`) onto
those columns, so repository query-builder strings use property paths, not column
names.

**The casing rule: snake_case only where a spec defines the key; everything authup
defines is camelCase** (#3769). The OAuth2/OIDC protocol surface (endpoint params, JWT
claims, introspection/discovery fields) and JWT payloads are **frozen snake_case**, and so
is an authup key riding a spec-defined response next to the spec's own members (the
introspection's `permissions` grant list, `sub_kind`, `realm_name`). Everything else authup
defines is camelCase, including the non-CRUD routes a resource server reads: the
authorization catalog (`GET /authorization`) and the batch check
(`POST /authorization/check`) are management API for casing purposes, since neither is
part of OAuth2/OIDC. Treating those two as protocol extensions and keeping them snake_case
was rejected: no spec defines them, and it would split the management API's casing by
audience. Table names, enum string values (permission/role/scope/event names), env vars
and config keys stay as they are.

## apps/server-core

The server-core package contains the server-side logic, organized into three layers:

### 1. core/: Domain & Business Logic

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

### 2. adapters/: External Systems

Adapters connect the core logic to external systems.

| Folder                | Responsibility                                                   |
|-----------------------|------------------------------------------------------------------|
| adapters/database     | Database migrations & entities                                   |
| adapters/http         | Thin HTTP controllers (delegate to core services), middlewares, request helpers (ActorContext bridge) |
| adapters/shared       | Shared adapters such as LDAP                                     |

### 3. app/modules/: Orchestration & Bootstrapping

Modules wire together adapters, ports, and core logic. Configure app startup, register adapters, and set up dependency injection.

| Folder                       | Responsibility                                                                                             |
|------------------------------|------------------------------------------------------------------------------------------------------------|
| app/modules/config           | Reads environment variables and configuration files. `constants.ts` SELECTS this service's keys out of `@authup/server-config` (which declares every key of the document once) and `@authup/server-config-kit` is the generic mechanism over such a registry; the env reader, the file reader, the validator and the static defaults all derive from the selection |
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
| app/modules/swagger          | API documentation generation. The document itself is built by `trapi generate`, never at runtime; this only serves it (see *Query vocabulary discovery*) |
| app/modules/provisioning     | Wires repository adapters to core provisioning synchronizers; hosts provisioning sources (default, file, composite) |

## Repository Pattern (Ports & Adapters)

### Port Interfaces

Defined in `@authup/server-kit` (re-exported from `@authup/server-kit/core`), these are the contracts that adapters must implement:

```typescript
import type { IQuery } from '@rapiq/core';

export type EntityRepositoryFindManyResult<T> = {
    data: T[],
    meta: EntityRepositoryPaginationMeta & { total: number }
};

export interface IEntityRepository<T extends ObjectLiteral = ObjectLiteral> {
    findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<T>>;
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

`findMany` (and the per-entity `findOne`/`findAllByQuery` variants that carry a
query) take the **rapiq IR** (`IQuery`), never a raw wire query: decoding is
the service layer's job (see *Query IR flow* below).

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
| **Junction/association** | client-permission, client-role, user-role | None (base is sufficient) |
| **Complex with secrets** | client | `checkUniqueness()`, `findOneWithSecret()` |
| **Complex with EA** | user, policy, identity-provider | `checkUniqueness()`, `saveWithEA()`, `deleteFromTree()`, `findByProtocol()` |

EA = Extra Attributes (key-value pairs stored in a separate table, dynamically loaded onto the entity).

### Adapter Implementation

Adapters live in `app/modules/database/repositories/` and are named `{Entity}RepositoryAdapter`. Most extend **`EntityRepositoryAdapter<T, R = Repository<T>>`** (`repositories/entity/`), the one TypeORM implementation of the port, configured per entity. An adapter declares its options and adds only what is bespoke to its entity:

```typescript
export class UserRoleRepositoryAdapter extends EntityRepositoryAdapter<UserRole> implements IUserRoleRepository {
    constructor(repository: Repository<UserRole>) {
        super(repository, {
            alias: 'userRole',
            target: UserRoleEntity,
            entity: 'user role',                        // the conflict message: "The user role already exists."
            realmScope: { column: 'userRealmId' },      // columns a `fields=` projection must not strip
        });
    }
}
```

The options (`EntityRepositoryAdapterOptions`): `alias`, `target`, `entity`; `realmScope` (`column`, default `realmId`, plus `extraColumns`: what the per-row realm gate reads, force-selected after `applyQuery`; unset for a list with no per-row gate, i.e. identity provider); `realmRepository` (the entity has names; without it `findOneByName` answers `null` and `findOneByIdOrName` is a lookup by id, which is every junction and attribute table); `nameColumn` (default `name`; the path adapter looks up by `path`); `lockRows` (the instance a `transaction()` hands its callback reads `FOR UPDATE`). What the base guarantees, once for all of them:

- **`findMany`** groups by id, executes the decoded IR through `applyQuery`, force-selects the `realmScope` columns and reads through `fetchMany`, the only fetch the field redaction runs on (#3329). **`findOneWithQuery`**, the record read that applies a `fields=` projection (`UserService.getOne` via the user adapter's `findOne`), force-selects them too, plus `id`: `GET /users/:id?fields=name` otherwise returned a foreign-realm user to a `realm_admin`, since the stripped `realmId` left the per-row realm check nothing to match (pinned in `realm-isolation-field-projection.spec.ts`). The client record read is gated on realm reach for every foreign row, so its adapter sets `realmScope` too.
- **Extension runs on reads that answer a caller, never on the read a write loads through.** `findMany`, `findOneById`, `findOneByName` and the protected `findOneWithQuery` call the overridable `extendMany` / `extendOne` (no-ops by default); `findOneBy` and `findManyBy` never do. That is the extra-attribute read/write rule as structure rather than convention: policy and user load their attributes there, identity-provider loads and decrypts its secrets on single reads only, since its list is the anonymous login surface.
- **A name lookup scoped to an unknown realm matches nothing** (`IRealmRepository.resolveId`, fail closed), and a non-uuid id is "no row" before the query (`hasUnmatchableId`, #3650: every by-id lookup returns `null` for it, so every dialect answers 404 where postgres would otherwise refuse the bind with `22P02`; filter operands get the same treatment from the rapiq adapter, #3647).
- **Every write answers a unique-index refusal with `EntityConflictError` (409)**, the losing side of a race `checkUniqueness` cannot close. `save` runs through the protected `persist(write)`, and so does every write an adapter adds besides it (policy and identity-provider `saveWithEA`, which the services and the policy provisioner write through); a new write that skips `persist` answers the race with a 500 again. Recognizable by `isEntityConflictError`, which `ensurePath` and the federated account manager rely on to re-read the winner. `checkUniqueness` throws the same error, so a caller sees one conflict type whichever of the two caught the duplicate.
- `validateJoinColumns` / `checkUniqueness` run over `target`; an adapter overriding one calls `super` (the attribute adapters refuse a non-uuid owner first). `checkUniqueness` is typeorm-extension's `isEntityUnique`: a column of a unique key the input does not carry takes the stored row's value, so an update (whose payload never carries `realmId`) is checked in the stored row's realm and client, and a global row of the same name does not conflict with a realm row keeping its name.

Deliberately NOT on the base: `transaction()` (user, client, path; path runs through its own retrying runner) and everything entity-specific (`getBoundPermissions`, `findOneWithSecret`, `saveWithEA`, `findDescendants`). Key, realm, event, user-authenticator and identity-provider-account do not extend it: they are mostly bespoke (key mints and KEK-wraps material, realm resolves keys, event and user-authenticator are append- or owner-shaped).

### Service Pattern (Core Business Logic)

Each entity has a service that encapsulates all business logic: permission checks, validation, realm defaulting, uniqueness checks, and entity persistence. Services are defined in `core/entities/{entity}/`.

#### ActorContext

Services receive an `ActorContext` instead of a raw HTTP request. This decouples business logic from HTTP:

```typescript
// @authup/server-kit (packages/server-kit/src/core/actor/types.ts)
import type { IPermissionEvaluator, PermissionPolicyBinding } from '@authup/access';
import type { Identity } from '@authup/core-kit';

export type ActorContext = {
    permissionEvaluator: IPermissionEvaluator;
    identity?: Identity;
    grants?: () => Promise<PermissionPolicyBinding[]>;
};
```

- `permissionEvaluator`: evaluates permissions (`evaluate`, `preEvaluate`, `evaluateOneOf`, `preEvaluateOneOf`)
- `identity`: the actor's identity (user, client)
- `grants`: the actor's own grants as its request resolved them (for a token, the grants that token carries). A service delegating the actor's grants (`isSuperset`, `resolveJunctionGrant`) reads them through `getActorGrants`, so it checks exactly what the gates evaluated; a missing resolver yields none

#### RequestPermissionEvaluator

The HTTP adapter provides `RequestPermissionEvaluator`: the concrete `IPermissionEvaluator` implementation for HTTP requests. It wraps the base `PermissionEvaluator` with request-scoped identity/scope enrichment. The authorization middleware composes one per request, over an engine that reads the request's grants (see *A user's client-owned grants apply through that client's tokens*).

**`extendContext` is SYMMETRICAL, and `useRequestPolicyGrants(event, identity)` is the one place the `global`-scope condition is spelled (#3723).** A token's scope restricts what its identity may do, never who it is: `useRequestPolicyIdentity(event)` answers the request's own identity whenever one resolved, and `useRequestPolicyGrants` answers that identity's grants under `global` and none otherwise. `extendContext` sets `IDENTITY` to the identity when there is one (overwriting whatever a caller put there, so an identity can never be injected past the resolution), and DELETES the key when no identity resolved. A caller may therefore fill the bag itself (the batch authorization check does, so every identity-reading policy in a tree gets the data) without restating the scope rule. An attach-only version silently held the gate for callers that left the key empty and lost it for any that did not, which is one edit away at every new call site. The identity carries its grants (`identity.grants`, see *Grants are policy data*), loaded through `useRequestPolicyGrants`, so overwriting or deleting the key governs both, and without `global` every grant-bound permission denies while identity-reading policies still see who is asking. The identity is built as a plain object, since `RequestIdentity` exposes its fields as getters a spread would drop. The load runs BEFORE the inner evaluator, so a failed read fails the request as itself instead of being flattened into a permission denial inside the engine. Only that key is governed; the rest of the caller's bag rides through untouched.

**The two single-subject check routes read WHO to check from the data's own `identity` key, and never remove it (#3604).** Both controllers pass the body through unchanged, with the actor `buildActorContext(event)` builds (its `grants` resolver is `useRequestPolicyGrants`), and both checkers keep `master`'s signature `check(idOrName, data, actor, realm)`. `buildPermissionCheckerData` (`core/identity/permission/checker/data.ts`) turns the key into the data both routes evaluate, on a plain evaluator (the permission route) or engine (the policy route), since the data already says who is evaluated:

- **No `identity`: the requester.** The actor's `IdentityPolicyData` goes into the data, with the grants the actor's scopes allow: a token without `global` is checked as itself with no grants.
- **`identity: null`: no identity at all**, as the caller asked.
- **An identity: that identity, as given.** When it is not the actor's own (by `type` and `id`), the actor must hold `PERMISSION_CHECK`: pre-evaluated first (403), so a caller holding no grant learns nothing about which subjects exist, then the subject is looked up (404) and the permission evaluated for the actor with only its `identity` and the subject's STORED realm under `realmMatch`. The check data belongs to the permission or policy being checked, so none of it reaches the gate, and the gate carries no `attributes`. The realm comes from the lookup because the grant lookup loads by `id` alone, so a realm written into the data could not bound the gate; a `realm_admin` therefore checks subjects of its own realm only. A foreign identity is named by UUID (400 otherwise), since names repeat across realms. Naming the actor's own identity skips the gate whatever the token's scopes, since it reveals only the actor's own (scope-gated) grants. Being refused throws from `safeCheck` rather than answering `status: "error"`, since it answers the request, not the check.
- **The resolved permission row is evaluated**, with its `realmId` and `clientId` on the evaluation context, not a global permission of the same name.

The gate exists because the permission-binding evaluator loads the grants of whatever identity it is handed, and on the policy route the caller also supplies `permissionBinding`, so an ungated subject would let any authenticated caller read anyone's authorization. It is a dedicated permission rather than the grant-read permissions (`user_permission_read`, `user_role_read`, `role_permission_read`) that already reveal the same facts, because answering it by hand takes many calls and relations, and one grant is what an operator can reason about. Wrapping the policy in a memory-provider `PermissionEvaluator` so both routes share one path was rejected: it overwrites a caller's `permissionBinding` and turns `PolicyError` into `PermissionError`.

```typescript
// adapters/http/request/helpers/actor.ts
export function buildActorContext(req: Request): ActorContext {
    const identity = useRequestIdentity(req);
    return {
        permissionEvaluator: useRequestPermissionEvaluator(req),
        identity: identity ? identity.raw : undefined,
        grants: identity ? () => useRequestGrants(req, { type: identity.type, id: identity.id }) : undefined,
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
- `data` is always `Record<string, any>` (raw body): validation happens inside the service
- `actor` is always `ActorContext`
- Return domain types from `@authup/core-kit`, never HTTP response objects
- `save()` is the upsert method for `PUT /:id`: resolves entity, delegates to create or update
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

        // No realm defaulting: role is global-capable, so no value is a global
        // row (see Realm Defaulting)

        // evaluateRecord from @authup/access: the record realm is named, never
        // derived from a realmMatch policy data key
        await evaluateRecord(actor.permissionEvaluator, {
            name: PermissionName.ROLE_CREATE,
            realm: validated.realmId ?? null,
            data: { [BuiltInPolicyType.ATTRIBUTES]: validated },
        });

        await this.repository.checkUniqueness(validated);

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);
        return entity;
    }
}
```

`AbstractEntityService` provides shared helpers:
- `getActorRealmId(actor)`: extracts the actor's realm ID from their identity

Service responsibility:
- Permission pre-checks and full checks with `PolicyData`
- Input validation using validators from `@authup/core-kit` (e.g., `RoleValidator`, `UserValidator`)
- Join column validation via `repository.validateJoinColumns()`
- Uniqueness checks via `repository.checkUniqueness()`
- Realm defaulting (realm-bound entities only), built-in entity protection, name-lock enforcement
- Entity creation, merging, and persistence
- Returns domain objects (no HTTP response formatting)

**An UPDATE is evaluated against the stored row AND the updated row**
(`AbstractEntityService.evaluateUpdate`, #3654). Evaluating only the updated
row lets an update move a row INTO reach: an actor holding `CLIENT_UPDATE`
under `{ pathId: { $in: [<analyses>] } }` could refile any client into
`analyses` and own it from then on. The stored row proves the actor may change
this row at all, the updated row that it stays in reach afterwards, so a move
out of reach is refused too. Snapshot the stored row BEFORE
`repository.merge`, which mutates the entity in place. `DELETE` evaluates the
stored row only and needs nothing more. The last argument is
`{ realm: (row) => ... }`, REQUIRED, resolving each row's record realm
(entities `row.realmId`, read raw like every stored row, which holds for the
updated row too since `realmId` is immutable and the updated row spreads the
stored one; junctions
`junctionResourceRealm(row)`, role attributes the parent role's realm, a realm
itself its own `id`). The method delegates to `evaluateRecordUpdate` from
`@authup/access` (see *Realm reach* below), so an update can never run with the
realm omitted. Consequence for realms: a `REALM_UPDATE` or `REALM_DELETE` grant
at `own` reach writes the actor's own realm only (the delete passes the realm's
`id` as its record realm too).

#### Entity-Specific Service Patterns

| Category | Examples | Service Characteristics |
|---|---|---|
| **Simple CRUD** | role, scope, realm, permission | Validator + validateJoinColumns + checkUniqueness + permission checks |
| **Junction** | client-permission, user-permission, client-scope, role-permission, permission-policy | Validator (UUID fields), validateJoinColumns populates join entities, duplicate check on unique key, realmId extraction from joins |
| **Junction with superset check** | client-role, user-role, identity-provider-role-mapping | Same as junction + `identityPermissionProvider.isSuperset(await this.getActorGrants(actor), await identityPermissionProvider.getFor(role))` in service to verify the actor's grants (as its request resolved them) cover all permissions in the target role |
| **Attribute** | role-attribute, user-attribute | Per-record permission filtering in `getMany`, managed under parent entity's UPDATE permission |
| **Complex with secrets** | client | Uses `{Entity}CredentialsService` for secret handling, per-record secret filtering in `getMany` |
| **Complex with self-access** | client, user | Self-edit fallback via `{ENTITY}_SELF_MANAGE` permission with ATTRIBUTE_NAMES policy, self-access detection in `getOne`, name-lock protection (user) |
| **Policy** | policy | Built-in protection, parent type validation, uses PERMISSION_* permissions (intentional: policies are managed under permission domain) |

#### Workflow Services

Non-entity workflows live under `core/identity/`:

| Service | Location | Responsibility |
|---|---|---|
| `RegistrationService` | `core/identity/registration/` | User registration (`register`) and account activation (`activate`) |
| `PasswordRecoveryService` | `core/identity/password-recovery/` | Forgot password (`forgotPassword`, which answers an unknown account with the same status and `{ resetExpires }` body a known one gets and sends nothing; response timing and a failed mail send, which answers 400 for a known account only, still tell the two apart) and reset password (`resetPassword`) |

These services own their own validation (inline validators, not from `@authup/core-kit`), and accept `Record<string, any>` raw data.

Workflow services receive options via their context type:

```typescript
export type RegistrationServiceOptions = {
    registrationEnabled?: boolean,
    emailVerificationEnabled?: boolean,
    publicUrl?: string,
    passwordMinLength?: number,
};

export type PasswordRecoveryServiceOptions = {
    passwordRecoveryEnabled?: boolean,
    emailVerificationEnabled?: boolean,
    publicUrl?: string,
    passwordMinLength?: number,
};
```

Feature gates check these options before proceeding (e.g. `if (!this.options.registrationEnabled) throw ...`). Options are wired from app config in `app/modules/http/modules/controller.ts`.

**Password minimum length:** the config key `passwordMinLength` (ENV
`PASSWORD_MIN_LENGTH`, default 10, max 512) drives every user-password write
path: `UserValidator`'s `password` mount takes it as a ctor option
(`UserValidatorOptions.passwordMinLength`, default `USER_PASSWORD_MIN_LENGTH`
= 10 from `@authup/core-kit`), threaded via `UserServiceContext` /
`RegistrationServiceOptions` / `PasswordRecoveryServiceOptions` in the
controller factories. Un-threaded `UserValidator` sites (IdP account
provisioning, file provisioning, the kit's client-side form) keep the
default 10. No composition rules: length only (NIST 800-63B).

**A new password or a deactivation ends the subject's sessions.**
`PasswordRecoveryService.resetPassword` revokes every session of the user after
the save, and `UserService.save` does the same on an update carrying
`password`, keeping only the session the user changed its own password with
(read from the injected `requestContext`); an administrator's change keeps
none. The update also clears a pending reset code, as does an address change, a federated login's included (provisioning does not). An update flipping `active` to false (`UserService` and `ClientService`)
revokes every session of that subject, and the authorization middleware treats
a resolved identity that is not `active` as no credential at all: the bearer
branch and the MFA ticket answer 401, the console cookie leaves the request
anonymous. So a deactivation ends a live bearer on its next request and a
refresh token with its session. A deactivation written outside these services
(a provisioning MERGE of `USER_ADMIN_ENABLED=false`) revokes nothing, so the
token endpoint checks the subject itself: the refresh grant answers
`invalid_grant` when the token's subject does not resolve or is inactive,
and `POST /token/introspect` reports a token `active: false` once its subject
is inactive or its session is gone. The revocation above goes through
`ISessionManager.revokeByOwner` (batched and failure-isolated, see
*Back-channel logout*), so the refresh tokens
(cascade) and the back-channel logout follow, and it runs after the write,
never inside the #3526 transaction. The session manager is an optional ctx
member, so the fake-backed specs construct the services without one. A
resource server verifying tokens locally against the JWKS still accepts an
issued access token until its `exp`.

**Mail rollback pattern:** When a service persists an entity and then sends an email (e.g. registration activation), wrap the mail call in try/catch. On failure, remove the entity and throw. Don't leave orphaned records.

**Mail templates:** workflow services do **not** build mail HTML inline:
they depend on the `IMailTemplateRenderer` port (`core/mail/`) and pass
`{ template: MailTemplateName.X, params, locale? }` (async `render`). The
mechanism has three layers:

- **Copy** lives in `@authup/i18n` under the `authupMail` namespace
  (`TranslatorTranslationMailKey`, `catalogs/{en,de,fr,es}/mail.ts`):
  the package's locale-parity test enforces per-locale key parity, and
  values may carry ilingo `{{var}}` placeholders (e.g.
  `passwordResetExpiry` → `{{minutes}}`). The renderer resolves it through
  an `Ilingo` instance over `MemoryStore({ data: CATALOGS })`; the
  requested BCP-47 tag is narrowed via `matchLocale()` → `DEFAULT_LOCALE`
  fallback, and a missing key throws `InternalError` (fail loud, the
  parity test makes it unreachable). `render` is async because copy
  resolution runs through ilingo's store contract: a file-backed
  (`FSStore`) or remote override store can slot in later without another
  interface change.
- **Structure** is a typed block model (`core/mail/format/`): templates
  (`core/mail/template/templates/*.ts`, registered in
  `MAIL_TEMPLATE_REGISTRY`) compose `paragraph` / `code` / `action` /
  `note` blocks via `defineMailTemplate`; the html and **text** parts both
  derive from the same block list so multipart content cannot drift. The
  html formatter escapes every interpolated value, stamps
  `<html lang="...">` from the resolved locale, and emits a hidden
  preheader (`preview`) for mail-client preview lines.
- **Hardening:** the renderer centrally drops any `action` block whose URL
  is not http(s) (`isSafeActionURL`: defense in depth against
  `javascript:` URLs), and `PASSWORD_RESET_EXPIRES_IN_MINUTES`
  (`core/identity/password-recovery/constants.ts`) drives both the
  persisted `resetExpires` and the expiry note in the mail.

The recipient locale is threaded from the HTTP adapter:
`useRequestLocale(event)` (`adapters/http/request/helpers/locale.ts`)
returns the first **authored** locale that matches: the `vc-locale`
cookie when `matchLocale()` accepts it (`auto` and unsupported values
fall through), else the first supported language in routup's q-ordered
`getRequestAcceptableLanguages(event)` (so `pt-BR, de;q=0.8` → `de`,
not the default). The register / password-forgot controllers pass it via
`IdentityWorkflowContext` (`core/identity/types.ts`) into
`register(data, context?)` / `forgotPassword(data, context?)`.

The renderer is wired through DI: `MailModule` registers
`MailTemplateRendererInjectionKey` (singleton) alongside the
`MailInjectionKey` client, and the controller factories resolve both:
swapping in a custom renderer (file-based templates, different branding)
is a registration change, not a code change. Pure + injectable, so mail
content is assertable via `FakeMailClient` (see
`test/unit/core/mail/renderer.spec.ts`; `templates.spec.ts` smoke-renders
every template × locale).

**Mail deep links:** when `publicUrl` is set, the renderer receives a `url`
param: `<publicUrl>/activate?token=<code>` for activation and
`<publicUrl>/password-reset?token=<code>&realmId=<id>` for reset (the
`realmId` is required so a non-master user's reset link resolves the right
realm): rendered as the call-to-action link. Both land on backend-served SSR
pages (see *Auth Workflow UI* below) that prefill the code from the query.
The raw code stays in the mail body for copy/paste; no identifier/PII is put
into the URL (the reset form asks for email/name). Only the mail carries the
code: `auth_users.activate_hash` / `reset_hash` store its SHA-256 digest and
the lookup digests the presented code, the console-session-secret rule, so a
read of the table yields nothing that activates an account or resets a
password. The activation code carries no expiry of its own (a column the
schema does not have yet).

### Thin Controller Pattern (HTTP Adapter)

Controllers are thin HTTP adapters. They extract input from the routup `IAppEvent`, build an `ActorContext`, delegate to the service, and format the HTTP response. Request body payload types come from `@authup/core-http-kit` (shared between the typed Client, the controller, and `@trapi/swagger` schema generation); every entity **record** response is the `{ data, meta }` envelope (`EntityRecordResponse<T>`: the shape the MFA enroll response pioneered, uniform since issue #1649), with the domain entity from `@authup/core-kit` under `data`:

```typescript
import type { Role } from '@authup/core-kit';
import type {
    EntityCollectionResponse,
    EntityRecordResponse,
    RoleCreatePayload,
} from '@authup/core-http-kit';

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
    async getMany(@DContext() event: IAppEvent): Promise<EntityCollectionResponse<Role>> {
        const actor = buildActorContext(event);
        const { data, meta } = await this.service.getMany(useRequestQuery(event), actor);
        return { data, meta };
    }

    @DPost('')
    async add(@DBody() data: RoleCreatePayload, @DContext() event: IAppEvent): Promise<EntityRecordResponse<Role>> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);
        event.response.status = 201;
        return { data: entity, meta: {} };
    }

    @DDelete('/:id')
    async drop(@DPath('id') id: string, @DContext() event: IAppEvent): Promise<EntityRecordResponse<Role>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);
        event.response.status = 202;
        return { data: entity, meta: {} };
    }
}
```

Controller conventions:
- Return type is a literal annotation (`Promise<EntityRecordResponse<Role>>`, `Promise<EntityCollectionResponse<Role>>`). This lets `@trapi/swagger` extract the response schema from the method signature. Services still return bare domain entities. The controller owns the envelope. Excluded from the envelope (protocol/bespoke shapes, stay flat): the OAuth2/OIDC surface (`/token*`, `/authorize`, jwks + openid-configuration, `/userinfo`, `/logout`), the register/activate/password workflows, `/`, the authenticator-challenge surface, permission/policy `check`, the batch `POST /authorization/check` (a bare array), and session `deleteMany` (`{ count }`).
- Body parameter type is the concrete payload type (`@DBody() data: RoleCreatePayload`): sourced from `@authup/core-http-kit`. Naming convention: `<Entity>CreatePayload` for POST, `<Entity>UpdatePayload` for POST `/:id`, `<Entity>SavePayload` for PUT `/:id`. Response shapes that genuinely diverge from the domain entity (e.g. `PolicyResponse`, `RegisterResponse`, `PasswordForgotResponse`) keep a named alias; trivial passthrough aliases are not introduced.
- **No business logic**: no permission checks, no validation, no entity manipulation
- Read the routup event via `@DContext() event: IAppEvent`
- Read the body via `@DBody() data: <RequestType>` (decorator awaits `readRequestBody` internally)
- Read query via `useRequestQuery(event)` from `@routup/basic/query`
- A method that decodes one additionally carries `@DQuerySchema(<EntityType>, 'collection' | 'record' | 'filters')` next to its `@DGet` (or its `@DDelete`, for the two bulk revokes). It is a build-time marker with no runtime effect, and it is what puts the endpoint's query parameters into the OpenAPI document; a `describeQuerySchema` call in an unmarked method fails the build. See *Query vocabulary discovery*.
- Read path params via `@DPath('id') id: string` or `event.params.id`
- Build actor via `buildActorContext(event)`
- For realm-scoped writes (create / update / save) on controllers that are dual-mounted at `/realms/:realmId/<entity>`, call `applyRouteRealmIDToBody(event, data)` before delegating: route realm wins silently over body realm. For realm-scoped reads, pass `getRequestRealmID(event)` as the realm key argument. See *Realm Scoping Model → Nested Route Mounting*.
- Delegate all work to `this.service.*()` methods
- For non-200 statuses, set `event.response.status = 201/202` and return the value. Never use `sendCreated`/`sendAccepted` because they erase the typed return value that trapi extracts.

Exceptions where controllers retain some logic:
- **Self-access resolution** (client, user): Resolve `@me`/`@self` tokens to actual IDs before delegating

The OIDC userinfo endpoint is a dedicated flat route `GET /userinfo` (`adapters/http/controllers/workflows/userinfo/`, advertised via discovery, `userinfoEndpoint` in the core-http-kit `Client` config): it serves the authenticated user's record as a FLAT claims document and must never adopt the record envelope, which is why it is not an alias of `GET /users/@me` (that route carries the envelope like every other record read).

No controller (or service) reaches for global singletons: cross-cutting services (logger, domain-event publisher) are constructor-injected from the DI container by the factories in `app/modules/http/modules/controller.ts`.

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

### Cross-Cutting Services via DIP (no singletons)

Mirrors PrivateAIM/hub. There is no `useLogger()` / `useXxx()` service-locator
anywhere: `@authup/server-kit` ships factories only, and `apps/server-core`
threads instances through constructor/context args:

- **Logger**: `LoggerModule` registers `LoggerInjectionKey` (eldin, singleton
  lifetime). Anything that logs receives a `Logger` (winston-shaped structural
  type from `@authup/server-kit`) explicitly: middlewares take it via options
  (`createLoggerMiddleware({ env, logger })`, `registerErrorMiddleware(router,
  { logger })`), core services via their context (`RealmService` /
  `SystemClientProvisioner` accept optional `logger`). A service without a logger
  simply stays silent (`this.logger?.warn(...)` guard style).
- **Domain events**: `DomainEventPublisher` (from `@authup/server-kit`,
  optional `logger` ctx) aggregates `IDomainEventHandler`s
  (`DomainEventRedisHandler`, `DomainEventSocketHandler`, the entity audit
  mirror). `publish` runs every handler even when an earlier one throws and
  then rejects with the first error, so a redis outage cannot drop the audit
  row of a committed write; `safePublish` catches + logs that rejection so an
  event-bus failure never fails the originating DB transaction. `DatabaseModule.registerEventPublisher` creates it, registers
  it under `DatabaseInjectionKey.DomainEventPublisher`, and injects it into
  every TypeORM subscriber instance via `setPublisher()` after
  `dataSource.initialize()` (TypeORM instantiates the subscriber classes from
  the data-source options itself, so setter injection is the handoff point:
  same trick as hub's `BaseSubscriber`).
- **Entity subscribers**: all 22+ subscribers in
  `adapters/database/domains/*/subscriber.ts` extend `EntitySubscriber<T>`
  (`adapters/database/subscriber/`), a declarative base class configured with
  `{ type, target, destinations, cache? }`: `destinations` is built with
  `buildEntityDestinations(type, (data) => [realmIds...])` (one global channel
  destination + one namespaced destination per non-null realm id, named by
  `buildEntityNamespaceName` from `@authup/core-kit`, which the kit's entity
  socket also connects through, falling back to `/` for a master-realm
  session); `cache.keys`
  returns the query-result-cache keys to drop on update/remove
  (`cache.onInsert: true` adds insert: used by junction/attribute subscribers
  whose cache is keyed by the owner id). Every `after*` hook hands its
  `event.manager` to the publish as the opaque `transaction`, because the
  hooks run inside the persist transaction and a handler that persists must
  ride it (#3539). The base strips every `select: false` column of its
  `target` (read once from typeorm's metadata-args storage) from both the
  payload and the previous payload, on a copy, never on the saved entity:
  the hook receives the object `save()` was handed, with the client secret,
  the password and reset/activate hashes, `email` and the token columns
  still set, and `select` only governs projection. So nothing a read withholds
  reaches redis, socket.io or the entity audit diff (which therefore records
  no `email` change). A subscriber without an injected publisher publishes
  nothing (tests / migration CLI runs).
- **typeorm-extension's global registry is unused**: `setDataSource` /
  `useDataSource` / `unsetDataSource` have no call sites; repositories that
  need a `DataSource` (identity-provider mappers/account, `OAuth2KeyRepository`)
  receive it via constructor from `DatabaseInjectionKey.DataSource`. Don't
  reintroduce `useDataSource()` in new repositories.

### Extra Attributes (EA) Entities

Entities like user, policy, and identity-provider store dynamic key-value pairs in a separate table.

**A value is stored in a type-preserving form (#3671).** The four `*_attributes` `value` columns persist through `serialize` / `deserialize` from `@authup/kit`: `serialize` writes a string JSON-quoted like any other JSON value, and `deserialize` (destr) reads both the quoted and the legacy bare form. Two consequences. A query on `value` through a find operator runs its operand through the transformer, so `KeyRepositoryAdapter.countBlobReferences` matches identity-provider blobs with raw parameters for both forms (`v1.<key>.%` and `"v1.<key>.%`). And no row is migrated: a legacy bare `false` or `123` is ambiguous, since `serialize(false)` and `serialize('false')` both wrote `false` and the API accepts non-string JSON values, so rewriting it would be a guess. Every attribute table may therefore hold legacy bare rows, which keep their old reading everywhere until written again; a reader or filter on `value` must accept both forms.

**Critical rule: separate read-path vs write-path EA loading.** `EntityRepositoryAdapter` enforces it (see *Adapter Implementation*): an EA adapter overrides `extendOne` / `extendMany`, which the base calls from `findOneById`, `findOneByName` and `findMany` but never from `findOneBy`, the read a write loads through. `saveWithEA()` does not extend after the save either. It writes the parent row and its attribute rows in ONE transaction (issue #3668), so a failing row write rolls the parent back; it joins a transaction already open on its manager and otherwise opens one on that manager, never a second pooled connection (#3526, #3539). On better-sqlite3 it opens none, since the driver shares one query runner and a transaction there would nest inside whatever else is running (the `isDatabaseTypeRowLockable` rule every transaction seam follows). Pinned on mysql/postgres by `test/unit/adapters/database/extra-attribute-transaction.spec.ts` (sqlite does not enforce the varchar length the spec fails on).

**`saveEA` REPLACES the attribute set, which a partial update must opt out
of.** Every existing attribute row whose name is not an own-property of the
input is deleted, so an update that simply says nothing about a key removes it.
That is right for the policy PROVISIONING synchronizer (reasserting a built-in
policy's full set on every boot is how a dropped key disappears) and wrong for
an HTTP update, whose payload is partial by contract: automation written before
`requiredAmr` / `requiredAcr` existed silently turned the upstream assurance
gate off just by updating an OAuth2 provider (issue #3487 finding 4). The
adapter already carries `keepAll` for exactly this; the identity-provider port
now forwards it and the controller sets it on the UPDATE branch only (create has
no rows to keep). A caller CLEARS an attribute by sending it as `null`, which
survives validation (`null` is not "optional" under validup's default
`optionalValue: 'undefined'`) and is what the console submits for a blank field.
A protocol switch is the one exception and replaces: the previous protocol's
rows are dead configuration no code reads, and one of them is a secret
(the LDAP bind password). `PolicyService.save` keeps the replace semantics and
stores only the options its type declares (#3669): `PolicyAttributesValidator`
runs the validator a registry holds for the type (`PolicyServiceContext.validators`,
`PolicyDefaultValidators` unless given; a composite's `children` excluded),
picked by the STORED type on an update because `type` is create-only. A type
the registry lacks accepts no options: a body carrying any key beyond the
policy's own columns answers 400 naming the type, one without is stored as the
bare row. That registry is the first seam of #3676, which feeds custom types
into it from provisioning. The two types whose config is required (`attributes`,
`attributeNames`) therefore fail validation on a partial update rather than
silently disabling a control, while the others replace their options with what
the body carries.

## Canonical Identifier Form

Identifier-style columns are stored in canonical form: `LOWER(TRIM(value))`. This applies to:

- `name` on every named entity (`client`, `user`, `role`, `scope`, `permission`, `policy`, `realm`, `identity-provider`)
- `email` on `user`

`displayName` and other free-form labels (`description`, `firstName`, `lastName`) preserve original casing: the canonical-form rule is only for columns used as identifiers in lookups / unique constraints.

### Why canonical form

Cross-DB collation behavior diverges:

- MySQL with `utf8mb4_*_ci` (default) treats `'foo'` and `'Foo'` as duplicates in `=` comparisons and `UNIQUE` constraints
- PostgreSQL with `en_US.UTF-8` (default) treats them as distinct rows

Without canonicalization, the same code base produces different uniqueness behavior on each DB. Canonicalizing identifier columns at write time eliminates the divergence: `=` is sufficient for lookups across both DBs, `UNIQUE` constraints behave identically.

### Four layers of enforcement

Canonical form is enforced at four boundaries (defense-in-depth):

1. **Validator transform**: every `name` / `email` validator chains `.trim().toLowerCase()` before its format check (Zod path) or `.matches(...)` (validup path). Mixed-case input is silently lowercased; callers see canonical form in the response.
2. **Validator regex**: the format check (`isNameValid` for names: `/^[a-z0-9-_.]+$/`; emails: `/^[^A-Z]+$/`) operates on the post-transform value. After `.toLowerCase()` the regex always passes; it remains as documentation of the contract and as a catch for code paths that bypass the transform.
3. **External boundary canonicalization**: when an identifier enters Authup outside the validator chain, it is lowercased at the ingress. Currently: `IdentityProviderAccountManager` taking attribute candidates from external IdPs (so external mixed-case usernames don't fall through to the random-nanoid fallback), and the OAuth2 password grant's `realm_id`/`realm_name` hint.
4. **Repository-level lookup canonicalization**: name-based *lookups* on the authentication surface canonicalize the key before binding it: the identity repositories (`app/modules/identity/repositories/{user,client}.ts`, the name, a realm-name filter and a uuid key, which is lowercased so its 60 s query-cache key is the one the entity subscriber drops), `OAuth2ClientRepository.findOneByIdOrName` (the `/authorize` client resolution), and `RealmRepositoryAdapter.findOneByName`. An auth ingress that misses layer 3 (the `/realms/<key>` URL segment specifically, an HTTP Basic username, a token-body credential key) still matches canonically stored rows instead of diverging by database collation. Lookup-only, auth-surface-only: write paths rely on layers 1–3, and the entity repository adapters' `findOneByName` (`GET /roles/<name>` etc.) still bind raw.

### Adding a new identifier column

When adding a `name`-style column on a new entity (or extending an existing one):

1. **Validator**: chain `.trim().toLowerCase()` after `z.string()` (Zod) or before the format check (validup) and before any length / pattern check.
2. **Repository**: use `=` for name lookups, never `LIKE :name`.
3. **Migration**: ship a data migration canonicalizing existing rows with an up-front collision pre-check, following the pattern of `apps/server-core/src/adapters/database/migrations/{mysql,postgres}/1779267068441-Default.ts`.

## Topic files (read on demand)

These are NOT loaded into every session. Before changing an area, read its file. A reference elsewhere of the form "architecture.md → *Section*" means the section listed under one of these files.

- [topics/query.md](topics/query.md): Query IR flow; Query vocabulary discovery
- [topics/events-stats.md](topics/events-stats.md): Entity statistics; Security Event Log
- [topics/consoles.md](topics/consoles.md): Account Console; Admin Console; Console Theming; Console substitution
- [topics/deployment.md](topics/deployment.md): Deployment Topology & UI Boundary; Development mode
- [topics/provisioning.md](topics/provisioning.md): Provisioning Architecture; Layers; File-Source Validation; Synchronization Order; Concurrent boots: the provisioning lock; Wildcard Realm Entry; Provisioning Permissions With Policies
- [topics/clients.md](topics/clients.md): Per-Realm System Clients; Client secret storage and rotation
- [topics/file-map.md](topics/file-map.md): File Structure
- [topics/realms.md](topics/realms.md): Realm Scoping Model; Entity Categories; Global-capable entity reads; Junction reads; Realm Defaulting; Realm immutability; Realm reach is a coarse `realmScope` enum on the grant; Admin Roles; Nested Route Mounting
- [topics/paths.md](topics/paths.md): Paths
- [topics/authorization.md](topics/authorization.md): Policy-Permission Model; Evaluation Layers; The authorization catalog (`GET /authorization`) and the introspected grants; The batch check; A user's client-owned grants apply through that client's tokens; Policy engine evaluators are per engine; Grants are policy data; PermissionBinding & aggregated grants; Security: Permission Assignment; Superset Check; Junction Policy Propagation; Self-Edit Pattern; Permissions; Unified user-namespace policy; Service flow; preEvaluate is derived from data availability; EA loading on tree roots
- [topics/oauth2-authorize.md](topics/oauth2-authorize.md): Authorize Realm Binding; Only the user at the authorization server may authorize an application; Response types: code only; The two UI hints: `ui_locales` and `ui_color_mode`; The account-level UI preference: `locale` and `color_mode`; OIDC prompt surface & id_token claims; RP-Initiated Logout: `end_session_endpoint`; Back-channel logout; Application Access Policy; OAuth2 Consent
- [topics/device-grant.md](topics/device-grant.md): Device Authorization Grant
- [topics/federation.md](topics/federation.md): Federated Login Completion; Federated Identity Claims; Identity-Provider Account Linking
- [topics/oauth2-token.md](topics/oauth2-token.md): OAuth2 Token Endpoint Authentication; Per-grant requirements; Per-client grant allowlist; Token endpoint realm resolution; Credential transport; `OAuth2ClientAuthenticator`; Client-certificate boundary and token binding; PKCE for public clients; Refresh Token Rotation & Replay Detection; `auth_session_tokens`: one row per issued token; The DB row is the single authority for refresh validity; Grant flow; Family revoke = the `auth_sessions` row, never a wider SSO session; Grace period; Cleanup
- [topics/sessions.md](topics/sessions.md): Session Management API; Session continuity: one session per interactive login
- [topics/mfa.md](topics/mfa.md): MFA: Authenticator Devices; Auth-Method Claims: amr / acr / step-up
- [topics/key-store.md](topics/key-store.md): Realm Key Store
- [topics/ui.md](topics/ui.md): UI Layer; What the kit store persists; Post-login destination: the `redirect` round-trip; vuecs 1.x SFC integration; SSR data handoff; Table usage; Theme and Tailwind rules
