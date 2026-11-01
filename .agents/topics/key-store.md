# Realm key store

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## Realm Key Store

`auth_keys` is the per-realm key store, discriminated by the JWK `use` column
(`sig` | `enc`, `JWKUse` in `@authup/specs`). Every key is a named entity
(name unique per realm; auto-minted keys are `<use>-<nanoid>`) with a
`KeyStatus`: `active` signs/encrypts and verifies/decrypts, `passive` only
verifies/decrypts, `disabled` neither. Imported signature keys may carry a
`certificate` chain.

**Two ports, one adapter** (`KeyRepositoryAdapter`,
`app/modules/database/repositories/key/`, DI `OAuth2InjectionToken.KeyStore`):

- `IKeyStore` (`core/key/types.ts`) resolves material for signer, verifier and
  cipher. `resolveOrCreate(realmId, use)` returns the highest-priority ACTIVE
  key, mints one only when zero rows exist for `(realm, use)` (sig: RS256,
  enc: 32 oct bytes), and fails loud when rows exist but none is active: never
  re-mint around an admin's kill switch. `resolveById` is a pure read; status
  is the consumer's check.
- Minting is check-then-act on a hot path, so concurrent mints for one
  `(realm, use)` share an in-flight promise and re-read before insert
  (`mintExclusive`). The map is per adapter instance, so `ProvisionerModule`
  must reuse the registered `KeyStore` (it builds its own only in a minimal
  graph). Cross-process duplicates are tolerated (both keys publish and
  verify); a distributed lock was rejected as not worth it.
- `IKeyRepository` (`core/entities/key/types.ts`) is the CRUD surface
  (`checkUniqueness`, `countBlobReferences`, `findHighestPriority`). Entity
  reads never select `decryptionKey`; `save()` KEK-wraps material centrally.
- Minting is eager plus backstop: `KeyProvisioner.ensureForRealm`
  (`core/key/provisioner.ts`) mints sig+enc at realm create and as a startup
  backfill; `resolveOrCreate` covers whatever is left, so MFA needs zero key
  config.

**Lifecycle enforcement:**

- Signer and `RealmCipher.encrypt` use active keys only. The verifier rejects
  a `kid` that is non-sig, `disabled`, or belongs to another realm than the
  payload's `realm_id`. JWKS surfaces publish `active` and `passive` only.
- A key proves the realm, nothing else. Every server-side consumer binds the
  token's subject and session to that realm (`isTokenSubject` /
  `isTokenSubjectActive` / `isTokenSession`, `core/oauth2/token/subject.ts`):
  bearer middleware and MFA ticket (401), refresh grant (`invalid_grant`,
  before consuming), revoke (200, no-op), introspection, end-session.
- Because a foreign-realm signer could mint any subject, IMPORTING signature
  material requires a `KEY_CREATE` grant reaching beyond the actor's realm. A
  `realm_admin` may generate sig keys, never import one.
- `RealmCipher.decrypt` re-reads the key row every call (only the imported
  cipher is cached; status is mutable), so disabling an enc key is an
  immediate, reversible kill switch (`RealmCipherBlobError`, fails closed,
  never 500).
- **Claims-cache trap:** the verifier serves a seen token from the claims cache
  without consulting its key. So disabling or deleting a sig key writes a
  per-key mark (`setKeyInactive`, lifted by `dropKeyInactive`), and `verify()`
  checks the header `kid` against it BEFORE the cache lookup. The mark must
  outlive every claims entry (longest token lifetime, at least the 1h
  fallback); an evicting Redis policy can still drop it early. Rejected:
  re-checking the key row on every hit (uncached read plus KEK unwrap on the
  hottest path) and flushing the claims cache (keyspace scan, cross-realm
  wipe, still racy). With the in-memory cache the mark reaches only the replica
  that handled the change.
