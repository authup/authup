# System clients and client secrets

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

### Per-Realm System Clients (`admin-console`, `account-console`)

Every realm auto-provisions two public clients (`SYSTEM_CLIENT_DEFINITIONS`,
`core/entities/client/system-clients.ts`; names in `@authup/core-kit`):
`admin-console` (a standalone-hosted dist may override it via
`window.__AUTHUP__.clientId`) and `account-console`. Separate clients give
per-app admission control (`accessPolicyId`), per-token attribution
(`auth_session_tokens.client_id`) and per-app grant/redirect/logout lists.

- **No shared client for downstream RPs.** Rejected: default-on,
  auto-consenting attack surface in every realm. RPs register their own
  (per realm, or every realm via a wildcard realm entry). A legacy `web` row
  is an ordinary, non-refreshed client; `web` is a creatable name.
- **Attributes** (`buildSystemClientAttributes`): `authMethod: none`,
  `tokenBindingMethod: none`, `builtIn`, `active`, `grantTypes:
  authorization_code refresh_token`, and `redirectUri` /
  `postLogoutRedirectUri` = one `<origin>/**` per app origin, the same set for
  both clients. A separately hosted surface adds its origin to
  `trustedOrigins`, never to the row. `displayName` is seeded at create only.
- **`isSimpleMatch` (`@authup/kit`)**: `*` matches a run not crossing `/`,
  `**` matches the rest, a separator before a trailing wildcard is optional
  (`<origin>/**` covers the bare origin). The `/` boundary keeps a host
  wildcard inside the host (`https://*.example.com/**` does not match
  `a.example.com.evil.test` or `a.example.com@evil.test`). Case sensitive:
  canonicalize URLs first. It is regex-free with one backtrack point (no
  ReDoS); the backtracking is easy to break, so keep the property test
  against the recursive reference when touching it (#3394).
- **Scopes** (`SYSTEM_CLIENT_SCOPE_NAMES` = `global`, `openid`) are
  `auth_client_scopes` rows, the only place a client's scopes exist (#3355,
  no `Client.scope` column). Binding is additive: admin-bound scopes survive.
- **App origins** (`getAppOrigins`, `app/modules/config/app-origins.ts`):
  publicUrl's origin plus `trustedOrigins`. A bare `host[:port]` entry expands
  to both http and https (`expandToOrigins`, `@authup/server-config`); the
  expansion happens once at config normalization, so `getAppOrigins` never
  re-expands.
- **`TRUSTED_ORIGINS` is security-sensitive**: every system client is
  `builtIn` (auto-consent) with `global` scope, so any listed origin can obtain
  a full-permission user token. It does not drive CORS. Non-production seeds
  `http://localhost:5173` (`DEVELOPMENT_ORIGIN`) for the standalone vite
  console.
- **Provisioning** is one mechanism, `SystemClientProvisioner.ensureForRealm`,
  run at startup for every realm (MERGE, so config changes propagate) and by
  `RealmService.save()` on realm CREATE through the never-fail, ungated
  `realmProvisioners` (order: system clients, keys, wildcard). The attribute
  MERGE is dirty-checked; scope binding always runs. A non-built-in row
  squatting a reserved name is taken over with a warning.
- **The builder's attributes reassert on every boot, silently.** Writing
  `name`, `realmId`, `authMethod`, `tokenBindingMethod`, `builtIn`, `active`,
  `grantTypes`, `redirectUri` or `postLogoutRedirectUri` via the API or a
  provisioning file is reverted at next start without error. Durable
  extensions: `displayName`, `description`, `baseUrl`,
  `backchannelLogoutUri`, `accessPolicyId` (deliberately not in the builder),
  and junction rows (`ensureScopes` never deletes).
- **Guardrails:** `CLIENT_RESERVED_NAMES` (`system`, `admin-console`,
  `account-console`) blocks API create/rename onto them; an existing `builtIn`
  row keeping its name may be edited. The validator strips `builtIn`, so only
  provisioned clients are `builtIn`, and only `builtIn` clients auto-consent.

### Client secret storage and rotation

`ClientSecretMode` (`plain | hashed | encrypted`, `@authup/core-kit`) is stored
as two exclusive booleans `secretHashed` / `secretEncrypted`
(`getClientSecretMode` maps them). Both set answers 400
(`assertSecretModeExclusive`, in `save()` and the provisioning synchronizer).
Encrypted values are realm-cipher blobs `v1.<key_id>.<payload>` under the
client realm's enc key (see key-store.md). A `secretStorage` enum column was
deferred: it costs a data migration and a field rename.

- **The mode is create-time only.** `ClientValidator` mounts both flags for
  `CREATE` / `PROVISIONING`; updates strip them. Flipping a flag without
  re-protecting would mark a plaintext as hashed and break authentication.
