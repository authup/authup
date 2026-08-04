# Upgrading

This page collects **action-required** notes for upgrading an existing deployment.
Entries are grouped by release, newest first. Routine changes (features, fixes) live in the
[changelog](https://github.com/authup/authup/blob/master/CHANGELOG.md); anything listed here
either requires operator action or deliberately changes behavior.

## Next release (after v1.0.0-beta.58)

### Security fix: redirect patterns with a host wildcard

A `redirectUri` / `postLogoutRedirectUri` pattern carrying a `*` in its host
(`https://*.example.com/**`) matched more than its host. The matcher treats
`/` as its only boundary, while a URL authority also ends at `?`, `#` and
`\`, so `https://evil.test?.example.com/cb` matched the pattern above and an
authorization code was issued to `evil.test`.

The candidate is now canonicalized before matching, so the string that gets
authorized is the string the browser navigates to. **No action is required**,
and no legitimate redirect stops matching. Three side effects are worth
knowing:

1. A pattern is now matched against the normalized URL, so a host differing
   only in case, an explicit default port (`:443` on https) and `.`/`..`
   segments resolve before comparison. A path-scoped pattern can no longer be
   walked out of with `..`.
2. `**` is no longer accepted inside the host of a pattern. It matches the
   rest of the value outright, so `https://**.example.com/**` read as "any
   subdomain" but accepted every origin. A single `*` is unchanged and still
   means "one host label". A stored pattern is not rewritten; only new writes
   are rejected.
3. `TRUSTED_ORIGINS` rejects the same shape at startup, with a message naming
   the offending value.

### `client/web` was renamed to `client/admin-console`

The rename of the admin console app (`@authup/client-web` →
`@authup/client-admin-console`) reaches the operator surface. There is **no
backwards alias**, and an unknown selector is now a hard error instead of a
silent success:

- **Docker**: `docker run authup/authup client/web start` →
  `client/admin-console start`. The entrypoint used to exit `0` on an unknown
  service, so this previously looked like a healthy container that started
  nothing. It now exits `1`.
- **Launcher config**: a `client.web` section in `authup.conf` is no longer
  read. Rename it to `client.admin-console`, otherwise every key in it
  (`port`, `host`, `apiUrl`, `cookieDomain`) silently falls back to its
  default.
- **CLI**: `authup start client/web` → `authup start client/admin-console`.
- **Binary**: `authup-ui` → `authup-admin-console`.

### `admin-console` and `account-console` are reserved client names

Both names are now provisioned as system clients in every realm. If a client
of either name already exists, **it is taken over** rather than left alone:
the provisioner overwrites `name`, `realmId`, `authMethod`,
`tokenBindingMethod`, `builtIn`, `active`, `grantTypes`, `scope`,
`redirectUri` and `postLogoutRedirectUri`, which makes it a public
(secret-less) auto-consenting client.

Rename any existing client on those names **before** upgrading. Attributes
outside that list (`displayName`, `description`, `accessPolicyId`, junction
rows) are preserved.

### The per-realm `web` client was removed

The shared `web` system client is no longer provisioned. Authup's own
consoles were moved off it earlier (`admin-console` / `account-console`);
it existed purely for downstream applications and was default-on attack
surface (auto-consent + `global` scope in every realm).

**Existing `web` rows are not touched**: logins against them keep working.
Two behavior changes require action:

1. `PUBLIC_URL` / `TRUSTED_ORIGINS` changes no longer propagate to the
   leftover rows; their `redirectUri` / `postLogoutRedirectUri` are
   frozen as-is.
2. Realms created after the upgrade get no `web` client, so a
   `client_id=web` login breaks there.

Register a client of your own instead. To keep the every-realm semantics,
declare it once via a [wildcard realm entry](./provisioning.md#realm-wildcard-name)
(`realms[].attributes.name: "*"`), which also offers a declarative `absent` cleanup for
the leftover `web` rows. `CLIENT_WEB_NAME` was removed from
`@authup/core-kit`, and `web` is a regular, creatable client name again.

## v1.0.0-beta.52 (was: next release after v1.0.0-beta.51)

### Login redirect allowlist — set `TRUSTED_ORIGINS`

Interactive login runs through the authorization-code flow against a per-realm `web` client
whose redirect allowlist is built from the origin of `PUBLIC_URL` plus every entry in
`TRUSTED_ORIGINS` (renamed from `ADDITIONAL_DOMAINS`).

**If your web UI is served from a different origin than `PUBLIC_URL`** (e.g. UI on
`https://app.example.com`, server on `https://auth.example.com`) **you must set**:

```dotenv
TRUSTED_ORIGINS=app.example.com
```

Otherwise every login fails after the redirect with an opaque OAuth2 error. Entries may be
bare hosts (expanded to both `http` and `https`) or full origins; comma-separated.

::: warning Security
Each trusted origin is added to a `builtIn` (auto-consent) client carrying the `global`
scope — an allowlisted origin can obtain full-permission user tokens. Only list origins you
control.
:::

### Refresh-token rotation (hard cutover)

Every `refresh_token` grant now rotates: the presented token is retired and a fresh pair is
issued. Refresh tokens minted **before** the upgrade are rejected with `invalid_grant` —
active users have to sign in once after the upgrade. Replaying an already-consumed refresh
token revokes the whole session family (RFC 6819 §5.2.2.3). A multi-tab tolerance window can
be configured via `TOKEN_REFRESH_GRACE_PERIOD` (seconds, default `0` = strict).

### Access-token TTL default lowered: 3600 → 900 seconds

Shrinks the revocation blind spot for stateless JWKS-verifying adapters. Override via
`TOKEN_ACCESS_MAX_AGE` (seconds) if your deployment depends on longer-lived access tokens.

### Authorize & token flows are realm-bound

An identity can only authorize (or redeem a code / refresh a token) against a client in
**its own realm** — a cross-realm attempt yields `login_required` / `invalid_grant`.
Consequences:

- Master-realm admins can no longer sign into other realms' applications through the
  built-in `web` client; use an identity of the target realm.
- A client identified **by name** at `/authorize` now requires a realm hint
  (`realm_id`), since every realm has a `web` client.

### Implicit & hybrid response types removed

`response_type=code` is the only supported response type (OAuth 2.1 posture). Public clients
must use PKCE and `state` unconditionally; the `id_token` is minted at the `/token` exchange.
RPs still using `token` / `id_token` / hybrid response types must migrate to the code flow.

### RP-initiated logout & discovery corrections

- New `end_session_endpoint`: `GET/POST /logout` (advertised in the realm discovery
  document). Downstream apps should end the shared authup session by redirecting there with
  an `id_token_hint`.
- `post_logout_redirect_uri` is honored only when it matches the client's **new, separate**
  `post_logout_redirect_uri` column — a URI matching only the login `redirect_uri` is
  rejected. Set the column for clients that use post-logout redirects (the provisioned
  `web` client is populated automatically).
- Discovery `revocation_endpoint` was corrected from `…/token` to `…/token/revoke`
  (RFC 7009).

### Minimum password length raised to 10

New password writes (user create/update, registration, password reset) reject values shorter
than 10 characters — configurable via `PASSWORD_MIN_LENGTH`. Existing password hashes keep
verifying; nobody is forced to reset. File-provisioned users whose configured password is
shorter than the floor now fail provisioning validation at startup.

### `Client.grantTypes` is now enforced

A non-null `grantTypes` value (space- or comma-delimited) acts as an allowlist at the
`/token` grants and the `/authorize` code request; violations fail with
`unauthorized_client`. `null` keeps allow-all semantics, so only clients that *set* the
column are affected — review clients that stored decorative values (e.g. a client listing
only `authorization_code` will fail token refreshes until `refresh_token` is added). The
provisioned per-realm `web` client already lists `authorization_code refresh_token`.

### Also notable (no action required)

- **Session management**: `GET/DELETE /sessions` API plus a sessions UI ("This device"
  marker, "log out other devices", admin force-logout).
- **OIDC prompt surface**: `/authorize` supports `prompt` (`none|login|consent|select_account`),
  `max_age` and `login_hint`; the `@authup/client-web-kit` URL builder now defaults to
  `prompt=select_account`, so kit-based apps inherit an account chooser on lingering
  sessions (pass an explicit `prompt` to opt out).
- **id_token claims**: `auth_time` now reflects the real authentication instant and a `sid`
  (session id) claim is included.
