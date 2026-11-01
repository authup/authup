# Authorization: policies, catalog, batch check, grants

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## Policy-Permission Model (n:m)

Permissions reference policies through a junction table (`auth_permission_policies`), not a direct FK. Each permission has a `decisionStrategy` (default: `unanimous`) controlling how multiple policies are combined.

### Evaluation Layers

```
Layer 1: Permission-level policies (from auth_permission_policies)
  └── system.default (composite, UNANIMOUS)
        ├── system.identity
        └── system.permission-binding   (also enforces the realmScope enum + Layer-2 policy)

Layer 2: per-grant junction (from role-permission.policyId + realmScope, etc.)
  ├── realmScope enum  (coarse realm reach: own / ownOrNull / any)
  └── policyId policy  (optional additional ATTRIBUTES/IDENTITY restriction)
```

- Both layers must pass. Layer 1 runs in `PermissionEvaluator` (`@authup/access`).
- `system.permission-binding` is evaluated by `IdentityPermissionBindingPolicyEvaluator`
  (`@authup/access`, registered for `PERMISSION_BINDING` by server-core's policy engine,
  `core/security/policy/engine.ts`). It evaluates the per-grant disjunction: access iff some
  grant passes BOTH its `realmScope` match against the resource realm AND its own `policyId`
  policy (see realms.md -> *Realm reach is a coarse `realmScope` enum on the grant*).
- There are no realm baseline policies (`system.realm-match` / `-bound` / `-or-global`); the
  enum replaced them. The `REALM_MATCH` policy type remains for operator-authored policies.

### The authorization catalog (`GET /authorization`) and the introspected grants

Authorization reaches a consumer as three inputs: the identity-free catalog, the grants and
the identity (both from the introspection).

