# Authorize resources with the authorization catalog

`GET /authorization` answers the identity-free authorization catalog
(`AuthorizationCatalog`, exported by `@authup/access`): every
permission definition with the policies bound to it, and each policy tree once.
The grants an identity holds ride the introspection response as `permissions`,
one entry per grant with its realm reach and its junction policy ids. Together
with the identity that introspection names, that is the data a console or a
resource server needs to evaluate Authup's decisions outside the Authup process.
Reading the `name` of each entry alone is not enough for resource authorization.

## Read the catalog and the grants

**The catalog endpoint is anonymous.** It takes no credential, neither a bearer
nor a console session cookie, and answers every caller the same bytes. That is
structural rather than a convenience: the consumer this document exists for is
typically a public client, which holds no secret, can obtain no token of its
own and therefore has no credential to be gated on. Gating on the end user's
bearer instead would make the document depend on who asks, and the whole point
is one document you fetch once and reuse to evaluate as many identities as you
see.

So cache it per process, not per credential or per user. One fetch serves every
session your application handles; refetch only when the stale signal below tells
you to.

What it publishes is the authorization RULES: every permission namespace, which
is a closed enum published in `@authup/access` and in the OpenAPI document
anyway, and every policy configuration, which is the deliberate part. Knowing a
rule does not help you satisfy it (an attributes predicate reads the subject's
own attributes, which a reader cannot set), and enforcement has never rested on
the rules being secret. The catalog is an upper bound on what may be asked, not
an entitlement: every decision it feeds runs over the grants of the identity
being evaluated, and you only ever see the grants of identities that hand you a
token.

A server that predates the route answers `404`. A console may fall back to
gating on the entry names alone, which is coarser than the catalog-backed
evaluator (it ignores realm reach and junction policies, so a check a
catalog-backed session denies passes there) and is acceptable only because a
console's gating is advisory and the server enforces every decision. A resource
server must never do that: fail closed on a missing catalog.

The grants and the identity come from the introspection you already run:
`POST /token/introspect` for a bearer, `GET /sessions/@me/introspect` for a
console session. `permissions` is the grant list; `sub`, `sub_kind`, `realm_id`
and `realm_name` are the identity. The grant list is NOT narrowed by the
token's `scope`: an active token reports the identity's full grant set, while
the server withholds the identity policy data from a bearer that holds no
`global` scope and denies it every `system.default`-bound permission. A
resource server that honours scopes applies that check itself.

```typescript
import {
    BuiltInPolicyType,
    PolicyData,
    createAuthorizationEvaluator,
    isAuthorizationCatalogStaleError,
} from '@authup/access';

// The catalog needs no credential at all; only the introspection speaks for
// the user. Fetch it once per process and reuse it for every identity.
const catalog = await client.authorization.get();
const introspection = await client.token.introspect({ token: accessToken }, {
    authorizationHeader: { type: 'Bearer', token: accessToken },
});

// An inactive token still names its subject, and it reports no grants at all.
// Building an evaluator from it would authorize every definition that carries
// no binding check, so refuse the credential before you build one.
if (!introspection.active) {
    throw new Error('The access token is not active.');
}

const authorization = await createAuthorizationEvaluator({
    catalog,
    grants: introspection.permissions ?? [],
    identity: {
        id: introspection.sub,
        type: introspection.sub_kind,
        realmId: introspection.realm_id,
        realmName: introspection.realm_name,
        // a client subject is its own client; a user's own clientId is not a claim
        clientId: introspection.sub_kind === 'client' ? introspection.sub : null,
    },
});
```

`createAuthorizationEvaluator` refuses an identity with no grant list, so the
inactive case above cannot reach it by omission: an identity holding no grant
passes an explicit empty array.

The response is `Cache-Control: public, no-cache`: it is a pure function of the
permission and policy rows and of no caller, so an intermediary may store it and
revalidate. Keep it in your own process too, and refetch it when
`createAuthorizationEvaluator` throws an error
`isAuthorizationCatalogStaleError` recognizes, which means a grant names a
definition or a policy the cached copy does not carry. Use that guard rather
than `instanceof`: a tree resolving two copies of `@authup/access` breaks the
class identity and turns the one recoverable state into an unrecoverable one.
The grants come from a fresh
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
- A tree YOUR copy of `@authup/access` cannot project is read the same way: a
  policy type newer than that copy, or a configuration its validator refuses,
  denies the definitions that reference it and drops the grants that name it,
  and never takes the other permissions down with it. Upgrade `@authup/access`
  after the server, and expect the permissions using a newly added policy type
  to deny until you do.

The grants (the introspection response's `permissions`):

- One entry per grant, so a name may repeat when the identity holds it through
  several junction rows.
- `name`, `realm_id` and `client_id` name the definition. `realm_scope` is the
  grant's own reach, `own` when absent. `policies` are the ids of the junction
  policy trees, resolved against the catalog; empty means no junction policy.
- A grant naming a definition the catalog lacks, or naming a policy the
  catalog lacks for a definition it carries, throws a stale error: the copy
  you hold predates the definition or the junction row, so refetch the catalog
  and build again. A grant naming a definition carried with `policies: null`
  is left out and denies, and its own policy ids are never resolved, so that
  case never reports stale. A grant whose junction policy contains a
  permission-binding check, or one your copy cannot project, is left out.

`createAuthorizationEvaluator` rejects missing fields, a definition referencing
an undeclared policy id, a duplicate permission namespace, an identity that is
not a `user` or a `client`, and grants supplied without an identity. It rebuilds the server's own binding model and runs the
same aggregation and evaluators, which is what makes the decisions equal.

## Upgrade order

1. Upgrade the Authup server to a release serving `GET /authorization` and
   reporting grants on introspection.
2. Upgrade `@authup/access` and, for typed access, `@authup/core-http-kit`.
3. Fetch the catalog. It needs no credential and no permission grant.
4. Replace name-only checks with
   `createAuthorizationEvaluator({ catalog, grants: introspection.permissions, identity })`.
5. A resource server must fail closed on a missing or malformed catalog and on
   an introspection without a grant list. Do not read the entries' names alone
   there.
