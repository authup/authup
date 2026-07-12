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

Defined in `@authup/server-kit` (re-exported from `@authup/server-kit/core`), these are the contracts that adapters must implement:

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
// @authup/server-kit (packages/server-kit/src/core/actor/types.ts)
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
default 10. No composition rules — length only (NIST 800-63B; plan 066
Stage 1).

**Mail rollback pattern:** When a service persists an entity and then sends an email (e.g. registration activation), wrap the mail call in try/catch. On failure, remove the entity and throw — don't leave orphaned records.

**Mail templates:** workflow services do **not** build mail HTML inline —
they depend on the `IMailTemplateRenderer` port (`core/mail/`) and pass
`{ template: MailTemplateName.X, params, locale? }` (async `render`). The
mechanism has three layers:

- **Copy** lives in `@authup/i18n` under the `authupMail` namespace
  (`TranslatorTranslationMailKey`, `catalogs/{en,de,fr,es}/mail.ts`) —
  the package's locale-parity test enforces per-locale key parity, and
  values may carry ilingo `{{var}}` placeholders (e.g.
  `passwordResetExpiry` → `{{minutes}}`). The renderer resolves it through
  an `Ilingo` instance over `MemoryStore({ data: CATALOGS })`; the
  requested BCP-47 tag is narrowed via `matchLocale()` → `DEFAULT_LOCALE`
  fallback, and a missing key throws `InternalError` (fail loud, the
  parity test makes it unreachable). `render` is async because copy
  resolution runs through ilingo's store contract — a file-backed
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
  is not http(s) (`isSafeActionURL` — defense in depth against
  `javascript:` URLs), and `PASSWORD_RESET_EXPIRES_IN_MINUTES`
  (`core/identity/password-recovery/constants.ts`) drives both the
  persisted `reset_expires` and the expiry note in the mail.

The recipient locale is threaded from the HTTP adapter:
`useRequestLocale(event)` (`adapters/http/request/helpers/locale.ts`)
returns the first **authored** locale that matches — the `vc-locale`
cookie when `matchLocale()` accepts it (`auto` and unsupported values
fall through), else the first supported language in routup's q-ordered
`getRequestAcceptableLanguages(event)` (so `pt-BR, de;q=0.8` → `de`,
not the default). The register / password-forgot controllers pass it via
`IdentityWorkflowContext` (`core/identity/types.ts`) into
`register(data, context?)` / `forgotPassword(data, context?)`.

The renderer is wired through DI: `MailModule` registers
`MailTemplateRendererInjectionKey` (singleton) alongside the
`MailInjectionKey` client, and the controller factories resolve both —
swapping in a custom renderer (file-based templates, different branding)
is a registration change, not a code change. Pure + injectable, so mail
content is assertable via `FakeMailClient` (see
`test/unit/core/mail/renderer.spec.ts`; `templates.spec.ts` smoke-renders
every template × locale).

**Mail deep links:** when `publicUrl` is set, the renderer receives a `url`
param — `<publicUrl>/activate?token=<hash>` for activation and
`<publicUrl>/password-reset?token=<hash>&realm_id=<id>` for reset (the
`realm_id` is required so a non-master user's reset link resolves the right
realm) — rendered as the call-to-action link. Both land on backend-served SSR
pages (see *Auth Workflow UI* below) that prefill the code from the query.
The raw code stays in the mail body for copy/paste; no identifier/PII is put
into the URL (the reset form asks for email/name).

#### Auth Workflow UI (backend-served SSR pages) + Status Endpoint

Authup can run headless (server-core without client-web), so every auth
workflow page is served by the embedded SSR app (`apps/server-core/ui`),
not by client-web:

- **Routes**: `/authorize`, `/register`, `/activate`, `/password-forgot`,
  `/password-reset` — each `GET` serves SSR HTML while `POST` on the same
  path remains the JSON API. The render plumbing is shared:
  `renderUIPage(event, { url, payload })` in `adapters/http/ui/render.ts`
  (JIT vs dist, template, manifest, preload links, content-type).
- **Feature flags** ride the hydration payload (`data.features`,
  `StatusResponseFeatures` shape) — pages render the form when the
  workflow is enabled, otherwise a localized "disabled" notice (no 404:
  stale email links should not dead-end). The same flags are exposed
  publicly on the root status endpoint `GET /`
  (`StatusController` → `{ version, date, features: { registration,
  passwordRecovery, emailVerification } }`, typed `StatusResponse` in
  `@authup/core-http-kit`, consumed via `client.status.get()`).
- **Flow continuity**: workflow links carry a same-origin `redirect` query
  param (the original `/authorize` path + query) so "back to login"
  restores the authorize request. `sanitizeRelativeRedirect()` in
  `adapters/http/ui/render.ts` rejects absolute / protocol-relative URLs
  (open-redirect guard).
