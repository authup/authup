# OAuth2

Authup implements the OAuth2 (including PKCE) protocol as well as the OpenID specification. The following examples and explanations demonstrate how these flows can be mapped using the Authup API.
For the examples, it is assumed that the backend application is running at `http://localhost:3000`.

## Redirect URIs

When registering a client, you can specify one or more allowed redirect URIs (comma-separated).
During authorization, the requested `redirect_uri` is validated against the registered values.

Authup supports wildcard patterns in registered redirect URIs as a convenience feature:

- `*` matches any characters within a single path segment (does not cross `/`)
- `**` matches any characters across path segments

**Examples:**

| Registered URI | Matches |
|---|---|
| `https://example.com/callback` | Exact match only |
| `https://example.com/*` | `https://example.com/callback`, `https://example.com/auth` |
| `https://example.com/**` | `https://example.com/callback`, `https://example.com/auth/done` |

::: warning
Wildcard redirect URIs deviate from [RFC 6749 §3.1.2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2.3), which requires exact string matching. This is acceptable when client registration is restricted to administrators. For production deployments, prefer exact redirect URIs to minimize open-redirect risk.
:::

## Client Secrets

A confidential client (`authMethod: secret`) stores its secret in one of three
modes. The mode is chosen when the client is created, through the two flags
`secretHashed` and `secretEncrypted` (never both):

| Mode | Flags | Stored as | Can it be read back? |
|---|---|---|---|
| `plain` (default) | both `false` | the plaintext | yes, by a reader whose permissions cover the client |
| `hashed` | `secretHashed: true` | a bcrypt hash | no |
| `encrypted` | `secretEncrypted: true` | a cipher blob under the realm's encryption key | yes, by a reader whose permissions cover the client |

Whatever the mode, the stored value is projected only to a reader whose
permissions cover the client, or to the client itself; the hash of a `hashed`
secret is no exception, since a hash of an admin-chosen value is
offline-crackable. A reader outside that reach gets the row without the field.

`encrypted` is the recoverable mode that keeps the plaintext out of the
database. The value is encrypted at rest (AES-256-GCM) under the client
realm's encryption key, the same automatically generated per-realm key that
protects MFA seeds. A reader whose permissions cover the client gets the
decrypted secret back on any read that projects the field
(`?fields=+secret`; the default projection omits `secret`), exactly as for a
`plain` secret; a read never returns the ciphertext. The secret is tied to that key's lifecycle:
while the key is disabled such clients cannot authenticate, and deleting the
key destroys their secrets, so `DELETE /keys/:id` answers `409` while client
secrets reference it and needs `force` to proceed. Set `secretsEncryptionKey`
(`SECRETS_ENCRYPTION_KEY`, see the
[server configuration](../deployment/configuration-server-core.md)) so the
realm key itself is wrapped at rest. Declaring `secretHashed` and
`secretEncrypted` together answers `400`.

The flags are create-time properties. An update (`POST /clients/:id`) ignores
them; the mode changes only through the rotation endpoint, together with a new
secret. A client created in `hashed` or `encrypted` mode answers with the
stored form in `secret` (the hash, or the cipher blob), not with the value you
sent, so keep the plaintext you chose; an encrypted secret can be read back
later with `GET /clients/:id?fields=+secret`.

### Rotating a secret

`POST /clients/:id/secret` replaces the secret and, optionally, the mode. Both
body fields are optional: without `secret` the server generates one, without
`mode` the client keeps its current mode. `mode` is one of `plain`, `hashed`
or `encrypted`.

```shell
curl -X POST 'http://localhost:3000/clients/YOUR_CLIENT_ID/secret' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{ "mode": "hashed" }'
```

```json
{
    "data": {
        "id": "YOUR_CLIENT_ID",
        "name": "acme-app",
        "authMethod": "secret",
        "secretHashed": true,
        "secretEncrypted": false
    },
    "meta": {
        "secret": "GENERATED_PLAINTEXT"
    }
}
```

`meta.secret` is the plaintext, returned in this response only; a hashed
secret cannot be read back later. The previous secret stops working as soon as
the response is sent, so update the application before it next authenticates.
The same route exists under a realm, `POST /realms/:realmId/clients/:id/secret`.

Rotating into `encrypted` mode works the same way, and the secret stays
readable afterwards:

```shell
curl -X POST 'http://localhost:3000/clients/YOUR_CLIENT_ID/secret' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{ "mode": "encrypted" }'
```

```json
{
    "data": {
        "id": "YOUR_CLIENT_ID",
        "name": "acme-app",
        "authMethod": "secret",
        "secretHashed": false,
        "secretEncrypted": true
    },
    "meta": {
        "secret": "GENERATED_PLAINTEXT"
    }
}
```

