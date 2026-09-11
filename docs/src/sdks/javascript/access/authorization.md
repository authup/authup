# Authorize resources from introspection

Authenticated token introspection returns an `authorization` snapshot with
`version: 1`. It carries permission-definition policies and the identity's grants,
including each grant's realm reach and policy. The older `permissions` array is a
name-only compatibility view; it is insufficient for resource authorization.

## Evaluate one resource

Use the response from `client.token.introspect(...)` with the resource server's
own credentials. The resource server must be permitted to introspect the token
(for foreign tokens, grant its client `token_introspect` with the needed realm
reach). Validate the response using `@authup/access`:

```typescript
import {
    BuiltInPolicyType,
    createAuthorizationEvaluator,
    PolicyData,
} from '@authup/access';

const response = await client.token.introspect(
    { token: accessToken },
    { authorizationHeaderInherit: true },
);
const authorization = await createAuthorizationEvaluator(response);

await authorization.evaluate({
    name: 'event_read',
    // These identify the PERMISSION definition, not the resource's realm.
    realmId: null,
    clientId: null,
    data: new PolicyData({
        [BuiltInPolicyType.REALM_MATCH]: event.realmId,
        [BuiltInPolicyType.ATTRIBUTES]: event,
    }),
});
// Resolves on allow; throws on denial or missing resource realm data.
```

Supply the resource realm explicitly: its ID, or `null` for a global resource.
`own` admits the actor's realm only; `ownOrNull` also admits global resources;
`any` admits every realm; `none` admits none. A realm-less actor cannot satisfy
`own` or `ownOrNull`. Master-realm membership adds no bypass.

A global permission definition (`realm_id: null`) can carry an `own` grant.
Lookup matches the exact `(name, realm_id, client_id)` namespace; omitted lookup
IDs mean `null`, not a wildcard or fallback. Same-name definitions never borrow
one another's grants.

The consumer accepts access tokens with the `global` OAuth scope, or an authenticated
console session response with that scope. Refresh tokens, ID tokens, MFA tickets
and access tokens without `global` cannot exercise identity grants through it.

The snapshot's identity is authoritative. Supplying different identity data or
policy include/exclude/pending options cannot weaken this evaluator. `evaluate`
requires all named permissions; `evaluateOneOf` accepts any named permission.

## Filter collections before pagination

```typescript
const compiled = await authorization.compile({ name: 'event_read' });

switch (compiled.verdict) {
    case 'allow':
        // No authorization predicate is required.
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

`condition` is a rapiq condition over row attributes. Grant reach targets the
`realmId` column; provide that field in the row model (or map it in the query
adapter). Its predicate and the grant's policy remain one AND term, and complete
grant terms are ORed. Definition policies retain their own nested composition,
inversion and decision strategy.

Call `compile` without `realmMatch` or `attributes` data: those describe the rows
the query has not loaded yet. The snapshot supplies the known actor. Other known
policy data, such as requested attribute names, may be supplied. A pending policy
that cannot be lowered produces `post`, never an unrestricted query. Reject it,
or evaluate the entire candidate set before counting and paging; filtering one
already-paginated page cannot produce an authorized-row total.

## Snapshot contract

The `OAuth2Authorization` type is exported by `@authup/specs`. Its envelope uses
snake_case; policy objects retain the existing Authup policy language, including
`decisionStrategy` and `attributeName`.

- `version`: currently `1`.
- `identity`: `id`, `type`, `realm_id`, `realm_name`, and `client_id`.
- `permissions`: held definitions, each with `name`, `realm_id`, `client_id`, an
  effective definition `policy`, and `grants`.
- Each grant has an explicit `realm_scope` and its own `policy`.
- Nullable fields are required. `policy: null` explicitly means no restriction
  at that layer; an omitted policy is malformed.

A `permissionBinding` node anywhere inside a definition tree evaluates the
identity's grants for that definition. As on the Authup server, definition
policies decide how that binding check combines with other checks. If a definition
has no binding check, the evaluator preserves that configuration. Definitions
absent from the snapshot deny; the snapshot exports held definitions, not the
management API's complete permission catalog.

The factory rejects inactive responses, legacy responses, missing fields,
unknown versions, duplicate namespaces, unsupported policy types and malformed
policy configurations. Version 1 supports the built-in policy types. Inactive
tokens expose neither authorization nor legacy permissions. Treat the snapshot
as authorization at introspection time; use the same refresh/cache lifetime you
use for token validity and grant revocation.

## Upgrade order

1. Upgrade the Authup server to a release exposing `authorization.version: 1`.
   Existing name-only consumers continue receiving `permissions`.
2. Upgrade the resource server's `@authup/access` and, for typed HTTP access,
   `@authup/specs` / `@authup/core-http-kit` to the matching release.
3. Replace name-only checks or direct `PermissionMemoryProvider` construction
   with `await createAuthorizationEvaluator(introspectionResponse)`. Apply
   concrete checks to records and compiled conditions to collection and count
   queries.
4. Require the new snapshot on every enforcement path. During a mixed-version
   rollout, a response from an older server must fail closed; do not fall back
   to the legacy permission array.

`PermissionEvaluator` and `PermissionMemoryProvider` retain their generic policy
semantics. Copying a `realmScope` onto a memory binding alone does not install the
Authup server's permission-binding enforcement.