- **Internal HTTP client (SSR self-calls)**: the render's API calls
  (session hydration, identity-provider/scope fetches) go through the
  client registered under `HTTPInjectionKey.UIHttpClient`.
  `HTTPModule.setup` registers the production default —
  `createInternalUIHttpClient` (`adapters/http/ui/internal-http-client.ts`),
  a `@authup/core-http-kit` `Client` whose hapic `FetchTransport` rewrites
  every request targeting `publicUrl` (origin + sub-path prefix, wildcard
  listen hosts normalized to loopback) onto the server's own listen
  address (`HTTPInjectionKey.Server` → `server.url`, resolved lazily per
  request). So SSR self-calls never round-trip through the reverse proxy:
  no TLS (a self-signed `publicUrl` cert would fail Node's fetch with
  `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`), no dependency on the public
  hostname resolving from inside the deployment. The rewrite is
  transport-level ONLY — `baseURL` stays `publicUrl` because rendered
  hrefs (e.g. identity-provider authorize links via `getAuthorizeUri`)
  derive from it and hydration does not patch attribute mismatches. The
  registration is `lifetime: 'transient'` (fresh client per render — the
  kit's auth hook writes per-user state) and is skipped when the token is
  already bound (test fakes win; see testing.md). Relatedly, the kit's
  entity-collection manager catches its own load errors and emits
  `failed` instead of rejecting — a failed SSR fetch renders the page
  degraded rather than killing the process via an unhandled rejection.
- **Sub-path deployment**: the SSR UI works behind a prefix-stripping
  reverse proxy (e.g. `https://example.com/auth/* → authup /*`) with no
  extra config — the prefix is derived from `publicUrl`'s pathname
  (`getURLBasePath` in `@authup/kit`). The vite build keeps its fixed
  `base: '/public/'`; `renderUIPage` rebases emitted asset URLs onto the
  prefix per request (`rebasePublicAssetURLs` in
  `adapters/http/ui/base-path.ts`, so the prebuilt dist stays
  deployment-agnostic). Inside the UI app the same prefix feeds the
  vue-router history base (`ui/src/app.ts`) and the `useBasePath()`
  composable (`ui/src/base-path.ts`) that pages use for inter-page hrefs
  and rendered `redirect` values — `redirect`/`requestPath` params stay
  server-local (prefix-free); the prefix is applied only when a path is
  rendered as an href. Server-side `Location` redirects are unaffected
  (built from full `publicUrl`). A true subdomain (no pathname) yields an
  empty prefix and identical behavior to before.
- **Kit form components** (`@authup/client-web-kit`,
  `src/components/workflows/`): `ALoginForm` (renamed from `ALogin`,
  deprecated alias kept; optional `registerLink` / `passwordForgotLink`
  `LinkProperties` props rendered via `<VCLink>` — presence shows the
  link), `ARegisterForm` (embeds `AActivateForm` when the register
  response is inactive), `AActivateForm`, `APasswordForgotForm`,
  `APasswordResetForm`. All pure: `injectHTTPClient()` +
  `done`/`failed` emits, inline permissive validup/zod validators (server
  is authoritative). `AAuthShell` (utility) provides the shared aurora
  backdrop + theme-token card + compact logo mark used by all SSR auth
  pages (it replaced the legacy hardcoded `#E8E8E8` card in
  `AAuthorize`). The auth-chrome CSS (shell, gadgets, back-link, realm
  grid) lives in `@authup/client-web-kit-theme`
  (`assets/css/styles/{auth,realm}.css`, behind `--authup-auth-*` /
  `--authup-realm-*` tokens) — kit components ship no `<style>` blocks.

### Thin Controller Pattern (HTTP Adapter)

Controllers are thin HTTP adapters. They extract input from the routup `IAppEvent`, build an `ActorContext`, delegate to the service, and format the HTTP response. Request body payload types come from `@authup/core-http-kit` (shared between the typed Client, the controller, and `@trapi/swagger` schema generation); response types are the domain entity from `@authup/core-kit` directly:

```typescript
import type { Role } from '@authup/core-kit';
import type {
    EntityCollectionResponse,
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
    async add(@DBody() data: RoleCreatePayload, @DContext() event: IAppEvent): Promise<Role> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);
        event.response.status = 201;
        return entity;
    }

    @DDelete('/:id')
    async drop(@DPath('id') id: string, @DContext() event: IAppEvent): Promise<Role> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);
        event.response.status = 202;
        return entity;
    }
}
```

Controller conventions:
- Return type is the domain entity directly (`Promise<Role>`, `Promise<EntityCollectionResponse<Role>>`). This lets `@trapi/swagger` extract the response schema from the method signature.
- Body parameter type is the concrete payload type (`@DBody() data: RoleCreatePayload`) — sourced from `@authup/core-http-kit`. Naming convention: `<Entity>CreatePayload` for POST, `<Entity>UpdatePayload` for POST `/:id`, `<Entity>SavePayload` for PUT `/:id`. Response shapes that genuinely diverge from the domain entity (e.g. `PolicyResponse`, `RegisterResponse`, `PasswordForgotResponse`) keep a named alias; trivial passthrough aliases are not introduced.
- **No business logic** — no permission checks, no validation, no entity manipulation
- Read the routup event via `@DContext() event: IAppEvent`
- Read the body via `@DBody() data: <RequestType>` (decorator awaits `readRequestBody` internally)
- Read query via `useRequestQuery(event)` from `@routup/basic/query`
- Read path params via `@DPath('id') id: string` or `event.params.id`
- Build actor via `buildActorContext(event)`
- For realm-scoped writes (create / update / save) on controllers that are dual-mounted at `/realms/:realmId/<entity>`, call `applyRouteRealmIDToBody(event, data)` before delegating — route realm wins silently over body realm. For realm-scoped reads, pass `getRequestRealmID(event)` as the realm key argument. See *Realm Scoping Model → Nested Route Mounting*.
- Delegate all work to `this.service.*()` methods
- For non-200 statuses, set `event.response.status = 201/202` and return the value — never use `sendCreated`/`sendAccepted` because they erase the typed return value that trapi extracts.

Exceptions where controllers retain some logic:
- **Self-access resolution** (client, robot, user): Resolve `@me`/`@self` tokens to actual IDs before delegating

No controller (or service) reaches for global singletons — cross-cutting services (logger, domain-event publisher) are constructor-injected from the DI container by the factories in `app/modules/http/modules/controller.ts`.

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
anywhere — `@authup/server-kit` ships factories only, and `apps/server-core`
threads instances through constructor/context args:

- **Logger** — `LoggerModule` registers `LoggerInjectionKey` (eldin, singleton
  lifetime). Anything that logs receives a `Logger` (winston-shaped structural
  type from `@authup/server-kit`) explicitly: middlewares take it via options
  (`createLoggerMiddleware({ env, logger })`, `registerErrorMiddleware(router,
  { logger })`), core services via their context (`RealmService` /
  `WebClientProvisioner` accept optional `logger`). A service without a logger
  simply stays silent (`this.logger?.warn(...)` guard style).
- **Domain events** — `DomainEventPublisher` (from `@authup/server-kit`,
  optional `logger` ctx) aggregates `IDomainEventHandler`s
  (`DomainEventRedisHandler`, `DomainEventSocketHandler`); `safePublish`
  catches + logs so an event-bus failure never fails the originating DB
  transaction. `DatabaseModule.registerEventPublisher` creates it, registers
  it under `DatabaseInjectionKey.DomainEventPublisher`, and injects it into
  every TypeORM subscriber instance via `setPublisher()` after
  `dataSource.initialize()` (TypeORM instantiates the subscriber classes from
  the data-source options itself, so setter injection is the handoff point —
  same trick as hub's `BaseSubscriber`).
- **Entity subscribers** — all 22+ subscribers in
  `adapters/database/domains/*/subscriber.ts` extend `EntitySubscriber<T>`
  (`adapters/database/subscriber/`), a declarative base class configured with
  `{ type, target, destinations, cache? }`: `destinations` is built with
  `buildEntityDestinations(type, (data) => [realmIds...])` (one global channel
  destination + one namespaced destination per non-null realm id); `cache.keys`
  returns the query-result-cache keys to drop on update/remove
  (`cache.onInsert: true` adds insert — used by junction/attribute subscribers
  whose cache is keyed by the owner id). A subscriber without an injected
  publisher publishes nothing (tests / migration CLI runs).
- **typeorm-extension's global registry is unused** — `setDataSource` /
  `useDataSource` / `unsetDataSource` have no call sites; repositories that
  need a `DataSource` (identity-provider mappers/account, `OAuth2KeyRepository`)
  receive it via constructor from `DatabaseInjectionKey.DataSource`. Don't
  reintroduce `useDataSource()` in new repositories.

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

### File-Source Validation (`ValidatorGroup.PROVISIONING`)

Only the **file** source validates (the default and programmatic sources are
code-built and bypass validation — which is why
`BaseProvisioningSynchronizer.canonicalizeName` stays as defense in depth).
`FileProvisioningSource` runs `RootProvisioningValidator` with
`ValidatorGroup.PROVISIONING` and **uses the validated output**: every nested
entity run (`createProvisioningEntitiesValidator`,
`core/provisioning/entities/utils.ts`) passes the group explicitly (zod
check closures don't inherit the validup run group), assigns the result back
(so validator transforms — canonicalization, stripping — reach the
synchronizers), and prefixes the array index onto issue paths.

The PROVISIONING group lives in the core-kit entity validators alongside
CREATE/UPDATE: identifier fields (`name`, `realm_id`, policy `type`) are
mounted `[CREATE, PROVISIONING]`; `built_in` is mounted **only** under
PROVISIONING (the API groups deliberately strip it — no HTTP service ever
runs the PROVISIONING group); `user.email` is optional under PROVISIONING
(the user synchronizer backfills a placeholder) while staying required at
CREATE. Consequences for file configs: invalid entities now fail startup
(fail-closed — the load throws before anything synchronizes), unmounted
attribute keys are stripped, and top-level `policies` (previously silently
dropped from the validator output) are validated via
`PolicyProvisioningValidator` (attributes + `extraAttributes` + recursive
`children`) and provisioned.

### Synchronization Order

`ProvisionerModule` runs (1) `GraphProvisioningSynchronizer`, (2) backfill via `assignDefaultPolicy` (config-gated, deprecated).

`GraphProvisioningSynchronizer` processes in order: policies → permissions → roles → scopes → realms.
`RealmProvisioningSynchronizer` processes per realm: clients → permissions → roles → users → robots → scopes.

### Per-Realm Public `web` Client

Every realm auto-provisions a public OAuth2 client named **`web`** (constant
`CLIENT_WEB_NAME` in `@authup/core-kit`) used by authup's own client-web and any
downstream UI embedding `client-web-kit`. It powers the realm-selection login
flow (auth-code + PKCE), so there is no per-realm FK, no migration, and no new
endpoint — the `/authorize` verifier already resolves clients via
`findOneByIdOrName('web', realm_id)`.

- **Attributes** (`buildWebClientAttributes`, `core/entities/client/web-client.ts`):
  `is_confidential: false`, `built_in: true`, `active: true`,
  `grant_types: 'authorization_code refresh_token'` (an enforced allowlist —
  see *Per-client grant allowlist* under the token-endpoint section),
  `scope: 'global openid'`, `redirect_uri` = one `<origin>/**` wildcard per
  trusted app origin (matched by `isSimpleMatch`).
- **App origins** come from `getAppOrigins(config)` = publicUrl's origin +
  `config.trustedOrigins` merged verbatim. A `trustedOrigins` entry may carry
  an http(s) scheme (contributes exactly that origin; other protocols are
  rejected) or be a bare host[:port] — expanded to BOTH the http and https
  origin by `expandToOrigins` (`app/modules/config/origins.ts`).
  `normalizeConfig` is the single owner of that canonicalization (expansion +
  dedupe at config time), so `Config['trustedOrigins']` always holds full
  origins (no path) and `getAppOrigins` does not re-expand. Config validation
  runs through `ConfigValidator` (validup + zod,
  `app/modules/config/validator.ts`; its `Record<keyof Config, ...>` validator
  map is the compile-time exhaustiveness guard — an unmounted Config key fails
  the build instead of being silently stripped), making
  `parseConfig`/`normalizeConfig` async. `TRUSTED_ORIGINS` (env, comma-separated) is
  **security-sensitive**: the `web` client is `built_in` (auto-consent) + `global`
  scope, so any allowlisted origin can obtain a full-permission user token.
  The origin list does NOT drive CORS — CORS reflects any origin by default
  (auth is header-based only, and OAuth2 clients are registered at runtime on
  domains unknown at startup; an explicit allowlist can be set via the
  `middlewareCors` config options). In non-production,
  `http://localhost:3000` is dev-seeded so client-web works on first run.
- **Provisioning (`WebClientProvisioner.ensureForRealm`)** is the single upsert
  mechanism, run two ways and sharing the same factory so they can't drift:
  1. **Startup** — `ProvisionerModule` lists every realm (incl. pre-existing)
     after the graph sync and upserts each realm's `web` client (MERGE — refreshes
     `redirect_uri` when config changes).
  2. **Runtime** — `RealmService.save()` calls `ensureForRealm` when it *creates*
     a new realm, via the injected `webClientProvisioner` (system-level, ungated —
     a realm creator may lack `CLIENT_CREATE`). Not called on update.
  Idempotent; guarded on `built_in` — a non-built-in client named `web` is never
  overwritten (skip + warn).
- **Guardrails:** `web` and `system` are reserved client names — `ClientService.save()`
  rejects API attempts to create/rename a client onto them (`CLIENT_RESERVED_NAMES`).
  The client validator strips `built_in` on create/update, so no API caller can
  self-assign it — only provisioned clients are `built_in`. The SSR `AuthorizeForm`
  auto-submits consent for `built_in` clients (skips the Allow/Deny step); user-
  created clients are never `built_in` and still show consent.

### File Structure

```text
@authup/server-kit (packages/server-kit/src/core/)
  types.ts                          — IEntityRepository<T>, EntityRepositoryFindManyResult<T>
  service.ts                        — AbstractEntityService base class
  actor/types.ts                    — ActorContext type definition
  actor/index.ts                    — barrel export
  index.ts                          — barrel export

apps/server-core/src/core/entities/
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

adapters/database/subscriber/
  module.ts                         — EntitySubscriber<T> base class + buildEntityDestinations helper
  types.ts                          — EntitySubscriberContext, EntitySubscriberCacheContext

adapters/database/domains/{entity}/
  subscriber.ts                     — declarative subscriber: extends EntitySubscriber with { type, target, destinations, cache? }

adapters/http/controllers/entities/
  {entity}/module.ts                — Thin controller class (HTTP adapter only)
  {entity}/index.ts                 — exports module.ts only

adapters/http/controllers/workflows/
  register/module.ts                — RegisterController → IRegistrationService (POST API + GET serves SSR page)
  activate/module.ts                — ActivateController → IRegistrationService (POST API + GET serves SSR page)
  password-forgot/module.ts         — PasswordForgotController → IPasswordRecoveryService (POST API + GET serves SSR page)
  password-reset/module.ts          — PasswordResetController → IPasswordRecoveryService (POST API + GET serves SSR page)
  status/module.ts                  — StatusController (GET / → version + feature flags)

adapters/http/ui/
  render.ts                         — renderUIPage(event, {url, payload}) shared SSR plumbing + sanitizeRelativeRedirect()
  base-path.ts                      — rebasePublicAssetURLs(html, basePath) sub-path asset rewrite (prefix from publicUrl pathname)

adapters/http/request/helpers/
  actor.ts                          — buildActorContext(req) bridge function
  realm-id.ts                       — getRequestRealmID / applyRouteRealmIDToBody / setRequestRealmID

adapters/http/middleware/built-in/
  realm-resolver/module.ts          — RealmResolverMiddleware resolves :realmId (UUID or name) → UUID
  realm-resolver/factory.ts         — createRealmResolverMiddleware(ctx)

app/modules/http/modules/
  controller.ts                     — Factory methods: creates repositories, services, and controllers
  middleware.ts                     — HTTPMiddlewareModule (mountRealmResolver wires realm-resolver at /realms/:realmId)

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

### Realm reach is a coarse `realm_scope` enum on the grant (NOT a policy)

There is no special "master realm" bypass, and realm reach is **not** a policy. Each
permission-junction row (`role/user/client/robot_permission`) carries a `realm_scope`
enum column (`@authup/access` `RealmScope`), a coarse, **actor-relative** reach with a
total order and a fail-closed default:

| `realm_scope` | matches resource realm `R` vs actor realm `A` | who |
|---|---|---|
| **`own`** (default) | `R === A` only — own realm, not null, not other realms | safe default; `realm_admin` writes |
| **`ownOrNull`** | `R === A` or `R === null` (global/null resources) | `realm_admin` reads (use global building blocks) |
| **`any`** | always — any realm incl. null | `admin` |

It is enforced inside the server-core `PermissionBindingPolicyEvaluator` (a separate
factor, ANDed with the junction's `policy_id` policies) by invoking the
`RealmMatchPolicyEvaluator` in **SCOPE MODE**: a grant's `realm_scope` is matched
against the resource realm supplied under the **`realmMatch` PolicyData key** (a single id,
`null`, or an array of ids — `realmScopeMatches` requires the scope to reach every listed
realm). The realm-match call is made **directly** (not via the policy engine — `realmMatch`
is in `policiesExcluded`) and stays **outside** the `policies[]` merge, so the policy-free
fail-open drop can never touch realm reach. A **realm-less / anonymous** actor can never
satisfy `own`/`ownOrNull` (only `any`), and the factor neutral-passes when no `realmMatch`
key is present (`preEvaluate` / gate checks / realm-less resources).

**Reach and policy are paired PER GRANT — a disjunction, not a folded MAX (issue #3155,
plan 036).** An actor can hold several grants for the *same* permission with different
`(realm_scope, policy_id)`. `aggregatePermissionPolicyBindings` groups the raw bindings into a
`PermissionPolicyBindingAggregated` = `{ permission, grants: { realm_scope, policy }[] }` — the
actor's **disjunction** of grants, with **no lossy collapse**. Every consumer evaluates that
disjunction directly: access is granted iff **∃ grant . `realmScopeMatches(grant.realm_scope,
resource)` ∧ (grant's `policy` passes)**, so each grant's reach stays paired with its OWN
policy. This is needed in both directions: a policy-free `own` grant must not MASK a
policy-bound `any` grant's wider reach (the under-grant the issue reported), and an `own`
grant's passing policy must not RIDE an `any` grant's wider reach when that `any` grant's own
policy fails (the symmetric over-grant). There is no collapsed `realm_scope` anymore — the
predecessor `mergePermissionPolicyBindings`, which folded a single lossy `(realm_scope,
policies)` per key, was removed in favour of the disjunction.

**Resources present their realm under the `realmMatch` PolicyData key — entities AND
junctions.** Entity services derive it from the ATTRIBUTES `realm_id` via
`AbstractEntityService.resourceRealmMatch` (set only when the source carries `realm_id`, so a
self-edit UPDATE — where the validator strips `realm_id` — leaves the key absent and
neutral-passes; `realm_id` also stays in ATTRIBUTES for the self-manage denylists). Junction
services (`role/user/client/robot-permission`, `user/client/robot-role`, `client-scope`,
`identity-provider-role-mapping`, `permission-policy`) carry no top-level `realm_id`
(only `owner_realm_id`/`permission_realm_id`), so they set their **OWNER realm**
(`role_realm_id` for role-permission, `user_realm_id` for user-role, `client_realm_id`
for client-scope, … via `JunctionEntityService.junctionResourceRealm`) under the `realmMatch`
key — junction ATTRIBUTES carry only genuine columns. So a junction write to another realm's
entity is realm-gated like a direct entity write — a `realm_admin` in realm A cannot bind a
permission/role/scope onto a realm-B role/user/client even though the permission itself is
global. (The *member* side — the permission/role being attached — is gated separately by the
superset `preEvaluate`.) Setting a `null` owner (a global entity) under `own` correctly
denies, consistent with a `realm_admin` not being able to write a global base entity.

> **One evaluator, no ATTRIBUTES pollution (plan 035):** the resource realm rides the dedicated
> `realmMatch` PolicyData key — a legit policy-type slot read only by `RealmMatchPolicyEvaluator`
> — instead of being stamped into the ATTRIBUTES bag. So `realm_scope` reach and user-authored
> realm-match policies share **one** evaluator (SCOPE MODE vs attribute-name mode), and an
> `ATTRIBUTE_NAMES` allowlist on a junction permission no longer mis-sees a synthetic `realm_id`
> (junction ATTRIBUTES carry only genuine columns). The realm-match evaluator reads the realm
> ONLY from `realmMatch` (single-source — an ATTRIBUTES `realm_id` is not a realm source for the
> scope factor).

> **Dependency:** this factor runs inside `PermissionBindingPolicyEvaluator`, i.e. only when
> `system.default` is bound to the operation permission. Universal binding to every permission
> comes from `assignDefaultPolicy` (config `permissionsDefaultPolicyAssignment`, default `true`,
> deprecated). With it disabled, the realm gate (and all permission-binding policy enforcement)
> weakens — a pre-existing coupling the realm isolation rides on.

`policy_id` remains for **additional** restrictions ANDed on top — and a realm
restriction *can* still be authored as a `policy_id` `ATTRIBUTES` policy
(`{ realm_id: { $in: [...] } }`); it is evaluated but is **NOT** part of the realm-scope
cap/superset (a restricted actor's explicit `policy_id` is ignored on create/update), so
it is an extra ANDed restriction, never a reach control.

**Propagation CAPs, not inherits**: a creator may only stamp a `realm_scope` ≤ its own
ceiling for that permission (ordered `min`); only an `any`-scoped actor may set an
explicit `policy_id` (a restricted actor's explicit `policy_id` on create/update is
ignored — no widen via attach/detach). `isSuperset` additionally requires the parent's
`realm_scope` ≥ the child's per permission (ordered compare).

### Admin Roles

| Role | Scope | Realm reach (junction `realm_scope`) |
|------|-------|-----------------|
| `admin` | All permissions, no restrictions | `any` — acts on all realms + `null` global, **from an identity in ANY realm** |
| `realm_admin` | All permissions except `realm_create`, `realm_update`, `realm_delete` | `ownOrNull` (reads) / `own` (direct entity CUD) |

### Nested Route Mounting

Realm-scoped controllers are dual-mounted via `@routup/decorators` array paths:

```typescript
@DController(['/users', '/realms/:realmId/users'])
export class UserController { ... }
```

This applies to the six controllers that read realm context: `client`, `robot`, `user`, `permission`, `policy`, `identity-provider`. Junction controllers (e.g. `client-role`, `user-permission`) are mounted flat — their realm is implicit via the parent entity's joins.

**Request flow**:

1. `RealmResolverMiddleware` (mounted at `router.use('/realms/:realmId', middleware)` in `HTTPMiddlewareModule.mountRealmResolver`) fires on any URL whose first segment is `/realms/<key>`. It accepts either a UUID or a realm name, resolves via `IRealmRepository.resolveId()` (UUID pass-through — no existence check; names resolve canonically), and stashes the resolved UUID on `event.store[sym]` via `setRequestRealmID(event, uuid)`. Unknown realm name → `EntityNotFoundError` → 404; an unknown realm UUID passes through and fails closed at the repository predicate below.
2. The decorator-mounted route subsequently re-extracts `:realmId` from the URL into `event.params.realmId`, clobbering the raw URL value with itself — this is why the resolved UUID is stored on `event.store`, not `event.params`.
3. Controllers read the realm via `getRequestRealmID(event)` (helper in `adapters/http/request/helpers/realm-id.ts`), which prefers the stashed UUID and falls back to `event.params.realmId` for cases where the middleware didn't run.

**Fail-closed realm-key predicates**: every repository adapter that filters a
name lookup by a realm key routes it through `IRealmRepository.resolveId(key)`
(UUID → returned as-is, binding an unknown UUID matches zero rows; name →
canonicalizing lookup, `null` on miss) and **fails closed** — `return null` /
`[]` — instead of silently dropping the filter. This covers the
`findOneByName` / `findOne` / `findByProtocol` blocks in the
identity-provider, user, client, robot, role, scope, permission, and policy
adapters plus the permission/policy checker services (`EntityNotFoundError`
on an unknown realm key; a realm-less check still runs unfiltered). Never
reintroduce the fail-open `resolve(...)` + `if (realm)` filter-drop shape — it
let `GET /realms/<unknown-uuid>/users/<name>` match a cross-realm row.

**Route-realm precedence (writes)**: controllers call `applyRouteRealmIDToBody(event, data)` at the top of `add`/`edit`/`put` (and inside `IdentityProviderController.write()`). When the route has `:realmId`, the helper overwrites `data.realm_id` with the route value — *route wins silently over body* (no `BadRequestError` for mismatch; the body value is simply discarded).

**Permission model**: the `realm_scope` enum evaluates against the resolved `entity.realm_id`. Mounting `/realms/:realmId/users` does not by itself grant cross-realm write access — the dual mount is a routing convenience, not an authorization shortcut. The global `admin` role (`realm_scope: any`) **can** act cross-realm from any realm; a `realm_admin` (`own`/`ownOrNull`) cannot. (Route-realm precedence still applies to the body `realm_id`.)

**`RealmController` is unaffected**: the middleware is mounted at `/realms/:realmId/:nested` (not just `/realms/:realmId`) so it only fires when there's at least one path segment after `:realmId`. Bare realm CRUD routes (`GET/POST/PUT/DELETE /realms/:id`) and sub-resource routes that belong to `RealmController` itself (`/realms/:id/.well-known/openid-configuration`, `/realms/:id/jwks`, `/realms/:id/jwks/:keyId`) are not intercepted. This is important for `PUT /realms/:id` upsert semantics — an unknown realm name in the path is a valid "create" intent, not a lookup miss.

## Policy-Permission Model (n:m)

Permissions reference policies through a junction table (`auth_permission_policies`), not a direct FK. Each permission has a `decision_strategy` (default: `unanimous`) controlling how multiple policies are combined.

### Evaluation Layers

```
Layer 1: Permission-level policies (from auth_permission_policies)
  └── system.default (composite, UNANIMOUS)
        ├── system.identity
        └── system.permission-binding   (also enforces the realm_scope enum + Layer-2 policy)

Layer 2: per-grant junction (from role-permission.policy_id + realm_scope, etc.)
  ├── realm_scope enum  (coarse realm reach — own / ownOrNull / any)
  └── policy_id policy  (optional additional ATTRIBUTES/IDENTITY restriction)
```

Both layers must pass for access to be granted. Layer 1 is evaluated by the
`PermissionEvaluator` in `@authup/access`. The server-core `PermissionBindingPolicyEvaluator`
(invoked via `system.permission-binding`) loads the actor's grants for the permission and
evaluates the **per-grant disjunction**: for each grant it matches that grant's `realm_scope`
against the resource `realm_id` (when present) AND evaluates that grant's `policy_id` policies,
and grants iff some grant passes both (see
[Realm reach](#realm-reach-is-a-coarse-realm_scope-enum-on-the-grant-not-a-policy)). The
baseline `system.realm-match` child and
the `system.realm-bound` / `system.realm-or-global` policies were **removed** in favour of the
enum; the `REALM_MATCH` policy *type* is retained for user-defined actor-relative policies.

### PermissionBinding & aggregated grants

```typescript
// packages/access/src/permission/types.ts
// Raw binding — one permission grant as loaded from a role/identity junction.
export type PermissionPolicyBinding = {
    permission: {
        name: string,
        client_id?: string | null,
        realm_id?: string | null,
        decision_strategy?: string | null,
    },
    policies?: PolicyWithType[],
    // realm reach of this grant (a separate factor from `policies`)
    realm_scope?: 'none' | 'own' | 'ownOrNull' | 'any',  // relative, default own
};

// aggregatePermissionPolicyBindings(raw[]) groups by permission key into the actor's
// disjunction of grants — the lossless replacement for the old collapsed binding.
export type PermissionGrant = {
    realm_scope: 'none' | 'own' | 'ownOrNull' | 'any',   // normalized, fail-closed default own
    policy?: PolicyWithType,                             // single junction policy (id kept) or a composite
};
export type PermissionPolicyBindingAggregated = {
    permission: BasePermission,
    grants: PermissionGrant[],
};
```

A raw `PermissionPolicyBinding` wraps a permission entity with its associated policies. The
permission is uniquely identified by `name + client_id + realm_id`. The `policies` array
contains:
- **Permission-level** (Layer 1): n:m policies from `auth_permission_policies` (loaded by `PermissionDatabaseProvider`)
- **Junction-level** (Layer 2): the single junction policy from `role_permission.policy_id` etc. (loaded by `getBoundPermissions()`)

Each grant carries its **realm reach** (`realm_scope`) as a **separate factor from its
`policy`** — a coarse, actor-relative enum (`none < own < ownOrNull < any`), ANDed with that
grant's policy and evaluated inside `system.permission-binding` against the resource
`realm_id`. It is **not** part of the binding identity key and is never folded into the policy
expression (so it is immune to the fail-open policy merge). When an actor holds multiple grants
for one permission key, `aggregatePermissionPolicyBindings` keeps each `(realm_scope, policy)`
as a distinct grant and every consumer — the binding evaluator, `isSuperset`, junction-grant
propagation, the memory provider — evaluates the disjunction directly (see
[Realm reach](#realm-reach-is-a-coarse-realm_scope-enum-on-the-grant-not-a-policy)). There
is no absolute realm-id allowlist on the grant — a specific-realm-set restriction is
expressed via a `policy_id` `ATTRIBUTES` policy. See
[Realm reach is a coarse `realm_scope` enum on the grant](#realm-reach-is-a-coarse-realm_scope-enum-on-the-grant-not-a-policy).

## Security: Permission Assignment

### Superset Check

When assigning a role to an identity or identity-provider (user-role, client-role, robot-role, identity-provider-role-mapping), `IdentityPermissionProvider.isSuperset(parent, child)` verifies the actor (`parent`) owns at least what the target role (`child`) confers. It is **disjunction-aware and policy-aware** — there is no lossy collapse (the old `mergePermissionBindings` AFFIRMATIVE fold was removed in #3158):

1. `aggregatePermissionPolicyBindings` groups each side's raw bindings into per-permission **grant disjunctions** (`{ realm_scope, policy }[]`).
2. For each target permission (matched by `name + realm_id + client_id`): if the actor holds no grant for it → fail.
3. For each target **grant**, require that **some** actor grant **dominates** it (`grantDominates`). Because access is the OR over grants, child-access ⊆ actor-access iff every child grant is covered by some actor grant.

**`grantDominates(parent, child)`** (`@authup/access`, `permission/helpers/grant.ts`) — a parent grant covers a child grant iff:

- **Reach:** `compareRealmScope(parent.realm_scope, child.realm_scope) >= 0` (ordered `none < own < ownOrNull < any`), AND
- **Policy** (`policyDominates`): an unrestricted parent covers any child; a restricted parent never covers an *unrestricted* child (it cannot confer the wider policy-free reach it lacks); two restricted grants cover one another **only when their policies are provably the same** (`isPolicyEquivalent`), never by evaluated effect. Provably-same means **either** the same persisted row (equal primary-key `id`) **or** structurally-identical configuration — a value-compare (`smob` `isEqual`) over the policy after `normalizePolicyForEquality` strips the non-evaluation-affecting columns (`id, built_in, name, display_name, description, parent_id, parent, realm_id, realm, created_at, updated_at`) recursively through `children`. So two *distinct rows with identical config* (same predicate) dominate, but a genuinely **different** configuration does not. A shared `type` is **not** equivalence (two `attributes` policies are both `type: attributes`, but `{department:X}` ≠ `{department:Y}`). Deciding `child ⊆ parent` for *different* trees is undecidable (a policy is a predicate over `PolicyData`), so we accept only provable identity/equality and treat anything else as distinct (#3159 — the predecessor treated any two policy-bound grants as mutually dominating: a latent over-permit across disjoint policy scopes, e.g. a `department=X` actor conferring a `department=Y` grant). Fail-closed; may under-permit only when the two equal predicates are not provably equal (e.g. composite children in different order). **Security invariant:** every key in `NON_SEMANTIC_POLICY_KEYS` must stay non-evaluation-affecting — adding an evaluation-relevant field there would widen equivalence into an over-permit (new *config* fields need not be added; they are compared by default).

An actor with both `admin` (unrestricted) and `realm_admin` (restricted) grants for a permission gets the union: the unrestricted grant dominates anything, so the disjunction stays permissive without any "least-restrictive-wins" fold.

### Junction Policy Propagation

When creating or updating any permission-binding junction (role-permission, user-permission, client-permission, robot-permission):

1. The service calls `this.identityPermissionProvider.resolveJunctionGrant(identity, { name, realmId, clientId, realmScope })`, passing the **requested** reach (`validated.realm_scope ?? own` on create; `data.realm_scope ?? entity.realm_scope` on update — the *resulting* junction reach, so a policy-only update can't silently widen).
2. It aggregates the actor's grants for that permission and selects the grant **relative to the requested reach** (`selectGrantForRequest`, #3160): each grant is ranked by the reach it can confer *for this request* — its `realm_scope` capped to `realmScope` — so a lower-scoped policy-free grant beats a higher-scoped policy-bound grant when both cap to the same requested reach (highest *capped* reach, policy-free preferred on a tie). This is **not** a global "ceiling" — a mixed-grant actor (e.g. `own`+no-policy *and* `any`+policy) propagates its policy-free `own` grant for an `own` request instead of inheriting the wider grant's policy.
3. The selected grant is returned **uncapped**; the new junction is then capped by the consumer: `realm_scope = min(requested, selected.realm_scope)`, and the selected grant's **own** `policy` (its `id`) is propagated as `policy_id` — never the target's. (If the selected grant is policy-restricted but its policy is not a propagatable `Policy` — e.g. an id-less composite — it fails closed to `realm_scope: none`. A clean lower-scoped grant covering the request avoids that fail-closed.)
4. Returning the selected grant uncapped preserves the "only an unrestricted (`any`, policy-free) actor may set an explicit `policy_id`" rule: that check reads the selected grant's uncapped `realm_scope`/`policy`, so it still fires exactly when the actor genuinely holds an `any` policy-free grant.

This prevents privilege escalation: a `realm_admin` cannot create unrestricted permission bindings, and (post-#3160) a mixed-grant actor neither under-propagates (spurious policy inheritance on a narrow request) nor over-propagates (riding a wider grant's reach with a narrower grant's policy). Because the actor only ever propagates its *own* policy (not the target's), this path needs no policy-content comparison — the asymmetry with the superset check, which must compare against fixed target grants.

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

UserAttribute names are still filtered against User entity columns by `UserAttributeService.create/update` — any `data.name` that matches a reserved User entity column raises a `BadRequestError` from `@authup/errors`. This prevents confusing rows like `UserAttribute(name='email', value='x')` coexisting with `User.email='y'`. The reserved-name filter and the policy denylist are layered: the policy stops admin-only field names from being declared as UserAttribute keys; the validator-level rejection stops shadowing of normal User columns even when those columns aren't in the denylist.

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

## Authorize Realm Binding (plan 041)

The authenticated identity's realm MUST equal the client's realm — an identity
cannot authorize (or redeem a code / refresh a token) against a client in
another realm. Without this an identity with a lingering session for realm A,
redirected to `/authorize` for realm B's `web` client (a downstream app's realm
picker), silently minted realm-A tokens against realm B's client (confused
deputy; the artifact carried realm-A `iss`/signing-key + realm-B `aud`).
Enforced server-side at **three** points — the kit UI (realm-mismatch card in
`Authorize.vue`) is UX only:

1. **`POST /authorize` issuance** — `OAuth2Authorization.authorize()` throws
   `OAuth2LoginRequiredError` (`ErrorCode.OAUTH_LOGIN_REQUIRED` / OIDC
   `login_required`, HTTP 400, **no identity data in the body** — no
   realm-enumeration oracle) when `identity.data.realm_id !== data.realm_id`
   (the client realm the code-request verifier stamped). The gate reads the
   scalar `realm_id` column, not the `realm` relation — the relation may not
   be loaded on the resolved identity. An identity carrying no `realm_id`
   fails closed the same way (plan 047.6 — a clean `login_required`, never a
   raw TypeError/500); the code issuer keeps its own null-guard on the loaded
   relation (it stamps `realm_name`) and fails closed with `invalid_request`.
2. **`/token` code redemption** — the code verifier's `realmId` option (fed
   `client.realm_id` by the HTTP authorize grant) rejects
   `code.realm_id !== realmId` with `invalid_grant`. Covers codes minted outside
   `authorize()` (identity-provider callback) and in-flight pre-deploy codes.
3. **`/token` refresh parity** — a **public** client refreshing a token whose
   `realm_id` differs from the client's realm → `invalid_grant` (kills legacy
   cross-realm public-`web`-client refresh tokens). Confidential clients are
   exempt — the secret proves identity, and the documented cross-realm password
   grant (UUID user + master client) relies on that exemption.

Deliberate breaking change: master-realm admins can no longer ride the built-in
`web` client into other realms' apps. A name-identified client at `/authorize`
now also requires a realm hint (`invalid_request` otherwise — every realm has a
`web` client, so a bare name is ambiguous). All SSR auth pages emit
`Content-Security-Policy: frame-ancestors 'none'` + `X-Frame-Options: DENY`
(clickjacking guard — the pages hydrate first-party session state, so click-
gating is only a defense when framing is denied).

Ending a lingering authup session on a downstream app's logout is **not** part
of this gate — it belongs to standard OIDC RP-Initiated Logout
(`end_session_endpoint`, plan 041 PR C), so kit and non-kit RPs share one
mechanism. `store.logout()` stays local-only (token/cookie cleanup); it does not
call `DELETE /sessions/@me` (that endpoint remains the session-management API for
revoking a specific session from the sessions UI).

### Response types — code only (plan 042 item 3)

`response_type=code` is the **only** supported response type (OAuth 2.1
posture). The implicit/hybrid response types (`token`, `id_token`, `none`) are
rejected by the code-request validator (a `response_type` issue → 400) and,
defense in depth, by `OAuth2Authorization.authorize()`
(`unsupported_response_type`). The authorization response never carries tokens
— an openid-scoped code carries `auth_time` (and `nonce`) on the code blob and
the `/token` exchange mints and returns the id_token. Discovery
`response_types_supported` advertises only
`code`. Consequently the code-request verifier requires PKCE + `state` for
public clients **unconditionally** (the former `willIssueCode` gate is gone —
every verified request issues a code). The verifier also rejects a
**pattern-less client** outright (plan 047.1, OAuth 2.1 posture): a client with
no registered `redirect_uri` patterns cannot use `/authorize` at all —
previously its `data.redirect_uri` went unchecked (any value passed, merely
flagged `redirectUriVerified=false`), letting a misconfigured client issue
codes to arbitrary attacker-supplied URIs. `redirectUriVerified` is now `false`
only when the request itself carries no `redirect_uri`.

### OIDC prompt surface & id_token claims (plan 041 PR B)

`/authorize` accepts the OIDC Core §3.1.2.1 params `prompt`
(space-delimited `none|login|consent|select_account`; unknown tokens
**ignored** for forward-compat; `none` combined with any other value →
`invalid_request`), `max_age` (coerced non-negative int), and `login_hint`
(canonicalized `trim().toLowerCase()`). Since authup's `/authorize` is a
**hosted** login page, the ladder in the kit `Authorize.vue` renders the
behavior for every RP (kit or not): `prompt=select_account` shows an
`AAccountPrompt` "continue as / use another account" chooser instead of silently
continuing; `login_hint` pre-fills the identifier; `prompt=consent` suppresses
the `built_in` auto-consent. `buildAuthorizeURL` (kit) **defaults
`prompt=select_account`** (overridable) so kit apps inherit account-switching.
The chooser targets a **lingering** session only: `Authorize.vue` watches the
kit store's `lastAuthOrigin` for a change to `login` during its mount (plan 045
— the store stamps it at the END of a settled `login()`, so the signal is
race-free against LoginForm unmounting; the store additionally exposes a
presence-derived `status` ref: `unauthenticated | authenticating | restoring |
authenticated`), so a just-completed credential entry (which IS the account
selection) proceeds straight to consent instead of re-prompting "continue as X"
for the account just authenticated; the branch also waits for the store's `user`
to resolve to avoid a "Continue as \<empty\>" flash — but only while resolution
is genuinely in flight: once it settles without a user (a non-user client/robot
lingering session, or a failed `userInfo` lookup), the chooser renders a
"use another account" escape hatch instead of spinning forever (plan 047.2 —
`Authorize.vue` tracks this with a local `userSettled` ref over the store's
`resolve()` settling, since the #3215 store rewrite; a failure settles the
chooser rather than latching it closed). The manual consent screen
(`AuthorizeForm`) additionally renders a **"Signed in as X — Not you?"** chip
(emits `switch` → local `store.logout()` → login form), so a wrong-account user
can switch even when the RP sent no `prompt=select_account`. Prompt/error string
comparisons use the `@authup/specs` `OAuth2AuthorizationPrompt` /
`OAuth2ErrorCode` enums, not bare literals. **Dead-bearer resilience (plan 042
item 13):** `AuthorizeForm`'s consent POST catch emits `loginRequired` on **both**
a `login_required` body error **and an HTTP 401** — a bearer that died mid-flow
(a session sweep, a sibling-tab logout, an account switch) previously fell into
`autoConsentFailed`, rendering the manual consent screen whose retry re-POSTed
the same dead bearer forever; now it falls back to re-authentication.
`AuthorizeForm`'s **deny/abort** path is gated on `redirectUriVerified` like
every other redirect in the ladder (plan 047.1): with an unverified
`redirect_uri` the form renders a stay-on-page notice instead of navigating
with `error=access_denied` (a user-click open redirect otherwise).

`prompt=login` / `max_age` freshness is enforced **server-side** in
`OAuth2Authorization.authorize()` (the authoritative backstop; the hosted UI is
convenience): the authentication time is the backing session's `created_at`
(**never** `refreshed_at` — a token refresh must not reset it; a session-less
Basic-auth authorize counts as "now"), and a violation throws
`login_required`. The window is `config.promptLoginMaxAge`
(`PROMPT_LOGIN_MAX_AGE`, default 60s) — a documented stateless
approximation, wired via the `AuthorizeController` → `HTTPOAuth2Authorizer` ctx
alongside the injected `ISessionManager`. The window is the **deliberate
contract**, pinned by tests (plan 047.A): a sub-window session satisfies
`prompt=login` without re-auth (it absorbs the hosted login→consent
round-trip), an over-window session throws, and `max_age=0` is *stricter* than
`prompt=login` (the documented inversion). Strict step-up =
`PROMPT_LOGIN_MAX_AGE=0`.

**id_token claims (bug fix + addition):** `auth_time` is now the session's
creation instant (previously — wrongly — the token issuance time == `iat`), and a
`sid` claim (= `session_id`) is added (prerequisite for RP-initiated /
back-channel logout). Both are `OAuth2TokenPayload` fields.

**Minting site — the `/token` exchange, not `/authorize` (plan 042 item 6):**
the id_token is minted inside the `authorization_code` grant
(`OAuth2AuthorizeGrant.runWith`) **after** `resolveSession`, so its `sid` is
**authoritative** — it references the real backing session in the reuse branch,
the fallback-create branch, and the session-less **federated IdP** flow alike
(the last previously produced **no** id_token at all, since only
`OAuth2Authorization.authorize()` minted one and the IdP callback bypasses it).
`OAuth2Authorization.authorize()` no longer mints the id_token or holds an
`openIdTokenIssuer` / `identityResolver`; instead it stamps the authentication
instant onto the auth-code blob (`OAuth2AuthorizationCode.auth_time`, replacing
the removed `id_token` field — cache blob, no migration) as the `auth_time`
source, and the grant reads it back. `at_hash` (over the freshly-issued access
token) is computed at the exchange, with the digest **derived from the
id_token's signing `alg`** (plan 047.7 — `*256`→SHA-256, `*384`→SHA-384,
`*512`→SHA-512, left half per OIDC Core §3.1.3.6; today all keys are RS256, so
behavior is unchanged — the derivation exists so a future multi-alg key can't
silently mint wrong hashes). No `c_hash` is minted — it only exists for the
hybrid response types authup dropped (code-only). `nonce` rides from the code.
The `openIdTokenIssuer` is wired into the `TokenController` authorize grant, and
`codeIssuer.updateIdToken` is gone. This resolves the plan-041 residual where a
sub/realm-mismatch fallback (or session-deleted-in-flight) left the id_token's
`sid` pointing at a stale session.

**Discovery** (realm-scoped `.well-known/openid-configuration`) advertises
`prompt_values_supported` (`none`, `login`, `consent`, `select_account`) and
**fixes** `revocation_endpoint` from `…/token` to `…/token/revoke` (RFC 7009 —
an RFC 7009 POST to `/token` never worked). An empty `max_age=` is treated as
**absent** (the validator preprocesses blank → undefined; `z.coerce.number('')
=== 0` would otherwise silently force re-authentication).

**`prompt=none` (silent auth) + `prompt=login` (re-auth) are handled in the
hosted SSR kit `Authorize.vue`, NOT server-side (plan 042 item 10).** The
server GET cannot silently authenticate: auth is header-only (the
authorization middleware reads the identity only from `Authorization`; cors.ts
relies on "no cookie-authenticated endpoint exists"), and a top-level
`GET /authorize` browser navigation carries no bearer. The session lives
client-side (the kit store's cookie), so the SSR page — which every RP (kit or
not) is redirected to — owns the decision. The kit ladder, evaluated after the
SSR app's router guard `await store.resolve()` settles the session:
- **`prompt=none`**: not-logged-in / realm-mismatch → redirect
  `redirect_uri?error=login_required&state`; non-`built_in` client →
  `consent_required` (no persisted consent record — see plan 043); `built_in`
  + logged-in + realm-match → the existing auto-consent path issues the code
  silently; a max_age/freshness `login_required` from the POST is redirected as
  `login_required`. Every silent error redirect is gated on
  `redirectUriVerified` — an unverified `redirect_uri` degrades to interactive
  UI (never redirect an OIDC error to an unregistered URI). Rendered by
  `AuthorizeSilentRedirect.vue` (client-only `window.location` in `onMounted`).
- **`prompt=login`**: forces the login form (with a re-auth banner,
  `authupClient.reauthText`) even for a logged-in user, until a fresh login on
  this page fires `LOGGED_IN`; the same banner path is reused when the POST
  surfaces `login_required` mid-flow (replacing the old silent
  `switchAccount`).

**Known limitation (plan 047.C, accepted):** because the ladder is client-side,
a JS-less or scripted `prompt=none` GET receives `200` HTML instead of an
immediate error redirect — an interop/ergonomics gap only (every security
backstop runs on POST `/authorize` + `/token` regardless of client JS). A
server-side silent answer would require cookie-based session recognition on
`/authorize`, deliberately avoided by the header-only auth/cors model; scoped
separately as plan 063.

The anonymous `GET /authorize` hydration payload carries a **trimmed client
DTO** (`ClientSummary` = `id`/`name`/`display_name`/`built_in`/`created_at`) plus
the `RealmSummary` and scopes — never the client's `redirect_uri` patterns (the
trusted-origin set), `grant_types`, internal `base_url`/`root_url`, or the
secret storage flags. `ClientEntity.secret` is additionally `select:false`, but
the DTO must not rely on that alone.

### RP-Initiated Logout — `end_session_endpoint` (plan 041 PR C)

`GET`/`POST /logout` (discovery `end_session_endpoint`, **no feature flag**) is
the RP-agnostic session-termination mechanism — the intended way a downstream
app (kit or non-kit) ends a lingering authup session on its own logout, so
`store.logout()` never needs a kit-specific session delete. Core logic is
`OAuth2EndSessionService` (`core/oauth2/end-session/`), wired via
`createLogoutController`. Security posture (all enforced, unit-tested matrix):

- **Request validation (plan 042 item 4):** `OAuth2EndSessionRequestValidator`
  (`core/oauth2/end-session/validator.ts`) runs over the merged body+query
  before anything else — length caps on every param (`id_token_hint` ≤ 4096,
  `post_logout_redirect_uri` ≤ 2000 + URL check, `state` ≤ 2048), blank params
  treated as absent, and the `realm_id`/`realm_name` hint canonicalized
  `trim().toLowerCase()` at the ingress (canonical-identifier-form layer 3, same
  contract as the token endpoint's `readRealmHint`). On a validation failure the
  controller falls back to a **parameter-less** confirm page (every
  attacker-controlled value dropped, no revoke, no redirect) — never a JSON
  error: the human behind the browser can still sign out.
- **id_token_hint** is verified by `OAuth2TokenVerifier` with a new
  `ignoreExpiry` option — signature, nbf and (crucially) **kind** still apply;
  only `exp` is skipped (a logout hint is routinely expired). The option threads
  down to server-kit's `verifyToken` (`validateExp: false`). The `ignoreExpiry`
  verify path **must NOT populate the shared signature-keyed claims cache**
  (`OAuth2TokenVerifier.verify` skips `saveWithSignature` when `ignoreExpiry` is
  set): otherwise an expired token re-caches with `buildTTL`'s 1h fallback (a
  past `exp` → non-positive ttl → 3600s) and the cache-first branch returns it
  with no `exp` re-check on every later verify — so `/token/introspect` would
  report an expired token as `active` for up to an hour (RFC 7662). The
  exp-bypass stays scoped to the single end-session call. A hint whose `kind
  !== id_token` is **rejected** (access/refresh tokens also carry `session_id`,
  so accepting them would let a leaked access token force a logout). `aud` vs
  request `client_id` cross-check (plan 047.4/047.B): when a **verified** hint
  is paired with a request `client_id`, the `client_id` MUST match the hint's
  `aud` — a name-form `client_id` is first **resolved to its client UUID**
  (realm scope: the request's `realm_id`/`realm_name` hint, else the *verified*
  hint's own realm claim; never claims of an unverified hint, no master
  fallback) and the resolved UUID is compared. Fail-closed shape: an `aud`-less
  verified hint with a request `client_id`, or a name that doesn't resolve,
  counts as **unverified** (no revoke; confirm page still works). Realm-key
  resolution is fail-closed too: a supplied-but-unknown realm key skips client
  resolution entirely (no name, no redirect), and a **name**-form `client_id`
  with no realm key anywhere fails closed as well (ambiguous — every realm has
  a `web` client; same rule as the /authorize verifier). A UUID `client_id` —
  including the sole-`aud`-derived one — resolves globally as before.
- **Bounded expired-hint window (plan 042 item 2):** with config
  `endSessionHintGracePeriod` > 0 (seconds past `exp`, ENV
  `END_SESSION_HINT_GRACE_PERIOD`), a hint expired beyond the window counts as
  **unverified** (`isWithinHintGraceWindow`; exp-less payloads fail closed) —
  bounding how long a leaked id_token stays a replayable remote logout. The
  default 0 keeps spec/Keycloak parity (any expired hint accepted); the real
  bound is then session lifetime, since a hint can only ever revoke the live,
  sub-matched session its `sid` references.
- A signature-verified hint carrying `sid` → the referenced session is revoked
  **immediately** (`ISessionManager.revoke`), but **only** after
  `session.sub`/`sub_kind` match the hint's subject (never revoke someone else's
  session). Without a hint the endpoint mutates nothing — the SSR page's sign-out
  is a click-gated, bearer-authenticated `store.logout()`.
- `post_logout_redirect_uri` is honored **only** when it is absolute http(s) AND
  `isSimpleMatch`es a registered pattern in the client's dedicated
  `post_logout_redirect_uri` column (open-redirect guard); otherwise dropped,
  and `state` rides only alongside a validated redirect. **The column is
  separate from `redirect_uri` (plan 042 item 9)** — login and logout redirect
  surfaces are no longer conflated: a URI that matches the login `redirect_uri`
  but not the post-logout allow-list is rejected. It is a nullable
  `text` column on `ClientEntity` + core-kit `Client` + `ClientValidator`
  (the 2000-char cap is on the inbound `post_logout_redirect_uri` **request
  param** in `OAuth2EndSessionRequestValidator`, not the column;
  comma-separated wildcard patterns, same shape as `redirect_uri`; mounted in
  every group, **not** in the self-manage denylist, **not** in the trimmed
  `ClientSummary` DTO, **added** to the client repository `fields.default`
  allow-list so reads return it). The migration is folded into the
  still-unreleased `1783325495597-Default.ts` (both dialects, up/down verified
  by the `tests-migrations` round-trip). `buildWebClientAttributes` sets it to
  the same `<origin>/**`-per-app-origin patterns as `redirect_uri`, so
  `WebClientProvisioner`'s MERGE widens it on the next startup.
- **The server-side bounce fires ONLY when the logout was actually performed**
  (`serverRevoked` — a verified hint revoked the session). A hint-less or
  forged request with an otherwise-valid `post_logout_redirect_uri` must **not**
  302 straight back to the RP: that would let the RP treat a no-op round-trip as
  a successful logout while the authup session survives. Instead the validated
  redirect is threaded into the render payload and the click-gated confirm page
  (`AEndSessionForm`) performs the bearer-authenticated sign-out, then navigates
  to it (`window.location`).

The SSR page is `apps/server-core/ui/src/pages/logout.vue` → kit
`AEndSessionForm`; the typed URL builder is `buildEndSessionURL` in
`client-web-kit`. **`AEndSessionForm` auto-clears local state on mount ONLY when
`serverRevoked && hintSub === store.user.id && hintSubKind === 'user'`** — the
revoked subject must be the browser's own user, kind included (plan 047.5; a
missing `hintSubKind` fails closed — no auto-clear). Without that gate, a
cross-site `GET
/logout?id_token_hint=<attacker's own id_token>` (which revokes the attacker's
own session, so `serverRevoked` is true) would forcibly sign out any unrelated
victim who merely renders the page (`store.logout()` is local-only, so it acts
on whoever's browser rendered it) — a forced-logout CSRF. The controller
forwards `hintSub` + `hintSubKind` (only for a verified hint) and the validated
`redirect` into the payload for this gate. **Residual (Keycloak parity):** a *leaked* valid
id_token can force-logout its own session (annoyance, not privilege escalation)
— mitigated by the sub-match + short id_token TTL.

**Kit store retains the id_token; client-web round-trips through `/logout`
(plan 042 items 8a + 8).** The `@authup/client-web-kit` store now keeps the
grant response's `id_token` as an `idToken` ref (setter emits
`StoreDispatcherEventName.ID_TOKEN_UPDATED`, cookie-persisted via
`CookieName.ID_TOKEN`, cleared in `cleanup()`). `applyTokenGrantResponse`
**retains** the existing value when a response carries none (a refresh grant
returns no id_token) rather than clearing it; to keep that retain safe,
`store.login()` runs `cleanup()` before applying the password-grant response —
mirroring `exchangeAuthorizationCode` — so a stale id_token can never survive
onto a newly-authenticated user (plan 047.3). This gives every kit RP an
`id_token_hint` to pass to the `end_session_endpoint` — without it they all
degrade to the click-gated confirm page. `apps/client-web/pages/logout.vue`
uses it: the page deliberately does **not** set `REQUIRED_LOGGED_OUT` (that meta
makes the routing interceptor run `store.logout()` before the page's setup,
discarding the id_token), captures `idToken`/`realmId` on mount, runs the
local-only `store.logout()`, then hard-redirects to
`buildEndSessionURL({ baseURL, idTokenHint, realmId,
postLogoutRedirectUri: <origin>/login })`. With the hint the server revokes and
bounces straight back; without it the server's confirm page returns to
`/login`. **It passes NO `client_id`**: omitting it lets the service resolve
the client from the hint's sole `aud` (the client **UUID**). Since plan 047.B a
name-form `client_id` (`web`) would also work — the service resolves it to the
UUID before the `aud` cross-check — but omission stays the simplest correct
call (no name→realm ambiguity to think about). `store.logout()` remains
local-only — the round-trip is the chosen mechanism, **not** a
`DELETE /sessions/@me` (which would collide with the #3191 interactive-login
session reuse → self-DoS of fresh logins).

## OAuth2 Token Endpoint Authentication

The `/token` endpoint authenticates the calling client according to RFC 6749. Confidential clients MUST present a `client_secret`; public clients identify with `client_id` only.

### Per-grant requirements

| Grant | Client auth requirement |
|---|---|
| `client_credentials` | Authentication is the grant's purpose. Confidential client only — public clients are rejected. |
| `authorization_code` | Confidential client MUST authenticate (RFC §4.1.3). Authenticated `client_id` MUST match the auth code's bound `client_id` — mismatch = `invalid_grant`. Client-by-name resolution is scoped by the shared realm hint (see *Token endpoint realm resolution*). |
| `refresh_token` | Confidential client MUST authenticate (RFC §6). Authenticated `client_id` MUST match the token's bound `client_id` — mismatch = `invalid_grant`. **A public client is NOT required to authenticate** (RFC 6749 §10.4 — client auth is "not possible" for it): when a request presents no client credentials but the token carries a bound `client_id`, the grant resolves that client **from the signed token itself** (server-minted, so trusted) rather than demanding the caller re-send it — a public bound client proceeds (rotation/replay detection is the abuse control), while a **confidential** bound client presented without a secret is rejected `invalid_client` (`clientAuthenticator.authenticate(payload.client_id)` with no secret throws for it). This is why the `@authup/client-web-kit` store refreshes with just `{ refresh_token }` and does **not** parse/echo the `client_id` — interactive client-web login runs through the authorization-code flow against the public per-realm `web` client, so its refresh tokens are client-bound, but the server extraction handles it. Tokens with no bound client refresh without auth (legacy/no-client flow). Client-by-name resolution (when a client *does* authenticate) is scoped by the shared realm hint. |
| `password` | Confidential client MUST authenticate (RFC §4.3.2). The token's `client_id` claim and the OpenID `aud` claim use the **authenticated** client's id, not any user-side association. The shared realm hint resolves the **user realm** and scopes the client leg. |
| `robot_credentials` | Authentication is the grant's purpose (Authup-specific extension). |

### Per-client grant allowlist (`grant_types`)

Independent of client authentication, every client-resolving grant enforces
`Client.grant_types` as an **opt-in allowlist** via `assertClientGrantAllowed`
(`core/oauth2/client/grant-type.ts`): when the column is non-null (space- or
comma-delimited values), the requested grant must be listed — otherwise the
request fails with `unauthorized_client` (RFC 6749 §5.2,
`ErrorCode.OAUTH_CLIENT_UNAUTHORIZED`, HTTP 400). `null` = allow-all, so
enforcement is opt-in per client and upgrades are backward compatible. Enforced
at both chokepoints:

1. **`/token`** — after client resolution in `authorization_code`,
   `refresh_token` (including the bound-client-from-token path, so public-client
   refreshes that never send `client_id` are covered), `client_credentials`, and
   `password` when a client authenticates. `robot_credentials` resolves no
   client and is exempt. `/token/introspect` and `/token/revoke` are deliberately
   NOT gated — RFC 7662/7009 operations are not grants.
2. **`/authorize` code-request verifier** — a non-null list must include
   `authorization_code`; denied before the consent UI renders (an RP
   misconfiguration fails at the front door, not at code redemption).

Unknown values in the column are inert (they can only narrow, never widen). A
refresh rejected this way is a plain `unauthorized_client` — **not** replay
detection, so no family revocation; restoring the grant type restores service.
The provisioned per-realm `web` client lists `authorization_code refresh_token`
(refreshed by `WebClientProvisioner`'s MERGE on startup).

### Token endpoint realm resolution

The three client-authenticating grants (`password`, `authorization_code`,
`refresh_token`) share ONE realm-hint semantic (helper `readRealmHint` in
`adapters/http/adapters/oauth2/grant-types/utils/realm.ts`):

- The realm hint is `realm_id ?? realm_name` from the request body (the
  authorization_code grant also accepts them from the query string, body
  wins) — each accepts a realm UUID **or** name. The hint is canonicalized at
  the ingress (`trim().toLowerCase()`, per *Canonical Identifier Form* layer
  3) since no validator runs on the token body.
- The hint is resolved once via `IRealmRepository.resolve(hint, true)` —
  **defaults to the master realm** when the hint is absent (or unknown; same
  fallback convention as registration / password-recovery; a missing master
  realm row throws `InternalError` — violated provisioning invariant). The
  by-id leg of that resolve is query-cached (60s, `CachePrefix.REALM` id key,
  invalidated by the realm subscriber), so the per-login SELECT is amortized.
  The refresh grant resolves lazily — a bare refresh (no client auth) does no
  realm lookup.
- **What the resolved realm scopes:** on `password`, both the user leg
  (name-based user resolution is deterministic; the LDAP-collection
  `findByProtocol(LDAP, realmId)` lookup is realm-scoped) and the client leg.
  On `authorization_code` / `refresh_token`, only client-by-name resolution —
  a *name*-identified client must live in the resolved realm (or be
  identified by its UUID). This makes the refresh leg deterministic: a
  password login via master's client refreshes against master's client again
  instead of an unscoped name lookup matching an arbitrary same-named client
  in another realm (every realm has a built-in `web` client, so collisions
  are guaranteed). A client name that does not exist in the resolved realm
  fails with `invalid_client`; register the client in that realm, pass a
  matching hint, or use its UUID. On the SSR `/authorize` page the login realm is
  pinned to the **client's** realm (`codeRequest.realm_id`, seeded into the
  login form), so that page authenticates that realm's users only.
- **UUID keys skip the realm predicate — intended.** A UUID-identified user
  or client is resolved globally by primary key (`IdentityResolver` drops the
  realm key for UUID lookups; UUIDs are globally unique, so the hint adds no
  disambiguation). The realm hint constrains NAME resolution only, and the
  issued token always carries the identity's true `realm_id`. Enforcing the
  predicate for UUIDs would break realm-less id-identified logins, because
  the master fallback makes "defaulted" indistinguishable from "explicit" by
  the time the realm reaches the authenticator.
- **Localized to `/token`.** HTTP Basic auth shares the same
  `UserAuthenticator` class but is intentionally untouched — realm-less
  Basic-auth-by-name resolution is unchanged (and never carries a realm
  hint). The same raw, fallback-less `realm_id` handling remains on
  `robot_credentials` / `client_credentials` (robot/client names are unique
  per `(name, realm_id)`) and on the `/authorize` code-request verifier's
  `data.realm_id` — see plan 037/038 non-goals.

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

## Refresh Token Rotation & Replay Detection (plan 016)

Every `/token` `refresh_token` call rotates: the presented refresh token (RT) is
retired and a fresh AT+RT pair minted. Rotation is backed by a durable
inventory table so replay survives cache flushes and can trigger the RFC 6819
§5.2.2.3 reaction strategy (revoke the whole token family). Access-token TTL
default is **900s** (was 3600s) to shrink the revocation blind spot for
stateless local-JWKS adapters.

### `auth_session_tokens` — one row per issued token

TypeORM entity `SessionTokenEntity` (`adapters/database/domains/session-token/`),
domain type `SessionToken` in `@authup/core-kit`. Columns: `id` (= jti,
app-provided `@PrimaryColumn('uuid')`), `session_id` (FK → `auth_sessions`
**ON DELETE CASCADE**), `kind` (`access`|`refresh`), `parent_id` /
`refresh_token_id` (plain nullable uuid — informational lineage, **no** self-FK),
`ip_address(45)` / `user_agent(512)`, `consumed_at` / `revoked_at` /
`expires_at` (varchar(28) ISO), `created_at`. Indexes on `session_id`, `kind`,
`expires_at`. **No subscriber** (not cached / not realtime). The same migration
widens `auth_sessions.ip_address` 15 → 45 (was IPv4-only). Port
`ISessionTokenRepository` (`core/oauth2/session-token/`), adapter
`SessionTokenRepositoryAdapter` (`app/modules/oauth2/repositories/session-token/`),
DI token `OAuth2InjectionToken.SessionTokenRepository`.

### The DB row is the single authority for refresh validity

The refresh grant verifies the RT with **`skipActiveCheck: true`** (crypto + exp
still enforced; only the cache blocklist is skipped) and decides on the DB row —
so family-revocation-on-replay is deterministic regardless of cache state (a warm
cache would otherwise reject a consumed RT *before* `runWith`). Consequently
`/token/revoke` must also soft-revoke the row: `OAuth2TokenRevoker` takes an
optional `sessionTokenRepository` and sets `revoked_at` alongside the cache
blocklist. **Do not remove the `skipActiveCheck` on the refresh path** without
re-adding a cache-based replay reaction — they are coupled.

### Grant flow (`core/oauth2/grant-types/refresh-token.ts`)

`findOneById(jti)` → reject (`invalid_grant`) if **missing** (expired-and-swept or
hard-cutover legacy — no `legacyRefresh`), **wrong kind**, or **`revoked_at` set**
→ `markRefreshConsumed(jti, now)` (atomic conditional UPDATE:
`consumed_at IS NULL AND revoked_at IS NULL AND kind='refresh'`). On success:
blocklist the old jti in cache (`setInactive(jti, exp)` — cache-only, **not** a
DB revoke, so grace stays intact), refresh the session, issue RT (`parent_id =
old jti`) then AT (`refresh_token_id = new RT jti`). On consume-failure →
`revokeFamily`. Each issuer writes the row after `saveWithSignature` when
`session_id` is present (M2M client/robot-credentials write only an access row —
they mint no RT).

### Family revoke = the `auth_sessions` row, never a wider SSO session

`revokeFamily`: `revokeBySessionId` soft-revokes every row and returns
`{id, expires_at}[]`; each jti is cache-blocklisted **with its real expiry**
(never the fallback 1h TTL — a 3-day RT must not resurface as `active` in
introspection); then `sessionManager.revoke(sessionId)` deletes the session
(cascade drops the rows) so its access tokens stop verifying on authup's own API.
Replay is logged (`logger?.warn`) and surfaced as `invalid_grant`.

### Grace period (`tokenRefreshGracePeriod`, seconds, default 0 = strict)

On consume-failure, `isWithinGraceWindow(jti)` returns true only when
`gracePeriod > 0` AND the row is unrevoked AND `now - consumed_at ≤ gracePeriod`
AND the token is the **chain tip** (`hasConsumedChild(jti)` is false). The chain-tip
check is load-bearing: without it a stolen *older* consumed RT replayed inside its
window would fork a parallel session instead of tripping replay detection. A
graced re-use mints a fresh chain-linked pair (never the same tokens); benign
multi-tab races present the still-current tip and are absorbed. Default 0 skips
the extra queries entirely (strict: any consumed-RT replay → family revoke).

### Cleanup

`components/oauth2-cleaner` sweeps `auth_session_tokens` where
`expires_at < now` (every minute, alongside the existing session sweep). AT rows
dominate volume; a deleted session cascade-drops its remaining rows.

## Session Management API (plan 016, PR G)

A REST surface over `auth_sessions` for "see all my sessions / force logout":
`SessionController` (`adapters/http/controllers/entities/session/`), dual-mounted
`@DController(['/sessions', '/realms/:realmId/sessions'])`, delegating to
`SessionService` (`core/entities/session/`). Sessions are **read + delete only**
(never created via this API — the OAuth2 grants own creation).

- `GET /sessions` — list. **Self-service by default:** an actor without
  `SESSION_READ` is force-scoped to its own sessions (the service catches the
  `preEvaluate` denial and passes `findMany(query, { owner })`, a mandatory
  `andWhere` a rapiq filter cannot override). An actor **with** `SESSION_READ`
  sees every session its realm reach permits (per-row `evaluate` + `resourceRealmMatch`,
  same drop-unauthorized-rows shape as `RobotService.getMany`).
- `GET /sessions/:id` — read one. Own session → no permission; else
  `SESSION_READ` + realm-match. `@me`/`@self` resolve to the caller's current
  session (`useRequestSessionId`).
- `DELETE /sessions/:id` — revoke one. Own → no permission; else `SESSION_DELETE`
  + realm-match. Delete routes through the cache-aware `SessionRepository.remove`
  (drops the id cache key; the DB delete cascade-drops the session's
  `auth_session_tokens` rows, so a force-logout also kills the subject's refresh
  tokens). Access tokens stay valid on local-JWKS adapters until `exp` (the
  documented limitation; authup's own API rejects immediately via the
  authorization middleware's session check).
- `DELETE /sessions` — bulk revoke, discriminated by whether the rapiq query
  carries a **recognized target filter** (`SESSION_FILTER_KEYS` = `id`, `sub`,
  `sub_kind`, `user_id`, `client_id`, `robot_id`, `realm_id`; the same
  vocabulary `getMany` filters on):
  - **No target filter →** self-service: revoke every own session except the
    current one ("log out my other devices"). No permission; the current session
    id comes from the bearer token (stashed by the authorization middleware via
    `setRequestSessionId`), never from the client. An **unrecognized/empty**
    filter falls through here too — a typo can never trigger a mass delete.
  - **A target filter (e.g. `?filter[user_id]=<uuid>`, comma-list for several
    subjects, or `?filter[realm_id]=…`) →** admin force-logout:
    `SessionService.deleteManyByQuery` loads **every** matching session
    (`ISessionRepository.findAllByQuery` — deliberately **unbounded**, no
    pagination cap: reusing the paginated `findMany` would silently truncate at
    `maxLimit`) and revokes each. Gated by `SESSION_DELETE` **plus a per-session
    `resourceRealmMatch`** (same drop-unauthorized shape as `getMany`). Filter
    breadth **cannot escalate** — the actor only deletes what it is already
    authorized to delete, so a `realm_admin` in realm A silently drops a target's
    realm-B sessions, and `filter[realm_id]` is bounded to its reach.
  A non-admin sending a target filter (even its own `user_id`) takes the admin
  path and gets `403`; self-service is the no-filter call. Typed client mirrors
  `getMany`: `client.session.deleteMany(data?: BuildInput<Session>)` — `deleteMany()`
  (self) / `deleteMany({ filter: { user_id } })` (admin).

**Ownership** = `session.sub === actor.identity.data.id && session.sub_kind ===
actor.identity.type` (sessions have a polymorphic subject — user/client/robot —
which is why dedicated `SESSION_READ`/`SESSION_DELETE` beat reusing the parent
`USER_*`/`CLIENT_*`/`ROBOT_*` families). Both auto-provision (enum-iterated) and
grant to `admin` (`any`) + `realm_admin` (`ownOrNull` read / `own` delete). The
list read path bypasses the session cache (id-keyed only, no list index) and goes
straight to TypeORM. **Every realm-gated `findMany` adapter force-selects the
columns its per-row gate reads, regardless of the client `fields` projection**
(plan 039) — the gate reads `entity.realm_id` via `resourceRealmMatch`, and rapiq
honors a `fields` projection over `default`, so without the force-select a scoped
reader could strip `realm_id` and neutralize the realm_scope reach factor
(cross-realm leak; for an `ownOrNull` reader the stripped realm reads as a
null/global resource). The shared helper `applyRealmScopeSelect(qb, alias,
extraColumns?)` (`app/modules/database/repositories/helpers.ts`) is called AFTER
`applyQuery` in: `session` (`+ sub, sub_kind` — ownership check), `user` /
`robot` (`+ id` — self short-circuit), `client` (`+ secret_hashed,
secret_encrypted` — the plaintext-secret gate precondition), `role-attribute`,
`user-attribute` (`+ user_id` — isMe check; the two attribute adapters configure
no `fields`, so the call is pinning defense in depth there). `role` / `scope` /
`permission` / `policy` list paths carry no per-row realm gate (their
`resourceRealmMatch` usages are write paths on server-loaded data), so they are
deliberately not force-selected. Regression specs:
`session-realm-isolation.spec.ts` and
`realm-isolation-field-projection.spec.ts`. When adding a per-row gate to a new
`getMany`, wire `applyRealmScopeSelect` into its adapter with every column the
gate reads.

**UI:** two `<VCTable>` pages backed by the kit `<ASessions>` collection —
`pages/settings/index/sessions.vue` (the actor's **own** sessions, `filter:
{ user_id }`) and `pages/users/[id]/sessions.vue` (an admin viewing a user's
sessions). The settings page carries a **"log out other devices"** button
(`authupApp` `SESSION_REVOKE_OTHERS*` keys) that confirms via `useAlertDialog`
then calls `client.session.deleteMany()` (`DELETE /sessions` — revoke-all-but-
current), toasts the returned `count`, and reloads the collection; it disables
when `total <= 1` (only the current session). The admin sessions **tab is gated
on `SESSION_READ`** in `pages/users/[id].vue` (hidden otherwise — the server
force-scopes a reader lacking it to their own sessions, so the tab would render
empty/misleading), and the child route is defense-in-depth-protected via
`definePageMeta({ [LayoutKey.REQUIRED_PERMISSIONS]: [SESSION_READ] })` (the
routing interceptor checks every `route.matched` record, so the child meta is
enforced on direct navigation).

The admin page carries a **"Log out everywhere"** button (`authupApp`
`SESSION_REVOKE_ALL*` keys, gated on `SESSION_DELETE` via `usePermissionCheck`,
error-tone confirm) that calls
`client.session.deleteMany({ filter: { user_id: entity.id } })` — the admin
force-logout path above. The self page marks the caller's **current
row** with a "This device" badge (`SESSION_CURRENT` key) and omits its per-row
delete button (a lone current-session delete would be a confusing silent
self-logout — the "log out other devices" button covers the rest). The current
session id is exposed by the `@authup/client-web-kit` store as a `sessionId` ref,
sourced from the token-introspection `session_id` in `resolveToken` (cleared on
logout).

### Session continuity: one session per interactive login

An interactive client-web login used to create **two** `auth_sessions` rows: the
SSR `/authorize` page password-grants a (client-less) bearer session purely to
authenticate `POST /authorize`, then `/login/callback` exchanges the auth code —
whose `authorization_code` grant `create()`d a *second* session. The bearer
session was then abandoned but lingered until expiry (and showed up in the
sessions list).

The authorization_code grant now **reuses** that bearer session instead of
minting a second one. The mechanism threads the bearer's session id through the
auth-code blob:

- `OAuth2AuthorizationCode` carries an optional `session_id` (cache-backed blob —
  Redis, **no migration**). `HTTPOAuth2Authorizer.authorizeWithRequest` reads
  `useRequestSessionId(event)` (the id the authorization middleware stashed from
  the authenticated bearer — server-derived, never client input) and threads it
  `OAuth2Authorization.authorize(data, identity, { sessionId })` →
  `OAuth2AuthorizationCodeIssuer.issue(..., { sessionId })` → `entity.session_id`.
- `OAuth2AuthorizeGrant.resolveSession` reuses the referenced session iff it
  still exists **and** matches the code's `sub` / `sub_kind` / `realm_id`
  (defense in depth); it stamps the authorizing `client_id` onto the row and
  `sessionManager.refresh()`es it. Any mismatch, or a **session-less** authorize
  flow (external-IdP callback — `IdentityProviderController` issues its code with
  no `sessionId`; non-interactive clients), falls back to `sessionManager.create()`,
  preserving prior behavior.

Covered by `test/unit/core/oauth2/grant-types/authorize.spec.ts` (reuse vs.
fallback branches, incl. the sub/realm-mismatch fail-safes) and the end-to-end
`test/unit/http/controllers/workflows/token/grant-authorize-session.spec.ts`
(login → authorize → exchange asserts a single session survives).

## MFA — Authenticator Devices (plan 049)

Polymorphic second-factor device model: `auth_user_authenticators` holds one row
per enrolled device, discriminated by `kind` (`totp` | `recovery` | `email` |
`webauthn` — the `UserAuthenticatorKind` enum in `@authup/core-kit`; email and
webauthn are reserved row-types, wired in later PRs of the same series).
Domain type `UserAuthenticator` (core-kit), TypeORM entity
`adapters/database/domains/user-authenticator/` (no subscriber — not cached, not
realtime), port `IUserAuthenticatorRepository` + `UserAuthenticatorService` in
`core/entities/user-authenticator/`, adapter in
`app/modules/database/repositories/user-authenticator/`.

**Secret handling — the load-bearing rules:**

- The TOTP seed must be *recoverable* (verification recomputes codes), so it is
  **AES-256-GCM-encrypted at rest** via `SymmetricCipher`
  (`@authup/server-kit`, `crypto/symmetric-cipher/` — blob =
  `base64(iv ‖ ciphertext ‖ tag)`) under the config `mfaEncryptionKey`
  (env `MFA_ENCRYPTION_KEY`, base64 32 bytes). Fail-closed at every layer:
  `normalizeConfig` throws at boot when `mfaEnabled` without a key, the service
  refuses TOTP enrollment/verification without a cipher
  (`ErrorCode.MFA_NOT_CONFIGURABLE`).
- Recovery codes are **bcrypt-hashed** (`hash`/`compare` from server-kit),
  stored as a JSON `{hash, used_at}[]` blob on a single `kind:'recovery'` row
  (regenerate semantics — re-enrolling replaces the set); single-use (`used_at`
  stamped on match).
- `secret` and `codes` are `select:false` columns; the repository re-selects
  them ONLY via `findOneWithSecretsById` / `findAllWithSecretsByUser`
  (verification paths). Every read surface (`getMany`/`getOne`/enroll response
  entity) nulls both — the raw seed/URI/QR/codes appear exactly once, in the
  enroll response (`{ entity, secret?, uri?, qr?, codes? }`; QR is a
  server-rendered PNG data-URI via the `qrcode` dep, TOTP via `otpauth`).
- The `findMany` adapter follows the plan-039 discipline
  (`applyRealmScopeSelect(qb, 'userAuthenticator', ['user_id'])`).

**Enrollment is two-step** (except recovery, which is usable immediately):
`POST /users/:id/authenticators` creates an *unconfirmed* row and returns the
provisioning material; `POST /users/:id/authenticators/:deviceId/confirm` with a
valid code flips `confirmed`. Only confirmed devices satisfy challenges. Own
devices are ungated self-access (like sessions); managing *others'* devices
requires the `USER_AUTHENTICATOR_READ/CREATE/UPDATE/DELETE` permissions
(auto-provisioned; realm_admin holds CUD at `own` reach, read at `ownOrNull`),
with per-row `resourceRealmMatch` gates. A foreign device id under the wrong
user's nested route is a 404 (no existence oracle).

**Enforcement — two chokepoints, both server-side:**

1. **Interactive `/authorize`**: the proof is session-bound — `auth_sessions.mfa_at`
   is stamped by `POST /authenticators/challenge` (bearer-scoped;
   `ISessionManager.markMfaVerified`) or by the password grant's `otp` param.
   `OAuth2Authorization.authorizeInner` (ctx `mfaChallengeProvider`, the
   `IUserAuthenticatorChallengeProvider` seam) throws `OAuth2MfaRequiredError`
   (`ErrorCode.OAUTH_MFA_REQUIRED` / wire `error: mfa_required` — a dedicated
   code, deliberately NOT `login_required`, so RPs can tell "log in again" from
   "complete the challenge") when the user holds a confirmed device and the
   backing session carries no `mfa_at`. A session-less flow (HTTP Basic) fails
   closed the same way. `GET /authenticators/challenge` reports
   `{ required, enrollmentRequired, kinds, challenge? }` — the kind-generic wire
   shape (the optional `challenge` payload carries WebAuthn request options in
   Stage 2) that drives the kit ladder.
2. **Direct password grant**: `HTTPPasswordGrant.verifySecondFactor` — a user
   with a confirmed device must send a valid `otp` form parameter (TOTP or
   recovery code, classified by shape via
   `guessUserAuthenticatorKindByResponse`: all-digits → totp) or the grant
   throws `mfa_required`. On success the created session is stamped
   (`mfa_at`), so the subsequent SSR `POST /authorize` passes the backstop.
   Users *without* a device pass through (they could never enroll otherwise) —
   `mfaRequired` (configure-inline) is enforced at `/authorize`
   (`enrollmentRequired` → the hosted UI routes to inline enrollment), not at
   the token endpoint. WebAuthn cannot ride a single POST — it stays
   interactive-only (documented boundary).

**Brute-force**: per-account exponential backoff inside
`UserAuthenticatorService.verify`/`confirm` — cache-keyed
(`mfaAttempt:<user_id>`) `min(300, 1·2^(n−1))`s lock, reset on success, 429
`MfaThrottledError` (`ErrorCode.MFA_ATTEMPT_THROTTLED`, `retryAfter` in the
body). Config: `mfaEnabled` / `mfaRequired` / `mfaEncryptionKey`
(`MFA_ENABLED` / `MFA_REQUIRED` / `MFA_ENCRYPTION_KEY`; `mfaRequired` requires
`mfaEnabled`, boot-validated). Events: `mfaEnrolled` / `mfaRemoved` /
`mfaVerified` / `mfaChallengeFailed` (`EventScope.IDENTITY`). Typed client:
`client.userAuthenticator.*` (getMany/getOne/enroll/confirm/delete +
`challenge()`/`verifyChallenge()`).

Tests: `test/unit/core/entities/user-authenticator/service.spec.ts` (service
matrix incl. backoff + single-use + select:false modeling),
`test/unit/http/controllers/entities/user-authenticator.spec.ts` (permission
surfaces), `test/unit/http/controllers/workflows/token/grant-password-mfa.spec.ts`
(end-to-end: enroll → confirm → grant gated → otp accepted → authorize backstop
→ challenge stamps `mfa_at` → authorize passes; recovery replay rejected).

## Security Event Log (plans 057 + 053 + 058)

`auth_events` is the persisted, PII-stripped security audit trail — the single
login-event surface. The record shape is derived from PrivateAIM/hub's
Authentik-lineage telemetry `Event` (`(scope, name)` verb pair, `ref_type`/
`ref_id` target reference, denormalized `actor_type`/`actor_id`/`actor_name`
snapshot that survives actor deletion, `request_*` context group, per-row
`expiring` + `expires_at` retention, serialize-transformer `data` text column
— null-guarded so absent context stays SQL NULL) hardened with the discipline
hub lacks: a **closed taxonomy** (`EventName`/`EventScope` enums in
`packages/core-kit/src/domains/event/` — never free text), **append-only**
(read-only HTTP surface, no update/delete API, no `updated_at`), and a central
**PII write boundary**.

- **Write path:** `EventService.record()` (`core/entities/event/`) is
  fire-and-forget-safe (a write failure logs and never fails the originating
  auth operation), stamps `expiring`/`expires_at` from `eventLogRetentionDays`
  (`0` = keep forever → `expiring: false`, `expires_at` null), truncates
  client-controlled strings to column
  widths, and passes `data` through `sanitizeEventData` — **allowlist-first,
  scalars only** (objects/arrays are dropped outright, so nothing nested can
  smuggle a secret; `password`/`client_secret`/`code`/`*token*` are simply never
  allowlisted). A structured logger line fires per event even when persistence
  is disabled (`eventLogEnabled=false`) — the free SIEM/Loki complement.
- **Emit sites** (explicit `record()` calls via optional `eventService?`
  ctx — security events never ride the CRUD subscriber bus): password grant
  `LOGIN` (core `runWith`, after issuance) and `LOGIN_FAILED` (HTTP adapter
  catch — carries the **canonicalized attempted identifier in `actor_name`**
  with `actor_id` null; the deliberate PII-posture call, it is the throttle
  key), `REFRESH_REPLAY_DETECTED` (`revokeFamily`), `AUTHORIZE`
  (`OAuth2Authorization.authorize()`, `data.reason: autoConsent|consent` from
  `client.built_in`), `LOGOUT` (end-session hint revoke), `REGISTER` /
  `ACCOUNT_ACTIVATED`, `PASSWORD_RESET_REQUESTED/COMPLETED`. Token issuance
  emits **no rows** (plan 016's `auth_session_tokens` already inventories every
  token; volume control).
- **Entity-CRUD bridge (plan 057 Stage 2, hub's EntityEventHandler):**
  `EntityEventHandler` (`core/entities/event/entity-event-handler.ts`, an
  `IDomainEventHandler` registered on the `DomainEventPublisher` in
  `DatabaseModule.registerEventPublisher` when `eventLogEnabled &&
  eventLogEntityEnabled`) mirrors every entity create/update/delete already
  published by the 22+ `EntitySubscriber`s into scope-`entity`
  `created|updated|deleted` rows (`ref_type` = entity type, `ref_id` = id).
  The pre-update snapshot rides the publish **context** as `dataPrevious`
  (`afterUpdate` passes `event.databaseEntity`) — **never inside `content`**,
  the shared realtime wire payload the redis/socket handlers ship. Actor +
  request attribution comes from an AsyncLocalStorage request context
  (`adapters/http/request/event-context.ts`; middleware mounted immediately
  after the authorization middleware — non-HTTP writes like
  provisioning/CLI/cron have no store → null actor = "system" semantics).
  Updates carry a `data.diff` of `{ next, previous }` **scalar** pairs
  (`buildEntityDiff`, `core/entities/event/diff.ts`): keys ending `_at` and
  any key matching the secret denylist
  `/(password|secret|hash|token|credential)/i` are dropped fail-closed,
  strings truncated to 512; `sanitizeEventData`'s dedicated `diff` branch
  re-checks the same regex at the write boundary. Created/deleted rows carry
  `data: null` (no column dumps). Rows self-prune on a short per-row TTL via
  `EventRecordInput.retentionDays` (config `eventLogEntityEnabled` default
  `true` / `eventLogEntityRetentionDays` default `7` days, env
  `EVENT_LOG_ENTITY_*`). v1 semantics: `realm_id` is read from the entity's
  own column — junction rows (rolePermission, userRole, ...) carry none and
  stay realm-less (null).
- **Read API:** `GET /events` (+ `/realms/:realmId/events`),
  read-only, gated by `EVENT_READ` with the session-service shape: a reader
  without the permission is force-scoped to its own rows (`actor_id` +
  `actor_type`), a scoped reader gets per-row realm_scope drops, and the
  repository force-selects the gate columns (`applyRealmScopeSelect`, plan-039
  discipline). `EVENT_READ` auto-provisions via `Object.values(PermissionName)`:
  `admin` = `any`, `realm_admin` = `ownOrNull` (deliberately NOT in the OWN
  override list). Typed client: `client.event.getMany/getOne`.
- **Admin UI:** `apps/client-web/pages/events/` — a read-only list page
  (`index.vue` + `index/index.vue`; kit collection `<AEvents>`
  (`EntityType.EVENT`, no server-side subscriber — the socket subscription is
  inert, same as sessions) rendering a `<VCTable>` with name/scope, ref,
  actor, IP and created_at columns + `ASearch` name filter) and a detail page
  (`[id]/index.vue`; General / Actor / Request cards + pretty-printed `data`
  dict). Nav entry + pages are gated on `EVENT_READ`
  (`LayoutKey.REQUIRED_PERMISSIONS`); no create/update/delete surface exists
  (append-only).
- **Retention:** `components/event-cleaner` (every minute, oauth2-cleaner
  mirror) deletes `expiring = true AND expires_at < now` (hub's cleaner shape);
  scheduled only when
  `eventLogEnabled && eventLogRetentionDays > 0`. Per-action retention later is
  per-action stamping — no schema change.
- **Failed-login throttle (plan 053, default off):** `LoginThrottleService`
  (`core/authentication/login-throttle/`) counts recent `LOGIN_FAILED` rows via
  the indexed `countRecent` — keyed on the **(identifier, ip) pair** (never
  identifier alone: account-lockout-DoS mitigation; no derivable IP → fail
  open) — and throws `LoginThrottledError` (HTTP **429**,
  `login_attempt_throttled`, `data.retryAfter`) before `authenticate` in the
  HTTP password grant. Config `loginAttemptThrottleEnabled/Threshold/Window`;
  enabling it with `eventLogEnabled=false` **fails loud at config time**. Basic
  auth is deliberately NOT throttled (recording/widening is a later call).
- **Metrics (plan 058 Part 2):** `IAuthFlowMetrics` port (`core/metrics/`,
  noop default) with the prom-client adapter (`app/modules/metrics/`,
  registered by `HTTPModule` — `Noop` when `middlewarePrometheus` is off) on
  the default registry: `authup_login_total{result}`,
  `authup_token_grant_total{grant_type}` (successes only),
  `authup_authorize_total{outcome}` (`denied` reserved until plan 052),
  `authup_refresh_replay_total`. Bounded label sets only — subject-level
  attribution belongs in the security event log, never in metric labels.

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

## Canonical Identifier Form

Identifier-style columns are stored in canonical form: `LOWER(TRIM(value))`. This applies to:

- `name` on every named entity (`client`, `robot`, `user`, `role`, `scope`, `permission`, `policy`, `realm`, `identity-provider`)
- `email` on `user`

`display_name` and other free-form labels (`description`, `first_name`, `last_name`) preserve original casing — the canonical-form rule is only for columns used as identifiers in lookups / unique constraints.

### Why canonical form

Cross-DB collation behavior diverges:

- MySQL with `utf8mb4_*_ci` (default) treats `'foo'` and `'Foo'` as duplicates in `=` comparisons and `UNIQUE` constraints
- PostgreSQL with `en_US.UTF-8` (default) treats them as distinct rows

Without canonicalization, the same code base produces different uniqueness behavior on each DB. Canonicalizing identifier columns at write time eliminates the divergence: `=` is sufficient for lookups across both DBs, `UNIQUE` constraints behave identically.

### Four layers of enforcement

Canonical form is enforced at four boundaries (defense-in-depth):

1. **Validator transform** — every `name` / `email` validator chains `.trim().toLowerCase()` before its format check (Zod path) or `.matches(...)` (validup path). Mixed-case input is silently lowercased; callers see canonical form in the response.
2. **Validator regex** — the format check (`isNameValid` for names: `/^[a-z0-9-_.]+$/`; emails: `/^[^A-Z]+$/`) operates on the post-transform value. After `.toLowerCase()` the regex always passes; it remains as documentation of the contract and as a catch for code paths that bypass the transform.
3. **External boundary canonicalization** — when an identifier enters Authup outside the validator chain, it is lowercased at the ingress. Currently: `IdentityProviderAccountManager` taking attribute candidates from external IdPs (so external mixed-case usernames don't fall through to the random-nanoid fallback), and the OAuth2 password grant's `realm_id`/`realm_name` hint.
4. **Repository-level lookup canonicalization** — name-based *lookups* on the authentication surface canonicalize the key before binding it: the identity repositories (`app/modules/identity/repositories/{user,client,robot}.ts`, both the name and a realm-name filter), `OAuth2ClientRepository.findOneByIdOrName` (the `/authorize` client resolution), and `RealmRepositoryAdapter.findOneByName`. An auth ingress that misses layer 3 (the `/realms/<key>` URL segment specifically, an HTTP Basic username, a token-body credential key) still matches canonically stored rows instead of diverging by database collation. Lookup-only, auth-surface-only — write paths rely on layers 1–3, and the entity repository adapters' `findOneByName` (`GET /roles/<name>` etc.) still bind raw (see plan 038).

### Adding a new identifier column

When adding a `name`-style column on a new entity (or extending an existing one):

1. **Validator** — chain `.trim().toLowerCase()` after `z.string()` (Zod) or before the format check (validup) and before any length / pattern check.
2. **Repository** — use `=` for name lookups, never `LIKE :name`.
3. **Migration** — ship a data migration canonicalizing existing rows with an up-front collision pre-check, following the pattern of `apps/server-core/src/adapters/database/migrations/{mysql,postgres}/1779267068441-Default.ts`.

## UI Layer (`apps/client-web`, `apps/server-core/ui`, `packages/client-web-kit`)

The UI sits on the `@vuecs/*` 1.x line — see
[`.agents/structure.md` → UI Stack](structure.md#ui-stack-appsclient-web-appsserver-coreui-packagesclient-web-kit)
for the package matrix. Two architectural notes specific to authup's
integration are worth knowing before editing UI code:

### vuecs 1.x SFC integration

`@vuecs/forms` 4.0, `@vuecs/list` 1.0, and `@vuecs/pagination` 2.0
dropped their pre-1.x render-function builder APIs (`buildFormGroup` /
`buildList` / `buildPagination` and friends) in favour of compound
`<VC*>` SFCs. Authup's entity forms, collection views, and pagination
chrome were migrated onto the SFCs; the transitional `buildForm*`
render-function shims (`core/form/builders.ts`) were **retired in #3139**
— there is no `core/form/builders.ts` anymore. The current
integration:

- **Forms** — entity form SFCs (`components/entities/**/A*Form.vue`)
  render `<VCFormGroup>` / `<VCFormInput>` / `<VCFormTextarea>` /
  `<VCFormCheckbox>` / `<VCFormSelect>` directly, binding each field via
  `@validup/vue`'s `useValidup` and `@ilingo/validup-vue`'s
  `<IFieldValidation>` (see `ARoleForm.vue`). `AFormSubmit`
  (`components/utility/AFormSubmit.ts`)
  wraps `<VCButton>` with `@vuecs/forms`' `useSubmitButton` so the
  create/update label, icon, and color swap stay locale-reactive — a
  deliberate adapter, not a temporary shim. **Split forms & shared
  validators:** multi-section forms (policy, identity-provider) register
  field-group sub-forms under a parent `useValidup` collector
  (`name: 'basic'` / `'client'` / ...), and the parent's `isInvalid` ORs
  the children's `$invalid`. A validup mount without a `group` option
  runs in *every* group, so a sub-form running a shared full-entity
  validator from `@authup/core-kit` unscoped is permanently `$invalid`
  the moment the validator mounts a key the sub-form's state doesn't own
  (e.g. `IdentityProvider.protocol`, required in every group but owned
  by the parent form) — with the issue on an unrendered field, the
  submit button never enables and no error is visible. **Scope the
  shared validator with validup's `pathsToInclude`** (`ContainerOptions`
  or `ContainerRunOptions`) to exactly the keys the sub-form renders —
  see `AIdentityProviderBasicFields` / `AIdentityProviderOAuth2{Client,
  Endpoint}Fields`, which reuse `IdentityProviderValidator` /
  `IdentityProviderOAuth2AttributesValidator` instead of redefining the
  mounts inline (single source of truth with the server rules; group
  options per mount are preserved). The alternative — feeding the
  parent-owned key into the sub-form state via a prop +
  `watch(..., { immediate: true })` — is only needed when that key
  should actually be validated client-side (see `APolicyBasicForm`'s
  `type`). Relatedly, the
  kit installs `createValidup` with `optionalAs: null` (blank optional
  inputs are emitted as `null`), so every optional string mount in a
  shared entity validator must be `.nullable()` — server-side runs use
  the default `optionalValue: 'undefined'` and would otherwise 400 on
  the `null`. **Input-group append/prepend slots:** `VCFormInput`'s
  `#groupAppend` / `#groupPrepend` slots hand the theme's joined addon
  class down via slot props — bind it on the slot root
  (`#groupAppend="{ class: appendClass }"` → `:class="appendClass"` on a
  native `<button>`/`<div>`; see `ASecretInput` / `ANameInput` and the
  identity-provider secret toggles). Dropping a raw `<VCButton>` in the
  slot renders a detached fully-rounded button against the input's
  squared group edge (double border/notched seam). Where a real
  `<VCButton>` is intentional (e.g. `AFormInputListItem`'s
  warning-colored delete), square its inner edge with `rounded-l-none`.
  **Entity hydration contract** (`assignFormProperties(form, entity,
  { fields: v.fields })`, `core/form/properties.ts`): the helper assigns
  only keys **declared in the form state** — the form owns its shape, and
  copying every entity key leaks foreign properties into the state and
  from there into submit payloads (a stale sibling-sub-form copy of
  `name` used to clobber the edited value on the identity-provider
  form's spread, #3222). With the validup `fields` accessor supplied,
  hydration is **edit-preserving**: a `$dirty` field whose current value
  differs from the incoming one is skipped (unsaved edit survives an
  entity refresh), while a `$dirty` field whose value matches is
  re-assigned and `$reset` (the edit got persisted, future syncs flow
  again). Two supporting rules: `useUpdatedAt` must be passed a ref or
  getter (`useUpdatedAt(() => props.entity)`) — passing `props.entity`
  by value captures the object once and yields a watcher that never
  fires; and user-input handlers must write through
  `v.fields.<key>.$model.value` (never `form.<key> = ...`) so the edit
  is dirty-tracked — direct `form` writes are reserved for hydration
  defaults (`generateName()` fills, prop seeds) that deliberately stay
  clean.
- **Collections** — `defineEntityCollectionManager().render(...)`
  (`components/utility/entity/collection/module.ts`) composes `<VCList>`
  + `<VCListBody>` + `<VCListItem>` + `<VCListLoading>` + `<VCListEmpty>`
  directly. It preserves the `{ header, body, item, footer, noMore,
  loading }` consumer-options shape and the
  `slotProps.created/updated/deleted` callback convention. This is the
  permanent implementation, not a shim. **Single-emit contract:** the
  callbacks delegate to the existing `ListHandlers` instance, which
  already calls `context.setup.emit('created' | 'updated' | 'deleted',
  ...)` — don't add a parallel `emit()` on the wrapper side or every
  mutation will fire twice and double-update Pinia stores.
- **Pagination** — `<APagination>`
  (`components/utility/pagination/APagination.ts`) is a thin **adapter**
  that bridges the entity-collection footer contract (nested rapiq
  `ListMeta` = `{ total, pagination: { limit, offset }, busy }` + a
  `load(ListMeta)` callback) onto `<VCPagination>`'s flat
  `:total` / `:limit` / `:offset` props and `@load({ offset })` event.
  It earns its keep: the ~30 footer call sites would otherwise each
  duplicate the `meta`-destructuring and the `@load` re-wrap. Its
  joined-tab rounding + brand hover styling lives in the theme's
  `.vc-pagination` rule (`client-web-theme/assets/css/index.css`) and
  applies to the underlying `<VCPagination>` regardless of the wrapper.

### Table usage

All 9 entity index pages (`apps/client-web/pages/<entity>/index/index.vue`)
use `<VCTable>` directly with `:data="props.data"` + `:columns="columns"`.
Per-cell rendering flows through the `#cell-<key>` template slots that
`<VCTable>`'s auto-render path dispatches onto each `<VCTableCell>`
(tada5hi/vuecs#1592).

**Row typing (since `@vuecs/table` 1.3.0, tada5hi/vuecs#1601):** `<VCTable>`
is now generic over `Row`, and the inference flows from `:columns` /
`:data` into the `#cell-*` slot props. Each page types its columns as
`TableColumn<Entity>[]` (e.g. `computed<TableColumn<Role>[]>(...)`), and the
cell slots are written **without** a row annotation — `#cell-built_in="{ row }"`
— so `row` infers as the entity type (verified: a bogus `row.<field>` access
is a compile error). The old `#cell-<key>="{ row }: { row: any }"` widening is
gone. **`VCTable` must stay globally registered** (`app.use(vuecs, …)`): the
generic `VCTableComponent` is a generic call signature that is **not**
assignable to the Options-API `components: {}` `Component` slot, so a local
`import { VCTable } + components: { VCTable }` makes `defineComponent`'s
overload resolution fail (`TS2769`). The `GlobalComponents` augmentation
carries the generic, so template inference works via global registration —
this is the one documented exception to the "explicit VC imports" convention.

Alignment classes (`headerClass: 'text-center'`, `cellClass: 'text-center'`)
go through as written — no Tailwind v4 `!` suffix needed.
`@authup/client-web-theme`'s `clientWebTheme()` overrides
`tableHeadCell.classes.root` to drop theme-tailwind's baked
`text-left` (default `"px-3 text-left font-medium"` → `"px-3 font-medium"`),
so the consumer-side class wins on source order. If theme-tailwind
ever bakes alignment into `tableCell.classes.root` (today it's just
`"px-3 align-middle"`), the same pattern can be applied to that
element in the theme override.

The pre-vuecs-1.1.1 `<ATable>` wrapper at
`packages/client-web-kit/src/components/utility/ATable.vue` has been
removed; its three jobs (permissive `SlotsType`, bvnext `:items`/`:fields`
prop bridge, alignment derivation from `headerClass` strings) are
either solved upstream (slot typing) or absorbed into the per-page call
sites (column shape, `!`-suffixed alignment).

### `bvnext` (bootstrap-vue-next) removal

Pre-vuecs-1.x, authup used `bootstrap-vue-next` for tables
(`<BTable>`), toasts (`useToast` + `BOrchestrator`), and dropdowns
(`BDropdown` / `BDropdownItem`). All three are now served by vuecs
equivalents:

- `<BTable>` → `<VCTable>` (the transitional `<ATable>` wrapper was
  retired once `@vuecs/table` 1.1.1 added template-literal slot
  typing for `cell-<key>` / `header-<key>`)
- `useToast()` from bvnext → `useToast()` from `@vuecs/overlays`,
  via the thin wrapper in
  `apps/client-web/composables/toast.ts` that preserves the
  `toast.show('msg')` / `toast.show({ variant, body })` calling shape
- `BOrchestrator` → `<VCToaster position="top-center" />`
  mounted in `apps/client-web/components/footer.vue`
- `BDropdownItem` (opportunistic fallback in `<AEntityDelete>`) →
  `<VCDropdownMenuItem>` resolved via `app.component(...)` lookup
- `createBootstrap` → not needed; `app.use(vuecs, ...)` configures
  vuecs in `apps/client-web/plugins/vuecs.ts` (the old
  `plugins/bootstrap.ts` was deleted)

### Tailwind v4 migration

The theme stack moved from `@vuecs/theme-bootstrap` (4.x) + raw
Bootstrap CSS to `@vuecs/theme-tailwind` (6.x) + Tailwind v4 + a
new `@authup/client-web-theme` package.

- **`@authup/client-web-theme`** (`packages/client-web-theme/`) —
  composes `tailwindTheme()` from `@vuecs/theme-tailwind` with
  authup-specific element overrides and ships a single CSS entry
  (`@authup/client-web-theme/index.css`) that pulls in
  `tailwindcss`, `@vuecs/design` (concrete OKLCH tokens),
  `@vuecs/theme-tailwind` (Tailwind ↔ vc-color rebind). Consumers register
  one theme: `app.use(vuecs, { themes: [authupTheme()] })`.
- **Tailwind v4** — wired via `@tailwindcss/vite` in both
  `apps/client-web/nuxt.config.ts` (`vite.plugins`) and
  `apps/server-core/ui/vite.config.ts`. v3 is not supported because
  theme-tailwind uses `@theme` and `--color-*` rebinds.
- **Bootstrap-compat layer — fully retired.** The `@layer components`
  block in `packages/client-web-theme/assets/css/index.css` used to
  `@apply` Tailwind utilities under legacy Bootstrap class names
  (`.btn`, `.row`/`.col-N`, `.alert`, `.badge`, `.nav`/`.navbar`,
  `.dropdown*`, `.modal-*`, `.fade`) so authup's pre-Tailwind templates
  kept rendering. Every call site has since migrated to a `<VC*>`
  component (`.dropdown*` → `<VCDropdownMenu>`, `.modal-*` →
  `<VCModal>` from `@vuecs/overlays`, the rest in #3139), so the block
  now holds only a thin `.vc-pagination` override of theme-tailwind's
  baked button rounding. Don't reintroduce Bootstrap-shaped class
  names; reach for the matching `<VC*>` component.
- **Mechanical sweep** — Bootstrap utility classes with a 1:1
  Tailwind equivalent (e.g. `d-flex` → `flex`, `flex-column` →
  `flex-col`, `w-100` → `w-full`, `fw-bold` → `font-bold`,
  `text-muted` → `text-fg-muted`, `bg-primary` → `bg-primary-600`)
  were rewritten across 37 templates by a one-off Python regex
  pass. Spacing utilities (`ms-*`, `me-*`, `mt-*`, `mb-*`, `p*`,
  `gap-*`) carry over unchanged — Tailwind v4 uses the same naming.
- **Tailwind `@source` scanning** — the theme's CSS adds `@source`
  directives for `apps/client-web/**`, `apps/server-core/ui/**`,
  and `packages/client-web-kit/src/**` so the JIT picks up
  utility-class strings that live outside any single consumer app's
  source tree (notably, classes inside the kit's components and
  the embedded consent SSR app).
- **Theme-tailwind semantic colors** — `bg-bg`, `bg-bg-muted`,
  `bg-bg-elevated`, `text-fg`, `text-fg-muted`, `border-border`,
  `text-on-primary`, `text-on-success`, etc. — plus per-palette
  scales `primary-*`, `success-*`, `warning-*`, `error-*`,
  `info-*` (50–950). Note: `error`, not `danger`; theme-tailwind
  does not ship a `secondary` or `light`/`dark` palette (Bootstrap
  names map onto `bg-bg-elevated` / `bg-bg-muted` / `bg-fg`).
- **Authup theme tokens** (`packages/client-web-theme/assets/css/index.css`,
  `@layer base`) — authup defines its identity in three token groups and
  bridges them onto the vuecs semantic layer so a single source drives
  both the `<VC*>` components and authup's hand-written chrome/content CSS:
  - **Themeable surfaces** (`--authup-surface-*`, `--authup-on-surface*`) —
    flip light (`:root`) → dark (`.dark`). They own the content layer
    (page backdrop, content area, cards, list wells, borders, body +
    secondary text) as a monotonic dark ramp
    (`app #16171a < content #1f2024 < card #26272c < raised #2d2f35 <
    active #34373d`). The `:root` block **bridges** them onto vuecs:
    `--vc-color-bg ← surface-content`, `-bg-muted ← surface-raised`,
    `-bg-elevated ← surface-card`, `-fg ← on-surface`,
    `-fg-muted ← on-surface-muted`, `-border ← surface-border`. The
    bridge lives in `:root` only and resolves per-element, so the `.dark`
    surface flips propagate automatically (it beats `@vuecs/design`'s
    vuecs-layer defaults via the kit-theme layer order). Surfaces stay
    genuinely dark in dark mode so the light `--vc-color-fg` keeps
    contrast — the predecessor `var(--vc-color-neutral-400/500)` was a
    light-mid grey (light-on-light, ~1.7:1, unreadable).
  - **Chrome tokens** (`--authup-chrome-*` — what header / sidebar /
    footer / navbar-dropdown CSS reads) — **flip with the mode** (mirrors
    hub's chrome model, PrivateAIM/hub#1668). Light-mode `:root` defaults
    alias the vuecs semantic tokens (`chrome-bg ← --vc-color-bg-elevated`,
    `chrome-bg-elevated ← -bg-muted`, `chrome-fg ← -fg`,
    `chrome-fg-muted ← -fg-muted`, `chrome-border ← -border`) so the
    chrome is a light raised surface; `.dark` pins them onto the **slate
    ramp** (`--authup-slate-900…300`, the dark chrome palette:
    `chrome-bg ← slate-800`, `chrome-bg-elevated ← slate-700`,
    `chrome-fg = #e8e6e2`, `chrome-fg-muted ← slate-400`) so dark mode
    keeps authup's recognizable dark-slate chrome. The chrome/content
    edges are tokens too — `--authup-chrome-edge-shadow-{bottom,top,right}`:
    soft drop shadows in light mode, the historical recessed inset band
    (and a shadow-free sidebar right edge) in dark mode. The header sits
    at `z-index: 2`, the sidebar at `position: relative; z-index: 1`, so
    the light-mode shadows paint over the page content.
  - **Brand accents** — `--authup-periwinkle #6d7fcc` (primary accent —
    active pill / nav-link background; also drives the
    `--vc-color-primary-*` scale via color-mix, rebound to
    `--color-primary-*` by theme-tailwind), `--authup-rose #cc8181`
    (sub-titles, `.foot-print`s, secondary accent), `--authup-salmon
    #ff5b5b` (dropdown hover text — its only live use), `--authup-green
    #4f9d6b` (brand green — the 💚 in the footer "Made with 💚" credit).
    Constant across modes. The former
    `--authup-brand-{gold,coral,indigo,tan}` names are gone — gold/tan
    usages (title bars, sidebar header, logo wordmark, nav active) folded
    into periwinkle; coral → salmon.
- **Tailwind v4 breaking changes** — UI work needs to follow the v4
  syntax, not v3:
  - Important modifier is a **suffix**: `text-3xl!`, not `!text-3xl`.
  - Opacity utilities are removed: use slash notation
    `bg-blue-500/20`, not `bg-blue-500 bg-opacity-20`.
  - CSS-variable references use parens:
    `bg-(--brand-color)`, not `bg-[--brand-color]`.
  - `outline-none` only zeroes `outline-style` now; for the full
    "remove outline" use `outline-hidden`.
  - Default ring width is **1px** (was 3px in v3) — pass `ring-3`
    to restore the v3 look.
  - Browser minimums: Chrome 111+, Safari 16.4+, Firefox 128+. v4
    drops the older fallbacks v3 carried.
- **Plugin install order** — the theme manager is still
  first-install-wins; `apps/client-web/plugins/vuecs.ts` keeps its
  `name: 'vuecs'` declaration, and `vuecs-navigation.ts` still
  `dependsOn: ['vuecs']`. Per-package plugins (`installForms`,
  `installPagination`, ...) still install AFTER
  `app.use(vuecs, ...)`. The trap is unchanged from the
  theme-bootstrap days — only the consequence-text changes
  (unstyled Tailwind class strings instead of unstyled
  Bootstrap class strings).

`bootstrap` and `@vuecs/theme-bootstrap` are no longer dependencies
of authup. The
`bootstrap/dist/css/bootstrap.css` CSS import is gone.

### `SlotName` enum local re-introduction

`@vuecs/list-controls` 2.x exported a `SlotName` enum
(`DEFAULT='default'`, `HEADER='header'`, `BODY='body'`,
`ITEM='item'`, `ITEM_ACTIONS='itemActions'`, ...) that authup's
`EntityCollectionSlotName` enum extended via `SlotName.X`
references. The `@vuecs/list` 1.0 compound rewrite removed the
enum. Authup keeps the string vocabulary locally in
`packages/client-web-kit/src/core/slot.ts` so the six consumer
files (`AUserForm`, `ARobotForm`, `APermissionPolicyBindingButton`,
`APermissionCheck`, `APolicyPicker`, `ATranslation`) and
`EntityCollectionSlotName` keep compiling. New code should prefer
the compound `<VCList*>` parts directly over slot-name dispatch.
