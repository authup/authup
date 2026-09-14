# Authorize resources with the authorization catalog

`GET /authorization` answers the identity-free authorization catalog
(`AuthorizationCatalog`, `version: 1`, exported by `@authup/access`): every
permission definition with the policies bound to it, and each policy tree once.
The grants an identity holds ride the introspection response as `permissions`,
one entry per grant with its realm reach and its junction policy ids. Together
with the identity that introspection names, that is the data a console or a
resource server needs to evaluate Authup's decisions outside the Authup process.
Reading the `name` of each entry alone is not enough for resource authorization.

## Read the catalog and the grants

The catalog endpoint is gated exactly like `GET /permissions`: the credential
must hold `PERMISSION_READ`, `PERMISSION_UPDATE` or `PERMISSION_DELETE`, and
any other authenticated credential is answered 403. A resource server therefore
fetches it with its own client credential, never with the end user's bearer:
the catalog is identity-free, so the user's grants say nothing about reading
it, and one `client-permission` row binding `permission_read` to the resource
server's client is all it needs. The answer is the same for every permitted
caller, so cache it per process rather than per subject.

The grants and the identity come from the introspection you already run:
`POST /token/introspect` for a bearer, `GET /sessions/@me/introspect` for a
console session. `permissions` is the grant list; `sub`, `sub_kind`, `realm_id`
and `realm_name` are the identity. A bearer without the `global` scope holds no
grants server-side, so its introspection carries none.

```typescript
import {
    AuthorizationCatalogStaleError,
    BuiltInPolicyType,
    PolicyData,
    createAuthorizationEvaluator,
} from '@authup/access';

// `client` authenticates with the resource server's own client credential,
// which holds permission_read; only the introspection speaks for the user.
const catalog = await client.authorization.get();
const introspection = await client.token.introspect({ token: accessToken }, {
    authorizationHeader: { type: 'Bearer', token: accessToken },
});

const authorization = await createAuthorizationEvaluator({
    catalog,
    grants: introspection.permissions,
    identity: {
        id: introspection.sub,
        type: introspection.sub_kind,
        realmId: introspection.realm_id,
        realmName: introspection.realm_name,
    },
});
```

The response is `Cache-Control: private, no-cache`: keep it in your own process
and refetch it when `createAuthorizationEvaluator` throws
`AuthorizationCatalogStaleError`, which means a grant names a definition or a
policy the cached copy does not carry. The grants come from a fresh
introspection, so a definition created after the catalog was cached (an Authup
upgrade adding permissions, a `POST /permissions`) or a junction row created
since reaches you through that error and nothing else. An evaluator is per
subject, because its grants and its identity are; the catalog behind it is
shared. A revoked grant is visible on the next introspection.

## Evaluate one resource

```typescript
await authorization.evaluate({
    name: 'event_read',
    // These name the PERMISSION definition, not the resource's realm.
    realmId: null,
    clientId: null,
    data: new PolicyData({
        [BuiltInPolicyType.REALM_MATCH]: event.realmId,
        [BuiltInPolicyType.ATTRIBUTES]: event,
    }),
});
// Resolves on allow; throws on denial.
```

For an anonymous caller omit `identity` and `grants`. No identity data is
injected and no grant is bound, so only a definition whose policies need no
identity can pass (a `date` or `time` policy alone, or an empty definition
layer), exactly as on the Authup server; a definition bound to `system.default`
denies. Grants supplied without an identity are refused.

`options.decisionStrategy` is forwarded; the policy include, exclude and
pending options are refused.

Reach is enforced by the `permissionBinding` node in the permission's
definition policies (`system.default` on every provisioned permission). A
permission whose definition carries no binding check is unrestricted, grants
included, so `allow` can also mean that the permission has no policy layer at
all. Keep `core.permissionsDefaultPolicyAssignment` on for `realm_scope` to
mean anything.

