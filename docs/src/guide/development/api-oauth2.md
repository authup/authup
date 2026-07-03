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
