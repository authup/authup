<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/access</h1>

<p align="center">
    <b>Evaluate Authup permissions and policies in your own process, with the same engine the server uses.</b><br>
    Your API decides "may this token update this row?" locally, instead of asking Authup on every request.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/access"><img src="https://img.shields.io/npm/v/@authup/access" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/access?

In Authup a grant is more than a permission name. Each grant carries a realm reach (`own`, `ownOrNull`, `any`) and optional policies (attributes, identity, time, date, realm match, composites), and a permission can carry policies of its own. Re-implementing that model in every API that receives an Authup token is how the API and the server end up disagreeing. This package is the model itself: the server-core service evaluates every management API request with it, and so can you.

| Concern | Without it | With it |
|---|---|---|
| **Permission checks** | `if (token.permissions.includes('user_update'))`, which ignores realm reach and policies | `evaluateRecord(evaluator, { name: 'user_update', realm })` answers the way the server would |
| **Realm reach** | Hand-written tenant comparisons per route | `own`, `ownOrNull` and `any` are evaluated per grant against the record's realm |
| **Policies** | A second, partial implementation of attribute, time and identity rules | The built-in policy evaluators, plus your own types through `PolicyEngine` |
| **Stale data** | Silent denials after a permission is added on the server | `AuthorizationCatalogStaleError` says the copy is old, so you refetch |
| **List queries** | Fetch everything, then filter in memory | `compile()` lowers a decision to a rapiq condition you can push into the query |

## Installation

```shell
npm install @authup/access
```

ESM only. Node.js `>=26.0.0`. No peer dependencies; the policy engine runs in a browser as well.

## Usage

### Evaluate permissions you define

```typescript
import {
    BuiltInPolicyType,
    PermissionEvaluator,
    PermissionMemoryProvider,
    defineAttributesPolicy,
    definePolicyData,
} from '@authup/access';

const evaluator = new PermissionEvaluator({
    provider: new PermissionMemoryProvider([
        { permission: { name: 'report_read' } },
        {
            permission: { name: 'report_update' },
            policies: [defineAttributesPolicy({ type: BuiltInPolicyType.ATTRIBUTES, query: { ownerId: 'u1' } })],
        },
    ]),
});

await evaluator.evaluate({ name: 'report_read' });

await evaluator.evaluate({
    name: 'report_update',
    data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { ownerId: 'u1' } }),
});

await evaluator.preEvaluate({ name: 'report_update' }); // passes: the row is not known yet
```

- `evaluate` resolves or throws a `PermissionError` (`isPermissionError`). With several names it needs all of them; `evaluateOneOf` needs one.
- `preEvaluate` is the gate before the data exists: a policy whose data key is missing counts as passed, and only a policy that already fails denies. `evaluate` with the same missing key denies.
- A permission the provider does not know denies.
- An `attributes` policy's `query` is a MongoDB-style filter (`{ ownerId: 'u1' }`, `{ age: { $gte: 18 } }`) matched against the `attributes` data key.

### Decide from Authup's catalog

A resource server reads the identity-free catalog once (`GET /authorization`, with its own client credentials and `permission_read`), and takes the grants and the identity from the introspection of the token it received (`POST /token/introspect`: `permissions`, `sub`, `sub_kind`, `realm_id`, `realm_name`):

```typescript
import {
    createAuthorizationEvaluator,
    evaluateRecord,
    isAuthorizationCatalogStaleError,
    reachesRecord,
} from '@authup/access';

declare const catalog: unknown;
declare const grants: unknown;
declare function refetchCatalog(): Promise<unknown>;

const identity = {
    type: 'user',
    id: '7c9e6679-7425-40de-944b-e07fc1f099d6',
    realmId: '4c8e0f9e-6c0a-4b1e-9d31-2a6f0b1c7e11',
};

let evaluator;
try {
    evaluator = await createAuthorizationEvaluator({ catalog, grants, identity });
} catch (error) {
    if (!isAuthorizationCatalogStaleError(error)) {
        throw error;
    }

    evaluator = await createAuthorizationEvaluator({ catalog: await refetchCatalog(), grants, identity });
}

await evaluateRecord(evaluator, {
    name: 'user_update',
    realm: '4c8e0f9e-6c0a-4b1e-9d31-2a6f0b1c7e11',
    data: { attributes: { name: 'alice' } },
});

const canDelete = await reachesRecord(evaluator, { name: 'user_delete', realm: null });
```

