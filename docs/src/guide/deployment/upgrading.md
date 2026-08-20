# Upgrading

This page collects **action-required** notes for upgrading an existing deployment.
Entries are grouped by release, newest first. Routine changes (features, fixes) live in the
[changelog](https://github.com/authup/authup/blob/master/CHANGELOG.md); anything listed here
either requires operator action or deliberately changes behavior.

## Next release (after v1.0.0-beta.62)

### Docker: the writable directory moved to `/var/lib/authup`

The image wrote its runtime files to `/usr/src/app/writable`, inside the
application install directory. It now uses `/var/lib/authup`, which is where
the filesystem hierarchy standard puts mutable application state and which is
a cleaner mount point than a path nested in the install tree.

**Action required if you mount a volume at the old path.** Update the mount
target; the volume itself is unchanged.

```diff
 volumes:
-  - authup:/usr/src/app/writable
+  - authup:/var/lib/authup
```

The same applies to a bind-mounted provisioning directory:
`-v /path/to/provisioning:/var/lib/authup/provisioning`.

Miss this and nothing fails loudly: the container starts, writes its
production log files inside the container layer instead of the volume, and
finds no provisioning files, so file-based provisioning silently stops being
applied. Set `WRITABLE_DIRECTORY_PATH=/usr/src/app/writable` to keep the old
location instead.

Only the image default changed. Running outside Docker still defaults to
`writable` relative to the application root, so an unprivileged `npx` or
bare-metal start is unaffected.

### A relative `writableDirectoryPath` now resolves against `rootPath`

The documented behavior - a relative path is resolved against `rootPath` -
was implemented for `themeDirectoryPath`, `authConsolePath` and
`accountConsolePath` but not for `writableDirectoryPath`, which stayed
relative to the process working directory and ignored `rootPath` entirely.
It now resolves like its siblings.

This only changes behavior for a deployment that sets `rootPath` to something
other than the working directory **and** gives `writableDirectoryPath` a
relative value. Absolute values, and the default, are unaffected.

### `GET /identity-providers/:id` now requires authentication

The endpoint was anonymous. It now requires an identity holding one of
`IDENTITY_PROVIDER_READ`, `IDENTITY_PROVIDER_UPDATE` or
`IDENTITY_PROVIDER_DELETE` for that provider's realm. A request without a
token answers `401`; an authenticated caller lacking the permission answers
`403` with code `permission_evaluation_failed`.

The record read carries the provider's extra attributes, which for an OAuth2
provider include `clientSecret` and for an LDAP provider the bind password.
The previous behavior handed those to anyone who knew a provider id.

**Action required only if you read a single provider without a token.** The
collection stays anonymous, because the hosted login page lists providers
before anyone signs in, and it never carries the extra attributes. Read the
one provider from it instead:

```http
GET /identity-providers?filter[id]=<provider-id>
GET /identity-providers?filter[name]=<provider-name>
```

Both key forms the record route accepted are filterable, so a caller
addressing a provider by name has a substitute too.

## v1.0.0-beta.62

### `auth_identity_provider_accounts` gains a unique constraint

`(provider_id, provider_user_id)` becomes unique, so one external identity
belongs to exactly one local user. Until now that invariant was enforced only
by a read-then-write in the application, with no transaction and no row lock,
so two concurrent logins or link completions for the same upstream subject
could both insert. After that the subject resolved to whichever row the
database happened to order first.

**Action required only if your deployment already holds such duplicates.**
The migration checks first and aborts the boot with the number of affected
groups rather than a hash-named driver error. Find them with:

```sql
SELECT provider_id, provider_user_id, COUNT(*)
FROM auth_identity_provider_accounts
GROUP BY provider_id, provider_user_id
HAVING COUNT(*) > 1;
```

Keep the row whose `user_id` names the account the person actually uses, and
delete the rest. The unique index cannot be created while duplicates exist,
so the boot would fail either way; the check only makes the reason readable.

### Federated login: completion hardening

- A federated login must carry the authorization code request it completes.
  `GET /identity-providers/:id/authorize-out` refuses a request without
  `codeRequest` (`invalid_request`). SDK consumers building their own login
  page pass it through the client:
  `client.identityProvider.getAuthorizeUri(id, { codeRequest })`; the bare
  `getAuthorizeUri(id)` URL no longer starts a login on its own.
- The callback completes the request by redirecting the browser to the
  client's own `redirect_uri` with `code` and `state` (RFC 6749). A refusal
  after the callback lands on the hosted login page instead of a JSON body,
  and a provider answering with `error` (the user cancelled) does the same.
- A custom-scheme `redirect_uri` (`myapp://cb`, RFC 8252) is served through
  an interstitial page that launches the app. Script-capable and local
  schemes (`javascript:`, `data:`, `vbscript:`, `blob:`, `filesystem:`,
  `file:`, `about:`) are refused everywhere: as a client redirect pattern, at
  `/authorize`, and at the callback.
- A `redirectUri` / `postLogoutRedirectUri` pattern carrying userinfo
  (`https://user:pass@app/**`) is refused by the client validator, as is a
  `redirect_uri` carrying one at `/authorize` and `/logout`. An existing
  client row holding such a pattern cannot be saved again until the pattern
  is fixed, and a provisioning file declaring one fails the boot with the
  file path and the issue.
- The pending-login state a federated login or an account link carries
  moved to its own cache namespace, so a login or link started on the
  previous version and completed after the upgrade is refused
  (`invalid_request`, up to the 30 minute state lifetime); the person starts
  it again. Relevant for a rolling upgrade over a shared Redis only.
- The identity-provider form's read-only "Redirect URL" now shows the
  callback (`/identity-providers/<id>/authorize-in`), the value to register
  at the external provider. It used to show `authorize-out`, which is the
  URL that starts a login, not the one the provider redirects back to.
- A substituted auth console package (`AUTH_CONSOLE_PATH`) must be built
  against render contract version 2, which adds the interstitial route
  `/identity-providers/:id/authorize-in` and its `IdentityProviderCallbackPayload`;
  a package exporting an older `CONTRACT_VERSION` is refused at boot.

## v1.0.0-beta.60

### Fixed: external identity-provider login

The token exchange against an external OAuth2 / OIDC provider never sent the
`code` parameter, so **every federated login has failed since
v1.0.0-beta.28** with an `invalid_request` from the provider's token
endpoint. The callback passed the raw code string where the authenticator
expected `{ code }`, and the HTTP client spread it into indexed body keys
(`0=d&1=b&...`). **No action is required** beyond upgrading. A callback that
arrives without a code is now rejected with a `400` instead of an opaque
upstream failure.

### `auth_sessions.client_id` is the client-subject foreign key only

One browser session legitimately serves several applications (the hosted auth
pages and the account console share the IdP origin by design), so a single
column could never name all of them: it was last-writer-wins and accurate for
none. Per-application attribution moved one level down, onto
`auth_session_tokens.client_id`.

`auth_sessions.client_id` now means what its foreign key always implied — the
subject of a **client** session — and is `NULL` for a user's session. Nothing
writes the authorizing application there anymore.

- **Runbooks that sign an identity out of one application must change**:
  `DELETE /sessions?filter[clientId]=...` no longer matches user sessions.
  Use `DELETE /session-tokens?filter[clientId]=...`, which revokes that
  application's tokens and leaves the session alive so the others stay signed
  in. To sign an identity out everywhere, filter by `userId` instead.
- **Sessions created before the upgrade keep the old value.** No backfill
  ships, because the column is behind `ON DELETE CASCADE`: until those rows
  expire (session lifetime, three days by default), deleting a retired client
  still force-logs-out the users whose sessions recorded it. Either wait out
  the lifetime before deleting a client, or run
  `UPDATE auth_sessions SET client_id = NULL WHERE sub_kind <> 'client'`.

### Schema migration: constraint names, MySQL column widths, 140 indexes

Two migrations apply. Both are safe to run on a populated database, and the
round trip is verified in CI against MySQL and PostgreSQL, but the second one
is not instant on a large instance. **Run `authup migration run` before the
rolling restart** rather than letting the first pod apply it under traffic.

- Index, unique and foreign-key names move onto the values TypeORM derives
  from the entity metadata. Names have no runtime meaning; this only ends a
  split where two naming regimes coexisted and every generated migration
  emitted 32 renames before its actual change.
- **MySQL only**: 15 `uuid` columns widen from `varchar(36)` to the
  `varchar(255)` TypeORM derives for them. This rewrites those tables, blocks
  writes for the duration and needs disk headroom for the copy. It runs first
  and is re-runnable, so an interrupted upgrade retries cleanly.
- 140 indexes are added, backing the filter and sort vocabulary each entity
  advertises (see below) and the remaining foreign-key columns. On PostgreSQL
  the migrations run in one transaction, so the largest tables
  (`auth_events`, `auth_sessions`, `auth_session_tokens`) are locked for the
  duration of the build.
- Three orphaned tables are **dropped with their rows**:
  `auth_authorization_codes`, `auth_refresh_tokens` and
  `auth_identity_provider_roles`. Each was superseded years ago (codes moved
  to cache blobs, refresh tokens to `auth_session_tokens`, provider roles to
  `auth_identity_provider_role_mappings`) and no entity has described them
  since. Back them up first if you still read them out of band.

### API: `meta.schema.sort` is now `meta.schema.sorts`

The query-capable `GET` endpoints describe their vocabulary under
`meta.schema`. Its sort key was renamed `sort` → `sorts` (rapiq 2.1.0, which
made `sorts` canonical on every developer-authored surface). **A client that
reads `meta.schema.sort` must follow**; there is no alias. The `?sort=-name`
URL parameter is unchanged.

Filters and sorts are also index-anchored now: every key an endpoint allows
is backed by a real index, so single-key filters and sorts behave exactly as
before. The one narrowing is a **multi-key sort** with no matching composite
index prefix, which is now dropped whole rather than executed — the request
still succeeds, unsorted.

## v1.0.0-beta.59

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

1. Both the request and the stored pattern are normalized before comparison,
   so a host differing only in case, an explicit default port (`:443` on
   https) and `.`/`..` segments resolve on either side. A path-scoped pattern
   can no longer be walked out of with `..`, and a pattern that was written
   non-canonically (`https://APP.example.com/**`, `https://app.example.com:443/**`)
   now matches the requests it always looked like it should.
2. `**` is no longer accepted inside the host of a pattern. It matches the
   rest of the value outright, so `https://**.example.com/**` read as "any
   subdomain" but accepted every origin. A single `*` is unchanged: it matches
   any run of characters that does not cross a `/`, so it spans dots and
   `https://*.example.com/**` covers `https://a.b.example.com/cb` as well as
   `https://a.example.com/cb`. A stored pattern is not rewritten; only new
   writes are rejected.
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
