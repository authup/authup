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

The catalog endpoint requires an access credential: a bearer, HTTP Basic, or the
console session cookie. The answer is the same for every caller, so cache it per
process rather than per subject. A credential without the `global` scope reads
the catalog like any other, but its introspection carries no grants: it holds
none server-side either.

The grants and the identity come from the introspection you already run:
`POST /token/introspect` for a bearer, `GET /sessions/@me/introspect` for a
console session. `permissions` is the grant list; `sub`, `sub_kind`, `realm_id`
and `realm_name` are the identity.

```typescript
import {
    AuthorizationCatalogStaleError,
    BuiltInPolicyType,
    PolicyData,
    createAuthorizationEvaluator,
} from '@authup/access';

const catalog = await client.authorization.get({
    authorizationHeader: { type: 'Bearer', token: accessToken },
});
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
policy the cached copy does not carry. An evaluator is per subject, because its
grants and its identity are; the catalog behind it is shared. A revoked grant is
visible on the next introspection.

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
  at that layer. A definition whose policy tree cannot be projected is left out,
  so a grant of it reads as stale until the policy is fixed.

The grants (the introspection response's `permissions`):

- One entry per grant, so a name may repeat when the identity holds it through
  several junction rows.
- `name`, `realm_id` and `client_id` name the definition. `realm_scope` is the
  grant's own reach, `own` when absent. `policies` are the ids of the junction
  policy trees, resolved against the catalog; empty means no junction policy.
- A grant naming a definition or a policy the catalog lacks throws
  `AuthorizationCatalogStaleError`: refetch the catalog and build again. A grant
  whose junction policy contains a permission-binding check is left out.

`createAuthorizationEvaluator` rejects an unknown version, missing fields, a
definition referencing an undeclared policy id, an unsupported policy type, a
malformed configuration and an identity that is not a `user` or a `client`. It
rebuilds the server's own binding model and runs the same aggregation and
evaluators, which is what makes the decisions equal.

## Upgrade order

1. Upgrade the Authup server to a release serving `GET /authorization` and
   reporting grants on introspection.
2. Upgrade `@authup/access` and, for typed access, `@authup/core-http-kit`.
3. Replace name-only checks with
   `createAuthorizationEvaluator({ catalog, grants: introspection.permissions, identity })`.
4. A resource server must fail closed on a missing or malformed catalog and on
   an introspection without a grant list. Do not read the entries' names alone
   there.