The `REALM_MATCH` key follows the same three-way rule the Authup server applies
to its own entities. A resource that carries a realm column passes its value:
the realm id, or `null` for a global row. A resource with no realm dimension
passes no key at all, and reach neutral-passes for it. The trap is a resource
that has a realm column whose value you forget to pass: reach then
neutral-passes as if the resource were realm-less, so pass the column whenever
it exists, `null` included. `own` admits the actor's realm only; `ownOrNull`
also admits global rows; `any` admits every realm; `none` admits none. A
realm-less actor cannot satisfy `own` or `ownOrNull`. Master-realm membership
adds no bypass.

`preEvaluate` and `preEvaluateOneOf` are the pre-gate for a request whose row is
not loaded yet: a pending policy passes, and reach settles only when `REALM_MATCH`
is present. `evaluate` requires every named permission, `evaluateOneOf` any.

## Filter collections before pagination

```typescript
const compiled = await authorization.compile({ name: 'event_read' });

switch (compiled.verdict) {
    case 'allow':
        break;
    case 'deny':
        // Return no rows and total: 0.
        break;
    case 'conditional':
        // AND compiled.condition into BOTH the row query and its count query,
        // using the corresponding rapiq adapter, BEFORE offset/limit.
        break;
    case 'post':
        throw new Error('This collection query requires unsupported policy evaluation.');
}
```

`condition` is a rapiq condition over row attributes; grant reach targets the
`realmId` column. Call `compile` without `realmMatch` or `attributes` data. A
pending policy that cannot be lowered produces `post`, never an unrestricted
query.

## Catalog and grant contract

The catalog (`GET /authorization`):

- `version`: `1`.
- `policies`: every policy tree a definition or a grant can name, keyed by the
  tree's id and present once. A node carries its `type`, its configuration
  keys, `invert` and, for a composite, its `children` inline. It is the output
  of that type's validator: no entity columns.
- `permissions`: one entry per definition with `name`, `realm_id`, `client_id`,
  `decision_strategy` and the definition's `policies` (ids), sorted by
  permission key.
- Nullable fields are required. An empty `policies` list means no restriction
  at that layer. `policies` is `null` when the server could not project one of
  the definition's trees (a policy type the catalog does not carry, or a
  configuration its validator refuses): the definition exists, the evaluator
  denies it and drops every grant of it until the policy is fixed. Such a
  definition is carried rather than left out, so that a definition absent from
  the catalog can only mean a copy older than the definition.

The grants (the introspection response's `permissions`):

- One entry per grant, so a name may repeat when the identity holds it through
  several junction rows.
- `name`, `realm_id` and `client_id` name the definition. `realm_scope` is the
  grant's own reach, `own` when absent. `policies` are the ids of the junction
  policy trees, resolved against the catalog; empty means no junction policy.
- A grant naming a definition or a policy the catalog lacks throws
  `AuthorizationCatalogStaleError`: the copy you hold predates the definition
  or the junction row, so refetch the catalog and build again. A grant naming
  a definition carried with `policies: null` is left out and denies. A grant
  whose junction policy contains a permission-binding check is left out.

`createAuthorizationEvaluator` rejects an unknown version, missing fields, a
definition referencing an undeclared policy id, an unsupported policy type, a
malformed configuration, an identity that is not a `user` or a `client`, and
grants supplied without an identity. It rebuilds the server's own binding model
and runs the same aggregation and evaluators, which is what makes the decisions
equal.

## Upgrade order

1. Upgrade the Authup server to a release serving `GET /authorization` and
   reporting grants on introspection.
2. Upgrade `@authup/access` and, for typed access, `@authup/core-http-kit`.
3. Bind `permission_read` to the resource server's own client (one
   `client-permission` row) and fetch the catalog with that credential.
4. Replace name-only checks with
   `createAuthorizationEvaluator({ catalog, grants: introspection.permissions, identity })`.
5. A resource server must fail closed on a missing or malformed catalog and on
   an introspection without a grant list. Do not read the entries' names alone
   there.