**The catalog** (`adapters/http/controllers/workflows/authorization/`, `Cache-Control:
private, no-cache`) is `AuthorizationCatalog` (`@authup/access`, with its zod schema):
every definition as `{ name, realmId, clientId, decisionStrategy, policies }` and each
policy tree once under `policies`, keyed by id. camelCase (#3769); the schema refuses the
old snake_case shape. It is an upper bound on what may be asked, not an entitlement.

- **Gate = the gate of `GET /permissions`**: `ForceLoggedIn`, then `preEvaluateOneOf` over
  `PERMISSION_READ` / `_UPDATE` / `_DELETE` (403 `permission_evaluation_failed`). Then every
  row is checked against the caller's realm reach (#3593), or this route bypasses the
  narrowing `GET /permissions` and `GET /policies` apply.
- **Reach withholds configuration, never an entry.** A definition out of reach travels with
  `policies: null`; a tree out of reach travels as `AUTHORIZATION_POLICY_WITHHELD_TYPE`, a
  node no consumer can project, so grants of it are dropped. An ABSENT definition must mean
  exactly one thing: the consumer's copy is stale. Accepted cost: a foreign realm's
  identifier tuples and policy ids still travel. Re-open if the tuple ever carries more.
- The reach test asks about the realm only. A read grant restricted by an ATTRIBUTES
  junction policy has no row to evaluate, so it denies; feeding it a synthetic row would
  widen (a missing key neutral-passes).
- **A caller reaching no definition gets 403 `permission_denied`**, not an all-deny
  document, which would read as authoritative. Default junction reach `own` excludes the
  global built-in rows, so `ownOrNull` is the practical floor for this route.
- **Who reads which route depends on the caller kind.** A resource server reads the catalog
  with its own client credential (one `client-permission` row) and fails closed without it.
  A browser client reads `POST /authorization/check` only: as a public client acting as the
  actor, the catalog gate is unsatisfiable for it, and gating by "does this user hold the
  permission family" made the console's source differ per user. The kit store does not
  consult the catalog even as a fallback (both routes ship together, so a fallback is
  unreachable). Below both is the name-only view for a server predating them: coarser
  (ignores reach and junction policies), kept because console gating is advisory. A
  resource server never uses it.
- A tree node is the output of its type's validator (`projectAuthorizationPolicy`), so
  entity columns never travel and server projection equals consumer validation.
- `buildAuthorizationCatalog` (`core/authorization/`) reads definitions
  (`IAuthorizationCatalogRepository.findDefinitions`) plus every grant-referenced tree
  (`findGrantPolicies`). `findDefinitions` throws `InternalError` when a junction row names
  a tree it cannot load (#3634): served without it, the restriction would vanish. Only that
  read throws: grant junctions are `ON DELETE SET NULL` and cached 60 s, so a deleted
  policy legitimately leaves a policy-free grant.
- A tree failing projection is warned about: a definition keeps its entry with
  `policies: null`; a grant tree is dropped (and the introspection drops its grants).

**Caching (#3599).** The document is per caller and not cached; `findDefinitions` and
`findGrantPolicies` are identity-free and sit in the DataSource query result cache
(`PermissionDatabaseProvider`), shared by both authorization routes. Staleness turns a
`POST /permissions` into a stale-catalog refetch that ends in deny-all, so invalidation is
load-bearing:

- Every table the reads derive from drops `AUTHORIZATION_CACHE_KEYS` on insert, update and
  remove: `auth_permissions`, `auth_permission_policies`, `auth_policies`,
  `auth_policy_attributes`, the role/user/client permission junctions, realms (cascade) and
  clients (delete nulls `auth_permissions.client_id`).
- A stored value counts only in the epoch it was read in; every invalidation drops the
  epoch key. Dropping only the value key lets a read that started before a commit
  overwrite a fresher value.
- `EntitySubscriber` drops its keys again after the outermost commit (hooks run before the
  commit). Applies to every subscriber cache.
- The 60 s TTL is only a backstop for writes bypassing subscribers (query-builder
  `delete()`).
- Trees are cached normalized (once, not per definition) and reassembled on read, which is
  where a missing tree still throws. Reads return a `structuredClone`: the memory cache
  hands out the stored reference and the realm-match evaluator writes `decisionStrategy`
  onto policies it evaluates.
- Rejected: narrowing query parameters on the route (reach narrowing already decides; the
  document is near constant-size).

**The grants** ride the introspection as `permissions` on `POST /token/introspect` and
`GET /sessions/@me/introspect`: one entry per junction row (`name`, `realm_id`,
`client_id`, `realm_scope`, junction policy ids), snake_case because it rides an RFC 7662
response. `resolveIntrospectionSubject` (`core/oauth2/introspection/`) is the one owner, so
the endpoints cannot drift.

- The projection is `getForToken` for the DESCRIBED token (the introspected one on POST,
  the request's own on GET), exactly what a request with it evaluates.
- A token whose `scope` lacks `global` reports an EMPTY list (#3749), matching the request
  path (`useRequestPolicyGrants`, #3723). Rejected: reporting the full set and leaving the
  scope rule to consumers (a consumer forgetting it allows what the server denies).
- No foreign-subject form exists; an admin lens over another identity needs its own gate.

**`createAuthorizationEvaluator({ catalog, grants?, identity? }, { validators?, evaluators? })`**
rebuilds the server's raw `PermissionPolicyBinding` model and runs the same aggregation and
evaluators, so parity holds by construction.

- A grant naming a definition or policy the catalog lacks throws
  `AuthorizationCatalogStaleError`: refetch and rebuild. Never read an absence as a deny.
- `policies: null` is NOT stale: deny the permission, drop its grants.
- A tree the consumer cannot project (unknown type, refused config) tombstones only the
  definitions referencing it. A malformed catalog (duplicate namespace) still throws.
- A grant tree containing a `permissionBinding` node settles false with `INVALID`
  (`containsBindingCheck` on the consumer side), so it cannot re-enter the evaluator
  without bound (#3633).
- **Policy types are open (#3635).** `PolicyDefaultValidators` sits next to
  `PolicyDefaultEvaluators`; `projectAuthorizationPolicy(input, validators?)` refuses what
  its registry lacks (and the withheld node always). Passed registries REPLACE the
  defaults; spread them. A validator without an evaluator projects and then denies.
- **server-core's type set stays closed**: every engine starts from
  `PolicyDefaultEvaluators`, so a custom-type tree travels as `policies: null`. Opening it
  means changing engine construction, the catalog builder and the introspection together;
  a validator seam on the builder alone would publish trees the server denies. A custom
  `type` written via `POST /policies` is accepted, evaluates as
  `POLICY_EVALUATOR_NOT_FOUND`, and accepts no options (400) until a validator is
  registered (#3669, #3676).
- A `realmMatch` key is a realm key, `null`, or a list of either (#3636). Empty key and
  empty list deny; `undefined` is refused (the server would coerce it to `null` and reach
  global rows).
- Identity and grants are optional. Without an identity the consumer binds no grant and
  REMOVES any caller-supplied IDENTITY key (it can never inject an identity), so only
  identity-free definitions pass. Grants without an identity are refused.
- Why grants ride the introspection and not the catalog: introspection is the hottest read
  and per identity; the catalog is large, shared and on a slower clock.

### The batch check (`POST /authorization/check`)

Answers VERDICTS about the caller's own authorization for a public client that cannot
satisfy the catalog gate (#3600). Publishing every policy predicate instead was rejected.
It discloses no definition, no policy configuration, and no realm key the caller did not
supply. It sits on the `:id`-free authorization controller: `POST /permissions/check` would
be shadowed by `POST /permissions/:id`, and `check` is a legal permission name.

- **No permission gate and no login gate.** Anonymous is a caller class: identity-free
  definitions (`date`/`time`, or none) have an answer before sign-in. Identity-bound ones
  deny on their own because `IdentityPermissionBindingPolicyEvaluator` does not declare
  IDENTITY in `requires` (missing identity = settled `DATA_MISSING`, not pending).
  `PermissionService.create` binds `system.default` unconditionally, so a default
  deployment answers anonymous callers an empty set. Cost is bounded by the body caps and
  the anonymous rate-limit bucket.
- **Body `{ names?, realms?, clients?, targetRealms? }`**, all optional; an empty body asks
  about every selected definition, so callers never keep a name list in step with their UI.
  - `realms` / `clients` select DEFINITIONS by owner; a definition is
    `(name, realmId, clientId)`, the unique key of `auth_permissions` (#3769).
    `targetRealms` is the resource realm each is checked against.
  - Owner selectors: `own` = caller's realm, or the request's TOKEN client (none for the
    console cookie or Basic); `ownOrNull` adds `null`; `granted`
    (`AUTHORIZATION_CHECK_GRANTED`) adds the owners the identity's grants name (none when
    scopes withhold the identity); an explicit list is verbatim. Rejected: a grant fallback
    inside `own` (it would mean two things).
  - `targetRealms` (`AuthorizationCheckTargetRealms`) takes `own`, `ownOrNull` or a list;
    no `granted` (a grant names an owner, not a resource location) and no `any`.
  - Defaults: `realms: [null]`, `clients: [null]`, `targetRealms: 'ownOrNull'`.
  - Explicit lists are never resolved, so nothing discloses a realm's or client's
    existence (unknown id = empty 200). Foreign ids are accepted: verdicts still run over
    the caller's own grants.
  - Each list is de-duplicated keeping first occurrence and order; callers must expect
    their own duplicates to be absent.
  - Rejected: answering a realm-owned definition only for its own realm (fuses the two
    realms, under-reports `any`, cannot tell same-named definitions apart).
  - Caps (`core/authorization/validator.ts`): 256 names
    (`AUTHORIZATION_CHECK_NAMES_MAX`), 4 entries per selector
    (`AUTHORIZATION_CHECK_SELECTOR_MAX`). Each (definition, target realm) pair is a
    synchronous tree walk on an ungated route.
- **Answer**: bare array `AuthorizationCheckPermissions`
  (`{ name, realmId?, clientId?, targetRealms }[]`, owners omitted when null), no envelope,
  no `version`. Unique by `(name, realmId, clientId)`. Only definitions reaching at least
  one requested target realm appear, so ABSENT = denied, and a `realmMatch` naming an
  unrequested realm fails closed for free. It is a pre-gate (upper bound): row-dependent
  junction policies are still decided per row.
- **`buildAuthorizationCheck` (`core/authorization/check.ts`)** reads definitions once
  through the catalog's `findDefinitions` into a `PermissionMemoryProvider`; grants are
  loaded once by the controller and ride on the identity. Per-name `findOne` would be
  hundreds of statements per login.
- **Everything downstream is keyed by the definition, never the name**: each `preEvaluate`
  passes the definition's `realmId` and `clientId`, and the expiry grant lookup matches the
  exact triple. Keyed by name, a realm-owned grant leaks onto a same-named global
  permission or the reverse.
- **A failed grant load fails the request, never answers as a denial.** Inside the engine
  a throw becomes issues and then a `PermissionError`, i.e. `200 []`, which the kit would
  memoize. The per-pair catch re-raises anything that is neither `PermissionError` nor
  `PolicyError`; a `PolicyError` denies only its pair, with a warning.
- **The bag carries `PERMISSION_BINDING`, `REALM_MATCH` and `IDENTITY`**, so identity and
  attribute-mode realm-match policies see what a request would give them. The evaluator is
  still wrapped in `RequestPermissionEvaluator`, which re-asserts IDENTITY from the request
  (or removes it), so placement cannot widen. `ATTRIBUTES` / `ATTRIBUTE_NAMES` are
  deliberately absent: a fabricated row could satisfy a policy the real row fails; absent,
  such a policy pends and permits (the documented upper bound).
- **Expiry (#3618).** `date`/`time` policies on the real clock report the next instant
  their verdict can change into `PolicyEvaluationContext.transitions`
  (`PolicyTransitionSink`), inherited by nested evaluations via context spread;
  `PermissionEvaluationOptions.transitions` passes it to `evaluate` / `preEvaluate` /
  `*OneOf` (not `compile`). Rules: report earlier, never later; nothing when the bag
  supplied `DATE`/`TIME` or the verdict cannot change; `invert` moves no instant; a time
  window end is reported as end + 60 s elapsed, never "local minute after" (DST fall-back
  would name the repeated hour).
  - Each pair gets its own `createPolicyTransitionCollector()`; an instant is kept only if
    the pair is held, or denied with the caller holding a grant for that exact definition,
    or denied while `deniesWithoutGrant` says the definition may pass without a grant.
    Otherwise the window would disclose boundaries of a permission the caller cannot
    hold, and the answer would depend on policy order.
  - Header: `Cache-Control: private, no-cache, max-age=N` (seconds to `expiresAt`, ceiled,
    clamped at 0), else `private, no-cache`. `max-age` over a custom header: relative
    (skew-immune) and CORS-safelisted.
- **Consumer: `createAuthorizationCheckEvaluator({ permissions, identity })`**
  (`@authup/access`). Looks entries up by context `realmId` + `clientId`, so a bare name is
  the global definition only. `data.realmMatch`: absent passes if any target realm did,
  `null` = global rows, the identity's realm id OR name = own realm (the server resolves to
  the id, its reach check accepts either), an array needs every member, anything else
  denies. `compile` answers `post`, or `deny` for an unheld definition.
- No counterpart on `POST /policies/:id/check`: policy names are unbounded, so a no-subset
  form has no defensible default.

**The kit store** reads this route only, with `realms: 'granted'`, `clients: 'granted'`,
`targetRealms: 'ownOrNull'`. `usePermissionCheck({ name, realmId?, clientId? })` names an
owned definition by real ids (no `own` shorthand). A bare name is the union of target
realms, so a `realmScope: none` grant does not enable a control.

- **Memo key = the introspection's authorization inputs** (subject, `scope`, grant list,
  by value), not the credential: keyed on credential, a role change mid-session would keep
  the first verdicts for the document's life. The comparison may over-refetch, never reuse.
- The memo also holds a local deadline (receipt + `max-age`, via
  `client.authorization.checkWithMaxAge`). One `setTimeout` per session commit refreshes
  it (never during SSR; delay capped at 2^31-1 ms and re-armed; cleared on re-arm and in
  `cleanup()`). The swap is dropped if the generation, the committed introspection, or the
  memo moved meanwhile. A failed timer refetch logs nobody out: retry after 30 s, doubling
  to 5 min (`CHECK_RETRY_DELAY` / `CHECK_RETRY_MAX_DELAY` in `core/store/create.ts`). A
  bearer session's `resolve()` refetches an expired memo explicitly, which catches timers
  held back by sleep or throttling.
- `permissionRevision` (watched by `usePermissionCheck` and the admin sidebar next to
  `status`) bumps only when installed verdicts DIFFER in canonical form; identical answers
  must not bump it (timer and cookie-mode navigations refetch constantly).
- `404` memoizes null and lands on the name-only view (the route has no gate, so 404 means
  an older server). Any other fetch failure rejects and clears the memo.
- **A failed BUILD commits a deny-all evaluator and never rejects** (a rejection reverts
  the staged session, revokes it and logs the console out). A failed FETCH rejects.
- Commits swap the delegate of ONE stable `StorePermissionEvaluator`; consumers hold
  `store.permissionEvaluator`. The server stays the enforcement point.

### A user's client-owned grants apply through that client's tokens

A permission or role may be owned by a client. For a USER, such a grant applies only
through a token issued to that client (#3597); a role owned by X is withheld through a Y
token together with the global permissions it carries. Unowned grants always apply.

- A request without a token client (clientless password grant, Basic, served console
  cookie) narrows nothing: it is first-party, and narrowing it would stop the consoles and
  Basic binding client-owned permissions. A bearer-mode admin console IS narrowed.
- System console clients are not exempted: public and auto-consenting, an exemption would
  hand any origin un-narrowed grants. Client subjects resolve their full grants.
- **`getForToken(token)` (`IdentityPermissionProvider`) is the one place narrowing
  happens**: a DISJUNCTION (unowned OR token client); an equality drops every global grant.
  `getFor(identity)` takes only `type` and `id` and returns full assignments, so identity
  metadata cannot narrow.
- Everything reads that one grant set:
  - **evaluation**: the authorization middleware installs `createGrantsResolver`: the
    request's own subject via `getForToken` with `useRequestTokenPayload`, any other
    subject or token-less request via `getFor`, memoized per request.
    `RequestPermissionEvaluator`, the batch check and `buildPermissionCheckerData` (which
    drops body-supplied grants) all use it.
  - **delegation**: `ActorContext.grants` via `buildActorContext`; `isSuperset` and
    `resolveJunctionGrant` take grant lists, never an identity; services read them through
    `getActorGrants` (none when the resolver is missing, so mistakes deny). Re-loading by
    identity at a call site compiles and silently widens.
  - **introspection**: `getForToken` of the INTROSPECTED token, never the caller's.
- `realm_access` / `global_access` claims apply the same rule to roles. A grant minting
  from an existing token must copy its `client_id` (refresh, MFA completion; the device
  grant binds the device's client).
- Open, by design:
  - `OAuth2AccessPolicyEvaluator` places IDENTITY only, so a binding node there denies.
  - Served consoles (cookie: identity, no token payload) fall through to `getFor`: grants
    owned by ANY client apply there.
  - An actor with an X token can assign itself an unowned role carrying grants it holds
    only through X: delegation checks what is held, not where it applies.
  - A user's owned roles/permissions are cached 60 s. Removing a junction or deleting a
    role invalidates at once; deleting a whole permission may lag up to 60 s.
- `isSuperset`'s role side includes every permission the role carries, regardless of
  client ownership (#3607).

### Policy engine evaluators are per engine

`PolicyEngine`'s constructor COPIES the evaluator map (`{ ...evaluators }`,
`packages/access/src/policy/engine/module.ts`). Never hold the caller's object: every
engine starts from the shared `PolicyDefaultEvaluators`, so `registerEvaluator` would leak
into every engine in the process, and an evaluator with per-application state would
evaluate against another application's data. Only visible with two applications in one
process (the federation e2e spec, testing.md -> *A second application in one spec*). A
caller wanting a shared registry passes the same object to `registerEvaluators` on each.

### Grants are policy data

- `IdentityPermissionBindingPolicyEvaluator` loads nothing: it reads
  `IdentityPolicyData.grants` from the `IDENTITY` key. No grants = settled `DATA_MISSING`
  deny (`accessGrants` throws a `PolicyError`). The identity data validator must mount
  `grants`, or it strips them on the first read. Neither case is pending (the pre-gate
  permits pending).
- Grants ride ON the identity so no placer can pair one subject with another's grants.
  Rejected: a separate `grants` key with a subject tag.
- Whoever places an identity loads its grants: `RequestPermissionEvaluator`,
  `buildPermissionCheckerData`, `buildAuthorizationCheck`, and consumer-side
  `createAuthorizationEvaluator`.
- Reasons: a read inside the engine is flattened into a denial (403, or `200 []`), and a
  provider callback mid-evaluation blocks evaluating built-in policies outside the
  process.

### PermissionBinding & aggregated grants

Types in `packages/access/src/permission/types.ts`:

- `PermissionPolicyBinding`: one raw grant: `permission` (`name`, `clientId`, `realmId`,
  `decisionStrategy`; identity = `name + clientId + realmId`), `policies` (Layer 1 from
  `auth_permission_policies` via `PermissionDatabaseProvider`, plus the Layer 2 junction
  policy via `getBoundPermissions()`), `realmScope` (`none | own | ownOrNull | any`,
  default `own`).
- `aggregatePermissionPolicyBindings` groups raw bindings into
  `PermissionPolicyBindingAggregated` = `{ permission, grants: { realmScope, policy }[] }`.
  No lossy collapse: every consumer (binding evaluator, `isSuperset`, junction propagation,
  memory provider) evaluates the disjunction.
- `realmScope` is a separate factor ANDed with the grant's policy, never folded into the
  policy expression (immune to the fail-open policy merge) and not part of the binding key.
  A specific realm set is expressed as a `policyId` `ATTRIBUTES` policy, not on the grant.
  See realms.md -> *Realm reach is a coarse `realmScope` enum on the grant*.

## Security: Permission Assignment

### Superset Check

Role assignment (user-role, client-role, identity-provider-role-mapping) calls
`IdentityPermissionProvider.isSuperset(parent, child)` with the actor's grants
(`getActorGrants`, token-narrowed) as `parent` and the role's full grants
(`getFor({ type: 'role', id })`, unfiltered by client ownership, #3607) as `child`.
Disjunction- and policy-aware (#3158): every child grant must be dominated by some actor
grant.

`grantDominates(parent, child)` (`packages/access/src/permission/helpers/grant.ts`):

- **Reach:** `compareRealmScope(parent, child) >= 0` (`none < own < ownOrNull < any`).
- **Policy (`policyDominates`):** unrestricted parent covers anything; a restricted parent
  never covers an unrestricted child; two restricted grants cover each other only when
  provably the same (`isPolicyEquivalent`): equal `id`, or equal configuration after
  `normalizePolicyForEquality` strips `NON_SEMANTIC_POLICY_KEYS` recursively. Same `type`
  is not equivalence (#3159: `department=X` must not confer `department=Y`). Containment of
  different trees is undecidable, so anything else is distinct (fail-closed).
- **Invariant:** every key in `NON_SEMANTIC_POLICY_KEYS` must stay non-evaluation-affecting;
  adding an evaluation-relevant key widens equivalence into an over-permit.

### Junction Policy Propagation

Creating or updating a role/user/client permission junction:

- The service calls `resolveJunctionGrant(await this.getActorGrants(actor), { name,
  realmId, clientId, realmScope })` with the REQUESTED reach (`validated.realmScope ?? own`
  on create; `data.realmScope ?? entity.realmScope` on update, so a policy-only update
  cannot widen).
- `selectGrantForRequest` (#3160) ranks grants by reach capped to the request,
  policy-free preferred on a tie. Not a global ceiling: a mixed-grant actor propagates its
  policy-free `own` grant for an `own` request rather than the wider grant's policy.
- The selected grant returns UNCAPPED; the consumer stores `realmScope = min(requested,
  selected)` and the selected grant's OWN policy id, never the target's. A restricted grant
  whose policy is not propagatable (id-less composite) fails closed to `none`.
- Uncapped return keeps the rule "only an `any` policy-free actor may set an explicit
  `policyId`" exact.
- No policy-content comparison is needed here (the actor only propagates its own policy),
  unlike the superset check.

## Self-Edit Pattern (declarative field denylists)

Identities edit their own rows via `*_SELF_MANAGE` permissions; admin-only fields are
blocked by an inverted ATTRIBUTE_NAMES policy bound to the permission. No hardcoded field
stripping in services.

### Permissions

| Permission | Identity type | Denylist policy |
|---|---|---|
| `client_self_manage` | client | `system.client-names-self-manage` (`invert: true`) |
| `user_self_manage` | user (own User columns and own UserAttribute rows) | `system.user-names-self-manage` (`invert: true`) |

Defaults (declared in `app/modules/provisioning/sources/default/module.ts`):

| Policy | Denylist `names` |
|---|---|
| `system.client-names-self-manage` | `active, realmId, pathId, authMethod, tokenBindingMethod, secretHashed, secretEncrypted, grantTypes, accessPolicyId` |
| `system.user-names-self-manage` | `active, nameLocked, status, statusMessage, realmId, pathId, emailVerified` |

- Client: `authMethod` (switching away from `secret` clears it), `tokenBindingMethod`, the
  storage flags (downgrade persists plaintext), and the admission controls `grantTypes` /
  `accessPolicyId`. `realmId` is validator-stripped on update already; kept as defense in
  depth.
- A self-managing client rotates via `POST /clients/@me/secret`; the service hands the
  policy the storage flags only when the mode changes, so this denylist refuses a mode
  change (clients.md -> *Client secret storage and rotation*).
- **Denylists fail open**: a new column mounted in the validator is self-editable until
  added. Extend the denylist with any admin-only column you add.

### Unified user-namespace policy

- `USER_SELF_MANAGE` governs User column edits AND UserAttribute writes:
  `UserAttributeService` maps `(name, value)` to `{ [name]: value }` before evaluation, so
  arbitrary keys are allowed except denylisted ones. An actor with `USER_UPDATE` takes that
  path instead and is not subject to the denylist.
- A UserAttribute named like a User column is refused with `BadRequestError` (no shadowing
  of real columns, independent of the denylist).

### Service flow

- `{Client,User}Service.save()`: on update, `preEvaluate(<E>_UPDATE)`; on denial, fall
  back to `<E>_SELF_MANAGE` only when the actor IS the row, then after validation
  `evaluateRecord(<E>_SELF_MANAGE, { realm: entity.realmId, data: { attributes:
  validated } })`. Unmounted fields are stripped by the validator before the policy sees
  them.
- Self-manage reach is matched against the STORED row's realm (also for the secret
  rotation and the user-attribute self path), so a grant at `realmScope: none` permits no
  self-edit.
- **The update WRITE (only) runs in a row-locking transaction (#3526)** via
  `transaction<R>(fn)` on `IUserRepository` / `IClientRepository`:
  - Pre-work (lookup, gates, validation, `validateJoinColumns`, `checkUniqueness`,
    derivations) stays outside. It acquires second pooled connections; inside a
    transaction ten concurrent saves deadlock the pool.
  - The request produces a PATCH (validated + derived fields, minus fields echoed back
    unchanged, minus `name` when the name lock reverted it). Inside the callback: lock-read
    the fresh row (`FOR UPDATE`), merge the patch, re-check rules depending on current
    state (`nameLocked`; the client secret follows the fresh `authMethod`), save. TypeORM
    then writes only changed columns, so concurrent writers' columns survive.
  - Nothing inside the callback may use a pool-bound repository (same rule for the entity
    audit row, which rides `event.manager`, #3539).
  - On sqlite the seam is an unlocked passthrough (no `FOR UPDATE`, one shared query
    runner). The lock is a private adapter option `lockRows` set only on the instance
    inside the transaction.
  - Not on the base `IEntityRepository` (32 implementers). Deliberately unlocked:
    registration, password recovery, the federated account manager's user writes.
  - The lost-update regression only reproduces on mysql/postgres (testing.md).

### preEvaluate is derived from data availability (tri-state, issue #3286)

- A policy whose `requires?(value)` keys are absent from the bag returns
  `{ success: false, pending: true }` instead of evaluating missing data. Built-ins:
  - identity -> `[IDENTITY]`; attributes -> `[ATTRIBUTES]`; date/time/composite -> none.
  - attributeNames -> none, reports pending itself (#3321): it settles against EITHER its
    own `ATTRIBUTE_NAMES` key (a projection list) or the `ATTRIBUTES` record (both
    enforced when both present); the engine gate is AND-only.
  - permissionBinding -> `[PERMISSION_BINDING]`; IDENTITY deliberately NOT declared, so a
    missing identity is a settled deny and a scope-restricted bearer fails the pre-gate.
  - realmMatch -> `[IDENTITY]` in scope mode, `[IDENTITY, ATTRIBUTES]` in attribute mode.
- Composites treat pending children as unknown and settle only when no resolution could
  change the outcome. **`invert` is never applied to a pending result.**
- A pending junction policy is a pending grant term; the disjunction settles false only
  when every term settled.
- A childless composite fails closed with `PolicyIssueCode.INVALID` (#3304);
  `PolicyProvisioningValidator` rejects it at config load. The entity API create path is
  NOT gated (the admin UI creates the composite before attaching children).
- `preEvaluate` passes `pendingPolicies: 'permit'` (default `'deny'`): only a tree that
  settles false denies. New policy types place themselves via `requires`; there is no
  exclusion list. The full `evaluate()` with data denies on pending.

**Condition lowering (#3286):** optional `IPolicyEvaluator.toCondition?(value, ctx)`
expresses a pending policy as a rapiq `ICondition` over row attributes, opt-in via
`PolicyEvaluationContext.withConditions`.

- Composite: settled children drop out; AND/OR compose ALL-OR-NOTHING per node (pushing
  one OR disjunct wrongly excludes rows); CONSENSUS never lowers; `invert` wraps via
  rapiq `not()` (null-inclusive, matches predicate inversion).
- The condition is exact: row matches iff the pending subtree settles true on it.
- Lowerable: `attributes`, `realmMatch` scope mode (field `attributeName`, default
  `realmId`; under `withConditions` an absent `realmMatch` key PENDS instead of
  neutral-passing), strict single-key attribute mode. Anything else is a per-row
  post-check.

**Permission compile:** `IPermissionEvaluator.compile(ctx)` ->
`allow | deny | { verdict: 'conditional', condition } | post`.

- Multiple names compile as a disjunction; any `allow` short-circuits, any non-expressible
  name degrades the whole result to `post`.
- The binding evaluator composes `and(reach, junctionPolicy)` per grant; a policy-free
  `any` grant settles true (admin fast path, `allow`); `none` reaches nothing.
- `getMany` consumers: `deny` -> append `inArray('id', [])`; `conditional` ->
  `appendQueryConditions` (exact pagination and totals); `post` -> per-row `evaluate` +
  `total -= 1`.
- Ownership alternatives compose service-side as `or(<ownership>, compiled.condition)`
  (ownership alone on `deny`): Session/Consent (`sub`+`subKind`), Event
  (`actorId`/`actorType`), User (`id`, user identity only), UserAttribute (`userId`,
  compiling `USER_UPDATE` only), UserAuthenticator (`userId`), IdentityProviderAccount
  (`userId`, reach on `userRealmId`, #3601). Pure gates: Key, TrustAnchor, RoleAttribute,
  the four global-capable entities (#3574) and the eight junction services, which pass
  `realmAttributeName: this.ownerRealmKey` (#3594).
- `EventService.resolveReadVisibility` (foreign-realm probing) survives only as the `post`
  fallback.
- The client secret gate is on the client SCHEMA (`secretReadGate`, `fields.validateMany`,
  #3322), not the service; it fails CLOSED on `post`.
- `FakePermissionEvaluator.compile` defaults to `post`; override via `setCompileResult`.

**The `post` verdict is approximate (#3595).** It fetches one page through the un-gated
query and drops rows, so `meta.total` is an upper bound and a page may be shorter than
`limit` (even empty) while later pages hold rows. Consumers must page to the end and not
show `meta.total` as an accessible count. Ownership-alternative services skip the
`or(...)` on `post`, widening the fetch further. `SessionTokenService.getMany` has the same
properties without calling `compile()` (its realm is `session.realmId`, a relation path
`realmAttributeName` cannot express). Rejected:

- Fetching the whole collection before paginating: schemas cap `maxLimit: 50` to bound
  reads; this would make list requests unbounded.
- Lowering `attributeNames`: it is a predicate over the bag's KEYS, not row values, so it
  has no row condition.

`post` is only reached when a grant carries a non-lowerable policy; default `admin` /
`realm_admin` grants are policy-free and compile `conditional`.

### EA loading on tree roots

`AttributeNamesPolicyValidator` reads `names` from extra attributes. A policy bound to a
permission is loaded as the root of a closure-table tree, and
`EATreeRepository.findDescendantsTree()` must call `extendOneWithEA` on the root
(`adapters/database/extra-attribute-repository/tree/repository.ts`); without it the root's
EA fields stay unloaded and validation fails `value_invalid`. Both Layer 1
(`PermissionDatabaseProvider`) and Layer 2 (`bindings.ts`) depend on it.