A client whose `secretEncrypted` flag predates encrypted storage still holds
a plaintext and keeps authenticating with it. Rotating it without a `mode`
stores the new secret encrypted, which is what the flag was meant to say.

The caller needs the `client_update` permission for the client's realm. A
client may rotate its own secret with `POST /clients/@me/secret` under
`client_self_manage`, keeping its current mode; a mode change is an
administrator's call and answers `403` for a self-managing client. A public
client (`authMethod: none`) has no secret and answers `400`.

Every rotation is recorded as a `clientSecretRotated` event in the security
event log. The event carries the mode and never the secret.

### Changing the secret of a plain client

While a client is in `plain` mode, `POST /clients/:id` with a `secret` still
sets a new plaintext. On a hashed or encrypted client the same request answers
`400` and names the rotation endpoint, so an update can never downgrade a
protected secret.

## Flows

### 1. Password Flow

The Password Grant Flow is used when the client application can directly access the user's credentials. 
This flow allows the client to exchange the user's username and password for an access token. 
It is most often used for trusted applications like mobile apps or desktop apps.

#### Request
To obtain an access token using the Password Grant Flow, send a POST request with the user's credentials:

```shell
curl -X POST 'http://localhost:3000/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password' \
  -d 'username=USER_USERNAME' \
  -d 'password=USER_PASSWORD'
```

The user is resolved within a single realm. Pass `realm_id` or `realm_name`
(both accept a realm UUID or name) to select it; when neither is provided —
or the provided value does not match any realm — the **master** realm is
used. In multi-realm deployments, users outside the master realm must
therefore include a realm parameter:

```shell
curl -X POST 'http://localhost:3000/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password' \
  -d 'username=USER_USERNAME' \
  -d 'password=USER_PASSWORD' \
  -d 'realm_id=REALM_ID_OR_NAME'
```

A confidential client authenticating on this grant by **name** must belong to
the same realm as the user; clients identified by UUID are unaffected. The
realm parameter constrains **name** resolution only — a UUID-identified user
is resolved globally by primary key, and the issued token always carries the
user's actual realm.

The same `realm_id` / `realm_name` semantic (master fallback included) applies
on the `authorization_code` and `refresh_token` grants, where it scopes
client-by-name resolution: a client identified by **name** on those grants
resolves within the hinted realm (master when no hint is given). Pass the
realm parameter — or the client's UUID — when the client lives outside the
master realm.

#### Response
```json
{
    "access_token": "ACCESS_TOKEN",
    "token_type": "bearer",
    "expires_in": 3600
}
```

### 2. Client Credentials Flow
The Client Credentials Flow is typically used for machine-to-machine communication, where the application needs to authenticate without the need for user involvement.

#### Request
To obtain an access token using the Client Credentials Flow, send a POST request to the token endpoint:

```shell
curl -X POST 'http://localhost:3000/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials' \
  -d 'client_id=YOUR_CLIENT_ID' \
  -d 'client_secret=YOUR_CLIENT_SECRET'
```

#### Response
```json
{
    "access_token": "ACCESS_TOKEN",
    "token_type": "bearer",
    "expires_in": 3600
}
```

### 3. Refresh Token
If your access token expires, you can use the Refresh Token Flow to obtain a new access token using the refresh token.

#### Request
To request a new access token, use the following POST request:
```shell
curl -X POST 'http://localhost:3000/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=refresh_token' \
  -d 'refresh_token=YOUR_REFRESH_TOKEN'
```

#### Response
```json
{
    "access_token": "***",
    "refresh_token": "xxx",
    "token_type": "bearer",
    "expires_in": 3600
}
```

### 4. Authorization Code Flow (OpenID Connect)

Browser-based applications redirect the user to Authup's hosted `/authorize` page, which handles login and consent. On success the browser is redirected back to the `redirect_uri` with a `code`, which is then exchanged at `/token` (`grant_type=authorization_code`). Public clients must use PKCE (`code_challenge` / `code_verifier`) and `state`.

`response_type=code` is the **only** supported response type (OAuth 2.1 posture): the implicit and hybrid response types (`token`, `id_token`, `none`) are rejected with `unsupported_response_type` — tokens are never delivered via the redirect URL. RPs still relying on implicit must migrate to the code flow with PKCE.

#### Authorize request

```
GET http://localhost:3000/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &realm_id=YOUR_REALM_ID
  &redirect_uri=https://app.example.com/callback
  &scope=global openid
  &state=RANDOM
  &code_challenge=CHALLENGE
  &code_challenge_method=S256
```

