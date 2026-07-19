# Reference: Authentik

- **Project:** [goauthentik/authentik](https://github.com/goauthentik/authentik) — open-source identity provider (Python/Django server, Go outposts, web UI).
- **Docs:** https://docs.goauthentik.io (release notes under `/docs/releases/`).
- **Why referenced:** authup's competitive-parity roadmap is derived from a code-grounded comparison
  against Authentik — index at `.agents/plans/048-authentik-parity-overview.md` (plans 048–067;
  the plans directory is local/gitignored). Facts below were **release-verified 2026-07-10**
  (2024.10 → 2026.5; Authentik shipped ~6 releases/year through 2025, thinning to 2026.2/2026.5).
- **How to maintain:** when you look something up in Authentik's docs/source during authup work,
  add or correct the mapping row here (cumulative — saves the next session the re-search). Pin
  claims to a release version.

## Concept map (Authentik → authup)

| Authentik concept | authup counterpart | Behavioral differences / notes |
|---|---|---|
| Flows & Stages (visual flow designer, stage bindings) | Separate service+controller pairs per journey; SSR auth pages (`apps/server-core/ui`) + kit `Authorize.vue` ladder; OIDC params (`prompt`, `max_age`) for login tiering | Deliberate non-goal (plan 062 §1): no flow engine. Interactive step composition is client-side (kit ladder); server enforcement stays declarative (backstops in `OAuth2Authorization.authorize()`). |
| Policies + bindings + engine mode (ANY/ALL), per-binding `negate`, `failure_result` | `Policy` entity (`@authup/access`): composite policies with `decision_strategy` unanimous/affirmative/consensus; boolean `invert`; bound via `auth_permission_policies` + per-grant `policy_id` | authup **fails closed** on evaluator error and never lets `invert` flip an error into a grant — Authentik's `failure_result: pass` is rejected as an anti-feature. Expression (Python) policies are a non-goal. |
| Property mappings (Python snippets) + source→group correlation | Claim-path mappers: `identity-provider-{attribute,role,permission}-mapping` via `getJWTClaimByPattern` | Declarative JSON-claim-path, not a code sandbox. |
| `UserSourceConnection` | `IdentityProviderAccount` (`findOneByProviderIdentity(provider_id, provider_user_id)`) | Subject-only matching today; email-verified linking + enrollment gating is plan 060. Note: Authentik corrected its OAuth-source `email_verified` default to `false` in **2025.10**. |
| Sources (OAuth/SAML/LDAP/Kerberos/SCIM/Plex/Telegram) | `identity-provider` (oauth2/oidc/ldap + social presets) | Kerberos/SCIM-source are non-goals (plan 062). Generic OAuth2 path reads claims from the access token only — never calls userinfo (plan 060 prerequisite). |
| Providers (OAuth2/OIDC, SAML, LDAP, RADIUS, SCIM, Proxy, RAC, WS-Fed) | `client` (OAuth2/OIDC only) | SAML/LDAP-server/RADIUS/SCIM/RAC/WS-Fed all rejected (plan 062). Forward-auth (≈ Proxy provider) is demand-gated 401-only plan 056. |
| Outposts (managed edge verifiers) | `packages/server-adapter-{kit,node,web,socket-io}` (in-process verification) | authup's embed story replaces the managed-outpost lifecycle. |
| Blueprints (YAML, `!Find`/`!KeyOf` tags) | Provisioning (`core/provisioning/` + `app/modules/provisioning/sources/`): per-entry `strategy`, name-based refs with wildcards, `.ts/.js` file source | Real-code templating beats YAML tags; export CLI is plan 061; `mustCreate`/reconcile-loop rejected. |
| Brands (per-domain: title/logo/favicon/CSS/flows, S3 since 2025.12) | `Realm` (`display_name` only today) | Plan 059 adopts title/logo/accent on Realm; no domain matching, no custom CSS. |
| Authenticator stages: TOTP, WebAuthn/passkeys, Duo, SMS, Static, Email OTP (2025.2), passkey autofill (2025.12) | **None today** (zero MFA) | Plan 049: TOTP+recovery with kind-generic challenge protocol, WebAuthn committed Stage 2, email-OTP option. Duo/SMS out. |
| `acr`/`amr`, step-up | `auth_time` + `sid` on id_token (plans 041/042); `amr`/`acr` = plan 050 | authup uses urn-style acr values; requested acr = step-up trigger, unknown values ignored. |
| Consent stage (always / permanent / expiring; self-service grants UI) | `built_in` auto-consent only; no persisted consent | Plan 055: permanent + revocation ("Applications" tab); expiring offset deferred. Federated logins bypass consent UI (documented exclusion). |
| Reputation policy (±5 bounds), GeoIP + impossible travel (2025.2), lockout | Global identity-aware rate-limit middleware only; dead `AttemptLogin` type | Plan 053: throttle over plan 057's `auth_events`; reputation deferred; GeoIP/impossible-travel rejected (plan 062). |
| Events + notification rules (transports; 365d retention default) | Persisted `auth_events` (plan 057), own storage — retention default 90d since 2026-07-16 (Okta-parity; was 365d Authentik parity), raiseable via `EVENT_LOG_RETENTION_DAYS` | Notification-rules engine rejected (plan 062). |
| Prometheus metrics (port 9300, server/worker/outposts) | `@routup/prometheus` middleware on `/metrics` — but `/authorize`+`/token` are skip-listed | Plan 058 Part 1 un-skips them; separate-port listener declined. |
| Application entitlements (2024.12, `entitlements` claim) | Client-scoped permissions (`permission.client_id`) surfaced via introspection | Per-app claims-in-tokens declared out of plan 052 (future claims-mapping plan if ever). |
| Initial Permissions (2025.4, preview; post-2025.12 RBAC overhaul) | Nothing (realm_scope covers the common case) | Plan 054: opt-in creator grant via `policy_id`+ATTRIBUTES — update/delete only (`preEvaluate` neutral-passes ATTRIBUTES on read paths). |
| RBAC: roles as sole permission carrier (2025.12), group hierarchy | Roles + direct user/client permission junctions with `realm_scope` + per-grant policy | authup keeps direct identity grants; groups hierarchy rejected (plan 062). |
| Device authorization grant (RFC 8628, since ~2022.10) | **Absent** | Plan 065. Authentik hardening precedents: scope clipping + Basic client-id (2025.12), client_secret required for confidential (2026.5). |
| RP-initiated logout: `post_logout_redirect_uri` only since **2026.5** | Shipped (plans 041/042): `end_session_endpoint`, `id_token_hint` verify, dedicated `post_logout_redirect_uri` column | **authup shipped this half first.** |
| Back-channel logout (2025.8 preview → 2025.10 GA), front-channel (2025.10) | `sid` claim ships; no push | Plan 064 (back-channel only; front-channel rejected — iframe tech). |
| Per-provider grant-type configuration (2026.5) | `Client.grant_types` column exists, **metadata-only** | Plan 067 enforces it (null = allow-all). |
| Password policies: complexity+zxcvbn+HIBP (one policy); expiry OSS; history Ent 2025.4 | `UserValidator` `min(3)`; reset flow `min(5)` | Plan 066: NIST-aligned min-length now, optional zxcvbn/HIBP Stage 2; expiry/history rejected (plan 062). |
| Invitation stage (`?itoken=`, single-use, policy-visible) | Self-signup registration only (`RegistrationService`) | No plan; candidate if closed-realm enrollment demand appears. |
| Impersonation (RBAC-gated, reason required since 2024.12) | Absent | Rejected (plan 062): only ever as RFC 8693 `act` semantics after plan 057. |
| SSF/CAEP (Ent 2025.2), mTLS stage (Ent 2025.6), RAC (OSS since 2025.2), Kerberos (2024.10), GWS/Entra sync (Ent), Endpoint devices/Agent (Ent 2025.12+), Account Lockdown (Ent 2026.5) | Absent | All rejected — see plan 062 entries 14–25. |
| Secrets at rest (verified 2026-07-14): TOTP device `key` is a **plaintext** hex CharField (django-otp `TOTPDevice.key`); OAuth2/SAML signing private keys live **plaintext** in the DB `certificates` table (leaked via unauthenticated API in CVE-2024-42490) | TOTP seeds AES-256-GCM-encrypted under the per-realm enc key from the realm key store (`auth_keys` `use=enc`, auto-generated); recovery codes bcrypt; realm key material (`auth_keys.decryption_key`, both sig + enc) is `select:false` and optionally KEK-wrapped at rest via env `SECRETS_ENCRYPTION_KEY` (plaintext base64 when unset) | authup is **stricter than Authentik on MFA seeds**, and — with a KEK set — on realm signing keys too (never exposed via API). Per-realm DB-stored keys are envelope-wrappable (KEK stays in env/vault); see also `.agents/references/keycloak.md`. |

## Capability quick-facts (verified 2026-07-10)

- **Authentik lacks:** PAR (RFC 9126), DPoP (RFC 9449), token exchange (RFC 8693), cert-bound
  tokens (RFC 8705). Its "provider federation" (2024.12) is RFC 7523-style JWT trust, not 8693.
  This is authup's modern-OAuth2 differentiation opening (noted in plan 048).
- **Enterprise-only line (2026.5):** SSF, mTLS stage, GWS/Entra sync, password history, WS-Fed,
  Account Lockdown, Endpoint Devices, CSV event export. Moved Ent→OSS: RAC (2025.2), AKQL (2026.5).
- **Architecture shifts:** Redis fully removed (Postgres-only) 2025.10; Rust worker entrypoint
  2026.5; OpenID conformance testing 2026.2.
