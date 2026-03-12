# OAuth2

Authup implements the OAuth2 (including PKCE) protocol as well as the OpenID specification. The following examples and explanations demonstrate how these flows can be mapped using the Authup API.
For the examples, it is assumed that the backend application is running at `http://localhost:3001`.

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
