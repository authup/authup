# MFA authenticators and amr/acr

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## MFA: Authenticator Devices

`auth_user_authenticators` holds one row per enrolled device, discriminated by
`kind` (`UserAuthenticatorKind` in `@authup/core-kit`: `totp`, `recovery`,
`email`, `webauthn`). Service and ports in `core/entities/user-authenticator/`,
adapter in `app/modules/database/repositories/user-authenticator/`. The entity
has no subscriber (not cached, not realtime).

**Kinds.**

- **TOTP**: the seed must be recoverable, so it is AES-256-GCM encrypted at rest
  through the realm cipher (`cipher.encrypt(seed, realmId)`, a
  `v1.<key_id>.<blob>`; see `key-store.md`). Keys mint per realm on first use,
  so `MFA_ENABLED=true` needs no key configuration. A blob naming an unknown or
  foreign key is a plain verification failure, never a 500.
- **Recovery**: bcrypt-hashed codes in a JSON `{hash, usedAt}[]` blob on one row;
  re-enrolling replaces the set; single use via `usedAt`.
- **Email OTP**: the row marks the mailbox as a factor (confirmed on create). The
  code is transient: bcrypt-hashed in the cache (`mfaEmailCode:<user_id>`,
  10 min), single use. A code is mailed only to a user holding a CONFIRMED email
  factor. `POST /authenticators/challenge/send` answers a uniform 200 (no
  enrollment oracle), except the 60 s per-user send cooldown, which answers 429
  `MfaThrottledError`.
- **WebAuthn**: a SECOND factor only (passkey-first login is out of scope). The
  relying party (`rpId`/`origin`) is derived from `publicUrl`, because every
  RP's login runs on the hosted IdP origin; no `publicUrl` means
  `MFA_NOT_CONFIGURABLE`. Challenge nonces are cached
  (`mfaWebauthnReg:` / `mfaWebauthnAuth:<user_id>`, 5 min); verify bumps the
  stored signature `counter` (replay defense).

**Secret handling.**

- `secret` and `codes` are `select: false`; only `findOneWithSecretsById` /
  `findAllWithSecretsByUser` re-select them (verification paths). Every read
  surface nulls both.
- The raw seed / URI / QR / codes appear exactly once, in the enroll response
  `{ data, meta: { secret?, uri?, qr?, codes?, webauthn? } }`.
- The `findMany` adapter force-selects `userId` through `applyRealmScopeSelect`.

**Enrollment** is two-step except recovery: enroll creates an unconfirmed row
plus provisioning material, `POST .../:deviceId/confirm` with a valid code
confirms it. Only confirmed devices satisfy challenges. Own devices are
ungated; others' need `USER_AUTHENTICATOR_*` with per-row record checks. A
foreign device id under another user's route is 404. The first confirmed
factor revokes the user's other sessions, federated ones too, as none proved
one (the enrolling one is kept; another actor's enrollment keeps none).
A session that revocation's listing misses (inserted by a password grant or
a session-less code redemption that decided before the factor was stored) is
re-checked after its insert (`revokeIfSecondFactorOwed`) and refused.

**Enrolling FOR another user is email only, for every actor** (`ValidationError`
otherwise). Every other kind would let the enroller hold the factor: TOTP and
recovery return the secret, and a WebAuthn ceremony can be completed on the
enroller's own authenticator. An admin resets a factor by deleting it.
`AUserAuthenticatorEnroll` mirrors this (`canOfferKind`).

**Enforcement: three server-side chokepoints.**

1. **`/authorize`**: the proof is session-bound (`auth_sessions.mfa_at`).
   `OAuth2AuthorizationGate` (via the `IUserAuthenticatorChallengeProvider`
   seam) throws `OAuth2MfaRequiredError` (`mfa_required`, deliberately not
   `login_required`) when the user holds a confirmed device and the session has
   no `mfaAt`, or `enrollmentRequired` under `mfaRequired`.
   `GET /authenticators/challenge` reports `{ required, enrollmentRequired,
   kinds, challenge? }`.