- `catalog` and `grants` are validated, so you can pass the parsed response bodies as they are. A malformed document throws.
- A grant naming a permission or a policy the catalog lacks throws `AuthorizationCatalogStaleError`: your catalog is older than the grant. Refetch and build again.
- A definition the server could not project arrives with `policies: null`, and a policy tree your copy cannot project (an unknown type, a configuration its validator refuses) denies the permissions that use it. Neither throws, and other permissions are unaffected.
- Without an `identity` only definitions whose policies need no identity can pass. Grants without an identity are refused.
- Custom policy types need both halves: `createAuthorizationEvaluator(input, { validators, evaluators })`, each replacing the built-in registry (spread `PolicyDefaultValidators` / `PolicyDefaultEvaluators` to extend it).

### Check one record

`evaluateRecord`, `evaluateRecordOneOf`, `reachesRecord`, `reachesRecordOneOf` and `evaluateRecordUpdate` take the record's realm explicitly:

| `realm` | Means |
|---|---|
| `'<realm id>'` | A row of that realm |
| `null` | A global row |
| `['<id>', null]` | A row spanning several realms; every one must be reached |
| `undefined` | Throws: a missing realm is a bug, never "global" |

- `realmId` and `clientId` name the realm and client OWNING the permission definition, not the record's realm. Absent means a global definition; an owned one is unreachable without them.
- `data` is a `PolicyData` or a plain record and must not carry `realmMatch` itself; the helper sets it from `realm`. It is cloned, never written to.
- `reachesRecord*` returns `false` for a `PermissionError` and rethrows anything else.
- `evaluateRecordUpdate(evaluator, { name, current, next })` evaluates the stored row and the updated row, so an update can neither move a row into reach nor out of it.
- `hasUnboundedReach(evaluator, name, owner?)` is true when `compile` answers `allow`: an `any` grant with no narrowing policy. Pass `{ realmId, clientId }` as `owner` for an owned definition.

### Use the batch check answer

A public client (a browser app) holds no secret, so it cannot read the catalog. It asks `POST /authorization/check` for its own verdicts instead and gates its UI with them:

```typescript
import { createAuthorizationCheckEvaluator, reachesRecord } from '@authup/access';

declare const permissions: unknown; // the response body

const evaluator = await createAuthorizationCheckEvaluator({
    permissions,
    identity: {
        type: 'user',
        id: '7c9e6679-7425-40de-944b-e07fc1f099d6',
        realmId: '4c8e0f9e-6c0a-4b1e-9d31-2a6f0b1c7e11',
        realmName: 'acme',
    },
});

const canEdit = await reachesRecord(evaluator, { name: 'user_update', realm: 'acme' });

// a definition owned by a realm or a client is named with its owner
const canExport = await reachesRecord(evaluator, {
    name: 'report_export',
    realmId: '4c8e0f9e-6c0a-4b1e-9d31-2a6f0b1c7e11',
    clientId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    realm: 'acme',
});
```

The answer lists each permission definition, identified by `name`, `realmId` and `clientId`, with the target realms it holds in; a missing entry is a denial. Which owned definitions it covers is the request's `realms` / `clients` selectors: `own`, `ownOrNull`, `granted` (the owner of every definition the identity holds a grant of, on top of `ownOrNull`) or a list of ids. A record realm matches its own entry, or the identity's own realm by id or by name. A realm the request did not ask about denies. The result is an upper bound: the server still decides each row.

## Realm reach

| `realmScope` | Reaches |
|---|---|
| `none` | Nothing |
| `own` (default) | Rows of the identity's own realm |
| `ownOrNull` | Own realm and global rows (`realm: null`) |
| `any` | Every realm and global rows |

A grant without a `realmScope` is `own`. An identity without a realm reaches nothing below `any`.

## Policy types

| `BuiltInPolicyType` | Value | Decides on |
|---|---|---|
| `ATTRIBUTES` | `attributes` | A MongoDB-style `query` over the `attributes` data |
| `ATTRIBUTE_NAMES` | `attributeNames` | Which field `names` the data may carry (with `invert`, a denylist) |
| `IDENTITY` | `identity` | The identity's `types` (`user`, `client`) |
| `REALM_MATCH` | `realmMatch` | The record realm against the identity's realm |
| `DATE` | `date` | A `start` / `end` date window |
| `TIME` | `time` | A `start` / `end` time of day (`HH:MM`), optionally limited by `interval` with `dayOfWeek`, `dayOfMonth` or `dayOfYear` |
| `COMPOSITE` | `composite` | Its `children`, combined `unanimous`, `affirmative` or `consensus` |
| `PERMISSION_BINDING` | `permissionBinding` | Whether the identity holds a grant that reaches the record |

