# Authorize resources with the authorization document

`GET /authorization` answers the caller's own authorization document
(`AuthorizationDocument`, `version: 1`, exported by `@authup/access`): every
permission definition the identity holds, the policies bound to that definition,
and each grant's realm reach paired with its own policy. It is the data a
console or a resource server needs to evaluate Authup's decisions outside the
Authup process. Token introspection carries the name-only `permissions` array
for compatibility; that array is not enough for resource authorization.

## Read the document

The endpoint requires an access credential: a bearer, HTTP Basic, or the
console session cookie. A resource server that verified a user's bearer
forwards that bearer; a client acting for itself uses its own. A credential
without the `global` scope receives an empty document: it holds no grants
server-side either.

```typescript
import { createAuthorizationEvaluator, BuiltInPolicyType, PolicyData } from '@authup/access';

const document = await client.authorization.get({
    authorizationHeader: { type: 'Bearer', token: accessToken },
});
const authorization = await createAuthorizationEvaluator(document);
```

The response is `Cache-Control: no-store`. Cache it in your own process with the
lifetime you give token validity: a revoked grant is visible on the next read.
Cache one evaluator per SUBJECT (the document's `identity.id`), never per
process or per client: the evaluator ignores a caller-supplied identity and
always evaluates as the document's subject.

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
// Resolves on allow; throws on denial or missing resource realm data.
```

`options.decisionStrategy` is forwarded; the policy include, exclude and
pending options are refused.

Reach is enforced by the `permissionBinding` node in the permission's
definition policies (`system.default` on every provisioned permission). A
permission whose definition carries no binding check is unrestricted, grants
included, so `allow` can also mean that the permission has no policy layer at
all. Keep `core.permissionsDefaultPolicyAssignment` on for `realm_scope` to
mean anything.

Supply the resource realm explicitly: its id, or `null` for a global resource.
`own` admits the actor's realm only; `ownOrNull` also admits global resources;
`any` admits every realm; `none` admits none. A realm-less actor cannot satisfy
`own` or `ownOrNull`. Master-realm membership adds no bypass.

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

## Document contract

- `identity`: `id`, `type` (`user` or `client`), `realm_id`, `realm_name`, `client_id`.
- `policies`: every policy tree the document references, keyed by the tree's id
  and present once. A node carries its `type`, its configuration keys, `invert`
  and, for a composite, its `children` inline. It is the output of that type's
  validator: no entity columns.
- `permissions`: one entry per held definition with `name`, `realm_id`,
  `client_id`, `decision_strategy`, the definition's `policies` (ids) and its
  `grants`, each with `realm_scope` and the grant's `policies` (ids).
- Nullable fields are required. An empty `policies` list means no restriction at
  that layer. A held permission with no definition is omitted and denies.

`createAuthorizationEvaluator` rejects an unknown version, missing fields, a
reference to an undeclared policy id, an unsupported policy type, a malformed
configuration and a grant policy that contains a permission-binding check. It
rebuilds the server's own binding model and runs the same aggregation and
evaluators, which is what makes the decisions equal.

## Upgrade order

1. Upgrade the Authup server to a release serving `GET /authorization`.
2. Upgrade `@authup/access` and, for typed access, `@authup/core-http-kit`.
3. Replace name-only checks with `createAuthorizationEvaluator(document)`.
4. A resource server must fail closed on a missing or malformed document. Do
   not fall back to introspection's `permissions` array there.