The following [OpenID Connect Core §3.1.2.1](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest) parameters are supported:

| Parameter | Description |
|---|---|
| `prompt` | Space-delimited list of `none`, `login`, `consent`, `select_account`. `none` performs silent authentication (no UI): a `built_in` client with a valid, realm-matching session is auto-consented and redirected with a `code`; otherwise the OIDC error (`login_required`, `consent_required`, or `interaction_required`) is redirected to the `redirect_uri`. **`prompt=none` must be driven as a top-level navigation, not a hidden iframe** — the authorize page sends `X-Frame-Options: DENY` / `frame-ancestors 'none'`, so the classic iframe silent-renew pattern is blocked. `select_account` shows a "continue as / use another account" chooser when a session already exists; `login` forces re-authentication (with a banner); `consent` forces the consent screen. Unknown values are ignored; `none` combined with any other value is an `invalid_request`. |
| `max_age` | Maximum acceptable age (seconds) of the authentication. If the session is older, the user is asked to re-authenticate (`max_age=0` forces it). |
| `login_hint` | Pre-fills the identifier on the login form. |

The freshness window for `prompt=login` is configurable via `promptLoginMaxAge` (see the [server configuration](../deployment/configuration-server-core.md)).

The resulting `id_token` includes the OIDC `auth_time` (the real authentication time) and `sid` (session id) claims.

#### Discovery

