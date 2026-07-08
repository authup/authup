# OAuth2

Authup implements the OAuth2 (including PKCE) protocol as well as the OpenID specification. The following examples and explanations demonstrate how these flows can be mapped using the Authup API.
For the examples, it is assumed that the backend application is running at `http://localhost:3001`.

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

## Flows

### 1. Password Flow

The Password Grant Flow is used when the client application can directly access the user's credentials. 
This flow allows the client to exchange the user's username and password for an access token. 
It is most often used for trusted applications like mobile apps or desktop apps.

#### Request
To obtain an access token using the Password Grant Flow, send a POST request with the user's credentials:

```shell
curl -X POST 'http://localhost:3001/token' \
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
curl -X POST 'http://localhost:3001/token' \
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
curl -X POST 'http://localhost:3001/token' \
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
curl -X POST 'http://localhost:3001/token' \
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

#### Authorize request

```
GET http://localhost:3001/authorize
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
| `prompt` | Space-delimited list of `login`, `consent`, `select_account`. `select_account` shows a "continue as / use another account" chooser when a session already exists; `login` forces re-authentication; `consent` forces the consent screen. Unknown values are ignored; `none` combined with any other value is an `invalid_request`. Note: `none` (silent authentication) is not yet implemented — it is not advertised in `prompt_values_supported`, and a `prompt=none` request currently renders the interactive page rather than returning an error redirect. |
| `max_age` | Maximum acceptable age (seconds) of the authentication. If the session is older, the user is asked to re-authenticate (`max_age=0` forces it). |
| `login_hint` | Pre-fills the identifier on the login form. |

The freshness window for `prompt=login` is configurable via `promptLoginMaxAge` (see the [server configuration](../deployment/configuration-server-core.md)).

The resulting `id_token` includes the OIDC `auth_time` (the real authentication time) and `sid` (session id) claims.

#### Discovery

Each realm exposes an OpenID Provider metadata document at `GET /realms/<realm>/.well-known/openid-configuration`, advertising the `authorization_endpoint`, `token_endpoint`, `revocation_endpoint` (`/token/revoke`), `end_session_endpoint` (`/logout`), `jwks_uri`, and `prompt_values_supported`.

### 5. RP-Initiated Logout

To end the Authup session when the user logs out of your application, redirect the browser to the `end_session_endpoint` ([OpenID Connect RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)):

```
GET http://localhost:3001/logout
  ?id_token_hint=THE_ID_TOKEN
  &client_id=YOUR_CLIENT_ID
  &post_logout_redirect_uri=https://app.example.com/after-logout
  &state=RANDOM
```

| Parameter | Description |
|---|---|
| `id_token_hint` | An `id_token` previously issued to the user. When its signature verifies (an expired token is accepted) and its subject matches the referenced session, that session is revoked immediately without a confirmation prompt; a subject mismatch is ignored as a no-op. |
| `client_id` | The client requesting logout. Cross-checked against the hint's `aud` when both are present. |
| `post_logout_redirect_uri` | Where to redirect after logout. Honored only when it is an absolute `http(s)` URL matching one of the client's registered `redirect_uri` patterns (open-redirect guard); otherwise ignored. |
| `state` | Opaque value echoed back on the redirect (only alongside a validated `post_logout_redirect_uri`). |

Without a valid `id_token_hint`, `/logout` serves a page asking the user to confirm sign-out; no state is changed until they confirm.
