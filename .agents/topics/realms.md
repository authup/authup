# Realm scoping model

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## Realm Scoping Model

### Entity Categories

| Category | Entities | `realmId: null` allowed |
|----------|----------|--------------------------|
| **Global-capable** | permission, role, scope, policy | Yes: building blocks reusable across realms |
| **Realm-bound** | client, path, user, identity-provider | No |
| **Junction** | role-permission, user-role, etc. | Inherit the owner's realm |

**Global uniqueness needs an extra index (#3559).** The `@Unique` tuples of the
four global-capable tables contain `realm_id` (and `client_id` on permission and
role), and every dialect treats NULLs as distinct, so the constraint enforces
nothing for global rows. Migration
`1788782400000-WidenClientSecretAndGlobalUniqueness` adds a unique index per
table over the same tuple with NULLs coalesced onto `''`, declared on the entity
as an unsynced, hand-named `@Index` (conventions.md -> *Database Migrations*).
sqlite keeps the nullable unique alone (one file per container, no replica to
race). Pre-existing duplicates abort the migration; merging them is the
operator's (upgrading.md).

### Global-capable entity reads

**Both read paths of role, scope, permission and policy are realm-gated
(#3574).** `getMany` compiles `[<E>_READ, <E>_UPDATE, <E>_DELETE]`: append the
condition on `conditional`, a constant-false `inArray('id', [])` on `deny`, the
per-row drop loop on `post`. `getOne` runs `evaluateRecordOneOf` with the row's
`realmId`.

- The two ship together: gating only the list hides a row that
  `GET /<entity>/<uuid>` still returns, which makes a reader wrongly believe the
  entity is isolated. It also closes the UUID path on the dual mounts, whose
  `findOneByIdOrName` scopes the by-NAME branch only.
- `policy` matters most: `extendManyWithEA` runs after the projection, so an
  ungated list would ship every realm's policy configuration outside any field
  gate.
- `own` excludes null, and every built-in row is global, so a role holding
  `<E>_READ` at the junction default `own` sees no global rows. That is why
  `realm_admin` holds these reads at `ownOrNull`.
- The member side of a junction is gated per joined row by
  `redactUnreachedRelations` (topics/query.md -> *Include authorization*), not
  by the owner key.
- The shape is repeated per service on purpose: core services cannot import
  the repository helpers, and several OR an ownership term in.

### Junction reads

**Every `JunctionEntityService` read is gated on the OWNER realm key (#3594).**
The relations read gate (#3295) runs `preEvaluateOneOf` without `realmMatch`, so
it never checks a row's realm; without this gate any holder of the target
permission read other realms' junction rows.

- A junction row has no `realmId`. Each service passes `this.ownerRealmKey`
  (abstract on `JunctionEntityService`, `packages/server-kit`) as
  `realmAttributeName` to `compile`, which lowers the reach onto that column.
  It never changes an `evaluate()` outcome.
- **A declared `realmAttributeName` refuses to lower the grant's own policy**
  (`IdentityPermissionBindingPolicyEvaluator`, `lowerable = false`). A grant
  policy is written against the entity's columns; pushed down onto a junction
  it emits SQL over a column the table lacks (500). The verdict becomes `post`
  and the per-row branch evaluates the same policy on real attributes. The
  whole class is refused rather than one policy type rebased.
- Gate on the OWNER key, never the member key (`user-role` gates
  `userRealmId`, not the usually global `roleRealmId`).
- The `post` fallback passes `junctionResourceRealm(entity)` as the record
  realm.
- Adapters force-select the owner key with `applyJunctionRealmScopeSelect`
  (sibling of `applyRealmScopeSelect`, which assumes `realmId`). A stripped
  owner realm reaches the record check as `undefined`, which throws.
- `client-scope` and `identity-provider-role-mapping` pre-gate on the PARENT
  family; copy each service's compile list from its own pre-gate.
- `permission-policy` gates on `permissionRealmId`, so an `own` reader sees no
  built-in permission's policy bindings.

### Realm Defaulting

**Absent and `null` `realmId` are the same input on create**, because common
serializers drop null fields. The entity type decides what it means.

- **Global-capable** (permission, role, scope, policy): no value is a GLOBAL
  row. The service does not default the realm;
  `evaluateRecord(..., { realm: validated.realmId ?? null })` decides whether
  the actor may create a global row, so a `realm_admin` omitting it gets 403.
  Kit forms always send the realm explicitly (uuid or `null`, never `''`).
- **Exception: a permission or role with a `clientId`** takes the client's
  realm; another realm is a `ValidationError` (`applyOwningClientRealm`,
  `core/entities/client/owner-realm.ts`). It runs AFTER the create gate, which
  is evaluated against the client's realm, so the 400 leaks nothing to a caller
  who may not create there.
- A new GLOBAL custom permission reaches the built-in `realm_admin` only at the
  next boot (provisioning resolves `globalPermissions: ['*']` minus
  `REALM_ADMIN_EXCLUDED_PERMISSIONS`); `assignToRealmAdminRoles` grants a
  realm-scoped one to that realm's `realm_admin` immediately.
- **Realm-bound** (client, user, path, identity-provider): no value is the
  ACTOR's realm. `UserService.save`, `ClientService.save`, `PathService.create`
  and `IdentityProviderController.write()` delete a `null` right after
  validation: `realm_id` is NOT NULL and typeorm-extension's join-column check
  skips null only on nullable columns, so a null answered 500.
- Rejected: absent = actor realm, null = global (the distinction is the
  defect); default from the actor's reach (one request would mean different
  things per caller).

**Save lookup (`PUT` / `POST /<entity>/:key`) of a global-capable entity:**

- a string `realmId` scopes the lookup; a key naming no realm is 400
  (`IRealmRepository.resolveOrFail`), never an unscoped lookup;
- no value with a NAME key looks up the global row (`realmId: null`), and a name
  upsert creates it there; on permission and role it also pins `clientId` (the
  body's or `null`), so it never addresses a client-owned row of the same name;
- no value with a UUID key looks up by id alone.

Permission and role share `findClientOwnedRowForSave`, which runs a
`preEvaluateOneOf` over CREATE and UPDATE before the client lookup (no client
existence probe) and validates the client id like create does.

Realm-bound entities scope a NAME key without a realm to the actor's realm, the
realm create would write, so `PUT /users/alice` from a master admin never
reaches another realm's `alice`. A UUID key stays a by-id lookup.

A policy with a `parentId` and no `realmId` is global; there is no parent/child
realm check, but attaching, detaching or deleting a child needs `PERMISSION_UPDATE`
on the parent (before its type), and attaching to a built-in parent is refused.

### Realm immutability (an entity never moves between realms)

Every validator mounts `realmId` for `CREATE` / `PROVISIONING` only, so an update
silently strips it. The owning `clientId` of a permission or role is fixed the
same way (a name-keyed update still reads `data.clientId` to pick the row before
the validator strips it, which is why the update payloads keep the field).

- **Reason: denormalization.** A user's or client's realm is copied into its
  junction rows (`user_realm_id`, `client_realm_id`, ...) and child rows carry
  their own `realm_id`; the reach factor evaluates those copies. Moving the
  parent alone strands every grant in the old realm.
- An update with a foreign realm key finds nothing: 404, which reveals nothing
  about the row's real realm. An unknown body realm is 400, an unknown route
  realm 404.
- **Only a NAME key may create on a `PUT` miss**; a UUID miss is
  `EntityNotFoundError`. Otherwise a realm change wrote a second row with the
  same name, which reads like a move. The guard is
  `if (!entity && (options.updateOnly || <key is a uuid>))` in every upserting
  `save()` (user, client, scope, policy, realm, role, permission, and
  `IdentityProviderController.write()`).
- Kit realm pickers are create-time only (gated on `!isEditing`).
- The `*_SELF_MANAGE` denylists also list `realmId`.

### Realm reach is a coarse `realmScope` enum on the grant (NOT a policy)

There is no master-realm bypass. Each permission junction row carries
`realm_scope` (`RealmScope` in `@authup/access`), actor-relative, ordered, and
defaulting fail-closed to `own`:

| `realmScope` | matches resource realm `R` vs actor realm `A` | who |
|---|---|---|
| `none` | nothing | |
| `own` (default) | `R === A` only | `realm_admin` writes |
| `ownOrNull` | `R === A` or `R === null` | `realm_admin` reads |
| `any` | always | `admin` |

- Enforced in `IdentityPermissionBindingPolicyEvaluator` (`@authup/access`,
  registered by server-core's engine), which calls `RealmMatchPolicyEvaluator`
  in SCOPE MODE against the `realmMatch` policy data key. It is called directly
  and outside the `policies[]` merge, so include/exclude filters and the
  fail-open policy drop can never skip it.
- A realm-less or anonymous actor satisfies only `any`. The factor neutral-passes
  when no `realmMatch` key is present (pre-evaluate, realm-less resources).
- **Reach and policy are paired PER GRANT, never folded (#3155).**
  `aggregatePermissionPolicyBindings` keeps the disjunction
  `{ realmScope, policy }[]`; access is granted iff some grant matches the
  realm AND its own policy passes. Folding over-grants or under-grants in both
  directions.
- **Resources present their realm through the record helpers in
  `@authup/access`** (`evaluateRecord`, `evaluateRecordOneOf`,
  `reachesRecord*`, `evaluateRecordUpdate`, `hasUnboundedReach`). `realm` is
  the RECORD's realm (`null` global, a list = every realm); `undefined` throws,
  and so does caller data already carrying `realmMatch`. Every single-record
  check in server-core goes through them; an eslint rule refuses the
  `realmMatch` key in `apps/server-core/src` except `core/authorization/check.ts`
  and `core/identity/permission/checker/service.ts`.
- The realm is always explicit: a stored row passes its `realmId` (a missing
  column throws, which is why realm-gated adapters force-select it), a create
  passes `validated.realmId ?? null`, an update goes through `evaluateUpdate`'s
  required `realm` resolver. `*_SELF_MANAGE` evaluations pass the STORED row's
  realm, so a self-manage grant at `none` permits no self-edit.
- **Junctions present their OWNER realm** (`junctionResourceRealm`) as the
  record realm, so binding onto another realm's role/user/client is gated like
  a direct write. The member side is gated by the superset pre-evaluate.
  `identity-provider-role-mapping` refuses a role of another realm and
  `permission-policy` a realm-bound policy of another realm, whoever asks.
- The resource realm rides `realmMatch`, never the ATTRIBUTES bag, so an
  `ATTRIBUTE_NAMES` allowlist never sees a synthetic `realmId`.
- **Dependency:** the factor runs only where `system.default` is bound, which
  comes from `permissionsDefaultPolicyAssignment` (default true, deprecated).
  Turning it off weakens realm isolation.
- `policyId` is an extra ANDed restriction, not a reach control: a restricted
  actor's explicit `policyId` is ignored, and it is not part of the
  cap/superset.
- **Propagation caps:** a creator stamps at most its own reach (`min`); only an
  `any` policy-free actor may set an explicit `policyId`; `isSuperset` requires
  the parent's reach >= the child's.

### Admin Roles

| Role | Scope | Realm reach (junction `realmScope`) |
|------|-------|-----------------|
| `admin` | All permissions, no restrictions | `any`: all realms + global, **from an identity in ANY realm** |
| `realm_admin` | All permissions except `realm_create`, `realm_update`, `realm_delete` | `ownOrNull` (reads, assignments) / `own` (direct entity CUD and role-permission writes, so a global role's bindings are out of reach) |

### Nested Route Mounting

Realm-reading controllers are dual-mounted
(`@DController(['/users', '/realms/:realmId/users'])`): client, user, path,
permission, policy, identity-provider, identity-provider-account, key,
trust-anchor, event, session, consent. Junction controllers are flat.

- `RealmResolverMiddleware` is mounted at `/realms/:realmId/:nested`
  (`HTTPMiddlewareModule.mountRealmResolver`) AHEAD of the authorization
  middleware, which needs the route realm to resolve a Basic name. It resolves
  a UUID or name and stores the UUID with `setRequestRealmID` on `event.store`,
  not `event.params`, because the route re-extracts `:realmId` from the URL
  afterwards. An unknown realm answers 404.
- Controllers read `getRequestRealmID(event)`
  (`adapters/http/request/helpers/realm-id.ts`).
- The `:nested` segment keeps the middleware off `RealmController`'s own routes
  (`/realms/:id`, `.well-known`, `jwks`): an unknown name on `PUT /realms/:id`
  is a create intent, not a lookup miss.
- **Realm-key predicates fail closed.** Name lookups filter through
  `IRealmRepository.resolveId(key)` and return `null` / `[]` on a miss. Never
  reintroduce `resolve(...)` + `if (realm)`: dropping the filter matches a
  cross-realm row.
- **Route realm wins silently over body realm on writes**
  (`applyRouteRealmIDToBody`, no mismatch error).
- The dual mount is routing only, never an authorization shortcut: reach is
  evaluated against the entity's realm.
- **`GET /realms/:id` carries `meta.endpoints`** (`{ issuer,
  openidConfiguration, jwks }`, `RealmRecordResponse` in core-http-kit), built
  by `buildRealmEndpoints` in `apps/server-core/src/utils/url.ts`, the one
  derivation the discovery document also reads, so the record issuer equals
  the discovery issuer. Only the record read carries it; the collection does
  not. `IRealmAPI` overrides only `getOne` so the `ClientEntityAPIRegistry`
  proof stays cast-free.