Each realm exposes an OpenID Provider metadata document at `GET /realms/<realm>/.well-known/openid-configuration`, advertising the `authorization_endpoint`, `token_endpoint`, `revocation_endpoint` (`/token/revoke`), `end_session_endpoint` (`/logout`), `jwks_uri`, `prompt_values_supported`, and the two back-channel logout flags `backchannel_logout_supported` and `backchannel_logout_session_supported` (both `true`, see [Back-Channel Logout](#7-back-channel-logout)).

The management read of a realm, `GET /realms/:id`, carries the three values an integrator copies out of that document under `meta.endpoints`: `issuer`, `openidConfiguration` and `jwks`. They are derived from the deployment's public url and the realm name, so a renamed realm answers with a new issuer. The realm collection, `GET /realms`, does not carry them: derive them from `<publicUrl>/realms/<name>` (the issuer; the discovery document and the JWKS sit under it) or read the record. The admin console shows them on the realm's page.

### 5. Federated login (external identity providers)

Nothing changes for a relying party when the person signs in through an
external identity provider. The application sends the same authorization
request, the person picks a provider on the hosted `/authorize` page instead of
typing a password, and the `code` arrives at the application's `redirect_uri`
exactly as it does for any other login. The provider round-trip happens between
Authup and that provider; the application never sees it.

Two things are worth knowing when reading the resulting tokens:

- `amr` is `["ext"]`: the subject authenticated at an external provider. It
  carries `"otp"` in addition when a second factor was verified.
- `acr` is absent for a federated login that verified no local factor. Authup
  checked no credential of its own, so it asserts no authentication context
  class. A password login reports `urn:authup:pwd`, and any login that verified
  a factor reports `urn:authup:mfa`.

Authup does not require its own second factor on top of a federated login,
because the provider is the authentication authority (see
[Identity Providers](../user/identity-providers.md)). An application that needs
a proof regardless can request one:

```http
GET /authorize?...&acr_values=urn:authup:mfa
```

Per [OpenID Connect Core §5.5.1.1](https://openid.net/specs/openid-connect-core-1_0.html#acrSemantics)
this is voluntary, so read the `acr` you get back rather than assuming the
request was satisfiable: a person who holds no factor at all cannot produce
one, and the token then reports what was actually achieved.

### 6. RP-Initiated Logout

To end the Authup session when the user logs out of your application, redirect the browser to the `end_session_endpoint` ([OpenID Connect RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)):

```
GET http://localhost:3000/logout
  ?id_token_hint=THE_ID_TOKEN
  &client_id=YOUR_CLIENT_ID
  &post_logout_redirect_uri=https://app.example.com/after-logout
  &state=RANDOM
```

| Parameter | Description |
|---|---|
| `id_token_hint` | An `id_token` previously issued to the user. When its signature verifies (an expired token is accepted — bounded by `endSessionHintGracePeriod` / `END_SESSION_HINT_GRACE_PERIOD` when configured, unbounded by default) and its subject matches the referenced session, that session is revoked immediately without a confirmation prompt; a subject mismatch is ignored as a no-op. |
| `client_id` | The client requesting logout. Cross-checked against the hint's `aud` when both are present — note `aud` carries the client's **id**, so a name-identified `client_id` will not match a hint's `aud`. |
| `post_logout_redirect_uri` | Where to redirect after logout. Honored only when it is an absolute `http(s)` URL matching one of the client's registered `post_logout_redirect_uri` patterns (a dedicated allow-list, separate from the login `redirect_uri`; same comma-separated wildcard syntax; open-redirect guard); otherwise ignored. |
| `state` | Opaque value echoed back on the redirect (only alongside a validated `post_logout_redirect_uri`). |

Without a valid `id_token_hint`, `/logout` serves a page asking the user to confirm sign-out; no state is changed until they confirm. The same applies when the request is malformed (oversized parameters, an invalid `post_logout_redirect_uri`): every parameter is discarded and the neutral confirm page is served. The `realm_id` / `realm_name` hint (scoping a name-identified `client_id`) is case-insensitive.

### 7. Back-Channel Logout

RP-initiated logout lets your application end the Authup session. Back-channel
logout ([OpenID Connect Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html))
is the other direction: Authup tells your application when a session it
received tokens for was ended elsewhere, by the user on the account console,
by an administrator, by another application's logout, or by refresh-token
replay detection.

#### Registering the endpoint

Set the client's `backchannelLogoutUri` (admin console client form, or
`POST /clients/:id` with `{"backchannelLogoutUri": "https://app.example.com/logout/backchannel"}`).
It is one absolute `http(s)` URL of at most 2000 characters, not a pattern
list: no wildcards, no comma-separated values. `null` (the default, and what
the provisioned system clients keep) disables the push for that client.

#### The request

Authup sends one request per affected client:

```http
POST /logout/backchannel HTTP/1.1
Host: app.example.com
Content-Type: application/x-www-form-urlencoded

logout_token=eyJhbGciOi...
```

`logout_token` is a JWT signed with the active signing key of your client's
realm, the realm named in `iss`, so it is verifiable against that realm's
`jwks_uri`. Verify it the way the specification asks (section 2.6):

| Claim | Value |
|---|---|
| `iss` | The realm issuer, as in every other token of that realm |
| `aud` | Your client's id |
| `sub` | The subject the session belonged to |
| `sid` | The session id, matching the `sid` of the id_tokens that session issued |
| `events` | `{"http://schemas.openid.net/event/backchannel-logout": {}}` |
| `iat`, `exp`, `jti` | Issued at, expiry (2 minutes after issue), a unique id to reject replays |
| `kind` | `logout_token`. No Authup endpoint accepts a token of this kind as a bearer |

A logout token never carries a `nonce`; refuse one that does, since it could be
an id_token in disguise. The `typ: logout+jwt` header is not set yet, so do not
require it. Answer with any `2xx` once the local session for `sid` is ended.
Applications that keep no per-session state can key on `sub` and end every
session of that user.

#### When it fires

- `DELETE /sessions/:id` and `DELETE /sessions` (the account console's "log
  out other devices", an administrator's force-logout, the sessions UI);
- `/logout` with a verified `id_token_hint`, once the hosted sign-out page
  has confirmed it: the `GET` and `form_post` bindings are browser
  navigations that hand over to that page, and the revoke runs on the JSON
  call the page makes;
- the refresh-token replay reaction, which revokes the whole session.

A session that simply expires sends nothing: its tokens expire with it.
Revoking a single token (`POST /token/revoke`) sends nothing either, because
the session stays alive.

#### Best effort

Delivery is awaited but never blocks the logout: every affected client is
notified concurrently, each request times out after 5 seconds, and a client
that is unreachable or answers a non-`2xx` status is logged on the server and
otherwise ignored. The API call that ended the session succeeds regardless.
Do not treat a missing push as proof that the session is still alive.

Every delivery is recorded in the security event log
(`GET /events?filter[name]=backchannelLogout` for the pushes that landed,
`filter[name]=backchannelLogoutFailed` for the ones that did not). A row
names the client and the ended session, and its `data.jti` is the `jti` of
the logout token, so it can be matched against your application's own log of
the tokens it received. A failed row carries the `status` your endpoint
answered with, or the `errorCode` when no answer arrived (`ECONNREFUSED`,
`ENOTFOUND`, `TimeoutError` after the 5 seconds); one carrying no `jti` at
all is a token that could never be signed, so nothing was sent to you. The
rows are attributed to the user who was signed out, not to your client, so
your own client credentials list none of them: reading another subject's
rows takes the `EVENT_READ` permission, an administrator's. Clients without
a `backchannelLogoutUri` are never contacted and leave no row.
