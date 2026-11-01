# Device authorization grant (RFC 8628)

Loaded on demand, not imported by CLAUDE.md. Read it before changing this area.

## Device Authorization Grant (RFC 8628)

A device POSTs `/device_authorization` and gets a `device_code` / `user_code`
pair; the person opens `<publicUrl>/device`, signs in, enters the code and
approves or denies; the device polls `/token` with
`grant_type=urn:ietf:params:oauth:grant-type:device_code`. Everything is a cache
blob under `CacheOAuth2Prefix`: no table, no migration, no config key. A cache
flush kills in-flight flows (the poll answers `invalid_grant`), and a
multi-replica deployment needs Redis.

- **Opt-in per client.** `OPT_IN_GRANT_TYPES` (`core/oauth2/client/grant-type.ts`)
  holds `DEVICE_CODE`: a null or empty `grantTypes` column refuses it with
  `unauthorized_client`, the one exception to null-allows-all. Enabling it on
  every existing client would put the §5.4 phishing surface on clients that
  never asked. So no feature flag exists.
- **Scope is rejected on excess, never clipped.** `resolveGrantedScope`
  (`core/oauth2/scope/helpers.ts`) is shared with the code-request verifier: a
  requested scope must be bound or carry `global`, else `insufficient_scope`;
  absent grants every bound scope. Clipping was rejected: one issuer would
  answer the same `scope=` two ways by grant.
- **No PKCE** (no redirect to protect). Instead: 256-bit `device_code`, 34.6-bit
  `user_code` (8 of `BCDFGHJKLMNPQRSTVWXZ`, 600 s), bearer-gated per-actor
  throttled lookups, single-use redemption by `cache.pop`, client binding at
  every poll. `normalizeDeviceUserCode` answers `null` for anything not matching
  the alphabet, so a malformed guess never reaches the cache.
- **No auto-consent, `builtIn` included.** The person has no context for which
  device asks, so an explicit Approve is the only defence. Do not reuse
  `AuthorizeForm.autoConsent`. Consent rows are recorded for a non-`builtIn`
  client, but a covering row never skips the screen.

**Threats and controls (RFC 8628 §5).**