Every policy accepts `invert`. Policy data is a `PolicyData` bag keyed by the type names (`attributes`, `identity`, `realmMatch`, ...); `definePolicyData` builds one with the well-known keys type-checked.

## API

| Export | Kind | Purpose |
|---|---|---|
| `PermissionEvaluator`, `IPermissionEvaluator` | class, interface | `evaluate`, `evaluateOneOf`, `preEvaluate`, `preEvaluateOneOf`, `compile` |
| `PermissionMemoryProvider`, `IPermissionProvider` | class, interface | Where an evaluator looks permission definitions up |
| `evaluateRecord`, `evaluateRecordOneOf`, `reachesRecord`, `reachesRecordOneOf`, `evaluateRecordUpdate`, `hasUnboundedReach` | function | Single-record checks with an explicit realm |
| `createAuthorizationEvaluator` | function | An evaluator over the catalog, the introspected grants and the identity |
| `createAuthorizationCheckEvaluator` | function | An evaluator over the batch check answer |
| `AuthorizationCatalogStaleError`, `isAuthorizationCatalogStaleError` | class, function | The refetch signal |
| `projectAuthorizationPolicy`, `AUTHORIZATION_POLICY_WITHHELD_TYPE` | function, const | The wire projection of a policy tree, and the node type the server sends in place of a tree the caller may not read |
| `AuthorizationCatalog`, `AuthorizationGrant`, `AuthorizationCheckPermissions`, `authorizationCatalogSchema`, ... | type, schema | Wire types and their zod schemas |
| `PolicyEngine`, `IPolicyEngine`, `IPolicyEvaluator` | class, interface | Evaluate a policy tree; `registerEvaluator(type, evaluator)` adds a type |
| `PolicyDefaultEvaluators`, `PolicyDefaultValidators` | const | The built-in registries |
| `BuiltInPolicyType`, `SystemPolicyName` | enum, const | Policy type names; the names of the provisioned system policies (`system.default`, ...) |
| `<Type>Policy`, `<Type>PolicyEvaluator`, `<Type>PolicyValidator` | type, class | One trio per built-in policy type |
| `IdentityPermissionBindingPolicyEvaluator` | class | Decides `permissionBinding` from the grants carried on the identity data |
| `PolicyData`, `definePolicyData`, `PolicyInput`, `IdentityPolicyData` | class, function, type | The evaluation data bag |
| `RealmScope`, `realmScopeMatches`, `normalizeRealmScope`, `compareRealmScope`, `minRealmScope`, `maxRealmScope` | enum, function | Realm reach |
| `aggregatePermissionPolicyBindings`, `grantDominates`, `buildPermissionKey` | function | Grant aggregation and comparison |
| `PermissionError`, `PolicyError`, `isPermissionError`, `isPolicyError` | class, function | Errors (both extend `AuthupError` from `@authup/errors`) |
| `createPolicyTransitionCollector`, `PolicyTransitionSink` | function, type | Collect the instant at which a `date` or `time` verdict could change |

## Notes

- **Realm reach is enforced by the `permissionBinding` policy.** A `PermissionEvaluator` over `PermissionMemoryProvider` ignores a binding's `realmScope`, and its default `permissionBinding` evaluator always passes. `createAuthorizationEvaluator` wires `IdentityPermissionBindingPolicyEvaluator`, and Authup binds `system.default` (which contains a `permissionBinding` policy) to every permission it creates, so that is where reach is checked. Build from the catalog when reach matters.
- **Identity data uses UUIDs.** The identity data validator checks `id`, `clientId` and `realmId` as UUIDs; any other value makes every `identity` policy fail.
- **`compile` can answer `post`.** That means the decision cannot be expressed as a query condition; evaluate every candidate row before you page, or the page and its total are wrong.
- **Each `PolicyEngine` owns its evaluator map.** The constructor copies the map, so `registerEvaluator` on one engine never reaches another.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
