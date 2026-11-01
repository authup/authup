# OAuth2 /authorize, prompts, logout, access policy, consent

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## Authorize Realm Binding

The authenticated identity's realm MUST equal the client's realm (confused
deputy otherwise: realm-A tokens minted against realm B's client). The kit's
realm-mismatch card in `Authorize.vue` is UX only. Server-side, three points:

1. **`POST /authorize`**: `OAuth2AuthorizationGate.evaluate`
   (`core/oauth2/authorization/gate.ts`) throws
   `OAuth2LoginRequiredError.realmMismatch()` (`login_required`, 400, no
   identity data in the body, so no realm-enumeration oracle) when
   `identity.data.realmId !== data.realm_id`. It reads the scalar `realmId`,
   not the `realm` relation (may be unloaded); a missing `realmId` fails closed
   the same way, never a 500.
2. **`/token` code redemption**: the code verifier's `realmId` option
   (`client.realmId`) rejects `code.realm_id !== realmId` with `invalid_grant`.
   Covers codes minted outside `authorize()`.
3. **`/token` refresh**: a PUBLIC client refreshing a token of another realm
   gets `invalid_grant`. Confidential clients are exempt: the documented
   cross-realm password grant (UUID user + master client) relies on it.

- A name-identified client at `/authorize` requires a realm hint
  (`invalid_request` otherwise): every realm carries the same-named system
  clients.
- All SSR auth pages send `frame-ancestors 'none'` + `X-Frame-Options: DENY`
  (they hydrate first-party session state).
- Ending an authup session on an RP's logout belongs to RP-initiated logout
  (`end_session_endpoint`). `store.logout()` stays local-only and never calls
  `DELETE /sessions/@me` (#3191 session reuse would self-DoS fresh logins).

### Only the user at the authorization server may authorize an application

- `POST /authorize` and `POST /device_authorization/approve` refuse a bearer
  carrying a `client_id` (`assertTokenMayAuthorize`,
  `adapters/http/request/helpers/token.ts`, `login_required` / 400). It is the
  first statement of `HTTPOAuth2Authorizer.authorizeWithRequest` and runs
  before the service call in `DeviceAuthorizationController.approve`, so a
  refused request resolves no client and reads no scope (#3608).
- Reason: a token issued to client Y could otherwise mint a code for public
  client X and regain the X-owned grants #3597 withholds from Y, browserless
  for a `builtIn` client. This is the bearer half of the refusal
  `isOAuth2IssuancePath` makes for the console cookie.
- The hosted login's token carries no client: `StoreLoginContext` has no client
  field and the form forwards only `codeRequest.realm_id`. Keep it that way.
- Rejected: an equality check against the client being authorized. A client
  re-authorizing itself still gains scope and lifetime (`resolveGrantedScope`
  admits any request asking for `global`; consent is recorded, not gated).
- `lookup` / `deny` take any user bearer (neither mints).
  `HTTPOAuth2IdentityGrantType` is unregistered; wiring it means calling the
  assert there too.

### Response types: code only

- `response_type=code` only. Others are refused by the code-request validator
  and again in `OAuth2Authorization.authorize()` (`unsupported_response_type`).
  Discovery advertises only `code`. No `c_hash` (hybrid only).
- Hence the verifier requires PKCE + `state` for public clients
  unconditionally, and refuses a client with no registered `redirectUri`
  patterns (an unchecked `redirect_uri` would issue codes anywhere).
  `redirectUriVerified` is `false` only when the request carries no
  `redirect_uri`.
- A `redirect_uri` carrying userinfo (`https://u:p@app/cb`) is refused with
  `invalid_request` before the pattern match (#3455): `isSimpleURLMatch`
  canonicalizes it away, but every redirect site builds `Location` from the
  raw string. `OAuth2EndSessionService.isValidPostLogoutRedirect` drops such a
  candidate too.
- `ClientValidator` refuses a `redirectUri` / `postLogoutRedirectUri` PATTERN
  with userinfo: `canonicalizePattern` drops it, so `https://u:p@app/**` would
  silently match the bare origin.

### The two UI hints: `ui_locales` and `ui_color_mode`

The console cookies (`vc-locale`, `vc-color-mode`) are host-only, so these
hints carry the preference from an RP on a sibling host. `ui_locales` is OIDC
Core 3.1.2.1; `ui_color_mode` is authup's own (`light|dark|system`, singular).

- **Mounted in `OAuth2AuthorizationCodeRequestValidator`**, which is what
  carries them across a federated round-trip (`buildHostedAuthorizeURL`
  re-emits only validated keys). Deliberately not on the code blob: nothing
  after redemption renders a page.
- Discovery advertises `ui_locales_supported` (from `LOCALE_CODES`) and
  `ui_color_modes_supported` (from `OAuth2UIColorMode`). `readUIColorModeHint`
  narrows against that same `@authup/specs` enum so pages and discovery cannot
  disagree.
- **Validated by shape only, never by value**: a cosmetic hint must never 400 a
  login. The closed set is applied where the page renders it. A malformed
  `ui_locales` LIST is still `invalid_request`. `ui_locales` is not narrowed to
  authup's catalogs (an unknown tag renders the fallback catalog).
- **`buildAuthorizeURL` defaults both from the cookies** (`LOCALE_COOKIE` /
  `COLOR_MODE_COOKIE` and the sentinels in the kit's `core/cookie.ts`), skipping
  the `auto` / `system` sentinels. `uiLocales` / `uiColorMode` override; `''`
  opts out. Read from the cookie, not the vuecs manager (a plain function with
  no injection context) and not the auth store (would be a second source of
  truth).
- **They seed only while the visitor chose nothing here.**
  `readUILocalesHint` / `readUIColorModeHint` apply in
  `apps/server-auth-console/src/render.ts` over `readUIClientPreferences`, each
  guarded on its cookie's sentinel, so the switcher stays the last word.
  Nothing is persisted.
- Rejected: a claim (the affected pages are anonymous; a theme is per browser).
  Rejected: a shared cookie `Domain` (needs config on both sides, and a
  host-only write on either side shadows the widened cookie silently).

### The account-level UI preference: `locale` and `color_mode`

Two reserved user attributes, `UserAttributeName.LOCALE` (`locale`) and
`UserAttributeName.COLOR_MODE` (`colorMode`), served as the claims `locale` and
`color_mode` (not `ui_color_mode`, which is the hint). The browser cookie is a
cache of the account value: the kit seeds the cookie refs from introspection on
every `resolve()` (account wins), writes switcher changes back, and on a first
sign-in with an empty account bootstraps an explicit browser value upward.

- **Server**: `OAuth2OpenIDClaimsBuilder.userMap` maps them like columns,
  because `UserIdentityRepository.find` ends in `extendOneWithEA`. An absent
  row is an absent claim, never `null` (#3518). They reach the id_token and
  both introspection routes only; `/userinfo` uses the attribute names.
- **Introspection is the reader** because it rebuilds claims on every call.
  The 60s by-id identity cache holds the user row only; attribute rows are
  re-read uncached. `CachePrefix.USER_OWNED_ATTRIBUTES` is passed to the EA
  repository but no read caches under it: caching the attribute read there
  would break the "visible on next introspection" guarantee.
- **Value validation is per name**: `assertPreferenceValue`
  (`core/entities/user-attribute/preferences.ts`) runs in
  `UserAttributeService.create` and `update` over the resulting pair
  (`data.name ?? entity.name`, `data.value ?? entity.value`), so neither a
  rename nor a name-less body slips past. `locale`: BCP47 shape, bounded by
  `LOCALE_MAX_LENGTH` (it rides every signed token; the column is unbounded),
  never narrowed to a catalog. `colorMode`: an `OAuth2UIColorMode`.
  `IdentityProviderAccountManager.saveUser` drops a refused mapped value
  instead of failing the login.
- **`create` takes only the id of a body-supplied `user` object** (`userId`
  wins; no id = 400). The object's `realmId` would otherwise gate
  `USER_UPDATE` against a caller-chosen realm, and dropping the object
  entirely would make `isSelfTarget` true and write onto the caller.
  `RoleAttributeService.create` applies the same rule to `role`.
- Not provisionable (provisioning writes `User` columns only). No keyed upsert
  route: the kit does find-then-write.
- Rejected: columns (migration + width for no filtering need); token-only
  claim (stale until refresh).
- **Kit** (`install(app, { preferences: { locale?, colorMode? } })`,
  `core/store/preferences.ts`): the app passes its refs; nothing is copied into
  the store. `seed()` runs inside the synchronous `commitSession` after
  `setUser`. A per-ref watch debounces 300ms, then find-then-write, chained per
  preference so two writes never both create; failure is one `console.warn`.
  A ref moved back to its sentinel deletes the row. Load-bearing guards:
  - `known` (set before assigning the ref) is the loop guard.
  - A pending change outranks a concurrent commit: `seed` skips a preference
    with an armed timer or in-flight write (cookie-mode consoles revalidate on
    every navigation).
  - Timers and writes belong to the subject they were made for: a subject
    change bumps a generation that clears timers, `known` and `pending`, so a
    previous user's toggle is never written onto the next user.
  - A failed value is remembered under `failed`, so the bootstrap does not
    retry the same refused write on every navigation.
- **`createCookieRef` returns one ref per cookie name and document** (client
  only; SSR gets a fresh ref from `initial`). The admin console has three
  `createColorMode()` instances; sharing by name keeps them one value. A second
  client caller's `initial` is ignored.
- **The Nuxt plugin registers both refs itself, client-only**, as plain
  `useCookie` refs (Nuxt syncs same-name refs over a `BroadcastChannel`), so
  they stay in step with `@vuecs/nuxt` without reaching it. Not
  `useLocaleManager()`: the `vuecs-locale` plugin is `enforce: 'post'` and does
  not exist yet when `authup:kit` runs. Not server-side: Nuxt's server cookie
  refs would cause a hydration mismatch.

### OIDC prompt surface & id_token claims

- **Params**: `prompt` (`none|login|consent|select_account`; unknown tokens
  ignored; `none` with anything else is `invalid_request`), `max_age`,
  `login_hint` (canonicalized `trim().toLowerCase()`). A blank `max_age=` is
  absent (the validator preprocesses it; `z.coerce.number('')` is 0 and would
  force re-authentication). String comparisons use the `@authup/specs`
  `OAuth2AuthorizationPrompt` / `OAuth2ErrorCode` enums.
- **The hosted ladder (`Authorize.vue`) renders prompts for every RP**:
  `select_account` shows `AAccountPrompt`; `login_hint` prefills;
  `prompt=consent` suppresses `builtIn` auto-consent. `buildAuthorizeURL`
  defaults `prompt=select_account`.
- The chooser targets a lingering session only: a fresh login on the page
  (store `lastAuthOrigin` turning `login`, stamped at the end of a settled
  `login()`) goes straight to consent. It waits for `user` while resolution is
  in flight, but once settled without a user (`userSettled`) it renders a "use
  another account" escape hatch instead of spinning.
- `AuthorizeForm` shows a "Signed in as X, not you?" chip (local
  `store.logout()` to the login form).
- **Dead bearer**: the consent POST catch emits `loginRequired` on a
  `login_required` body AND on HTTP 401, otherwise `autoConsentFailed`'s retry
  re-POSTs the dead bearer forever.
- **Every redirect in the ladder is gated on `redirectUriVerified`**, the
  deny/abort path and every silent error redirect included. Unverified means a
  stay-on-page notice (never redirect an OAuth2 error to an unregistered URI).
- **Freshness is server-side** in `OAuth2AuthorizationGate`: auth time is the
  backing session's `createdAt`, never `refreshedAt` (a refresh must not reset
  it); a session-less Basic authorize counts as now. The window is
  `promptLoginMaxAge` (`PROMPT_LOGIN_MAX_AGE`, default 60s), which absorbs the
  hosted login-to-consent round trip; `max_age=0` is stricter than
  `prompt=login`. Strict step-up is `PROMPT_LOGIN_MAX_AGE=0`.
- **id_token**: minted at the `/token` exchange in `OAuth2AuthorizeGrant.runWith`
  after `resolveSession`, so `sid` always names the real backing session
  (reuse, session-less create and federated alike). `authorize()` does not mint
  it; it stamps `auth_time` on the code blob. `auth_time` is the session's
  creation instant. `at_hash` digest is derived from the signing `alg`
  (`*256/384/512`), so a non-RS256 key cannot mint wrong hashes. `nonce` rides
  the code.
- **Discovery** advertises `prompt_values_supported` and
  `revocation_endpoint` as `.../token/revoke`.
- **`prompt=none` and `prompt=login` are decided client-side** in the hosted
  page: a top-level `GET /authorize` carries no bearer, and the console cookie
  is denied on the issuance surface by design. After the router guard settles
  `store.resolve()`:
  - `prompt=none`: not logged in or realm mismatch redirects
    `login_required`; a non-`builtIn` client probes persisted consent (see
    *OAuth2 Consent*) and redirects `consent_required` only without a covering
    consent; otherwise auto-consent issues silently. Rendered by
    `AuthorizeSilentRedirect.vue` (client-only `window.location`).
  - `prompt=login`: forces the login form with a re-auth banner until a fresh
    login stamps `lastAuthOrigin`; reused when the POST returns
    `login_required`.
- Accepted limitation: a JS-less `prompt=none` GET gets 200 HTML, not an error
  redirect. Every security backstop runs on POST `/authorize` and `/token`.
  A server-side answer would need cookie session recognition on `/authorize`,
  which the header-only model avoids.
- **The anonymous hydration payload carries `ClientSummary`**
  (`id`/`name`/`displayName`/`builtIn`/`createdAt`, core-http-kit) plus
  `RealmSummary` and scopes. Never `redirectUri`, `grantTypes`, `baseUrl`,
  `backchannelLogoutUri`, `accessPolicyId` or the secret flags; do not rely on
  `secret` being `select: false`.

### RP-Initiated Logout: `end_session_endpoint`

`GET`/`POST /logout` (no feature flag) is the RP-agnostic way to end an authup
session. Core: `OAuth2EndSessionService` (`core/oauth2/end-session/`), wired via
`createLogoutController`.

- **Validation** (`OAuth2EndSessionRequestValidator`): length caps on every
  param (`id_token_hint` 4096, `post_logout_redirect_uri` 2000, `state` 2048),
  blanks are absent, the realm hint is canonicalized. A validation failure is
  never a JSON error. A malformed cosmetic param must not cancel a revoke: the
  controller retries with the `id_token_hint` alone (redirect dropped); only a
  malformed hint falls through to the parameter-less confirm page with no
  revoke.
- **The hint** is verified with `ignoreExpiry` (signature, nbf and kind still
  apply). The `ignoreExpiry` path must NOT call `saveWithSignature`
  (`core/oauth2/token/verifier/module.ts`): an expired token would re-cache for
  the 1h fallback TTL and introspect as `active`. Only `kind === id_token` is
  accepted (access and refresh tokens carry `session_id` too).
- **`client_id` vs `aud`**: with a verified hint, the request `client_id` must
  match the hint's `aud`. A name is resolved to its UUID first, scoped by the
  request's realm hint else the verified hint's realm claim (never an
  unverified hint's, no master fallback). An `aud`-less hint with a
  `client_id`, an unresolvable name, an unknown realm key, or a name with no
  realm key all count as unverified (no revoke). A UUID resolves globally.
- **`endSessionHintGracePeriod`** (`END_SESSION_HINT_GRACE_PERIOD`, seconds
  past `exp`, default 0 = any expired hint, Keycloak parity): beyond it the hint
  is unverified (`isWithinHintGraceWindow`; exp-less fails closed).
- A verified hint's `sid` session is revoked only after `session.sub`/`subKind`
  match the hint. Without a hint nothing is mutated.
- **`post_logout_redirect_uri`** is honored only if absolute http(s) and it
  `isSimpleMatch`es the client's own `postLogoutRedirectUri` patterns, never
  `redirectUri`; `state` rides only with a validated redirect. The admin form
  keeps two separate lists for that reason; clearing all patterns submits
  `null`, never `''`. `buildSystemClientAttributes` sets the same
  `<origin>/**` patterns as `redirectUri`.
- **The server bounces only when it actually revoked** (`serverRevoked`).
  Otherwise the redirect goes into the payload and the click-gated confirm page
  (`AEndSessionForm`) signs out with the bearer, then navigates. A no-op
  round-trip must not look like a logout to the RP.
- **`AEndSessionForm` auto-clears local state only when
  `serverRevoked && hintSub === store.user.id && hintSubKind === 'user'`**
  (missing kind fails closed). Otherwise a cross-site `GET /logout` with the
  attacker's own id_token would sign out whichever victim renders the page.
  Residual (Keycloak parity): a leaked id_token can end its own session.
- **Kit id_token**: the store keeps `idToken` (cookie
  `CookieName.ID_TOKEN`, `ID_TOKEN_UPDATED`, cleared in `cleanup()`).
  `applyTokenGrantResponse` retains it when a response carries none (refresh);
  that is safe only because `store.login()` runs `cleanup()` first.
- **`apps/client-admin-console/src/pages/logout.vue`** (bearer mode only;
  cookie mode signs out via `DELETE /sessions/@me`): no `requireLoggedOut` meta
  (the guard would drop the id_token first); captures `idToken`/`realmId`,
  runs local `store.logout()`, redirects to `buildEndSessionURL` with
  `postLogoutRedirectUri: <origin>/login` and NO `client_id` (resolved from
  the hint's sole `aud`).

### Back-channel logout (OIDC Back-Channel Logout 1.0)

`Client.backchannelLogoutUri`: one absolute http(s) URL, no wildcard, no list,
no userinfo, `null` = no push. The validator's `.max(2000)` matches the
`varchar(2000)` column; an uncapped value would fail at the driver as a 500.

- **One chokepoint: `SessionManager.revoke(id)`**: load session, resolve the
  audience, remove the row, then notify. Order is load-bearing: the audience
  is the distinct `auth_session_tokens.client_id`s carrying a URI, and those
  rows cascade with the session. Every management-API session delete routes
  through it (`DELETE /sessions/:id`, `DELETE /sessions`, `/logout` with a
  verified hint, refresh-replay family revoke).
- **Does not emit**: `verify()` expiring a lapsed session, the cleaner's
  sweep, DB cascades from a deleted user/client/realm, `/token/revoke`.
- **Notifier**: `OAuth2BackchannelLogoutNotifier`
  (`core/oauth2/backchannel-logout/`) implements `ISessionRevokeNotifier`,
  declared in `core/authentication/session/types.ts` so the session manager
  imports no oauth2 file. `AuthenticationModule` depends on `OAUTH2`; only the
  `revokeNotifier` field is optional (fake-backed specs).
- **Token**: signed with the CLIENT realm's key (`iss` from
  `client.realm.name`; the session's realm can differ). `kind: logout_token`
  (never accepted as a bearer), `aud` = client id, fresh `jti`, `exp`
  `OAUTH2_BACKCHANNEL_LOGOUT_MAX_AGE` (120s), the `events` member, `sid`,
  `sub`, `realm_id`. No `nonce` (spec forbids it). Known gap: no
  `typ: logout+jwt` header (`signToken` has no header option).
- **Delivery**: form POST `logout_token=<jwt>`, one per client under
  `Promise.allSettled`, timeout per request, `redirect: 'manual'` (a 3xx is a
  refusal, never a second POST elsewhere), awaited before `revoke` returns.
  Best effort: failures are warned, never rethrown. The response body is
  cancelled (an unread body pins the keep-alive socket).
- **Bulk revokes** (`deleteManyForSelf`, `deleteManyByQuery`, `revokeByOwner`)
  go through `SessionManager.revokeMany` in batches of
  `SESSION_REVOKE_CONCURRENCY` (5, below the pool of 10, since each revoke
  holds a connection). A failed revoke is logged and the rest continue; the
  call returns the ids it could not revoke. A failed audience read never blocks
  the removal.
- **SSRF residual**: the URL is admin-chosen (`CLIENT_CREATE`/`UPDATE`) and
  deliberately NOT in the self-manage denylist. Bounded by the fixed request
  shape and a discarded response.
- Discovery: `backchannel_logout_supported` and
  `backchannel_logout_session_supported`. Absent from
  `buildSystemClientAttributes` and `ClientSummary`.
- **Audit rows**: `backchannelLogout` / `backchannelLogoutFailed` per client
  (`refType: client`, `sessionId`, subject as actor, client's realm,
  `data.jti`, plus `status` or `errorCode` on failure). The row carries a CODE,
  never the rendered error: `describeCauseChain` output names RP hosts and
  addresses, and the subject can read their own rows while
  `backchannelLogoutUri` is withheld from them. Clients without a URI get no
  row.

## Application Access Policy

`Client.accessPolicyId` (FK to `auth_policies`, `ON DELETE SET NULL`) gates who
may obtain a token for the client via the interactive flows. `null` allows. A
failure is `access_denied` (400, neutral message, no oracle).

- **Evaluator**: `OAuth2AccessPolicyEvaluator` (`core/oauth2/access-policy/`)
  loads the tree via `findDescendantsTreeById` (base row first: an id-only root
  has no `type`) and evaluates with IDENTITY data only. An `ATTRIBUTES` access
  policy therefore never passes. Fails closed on everything: dangling id, load
  failure, evaluation error, no evaluator wired.
- **Four legs**:
  1. `OAuth2AuthorizationGate.evaluate`, last before issuance (realm, MFA,
     freshness, access policy), so a denial is shown only to a fully
     authenticated identity. `POST /authorize` and device approval.
  2. The federated callback, before a session exists: redirects to the hosted
     `/authorize` with `error=access_denied`. Only for logins completing a
     code request; a device-page federated login has no client at the
     callback, so legs 1 and 4 stop it.
  3. and 4. `/token` redemption backstops (code and device code) via
     `assertAccessPolicyBackstop`
     (`adapters/http/adapters/oauth2/grant-types/utils/access-policy.ts`),
     subject from blob scalars, denial as `invalid_grant` (the artifact is
     burnt).
- **Transport honors `redirectUriVerified`**: verified means
  `AuthorizeController.confirm` returns 200 `{ url: ...?error=access_denied }`;
  unverified means a 400 body and a terminal card. `redirectUri`/`state` are
  non-enumerable fields on `OAuth2AccessDeniedError`, so they never serialize.
- **Guardrails**: `accessPolicyId` is in the `system.client-names-self-manage`
  denylist and absent from `ClientSummary`. `ClientService.save` refuses a
  policy of another realm (`assertAccessPolicyRealm`; global allowed; checked
  only when the reference changes). Every leg evaluates with the client's
  realm, so an old cross-realm binding denies. `buildSystemClientAttributes`
  omits the key (the provisioner MERGE would wipe an admin-set policy).
  Assignment lags up to 60s at `/token` (client query cache).
- **Every leg records** one `AUTHORIZE_FAILED` (`reason: 'accessPolicy'`) and
  `authup_authorize_total{outcome="denied"}` (#3575).
- **Admission control, not continuous**: not evaluated on `refresh_token`. To
  evict an admitted identity, revoke its session.

## OAuth2 Consent

`auth_consents`: one row per `(client_id, sub, sub_kind, scope)` (unique
index), a single lowercase scope token per row, CASCADE to client and realm. A
nullable `userId` FK (CASCADE) is set when `subKind = user`. `expires_at` is
always null today but is honored by the covering check.

- **Covering rule**: covered iff every requested token has an unexpired row;
  strict token superset (`global` does not imply `openid`). Both server
  (`ConsentService`) and kit normalize with `unwrapOAuth2Scope`; if either stops
  lowercasing, covering silently never matches.
- **Union/keep**: re-approval only inserts missing tokens
  (`insertMissing`: save per row plus a duplicate-key catch via
  `isDatabaseUniqueViolationError`). Not a query-builder `orIgnore()`, which
  bypasses subscribers. Rows only shrink by explicit revoke.
- **One persist site**: `HTTPOAuth2Authorizer.authorizeWithRequest`, after
  `authorize()` succeeds, skipping `builtIn` clients, try/catch (never fails an
  issued code). Not at `/token`. Federated logins write here too.
- Tokens over `CONSENT_SCOPE_MAX_LENGTH` (128, shared by column and service)
  are dropped at normalization.
- **Covering read cache**: `findAllBySubjectClient` uses a 60s cache
  (`CachePrefix.CONSENT_COVERING`), dropped by the subscriber with
  `cache.onInsert: true`. The kit probe uses the uncached list path.
- **API**: `/consents` + `/realms/:realmId/consents`, read and delete only.
  Without `CONSENT_READ` a reader is force-scoped to own rows; foreign rows go
  through the compiled WHERE, with a per-row `reachesRecord` on `post` (the
  adapter force-selects `realmId`/`sub`/`subKind`).
- **Kit probe** (`Authorize.vue`): `consent.getMany` filtered by the resolved
  user subject (`sub`, `subKind: 'user'`, `clientId`). The subject filter is
  load-bearing: a `CONSENT_READ` holder would otherwise get every subject's
  rows and auto-consent off a stranger's grant; the match re-checks
  `row.sub`/`row.subKind`. Driven by the resolved user id (not token presence);
  responses for a stale subject are dropped. Failure means not covered.
  `autoConsent = (builtIn || consentGranted) && !prompt.includes('consent')`.
- **List endpoint joins a client summary only** (id, name, displayName,
  builtIn, baseUrl). `client` stays out of the schema's `relations.allowed`
  even with the #3295 gate: the summary is the deliberate self-service shape,
  and a rapiq `client` join would collide with the manual one.
- **Account console Applications page**: an app name links only when `baseUrl`
  passes `isHttpURL` (`apps/client-account-console/src/pages/utils.ts`, http(s)
  allowlist, not a scheme denylist), since it is admin text rendered as `href`.
- Revoking consent stops the next silent issue only; issued tokens are revoked
  through the sessions API.