| Threat | Control | Where |
|---|---|---|
| §5.1 user code brute forcing | 34.6 bits, 600 s, lookups for an authenticated user only, misses counted per ACTOR (10 per 600 s) and forgiven by a decision ONCE per window, fail closed on a cache outage (429), one neutral `invalid_grant` for unknown / expired / decided / malformed / non-string codes, one `AUTHORIZE_FAILED { reason: 'userCode' }` row per miss | `user-code.ts`, `OAuth2DeviceAuthorizationService.resolve`, `ForceUserLoggedInMiddleware` on the three page routes |
| §5.2 device code brute forcing | 256 bits, keyed by itself, never derivable from `user_code`, bound to `client_id` + `realm_id`, popped at redemption | the repository, `OAuth2DeviceCodeVerifier` |
| §5.3 / §5.6 device trustworthiness | a confidential client authenticates at BOTH endpoints; a public client identifies by `client_id` and a supplied secret is refused; opt-in per client | `DeviceAuthorizationController.request`, `HTTPOAuth2DeviceCodeGrant`, `assertClientGrantAllowed` |
| §5.4 remote phishing | the page shows client, realm and scopes and requires an explicit Approve; the approval runs the `/authorize` admission gates; with `verification_uri_complete`, and on the return from an identity provider, the code is still displayed and confirmed before any lookup | `ADeviceVerifyForm`, `OAuth2DeviceAuthorizationService.approve`, `OAuth2AuthorizationGate` |
| §5.5 session spying | `device_code` never enters a browser; the page handles `user_code` only, in JSON POST bodies; `/device_authorization` is in `OAUTH2_ISSUANCE_PATHS` (prefix match), so the console session cookie cannot become a device token | `issuance.ts` |
| §3.5 polling abuse | `slow_down` via a per-`device_code` set-if-absent key over a FIXED 5 s window; a refused poll leaves the standing window | `touchPoll` |
| confused deputy across realms | approver realm must equal `blob.realm_id` at lookup, approve and deny (`login_required`); at redemption `blob.client_id === client.id` and `blob.realm_id === client.realmId` (`invalid_grant`, identical to "unknown") | `resolve`, verifier |
| confused deputy across clients | the approval refuses a bearer carrying a `client_id` (#3608); `lookup` and `deny` are exempt, since neither mints | `assertTokenMayAuthorize` |

**Accepted residual oracle.** A foreign-realm user holding a VALID code gets
`login_required` (the realm-mismatch card), an invalid code the neutral error.
Accepted for 34.6-bit codes behind the per-actor throttle.

**Artifacts.** Constants live in `core/oauth2/device-authorization/constants.ts`;
the adapter is `OAuth2DeviceCodeRepository`
(`app/modules/oauth2/repositories/device-code/`). Constants are SECONDS (like
`expires_in`); every `ttl` handed to `ICache` is MILLISECONDS.

| Prefix | Key | Value | TTL |
|---|---|---|---|
| `oauth2_device_code` | `<device_code>` | the immutable request | lifetime + grace |
| `oauth2_device_user_code` | canonical `user_code` | `<device_code>` | 600 s, `add` so a collision is refused and the caller regenerates |
| `oauth2_device_decision` | `<device_code>` | the decision | remaining lifetime + grace, written ONCE with `add` |
| `oauth2_device_poll` | `<device_code>` | `1` | 5 s, fixed |
| `oauth2_device_lookup_attempt` | `actor:<sub>` / `lock:actor:<sub>` / `reset:actor:<sub>` | counter / deadline / forgiveness marker | 600 s |

- **The blob is never rewritten.** The decision is its own write-once key and
  reads merge the two. `ICache` has `add` (`SET NX`) and `pop` (`GETDEL`) but no
  compare-and-set, so this is what makes concurrency safe.
- **The 300 s grace is what makes `expired_token` reachable**; without it the
  swept blob collapses into `invalid_grant`.
- **Guard every TTL derived from `expires_at - now`.** Redis refuses a
  non-positive `PX`, the memory adapter would store forever.
- The FIXED poll window and the per-ACTOR-only throttle are deliberate ceilings,
  marked `ponytail:` in the adapter.

**A decision forgives the actor's misses once per window, never on demand
(#3590).** `resetLookupMisses` `add`s a `reset:` marker and drops the counter
only when that `add` won. Do not copy the MFA throttle's reset-on-every-success:
any account can mint and decide on its own code (public client, ungated
`deny`), so an unbounded reset turns the throttle into "9 guesses per
self-served decision". The forgiveness is claimed only when a counter exists,
and is best effort (`forgiveLookupMisses` warns): the decision is already
written, so bookkeeping must not fail it.

**The admission gate is shared with `/authorize`.** `OAuth2AuthorizationGate`
(`core/oauth2/authorization/gate.ts`) holds realm binding, session /
`authTime`, the MFA backstop, the `acr_values` step-up, `prompt=login` /
`max_age` and the access policy. A device approval passes
`{ realm_id: code.realm_id }`; the prompt and step-up gates are inert there.
Metrics: both decision methods go through `resolveForDecision`, which records
the foreign-realm refusal (it runs before the gate) by the error's own marker;
`lookup` calls the bare `resolve` and records nothing, like the `/authorize`
GET (#3591). Do not route `resolve`'s throttle and miss errors through
`classifyAuthorizeFailure`: they would count one `error` per guess.

**The service** (`OAuth2DeviceAuthorizationService`).
- `issue` emits no event (anonymous and unbounded).
- `resolve` runs the realm binding LAST, so the neutral refusal never says
  whether a code exists; a non-pending or expired blob and a missing or
  inactive client count as misses.
- `lookup` projects `ClientSummary` + `RealmSummary` + `scope`, never
  `redirectUri`, `grantTypes`, `accessPolicyId` or the secret flags.
- A second decision of any kind answers the neutral `invalid_grant`. A consent
  write failure is a warn line, never a failed approval.
- Request attribution is not automatic: the ctx carries `requestContext` and
  every `record()` spreads it. Neither code ever lands in event `data`.

**The verifier** (`OAuth2DeviceCodeVerifier.verify`). A `client_id` or
`realm_id` mismatch answers the same `invalid_grant` as unknown, leaves the
blob untouched and arms no poll key, so a leaked code presented by another
client cannot burn or slow the legitimate flow. Denied answers `access_denied`
once, then `invalid_grant`. `HTTPOAuth2DeviceCodeGrant` extends
`OAuth2AuthorizeGrant` (`toAuthorizationCode`), runs the access-policy backstop
over the blob scalars, then `runWith`, so session reuse, id_token, `at_hash`,
token rows and refresh rotation are inherited. There is deliberately no core
grant class.

**Session semantics.** The approval binds the approver's bearer session and the
redemption reuses it; a code whose session ended in between is refused
(`invalid_grant`). `auth_sessions.client_id` is never written (subject FK); the
device client lands on `auth_session_tokens.client_id`, so back-channel logout
reaches it. Ending the approver's browser session ends the device's access too.

**Wire.**
- The realm hint resolves before the client, and a UUID-identified client may
  sit outside it, so the blob's `realm_name` comes from an explicit second
  resolve, never from the client's unloaded relation.
- `GET /device` is a stateless hop to `<authConsoleUrl>/device` and is NOT an
  issuance path.
- Expiry answers `device_code_expired` (`data.error: expired_token`): its own
  authup code, because `expired_token` is the 401 JWT code.
- `DeviceVerificationThrottledError` (429): the kit guards on its marker, never
  on the status.
- Discovery lists the device endpoint under `mtls_endpoint_aliases` too. `GET /`
  and the realm `meta.endpoints` do not list it (they enumerate discovery
  documents).
- `client.deviceAuthorization.create` drops the client-level `Authorization`
  header unless `authorizationHeaderInherit` is set, so an authenticated client
  never sends the mixed credentials the server refuses.

**The hosted page.** server-core's `GET /device` hands over to
`@authup/server-auth-console` (render contract 5). `readDeviceUserCode` caps the
code at 16 characters; `federatedLogin` is set only for a uuid `provider`; the
`error` marker set is `access_denied` alone. `ADeviceVerifyForm` is a ladder on
its own `step`: code (always rendered, §3.3.1), login, lookup, MFA when
required, confirm, done. `client.builtIn` is never read.

**Coming back from an identity provider lands on the CODE step, never on the
lookup (#3589).** `authorize-out?user_code=` is an anonymous GET, so an attacker
can mint that link for their own device's code; a victim with upstream SSO
would return signed in, one click from approving it. The person's Confirm click
is the only way to `lookup()`. A failed redemption follows the `/authorize` rule
(see federation.md → *Federated Login Completion*). The provider list waits for
a realm: a list query filtering `realm_id = ''` is a 500 on postgres (uuid
column) on an anonymous route.

**Deliberately absent.** `prompt` / `max_age` / `acr_values` on the device
request (the RFC defines none); a callback-side lookup of the user code (see
federation.md); config keys for lifetime and interval (600 / 5 are the RFC
examples; the upgrade is one `core.deviceCodeMaxAge` entry); CIBA; QR rendering.
A table for the artifact was rejected: a ten-minute blob would cost a migration
and a sweeper. The CLI's `authup login` is a client of this grant
(`apps/authup/src/host/device.ts`); nothing server-side exists for it.
