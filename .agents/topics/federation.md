# Federated login, identity claims, account linking

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## Federated Login Completion (`authorize-in`)

The external-IdP callback completes the EXTERNAL leg of a login started on one
of two hosted pages: the RP's authorization request on `/authorize`, or the
device page's pending user code on `/device` (#3589). It establishes the authup
session and returns the browser to that page with a one-time login handle. The
RP's code is issued at the end of the hosted ladder by the same
`POST /authorize` an interactive login posts, so a federated login passes
`prompt=login` / `max_age`, `select_account`, the `acr_values` step-up and
consent (#3454). The local second factor is deliberately skipped for an `ext`
session (see *Intentional enforcement boundaries*).

The ladder is `OAuth2FederatedLoginService` (`core/oauth2/federated-login/`),
not the controller. `complete()` answers `{ kind: 'refused', ... }` or
`{ kind: 'issued', pendingLoginId }`; `completeHandoff()` consumes the pending
login, extends its session and mints the AT+RT pair. The controller maps answers
onto a transport and owns the cookie. The service imports from `core/identity`
by FILE, never the barrel: the barrel cycle would TDZ-crash.

- **The code goes to the RP, never to a hosted page** (#3459). It is bound to
  the RP's `client_id` and `redirect_uri`; the auth console holds no client row,
  so a code delivered there could only answer 401 `invalid_client`. The callback
  mints no code; `AuthorizeController.confirm` does.
- **The WHOLE verified request reaches the code issuer**, never a subset
  (#3446). `buildHostedAuthorizeURL` re-renders every defined key.
  `code_challenge` / `code_challenge_method`, `nonce` and `acr_values` must ride
  the code: a code without its challenge cannot be redeemed by a public client,
  which is every console client.
- **The re-verification IS the redirect gate.** `redirectUriVerified` is the only
  thing that knows the `redirect_uri` matched a pattern; a completion without it
  is refused before a user is provisioned. Re-verifying also re-resolves the
  client, so a client deactivated mid-login fails closed.
- **A disabled provider and an inactive user are refused at the callback**, not
  only at start. Otherwise a federated login becomes the way around a
  deactivation. Only the provider check runs before the provider's single-use
  code is spent.

**Refusals bounce to the hosted page, never as JSON (#3458).** Once the state is
verified, every refusal is a 302 to the page the login came from:

- a re-verification failure: no marker (`serve()` re-runs the same verifier and
  renders the refusal). Only an `OAuth2Error` is bounced; anything else throws;
- a disabled provider: `error=login_required`, mapped to
  `OAuth2LoginRequiredError.providerUnavailable()`. `Authorize.vue` renders a
  payload error as a terminal card with no form or links, so the copy must not
  promise one;
- an inactive user, an assurance or enrollment refusal: `error=access_denied`;
- a provider answering `error` instead of a code: no marker, and nothing of the
  provider's `error` / `error_description` is echoed (whoever controls the
  provider's redirect shapes those values).

The marker set is CLOSED and the text server-side. Non-refusals keep JSON: 502
for the upstream token endpoint failing, 400 for an invalid state or a callback
with neither `code` nor `error`.

**A failed REDEMPTION on the hosted page clears the lingering session (#3487).**
Otherwise the ladder continues against whatever session the cookies hold and
consents the application into the WRONG account, silently for a `builtIn`
client. The page strips `provider` from the URL on mount, so a reload would
resume on the old session with no hint; hence `store.logout()` in the
completion catch. **Exempt:** the refusal carrying
`reason: IDENTITY_PROVIDER_LOGIN_NOT_PENDING` (`@authup/core-http-kit`, shared by
both sides). `provider` is a plain query parameter, so logging out on it would
make any authorize URL a one-click logout.

**The `state` is consumed by an atomic pop** (`popOneById`, #3456), so of two
callbacks with one state only the first gets the payload. Its entries live
under `CacheOAuth2Prefix.AUTHORIZATION_STATE`, a namespace of their own.

**The pending login** (`OAuth2FederatedLoginStore`,
`CacheOAuth2Prefix.FEDERATED_LOGIN`, 5 min, consumed on read) holds three
scalars: session id, provider id, user name. Never the identity object (it
carries the provider with its decrypted `clientSecret` and the raw upstream
token payload) and never a token.

**The browser binding is a cookie.** `authup_federated_login` (HttpOnly,
`SameSite=Lax`, `Secure` under an https publicUrl, path
`<basePath>/identity-providers`) carries it; the redirect carries only a
`provider` hint, and `POST /identity-providers/:id/login-complete` reads and
clears the cookie. A crafted URL handed to someone else completes nothing.
Handing the front end a one-time value to trade for a session was rejected;
Keycloak and Authentik bind the pending login to the browser's cookie too.

**The completion requires `isSameOriginRequest`** (mandatory
`Sec-Fetch-Site: same-origin`, `Origin` = publicUrl's). `SameSite` is scoped to
the registrable domain, so a sibling subdomain is same-site and carries the
cookie. CORS governs what a foreign page READS, not what the server ACTS on, so
every cookie-authenticated surface must repeat this check (see *Account
Console → Console session credential*).

**The state is bound to the browser too (#3439).** `authorize-out` sets a nonce
in the same cookie and on the state; the callback refuses a mismatch before the
provider's code is spent. The state's ip / user agent cannot do this: whoever
mints the state chooses both. One cookie serves both phases, so two federated
logins in one browser share a slot and the older one is refused (accepted).

**The pending session** is `authMethod: ext`, `mfaAt: null`, `expiresAt` = the
pending-login TTL (an abandoned login self-expires); `completeHandoff()` extends
it. It carries no `clientId` (that column is the subject FK). The hosted ladder
and the exchange reuse it (#3191).

**Render contract.** The page must complete `federatedLogin: { providerId }`
(contract 3 for `/authorize`, 5 for `/device`). A substituted console that
ignores it strands every federated login; see *Console substitution*.

**The access-policy leg stays at the callback**, denying before a session
exists. Trade-off: the denial is revealed after the first factor only, and this
leg keeps its own bounce instead of the ladder's `AUTHORIZE_FAILED` event and
`denied` metric.

**Custom-scheme `redirect_uri`.** `routup`'s `sendRedirect` allows http(s) only;
the callback always targets the hosted page, and `AuthorizeForm` navigates the
RP target at the end. The interstitial route still exists in
`@authup/client-auth-console` (contract 2) but nothing renders it; deleting it is
a contract change. Script-capable schemes are refused at three layers
(`isSafeRedirectURLScheme` in `@authup/kit`): `ClientValidator`, the
code-request verifier (`invalid_request`), and the completion, which fails
closed before the provider's code is spent. The hosted page renders the target
as an href, and the kit store cookies are JS-readable.

**A federated login has somewhere to return to, or it does not start (#3457,
#3589).** `authorize-out` requires a `codeRequest` or a `user_code`
(`invalid_request` otherwise, and it refuses a disabled provider up front). The
callback refuses a state with neither; the account-link branch is dispatched
first.

**The device variant is a session and nothing else.** `authorize-out` checks
only the code's FORMAT (`normalizeDeviceUserCode`) and never reads the
device-code cache: the route is anonymous, and a lookup would say which codes
exist (RFC 8628 §5.1). The callback calls `complete({ codeRequest: null })`; the
key is required and nullable so omitting it is a compile error. With `null`,
the client-dependent gates (re-verification, realm match, `redirect_uri`,
access policy) are skipped; the device flow's `lookup` and `approve` run them
once the person is signed in. Looking the code up at the callback was
rejected: it duplicates `resolve` and the gate and needs a miss-accounting rule
with no actor.

**The return URL comes from the popped STATE alone**: the hosted authorize URL,
else `<publicUrl>/device?user_code=XXXX-XXXX`. Nothing the provider's redirect
carries reaches it. `/authorize` maps `access_denied` and `login_required`;
`/device` maps `access_denied` only.

`LoginForm` renders the provider list only with a `codeRequest` or a
`deviceUserCode` and a known realm; a host embedding `ALoginForm` with neither
gets the password login alone.

**The provider LIST is anonymous, the provider RECORD is not (#3480).**
`GET /identity-providers` serves the schema's `fields.default` projection.
`GET /identity-providers/:id` needs `IDENTITY_PROVIDER_READ`/`UPDATE`/`DELETE`
with a realm match: the record read splices extra attributes after the query
(`extendOneWithEA`), so the OAuth2 `clientSecret` and the LDAP bind password sit
outside every rapiq field gate. Anonymous callers read one provider via
`?filter[id]=<uuid>`.

## Federated Identity Claims

`IdentityProviderOAuth2Authenticator.buildIdentityWithTokenGrantResponse` merges
access token, then `id_token`, then userinfo (#3434). The access token is
opaque by contract (OIDC Core §2), and authup's own carries no username.

- **Name ladder: `preferred_username, nickname, name, sub`.** authup's own
  claims builder maps `preferred_username` and `nickname` onto the nullable
  `displayName`, so `name` is needed for authup-to-authup federation.
  Candidates are consumed only when the validator raises an issue on that path,
  so candidates for OPTIONAL keys would be dead code.
- **`identity.id` stays the ACCESS token `sub`.** It keys
  `findOneByProviderIdentity`; sourcing it elsewhere orphans every existing
  account row and provisions duplicate users.
- **userinfo is called only when the provider declares `userInfoUrl`**; its
  failure is logged and swallowed. The hapic client has no `baseURL`, so a
  `/userinfo` default would be a relative URL that throws.
- **`identity.data` is the merged claim set** (#3674), which the attribute,
  role and permission mappers match over. Since those claims drive grants, an
  `id_token` or userinfo whose `sub` differs from the access token's is dropped
  whole, and so is a userinfo with no `sub` (OIDC Core 3.1.3.7, 5.3.2). A
  mapping on a userinfo-only claim is removed on a login whose userinfo fails
  (enrichment never blocks a login).
- The five presets (github, facebook, instagram, paypal, google) override the
  builder; google merges its `id_token` into `data`.
- **The name is forward-only; the email is verification-aware.** UPDATE never
  rewrites `user.name` (`nameLocked`), and the name-collision retry is
  CREATE-only. A mapped `email` that differs from the stored one clears
  `emailVerified` unless the mapping asserts it. The stored address must be
  re-read via `IUserIdentityRepository.findOneById` (re-selects the
  `select: false` column): `account.user` carries no email, and comparing
  against it would clear the flag on every login.

**Enrollment gating (#3675).** Two extra attributes on every provider (OAuth2,
OIDC, LDAP) gate creating a local user for an unknown subject:
`enrollmentEnabled` (null means true) and `enrollmentPolicyId`. Stored as
`auth_identity_provider_attributes` rows, validated by
`IdentityProviderEnrollmentAttributesValidator`, read through destr (`"false"`
is `false`).

- The gate runs in `saveUser` on the CREATE branch only, over the FINAL row
  (after mapping and the default `sources/<provider>` folder, before the user
  insert), and AGAIN after each name-collision rename: a policy that approved
  one name says nothing about the fallback. The UPDATE branch is never gated;
  new users of a closed provider come in through the Connect flow.
- The policy sees the would-be row under `BuiltInPolicyType.ATTRIBUTES` with NO
  identity: an `identity` policy denies (`DATA_MISSING`), and a missing key
  denies an equality on it, so `{ emailVerified: true }` refuses a login whose
  token lacked the claim.
- Fails CLOSED on a deny, an unloadable or dangling tree, a tree whose realm is
  neither null nor the provider's, and no evaluator wired.
- `IdentityProviderEnrollmentDeniedError` is marker-guarded only (no dedicated
  `ErrorCode`; a code fallback would match every `ValidationError`).
  `complete()` answers `ENROLLMENT_DENIED` / `access_denied` and records one
  `LOGIN_FAILED` row with no actor.
- On the LDAP password grant the refusal surfaces as
  `entity_credentials_invalid` (the composite authenticator throws the last
  strategy's error). Kept on purpose: a distinct error would confirm the bind
  succeeded. The trace is the warn line in
  `IdentityProviderLdapCollectionAuthenticator`.
- Attributes, not columns: the anonymous provider list ships every
  `fields.default` column, and a dangling policy id fails closed where an FK
  `ON DELETE SET NULL` would silently reopen enrollment.
- Rejected: auto-link-by-email (account takeover by whoever controls the email
  claim upstream), a separate require-verified-email switch (one `attributes`
  policy over `emailVerified` covers it), any matching-mode enum.

## Identity-Provider Account Linking

`auth_identity_provider_accounts` maps an external identity to a `userId`.
Federated login still auto-creates a NEW user for an unknown identity, so the
link flow is the only way to bind one to an EXISTING user. Two unique indexes:
`(providerId, userId)` and `(providerUserId, providerId)` (#3442). The second's
column ORDER is load-bearing: `providerUserId` leads the declared rapiq index,
and reversing it fails `assertSchemaMatchesEntity` at boot.

- **One port, one adapter.** `IIdentityProviderAccountRepository`
  (`core/entities/identity-provider-account/types.ts`) carries the entity CRUD
  surface, `removeGuarded`, and the account-manager methods
  (`findOneByProviderIdentity` / `save`); `IdentityProviderAccountRepositoryAdapter`
  serves the management API, the federated login and the link flow.
- **Entity API**: read + delete only, dual-mounted. A caller without
  `IDENTITY_PROVIDER_ACCOUNT_READ` sees only its own rows; a foreign row is
  gated on the owner realm `userRealmId` (no `realmId` column). `getMany`
  compiles with `realmAttributeName: 'userRealmId'` and ORs `eq('userId', ...)`
  for a user identity (#3601). The `post` branch needs
  `applyJunctionRealmScopeSelect(qb, alias, 'userRealmId', ['userId'])`. The
  upstream token columns are `select: false`, so no read returns them.
  `include=provider` is allowed, `user` is not.
- **Unlink lockout guard**: deleting a password-less user's LAST link is refused
  for every caller (`IdentityProviderAccountUnlinkBlockedError`, 400).
  `removeGuarded` counts and deletes in one locked transaction, so two
  concurrent unlinks cannot both pass.
- **Link flow (#3439).** The callback is unauthenticated, so it writes NOTHING:
  1. `POST /identity-providers/:id/link-request` (user, provider OAuth2/OIDC,
     enabled, in the actor's realm) saves a state with
     `link: { userId, providerId }` and returns the upstream authorize URL.
  2. The callback resolves the identity, stashes a four-scalar
     `IdentityProviderAccountLink` under a one-time handle and redirects to the
     account console's `/connected-accounts?linkHandle=...`
     (or `?linkError=link_failed`).
  3. The console POSTs the handle to `/identity-providers/:id/link-confirm`
     with its bearer, and the server links it to the AUTHENTICATED user.

  Why: binding at the callback lets an attacker mint a state with their own
  `userId` and have the victim follow it, binding the victim's external
  identity to the attacker's account (pre-hijacking). The handle is inert on
  its own: redeemable only by the stashed `userId`, for that provider, once.
  Do not drop `userId` from the stash. Never stash the identity object (it
  carries the decrypted `clientSecret` and raw token payload). The stash
  (`IIdentityProviderAccountLinkStore`, TTL `IDENTITY_PROVIDER_ACCOUNT_LINK_TTL`
  = 5 min) is not an `OAuth2AuthorizationStateManager` blob: that would inherit
  a 30 min TTL and re-apply the ip check to the SPA's XHR. Callback and confirm
  must reach the same cache (Redis or sticky routing).
  `link()` never runs mappers, mutates the user, mints a code or creates a
  session.
- **The invariant is DB-backed (#3442).** `link()`'s find-then-save is the
  friendly path only. The adapter's `save` turns a unique violation
  (`isDatabaseUniqueViolationError`) into `EntityConflictError`; the driver does
  not say which index fired, so `IdentityProviderAccountManager` classifies
  after a re-read. In `link()`: same user is a no-op, another user is
  `IdentityProviderAccountAlreadyLinkedError`, no row means the user already
  links this provider via another external account (a plain
  `ValidationError`, never "linked to another user"). In the federated `save()`:
  the loser of two concurrent first logins removes its just-created user best
  effort, logs a failure through `describeError`, and continues on the winner's
  account.
- **Events**: `identityProviderLinked` is recorded on the authenticated confirm
  (the callback has no actor); `identityProviderUnlinked` on delete. Metadata
  only, never tokens.
- **UI**: account console `/connected-accounts` (strips `linkHandle` /
  `linkError` after use); admin console tab
  `users/[id]/identity-provider-accounts` (`AIdentityProviderAccounts`, gated
  on `IDENTITY_PROVIDER_ACCOUNT_READ`).
