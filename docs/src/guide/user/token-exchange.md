# Token Exchange

Token exchange lets a trusted client ask Authup for a short-lived token that
carries a narrow, resource-level capability on behalf of someone else. It
implements [RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693) for one
purpose: delegated capability tokens for a resource server.

A backend receives a request from a user, decides that the user may read a
storage bucket, and exchanges the user's access token for a token that says
exactly that. The caller then presents the token to the storage service, which
verifies it locally.

```text
caller ---- request ----> backend (the actor)
                            | decides the caller may do this
                            | POST /token  grant_type=...token-exchange
                            v
                          Authup  ---- capability token ----> backend ----> caller
                                                                              |
caller ---- Bearer <capability token> ----> resource server                   |
                                            verifies against /jwks  <---------+
```

Authup decides only **whether this client may delegate these capability types
to this audience**. Whether the user may read this particular bucket is the
backend's decision, made before it asks.

## Delegation, not impersonation

The client that requests the token is the **actor**. The person or client the
token is about is the **subject**. The actor never becomes the subject:

- No session is created, and no cookie, `id_token` or refresh token is issued.
- The token names the actor in its `act` claim, so a resource server and an
  audit trail can always see who asked.
- The token is restricted to one audience and to the capabilities listed in it.
- The token is never accepted as an Authup access token: the Authup API, the
  server adapters (unless told otherwise, see
  [local verification](#local-verification)) and token introspection all refuse
  it. Introspection reports `active: false`.
- Every successful exchange is recorded in the security event log as
  `tokenExchanged`, with the actor, the subject, the audience, the capabilities,
  the lifetime and the token's `jti`. With event persistence turned off, or if
  writing the row fails, the exchange still succeeds and only a server log line
  remains.
- A policy of subject realm scope `any` can only be written by a grant that
  reaches every realm with no policy narrowing it, since it acts on subjects
  outside the client's own realm.

## Setting up a client

Two things must be in place, and either one alone is not enough.

### 1. Enable the grant on the client

Select **Token exchange** under the client's grant types, or list
`urn:ietf:params:oauth:grant-type:token-exchange` in its `grantTypes`. The grant
is opt-in: a client with an empty `grantTypes` may use every other grant but not
this one.

The client must be confidential. A client with `authMethod: none` is refused
with `invalid_client`.

### 2. Create a policy

A policy states what the client may delegate to one audience. There is at most
one policy per client and audience. Manage them on the client's **Token exchange
policies** tab in the admin console, or through
`/client-token-exchange-policies`.

| Field | Meaning |
|---|---|
| `clientId` | The actor. Fixed once the policy exists. |
| `audience` | The resource server, up to 256 characters without whitespace. Matched exactly, including case. |
| `capabilityTypes` | The capability types the client may delegate, separated by spaces. At least one is required, and there is no wildcard. Each type matches `[a-z][a-z0-9-]{0,63}`. |
| `maxLifetime` | The longest an issued token may live, from 1 to 86400 seconds. |
| `subjectRealmScope` | `own` (the default) allows only subjects of the client's own realm. `any` allows subjects of **every** realm. |

::: warning `any` crosses every realm
With `subjectRealmScope: any` the client can obtain a capability token for a
user or client of any realm, as long as it holds that subject's access token.
Use it only for a client the whole deployment trusts.
:::

### Permissions

Policies are managed under their own permissions:

| Permission | Allows |
|---|---|
| `client_token_exchange_policy_create` | Creating a policy |
| `client_token_exchange_policy_read` | Reading policies |
| `client_token_exchange_policy_update` | Changing a policy |
| `client_token_exchange_policy_delete` | Deleting a policy |

`client_update` is deliberately not enough, and the built-in `realm_admin` role
does not hold these permissions. A policy lets its client mint tokens that
resource servers trust for any capability id, so writing one is a decision over
every resource server of the deployment and not a change local to one realm.
The built-in `admin` role holds all four.

The policy API needs only the permissions above. The **Token exchange policies**
tab sits on the client page of the admin console, which also requires
`client_update`, and it needs one of the read, update or delete permissions.

## Exchanging a token

The request goes to the token endpoint and authenticates the actor the same way
as any other grant (HTTP Basic, `client_id` and `client_secret` in the body, or
a client certificate).

An actor named by its `name` instead of its id, outside the master realm, also
needs `realm_id` or `realm_name` in the body. Without the hint the name resolves
against the master realm and the request answers `invalid_client`.

```bash
curl -X POST 'http://localhost:3000/token' \
  -u 'ACTOR_CLIENT_ID:ACTOR_CLIENT_SECRET' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=urn:ietf:params:oauth:grant-type:token-exchange' \
  -d 'subject_token=SUBJECT_ACCESS_TOKEN' \
  -d 'subject_token_type=urn:ietf:params:oauth:token-type:access_token' \
  -d 'audience=storage' \
  -d 'cap=bucket:reports:read,write' \
  -d 'expires_in=600'
```

| Parameter | Required | Value |
|---|---|---|
| `grant_type` | yes | `urn:ietf:params:oauth:grant-type:token-exchange` |
| `subject_token` | yes | An access token of the subject, issued by this Authup. |
| `subject_token_type` | yes | `urn:ietf:params:oauth:token-type:access_token` |
| `audience` | yes | Exactly one audience, allowed by a policy of the client. |
| `cap` | yes | One or more capability entries, separated by spaces. |
| `requested_token_type` | no | If sent, `urn:ietf:params:oauth:token-type:jwt`. |
| `expires_in` | no | The requested lifetime in seconds. It is clamped to the policy's `maxLifetime`, which is also the default. |
| `realm_id` or `realm_name` | no | The realm of the actor, by id or name. Needed when the actor is named by `name` outside the master realm. |

Every parameter of this grant must be in the form body. One in the query string
is refused with `invalid_request`, because a token in a URL ends up in access
logs. `scope`, `resource`, `actor_token` and `actor_token_type` are not
supported and are refused the same way.

### Capability entries

Each entry has the form `<type>:<id>:<actions>`:

- `type` matches `[a-z][a-z0-9-]{0,63}` and must be listed in the policy.
- `id` matches `[A-Za-z0-9._-]{1,128}`.
- `actions` is a comma-separated list without duplicates, each matching
  `[a-z][a-z0-9-]{0,31}`.

A request carries at most 32 entries and 4096 bytes, without duplicate entries.
Authup checks only the syntax and the type. `id` and `actions` mean whatever the
resource server says they mean.

### Response

```json
{
    "access_token": "<JWT>",
    "issued_token_type": "urn:ietf:params:oauth:token-type:jwt",
    "token_type": "Bearer",
    "expires_in": 600
}
```

There is no `refresh_token`, `id_token` or `scope`.

### Errors

| `error` | Cause |
|---|---|
| `invalid_client` | The actor did not authenticate, or it is a public client. |
| `unauthorized_client` | The grant is not in the client's `grantTypes`. |
| `invalid_request` | A missing or malformed parameter, a wrong token type, invalid `cap` syntax, or a parameter in the query string. |
| `invalid_grant` | The subject token is invalid, expired, revoked, not an access token, bound to a certificate, or its subject is inactive or outside the policy's realm scope, or the client's application access policy denied the subject. |
| `invalid_target` | No policy for this audience, or a capability type the policy does not list. |
| `server_error` | The subject's realm cannot sign the token. See [signing keys](#signing-keys). |

## The issued token

A signed JWT with these claims:

| Claim | Value |
|---|---|
| `iss` | `<publicUrl>/realms/<subject realm name>` |
| `sub`, `sub_kind` | The subject, copied from the subject token. |
| `realm_id`, `realm_name` | The subject's realm. |
| `aud` | The requested audience, as a string. |
| `kind` | `capability_token` |
| `cap` | The capability entries, as an array of strings. |
| `act` | `{ "sub": "<actor client id>", "sub_kind": "client" }` |
| `client_id` | The actor's client id. |
| `iat`, `exp`, `jti` | Issue time, expiry, and a unique id. |

The token does not carry `scope`, `session_id`, `sid`, `nonce` or `cnf`.

### Local verification

A resource server verifies the token itself, against the signing keys Authup
publishes at `/jwks` (every realm) or `/realms/<realm>/jwks` (one realm). It must
check the signature, `exp`, that `aud` is its own audience and that `kind` is
`capability_token`, then read `sub` and `cap`.

With plain [jose](https://github.com/panva/jose):

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwks = createRemoteJWKSet(new URL('http://localhost:3000/jwks'));

const { payload } = await jwtVerify(token, jwks, { audience: 'storage' });

if (payload.kind !== 'capability_token') {
    throw new Error('not a capability token');
}
```

With [`@authup/server-adapter-kit`](../../sdks/javascript/server-adapter/web-middleware.md#capability-tokens),
a verifier built with the `capability` option does the same checks and accepts
nothing else.

Do not use token introspection: it reports every capability token as
`active: false`.

### Signing keys

The token is signed with the signing key of the **subject's** realm, and `/jwks`
publishes asymmetric keys only. A token signed with an `oct` key could not be
verified by anyone, so a realm whose active signing key is `oct` answers
`server_error` and logs
`token exchange requires an asymmetric signing key in realm <name>`.
Give the realm an RSA or EC signing key.

### No revocation

A capability token is not stored. It cannot be revoked, and ending the subject's
session, deactivating the subject or changing a policy does not reach a token
already issued. It stays valid until its `exp`, which may be later than the
expiry of the subject token it was exchanged for. `maxLifetime` is the longest
window this leaves open, so set it to what the use case really needs.