- **Adapter-kit (local mode):** reads `GET /realms/<realm_id>/jwks/<kid>` and
  refuses a non-uuid `kid` or `realm_id` first (`..` would hit the flat
  `/jwks/<kid>`, which serves any realm's key). It selects the issuer by
  string `realm_id`, not `iss` (internal URLs see another `iss`). Keys are
  cached per `(realm_id, kid)` in process memory (vouchly `cachedKeys`,
  `jwkCache.ttl` / `.timeout`, `jwkCache: false` opts out), so a disabled key
  reaches an adapter after at most the TTL. Remote mode (a `creator`)
  introspects and re-mints its client token once on 401. Verified results are
  cached only when a cache is passed (served until `exp`, outliving revocation,
  hence no default cache); entries are namespaced
  `authup:<local|remote>:<baseURL>`.

**Management API:**

- `KeyService` + `KeyController` on `/keys` and `/realms/:realmId/keys`,
  gated by `KEY_*` (`admin` any; `realm_admin` read `ownOrNull`, CUD `own`).
- Create is generate vs import by material presence. Generate: RS256/384/512,
  ES256/384/512 (HS* rejected: JWKS cannot publish shared secrets), default
  `priority = max+1`, so generate doubles as rotate. Import: pkcs8+spki for sig
  (see the reach rule above), 32 base64 bytes for enc.
- Update mounts only `name` / `priority` / `status`.
- DELETE of an enc key with blob references answers 409 + `data.references`
  unless `?force=true` (crypto-shred). No re-encrypt sweep exists, so a hard
  block would make such keys undeletable.
- Private material never leaves the server: every read nulls `decryptionKey`.
- **No entity subscriber**, deliberately: `afterInsert` content would carry
  private material onto the realtime bus. `KeyService` records explicit
  metadata-only ENTITY events (#3269: `name` / `use` / `status`, update diff,
  `force`), never key material or certificate, on the default retention and not
  gated by `eventLogEntityEnabled`.

**Imported certificates:**

- Only on an imported signature key, immutable. Every PEM block is parsed;
  the leaf SPKI must equal the imported key (both canonicalized).
  `KeyCertificateError` is transport-neutral and mapped by `KeyService`.
- JWKS publishes `x5c` (leaf-first base64 DER) and `x5t#S256`. A malformed
  stored certificate never breaks JWKS: the key is published without
  certificate fields.

**Trusted CAs:**

- `auth_trust_anchors` is separate from `auth_keys` on purpose: anchors hold
  no operational material and must never reach signer, verifier, cipher,
  provisioner or JWKS selection.
- Realm-bound, unique name, immutable PEM, `enabled` switch; the first
  certificate must be a CA. Replacement is delete + create. Reuses `KEY_*`
  permissions. Enabled anchors are what turn on mTLS client auth (RFC 8705).
- No subscriber; `TrustAnchorService` records the same explicit lifecycle
  events (`refType: trustAnchor`, never certificate bytes), because enabling an
  anchor changes a realm's authentication and must be auditable.

- **`use` hygiene is load-bearing:** the signer supports oct keys, so without
  the filter it could sign with an enc key. Signer and the authorize grant
  (at_hash alg) pass `JWKUse.SIGNATURE`; the verifier rejects a non-sig `kid`;
  both JWKS surfaces filter `use: sig`. An enc key must never appear in JWKS.
- **`RealmCipher`** (`core/key/realm-cipher.ts`): `encrypt(plain, realmId)`
  yields `v1.<key_id>.<payload>`; `decrypt(blob, realmId)` resolves the key by
  the blob's id (rotation never orphans a blob) and mandatorily asserts the
  realm (a skippable assert would get skipped). Consumers: MFA seeds, client
  secrets (clients.md), identity-provider secrets.
- **Identity-provider secrets:** `IdentityProviderRepositoryAdapter` encrypts
  exactly `IDENTITY_PROVIDER_SECRET_ATTRIBUTES` (OAuth2/OIDC `clientSecret`,
  LDAP `password`) in `saveWithEA` and decrypts after extension. Writes never
  sniff: every written value is encrypted, `v1.`-prefixed ones included
  (nothing legitimately echoes a blob, and keeping prefixed values raw would
  bypass encryption). Reads use the prefix: legacy plaintext passes through and
  is encrypted on next save; an undecryptable blob is dropped so the login
  fails closed. The adapter is a lazy factory because the identity module
  boots before oauth2 registers the cipher. All consumers share the one
  `OAuth2InjectionToken.RealmCipher` instance.
- **Optional KEK** (`SECRETS_ENCRYPTION_KEY`, base64 32 bytes): `decryptionKey`
  (RSA private and oct material, never the public key) is stored as
  `wrapped.v1.<blob>` (`core/key/wrap.ts`), unwrapped on read, and plaintext
  rows are lazily wrapped on read, so adding a KEK needs no migration. A
  wrapped row without a KEK fails loud. Unset is plaintext at rest
  (Keycloak/authentik parity) with a production boot warning. Rotation is
  priority + status: new active key, old to passive, then disabled/deleted.
- **Realm delete crypto-shreds:** `auth_keys.realm_id` cascades, so every
  blob under that realm's enc keys becomes unrecoverable.
- **Client secrets reuse the key store unchanged.** Rejected key-side
  redesigns: a per-purpose enc key column (realm plus blob key id suffice), an
  `auth_secrets` envelope table (a JOIN on the `/token` hot path, and released
  MFA blobs would migrate), a re-encrypt sweep on rotation (passive keys keep
  decrypting), renaming `decryptionKey` / `encryptionKey` (wire break on
  `/keys`), moving the KEK wrap out of the adapter (it sits on the hexagonal
  boundary on purpose). Without a KEK an encrypted column in the same database
  is parity, not a defence against a database read.

**UI:** admin console `/keys` (realm-scoped, gated on `KEY_*`) over the kit's
`AKeys` / `AKey` / `AKeyForm`. The delete flow catches the 409 with
`references` and re-confirms before retrying with `force`.
