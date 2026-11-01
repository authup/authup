# Token endpoint authentication and refresh rotation

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## OAuth2 Token Endpoint Authentication

`/token` authenticates the client by its `authMethod`: `none` identifies with
`client_id`, `secret` presents the shared secret, `tls` presents trusted
certificate evidence. The methods are exclusive; a `tls` client never falls
back to a secret.

### Per-grant requirements

| Grant | Client auth requirement |
|---|---|
| `client_credentials` | `secret` or `tls` only; `none` is rejected. |
| `authorization_code` | Configured method. `client_id` must equal the code's bound client, else `invalid_grant`. |
| `refresh_token` | `secret` / `tls` must authenticate and match the token's bound client (`invalid_grant`). A request without `client_id` resolves the client from the token and passes only if it is still `none`. A bound token also needs the same certificate thumbprint. |
| `password` | Configured method when a client is supplied. `client_id` and the OpenID `aud` are that resolved client's id. The realm hint resolves the user realm and scopes the client leg. |

### Per-client grant allowlist (`grantTypes`)

- `assertClientGrantAllowed` (`core/oauth2/client/grant-type.ts`): a non-null
  `Client.grantTypes` (space- or comma-delimited) must list the grant, else
  `unauthorized_client` (400). `null` allows all.
- Exception: `OPT_IN_GRANT_TYPES` (today the device grant) needs an explicit
  entry; a null or empty column refuses it, so an upgrade never widens an
  existing client.
- Enforced at `/token` after client resolution (refresh included, also on the
  bound-client-from-token path) and in the `/authorize` code-request verifier
  (front door, before consent). Not on `/token/introspect` or `/token/revoke`:
  those are not grants.
- Unknown values are inert (narrow only). A refresh refused here is plain
  `unauthorized_client`, not replay detection: no family revoke.
- System clients list `authorization_code refresh_token`, reasserted by the
  provisioner MERGE.