2. **Password grant** (`HTTPPasswordGrant.verifySecondFactor`): a user with a
   confirmed device must send a valid `otp` (classified by
   `guessUserAuthenticatorKindByResponse`), else `mfa_required` with
   `data.kinds`. Success stamps the created session. A device-less user passes
   (they could never enroll otherwise); `mfaRequired` is enforced at
   `/authorize`.
3. **User Basic auth**: a Basic credential carries no factor, so a user with a
   confirmed device is left anonymous (`hasConfirmedByUser`, wired only while
   `mfaEnabled`).

**The password grant is the single chokepoint for credential login.**
`LoginForm` catches `mfa_required` and resubmits the credentials WITH the code,
so no token is issued before the factor. A post-login challenge would issue a
credential-only bearer, which is a full-API MFA bypass. The enforcement paths
call `challenge(userId, { issueMaterial: false })` so they never mint a
WebAuthn nonce.

**Intentional enforcement boundaries (#3251).**

- A session with `authMethod: ext` (federated) owes no local factor or inline
  enrollment, unless the application asked with `acr_values=urn:authup:mfa`
  (then the step-up applies, since a local factor is the only proof authup can
  produce). The challenge endpoint takes the request's `acrValues` and decides;
  the kit renders what it answers. Rationale: the local factor belongs to a
  local credential (#3454).
- `mfaEnabled=false` downgrades every user, enrolled ones included; device rows
  survive and reactivate.
- The device-less password-grant pass-through is the bootstrap for inline
  enrollment. A client that must require enrollment before a token uses the
  code flow and drops `password` from its `grantTypes`.
- Operator-facing: `docs/src/guide/deployment/configuration-server-core-mfa.md`.

**Verifying the upstream's assurance (#3477).** An OAuth2/OIDC provider may
carry `requiredAmr` / `requiredAcr` (extra attributes, comma or space
separated; both null trusts the provider unconditionally).

- `requiredAmr` is a DISJUNCTION (any listed value passes; the form label says
  "any of"). `requiredAcr` is membership of `acr`. Values are the operator's;
  authup cannot normalize them.
- Enforced by `assertIdentityProviderAssurance`
  (`core/identity/provider/authentication/protocols/oauth2/assurance.ts`) inside
  `IdentityProviderOAuth2Authenticator.resolveIdentity`, before
  `accountManager.save`: a refusal provisions no user, and the account-link
  flow shares the gate. Not in the identity builder, which presets override.
- Fails CLOSED once an allow-list is set: no `id_token`, missing claims or an
  undecodable token are refused.
- The `id_token` is DECODED, not signature-verified: it comes from the server's
  own back-channel call to the configured `tokenUrl` (OIDC Core 3.1.3.7 item 6).
  The audience is still checked: `aud` must be exactly the provider's
  `clientId`, and an `azp` must name it (items 3 and 5); a membership test
  would accept multi-audience tokens. Rejected: JWKS verification (does not
  apply to this path), `iss` (needs a column and would fail open), `exp`
  (clock-skew refusals), `nonce` (the state cookie is stronger).
- `requiredAcr` is also sent outbound as `acr_values`
  (`buildIdentityProviderAcrValues`), which is voluntary; only the inbound check
  guarantees it.
- `OAuth2FederatedLoginService.complete` maps `IdentityProviderAssuranceError`
  to `access_denied`; the reason goes to the log only. The error has no
  dedicated `ErrorCode`, so `isIdentityProviderAssuranceError` must stay
  marker-only (a code fallback would match every `ValidationError`).

**MFA-pending login ticket (#3242)** for kinds that cannot ride one grant POST
(email, WebAuthn).

- On `mfa_required` with an interactive kind, the grant creates a pending
  session (`mfaAt: null`, expiry = ticket lifetime) and returns `mfa_token` +
  `mfa_token_expires_in` in the error data, never a token pair. TOTP/recovery
  only users get no ticket.
- The ticket is `OAuth2TokenKind.MFA`, issued by `OAuth2MfaTokenIssuer`
  (`mfaTicketMaxAge`, default 600 s). The authorization middleware requires
  `kind === access_token`, so the ticket is denied on the whole API; it is
  stashed on its own request slot (`setRequestMfaLoginTicket`), and only the
  challenge controller accepts it.
- A ticket-authenticated verify calls `OAuth2MfaLoginService.complete()`:
  extend the session, mint AT+RT, blocklist the ticket (single use), record
  `LOGIN`. The kit applies the grant with `store.loginWithTokenGrant()`.
- A pending session has `mfaAt: null`, so a replayed ticket still hits the
  `/authorize` backstop.
- `@authup/server-adapter-kit` refuses any bearer whose `kind` is present and
  not `access_token`, since refresh tokens and tickets share signing keys.

**Verify unit of work (#3237).** `UserAuthenticatorService.verify()` holds a
per-user cache lock (`mfaVerifyLock:<user_id>`, `ICache.add`, random owner
token, 10 s lease renewed via `renewIfValue`, released via `dropIfValue`).
A held lock, cache outage or lost lease answers `false` (fail closed). The
`onVerified` hook (stamps `session.mfaAt`) runs BEFORE consumption persists, so
a stamp failure consumes nothing; the inverse residual (stamped session, code
not consumed) is accepted.

**Brute force.** Per-account backoff in `verify` / `confirm`: count via
`ICache.increment` (`mfaAttempt:`, 1 h window), lock deadline under
`mfaThrottle:`, `min(300, 2^(n-1))` s, reset on success, 429
`MfaThrottledError` with `retryAfter`. The throwing entry points read the
throttle through `assertNotThrottledOrRetry`, so a cache outage is a 429, not
a 500.

**Config:** `mfaEnabled` / `mfaRequired` (`mfaRequired` requires `mfaEnabled`,
boot-validated). Events: `mfaEnrolled`, `mfaRemoved`, `mfaVerified`,
`mfaChallengeFailed` (`EventScope.IDENTITY`). Typed client:
`client.userAuthenticator.*`.

**UI (kit + app):** The hosted
`Authorize.vue` ladder blocks consent until `GET /authenticators/challenge`
resolves, because a `builtIn` client auto-submits and must not render before
the factor requirement is known: `required` renders `AMfaChallengeForm`,
`enrollmentRequired` renders `AUserAuthenticatorEnroll`. Silent
(`prompt=none`) flows skip the form and hit the server backstop. After a self
email/webauthn enrollment without recovery codes, the enroll component's
recovery-code nudge defers its `done` emit, so the ladder's re-render cannot
unmount shown-once codes; the nudge is never shown to an admin managing
another user.

## Auth-Method Claims: amr / acr / step-up

- **The method is recorded on the session** (`auth_sessions.auth_method`,
  `SessionAuthMethod`: `pwd | ldap | ext | client`). The password grant stamps
  `pwd` for LDAP too (`ldap` is reserved). The federated callback creates its
  session with `ext`. Pre-column sessions carry `NULL` and get no amr/acr.
- **amr/acr are derived at the `/token` mint site** from the resolved session
  by `deriveAmrAcr` (`core/oauth2/authorization/helpers.ts`): `pwd|ldap ->
  ['pwd']`, `ext -> ['ext']`, plus `otp` when `mfaAt` is set;
  `acr = urn:authup:mfa` with `mfaAt`, else `urn:authup:pwd`. Never the
  reserved `"0"`. Emitted on every token kind so resource servers need no
  id_token.
- **`acr_values`** is case-sensitive (no lowercasing), rides the code blob and
  is advertised as `acr_values_supported`. Unknown values are ignored, never
  400; the id_token returns the achieved acr.
- **`urn:authup:mfa` is a step-up trigger** (`OAuth2AuthorizationGate`, throws
  `OAuth2MfaRequiredError.stepUpRequired()`), applied only while the user holds
  a confirmed factor, so an unsatisfiable request degrades instead of bricking
  the RP. `mfaAt` must be within `mfaFreshnessMaxAge`
  (`MFA_FRESHNESS_MAX_AGE`, default 60 s). Never 0: the hosted challenge
  round-trip takes seconds, so a 0 window loops the ladder.