- **`POST /clients/:id/secret` (`rotateSecret`) is the only writer of a
  non-plain secret.** Body `{ secret?, mode? }` (`ClientSecretRotateValidator`,
  3-256 chars). Missing secret is generated (`generateSecret`, nanoid 64);
  missing mode keeps the current one, so an empty-body rotation of a legacy
  `secretEncrypted` row (plaintext under the flag) lands in real encrypted
  mode. Response `{ data, meta: { secret } }` shows the plaintext once.
  Non-`secret` clients answer 400.
- **Gate:** `CLIENT_UPDATE` with realm reach on the row, else for the client
  itself `CLIENT_SELF_MANAGE`, evaluated over `{ secret }` plus the flags
  only when the mode changes, so the self-manage denylist refuses a mode
  change but allows a same-mode rotation. The pre-gate runs before the
  `authMethod` check and validation.
- **Create/update `secret` is always plaintext.** Update accepts it only on a
  plain client; on hashed/encrypted it answers 400 naming the endpoint, `null`
  included (else a silent regenerate). Switching `authMethod` away from
  `secret` clears secret and flags, which is why there is no
  `DELETE /clients/:id/secret`.
- **`protect()` never sniffs its input.** Hashed mode hashes, encrypted
  encrypts (needs a wired cipher and a realm, else throws), plain stores as
  is. Rejected: `isBCryptHash ? keep : hash`, which stored a bcrypt-looking
  plaintext raw where it could never verify.
- **`verify()`**: hashed is bcrypt compare; encrypted AND
  `isRealmCipherBlob` decrypts then compares; anything else compares as
  plain. `isRealmCipherBlob` (`core/key/realm-cipher.ts`, `v1.` prefix) is the
  one discriminator, so a legacy flagged plaintext still verifies. A
  `RealmCipherBlobError` fails the credential closed; other errors surface.
  Plain compares run `timingSafeEqual` over SHA-256 digests: a length check
  would leak the secret's length, `===` is a timing oracle.
- **The one sniff is provisioning** (`ClientProvisioningSynchronizer.protectSecret`):
  a file may carry a raw value or an already protected one (bcrypt hash /
  cipher blob) so GitOps need not hold plaintext; raw values are protected
  before the save. Required because the synchronizer writes straight to the
  repository, bypassing the credential service. The default `system` client is
  plain and not routed through `protect` (no realm exists yet).
- **Audit:** one `CLIENT_SECRET_ROTATED` row (`IDENTITY` scope, `refType:
  client`, `data: { kind: <mode> }`). Never the secret in any form.
- **Read side (#3351):** `secretReadGate` gates every stored form alike
  (plaintext, bcrypt hash, cipher blob): a hash is offline-crackable (#3328),
  and the encrypted flag earns no exemption. Realm reach narrows the list WHERE and
  `getOne`; junction `fields[client]` positions redact. `revealSecret` then
  decrypts a blob in place for a permitted reader; an undecryptable blob or a
  missing cipher drops the field, never 500, never ciphertext.
- **One cipher instance**, `OAuth2InjectionToken.RealmCipher`
  (`app/modules/oauth2/module.ts`), used by MFA seeds, the client service, the
  `/token` client authenticator, Basic auth and provisioning (which builds its
  own only in a minimal graph). One instance so the per-key cipher cache
  works. Without a cipher, protect refuses encrypted mode and verify of a blob
  is false.
- **Encrypted secrets follow the enc key's lifecycle.**
  `countBlobReferences` counts `auth_clients.secret`, so `DELETE /keys/:id`
  answers 409; `?force=true` crypto-shreds and those clients need a rotation.
  Disabling the key stops them authenticating until re-enabled; a passive key
  still decrypts. This blast radius is why encrypted mode is opt-in and why
  production should set `SECRETS_ENCRYPTION_KEY`.
- **`auth_clients.secret` is `varchar(512)`** (a 256-char plaintext encrypts
  to about 420). Its widening in
  `1788782400000-WidenClientSecretAndGlobalUniqueness` is hand-written: a
  generated length change would `DROP COLUMN` and empty every secret.
  `down()` fails on longer values; rotate encrypted clients away first.
- **Protect before the transaction.** `rotateSecret` runs `protect()` first
  (encryption reads `auth_keys` on another pooled connection, which deadlocks
  under a pinned `FOR UPDATE`, #3526/#3539, invisible on sqlite), then
  lock-reads the fresh row inside `repository.transaction`, re-checks
  `authMethod` (a concurrent switch to `none` must stay cleared) and writes.
  The update path stays plain-only for the same reason.
- **Kit:** `AClientForm` shows the secret input and hashed switch on create;
  on edit only for plain clients, sending `secret` only when changed and never
  `secretHashed`. `AClientSecretRotate` is the rotation dialog, opening on the
  current mode. The create default stays plain.