- `AClientForm` offers only the closed `OAuth2TokenGrant` vocabulary (a typo
  would silently disable a client). Empty selection must submit `null`, never
  `''` (the validator's `.min(3)` refuses it). A stored value outside the enum
  renders as an extra checked option so saving the form never strips it.

### Token endpoint realm resolution

- `password`, `authorization_code` and `refresh_token` share `readRealmHint`
  (`adapters/http/adapters/oauth2/grant-types/utils/realm.ts`): `realm_id ??
  realm_name` (UUID or name), body wins over query, canonicalized at ingress
  since no validator runs on the token body.
- `/realms/:realmId/token` is the same controller; `TokenController.applyRouteRealm`
  stamps the route realm onto the body as `realm_id`, so it wins silently for
  every grant and for introspection's client auth. An unknown route realm is
  404 (not the master fallback). An array body is refused (`invalid_request`):
  it cannot carry the stamp. The mount scopes names only, it is not a
  confinement. `isOAuth2IssuancePath` strips the `/realms/<key>` prefix so the
  console cookie stays denied there. Discovery advertises the flat `/token`.
- Absent or unknown hint resolves to the master realm
  (`IRealmRepository.resolve(hint, true)`); a missing master row is an
  `InternalError`. A bare refresh does no realm lookup.
- The realm scopes NAME resolution only: on `password` the user leg (incl. the
  LDAP `findByProtocol`) and the client leg; on code/refresh the client leg.
  Every realm carries same-named system clients, so an unscoped name lookup
  would pick an arbitrary realm's client. A name absent from the realm is
  `invalid_client`.
- UUID keys skip the realm predicate on purpose: the master fallback makes a
  defaulted realm indistinguishable from an explicit one, so enforcing it would
  break realm-less id logins. The token always carries the identity's own
  `realm_id`.
- HTTP Basic on the management API (#3687, `AuthorizationMiddleware.authenticateBasic`):
  a name is tried in the route realm, then master, on `/realms/:realmId/*`; in
  master alone on flat routes; UUIDs resolve globally. Rejected: refusing a
  name several realms hold (a realm's own `admin` would lock out the master
  admin), strict route-realm scoping (breaks master-admin calls on nested
  mounts), refusing foreign-realm identities (refuses `any` admins).
- `client_credentials` and the `/authorize` verifier's `data.realm_id` keep
  raw, fallback-less realm handling.

### Credential transport

- RFC 6749 §2.3.1: body `client_id`/`client_secret` OR Basic header, never
  both (`invalid_request`). Enforced by `extractClientCredentialsFromRequest`
  (`.../grant-types/utils/credentials.ts`); every client-authenticating grant
  uses it.
- `tls` sends a body `client_id` without a secret plus the proxy certificate
  header; a secret or Basic header for a `tls` client is mixed auth and
  refused.

### `OAuth2ClientAuthenticator`

`core/oauth2/client/authenticator.ts` serves every client-resolving grant:
`none` refuses a supplied secret, `secret` verifies it, `tls` refuses a secret
and validates the certificate against the client realm's enabled trust
anchors. `ClientAuthenticator` (`core/authentication/entities/client/module.ts`)
is the separate management-API Basic authenticator and accepts `secret` only.

### Client-certificate boundary and token binding

- `certificateSource`: `disabled` (default), `standard` (RFC 9440
  `Client-Cert` + optional `Client-Cert-Chain`) or `forwarded`
  (`X-Forwarded-Tls-Client-Cert`, URL-escaped PEM). Exactly one header family,
  never a fallback probe. Enabling it asserts the listener is private and the
  proxy overwrites these headers.
- Validation uses `@peculiar/x509` plus WebCrypto, no Node crypto types.
- **Reflect trap:** `@peculiar/x509` v2 pulls in `tsyringe`, which throws at
  import without `reflect-metadata`. rolldown emits relative imports before
  bare ones, so the entry's own polyfill import lands too late. Both x509
  import sites (`core/client-certificate/module.ts`,
  `adapters/http/request/client-certificate.ts`) import the relative shim
  `core/client-certificate/reflect.ts` first. Do not remove or reorder it.
  Tests use `setupFiles: ['reflect-metadata']`.
- `tls` auth: leaf current, non-CA, clientAuth EKU and digitalSignature when
  present, chains to an enabled realm trust anchor, exactly one URI SAN
  `urn:authup:client:<client-uuid>`. Offline: no AIA/CRL/OCSP.
- `tokenBindingMethod: tls` stamps `cnf: { "x5t#S256": <thumbprint> }` on
  access, refresh and MFA tickets. Binding accepts any current non-CA leaf,
  self-signed included (the handshake proves possession). Refresh must present
  the same thumbprint; rotation keeps the claim.
- Consumers fail closed on a bound token without a matching thumbprint. In
  `@authup/server-adapter-kit` the check lives in `TokenVerifier.verify` itself
  (#3268, `options.certificateThumbprint`, value or lazy provider) and runs on
  every verify, cached results included. A bare `verify(token)` on a bound
  token throws `JWTError`.

### PKCE for public clients

`/authorize` refuses a public client without `code_challenge`; `/token`
re-checks (public client + code without challenge = reject), in case the
client's method changed mid-flow. `code_challenge_method` defaults to `plain`
(RFC 7636 §4.3).

## Refresh Token Rotation & Replay Detection

Every refresh rotates: the presented RT is consumed and a new AT+RT pair
issued. A durable inventory makes replay detection survive cache flushes and
triggers RFC 6819 §5.2.2.3 family revocation. Access-token TTL defaults to
900s to bound the blind spot of local-JWKS verifiers.

### `auth_session_tokens`: one row per issued token

- `SessionTokenEntity` (`adapters/database/domains/session-token/`), port
  `ISessionTokenRepository` (`core/oauth2/session-token/`), adapter in
  `app/modules/oauth2/repositories/session-token/`.
- `id` is the jti. `session_id` and `client_id` are FKs with `ON DELETE
  CASCADE`. `refresh_token_id` is lineage only, no self-FK. `client_id` is the
  per-application attribution (null when the mint had no client).
- No subscriber: not cached, not realtime.

### The DB row is the single authority for refresh validity

- The refresh grant verifies with `skipActiveCheck: true` and decides on the
  row, so replay reaction is deterministic whatever the cache holds. Do not
  drop `skipActiveCheck` without re-adding a cache-based replay reaction.
- Therefore `/token/revoke` must soft-revoke the row too (`OAuth2TokenRevoker`
  with `sessionTokenRepository`), not only blocklist the cache.
- `/token/revoke` verifies with `{ ignoreExpiry: true, skipActiveCheck: true }`
  (RFC 7009 §2.2): revoking an expired token must succeed, or a client's
  revoke-then-clear logout aborts and leaves the row live.

### Grant flow (`core/oauth2/grant-types/refresh-token.ts`)

- Reject (`invalid_grant`) a missing row, wrong kind, `revokedAt` set, or a
  session not bound to the token's subject and realm (`isTokenSession`,
  checked before anything is consumed). Then `markRefreshConsumed` is an
  atomic conditional UPDATE; losing it means replay (`revokeFamily`) unless the
  grace window applies.
- The old jti is cache-blocklisted only (`setInactive`), not DB-revoked, so
  the grace window keeps working.
- **Session deleted mid-issue (#3435):** a concurrent revoke, logout or sweep
  can delete the session between lookup and insert. The adapter maps the FK
  violation (`isDatabaseForeignKeyViolationError`) to
  `SessionTokenRelationMissingError`, and the refresh grant re-raises it as
  `invalid_grant`; a 500 would read as retryable while the presented token is
  already consumed. Only that condition is translated. The error names no
  relation on purpose: sqlite cannot tell which FK failed, and both parents
  cascade, so the answer is the same. A pre-issue re-read was rejected: it
  narrows nothing.
- **A refresh never re-attributes the session's device.** `auth_sessions`
  `ip_address` / `user_agent` are pinned at creation; refresh slides only
  `refreshedAt` / `seenAt` / `expiresAt`. The refreshing request may be a
  server-side renderer, not the device. The new tokens and their inventory rows
  carry the request's values (`options.userAgent ?? session.userAgent`),
  falling back to the session without request context.
- **Trap:** the row column is camelCase `userAgent`, the payload claim is
  snake_case `user_agent`. `OAuth2TokenPayload` has an index signature, so
  reading the wrong key type-checks and writes empty strings.
- A relocated device and a renderer refresh look identical at `/token`;
  telling them apart needs the renderer to forward `X-Forwarded-For` under a
  bounded `trustProxy`.

### Family revoke = the `auth_sessions` row, never a wider SSO session

`revokeFamily` soft-revokes every row of the session, blocklists each jti with
its real expiry (the 1h fallback TTL would let a 3-day RT reappear as active in
introspection), then `sessionManager.revoke(sessionId)` deletes the session and
sends back-channel logout (audience read before the cascade). Surfaced as
`invalid_grant`.

### Grace period (`tokenRefreshGracePeriod`, seconds, default 0 = strict)

A consumed RT is accepted again only if grace > 0, the row is unrevoked,
`now - consumedAt <= grace`, and it is the chain tip (`hasConsumedChild` is
false). The chain-tip check is load-bearing: without it a stolen older RT
would fork a parallel chain instead of tripping replay. A graced reuse mints a
fresh pair.

### Cleanup

`components/oauth2-cleaner` deletes rows with `expiresAt < now` every minute;
a deleted session cascades its rows.
