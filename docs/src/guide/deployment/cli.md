# Sign-in and entity commands

The `authup` binary is also a client of a running deployment. `authup login`
signs it in through the device authorization grant, and then one command per
entity reads and manages records over the same typed client the consoles use.

## Sign in

Create a public OAuth2 client (`authMethod: none`) in the realm the CLI users
belong to and list the device grant on it: `grantTypes` must name
`urn:ietf:params:oauth:grant-type:device_code`, and `refresh_token` keeps the
sign-in alive past the access token's fifteen minutes. The grant is opt-in per
client (see [Device Authorization Grant](../development/api-oauth2.md#_8-device-authorization-grant-rfc-8628)).
There is deliberately no provisioned client for the CLI: the client's access
policy is how an operator decides who may sign the CLI in, and a client authup
provisioned into every realm would sit outside it.

```shell
authup login --server https://auth.example.com --client cli --realm master
```

`--client` takes the client's UUID, or its name together with `--realm` (a
name repeats per realm; without a realm the master realm is assumed). Both are
remembered per server, so a later `authup login` to the same server needs no
flags. `--server` falls back to `AUTHUP_SERVER_URL`, then to the server of the
last login. Plain `http:` is accepted for `localhost` only.

The command prints the verification URL and the code; open the URL, sign in
and confirm the code. The CLI polls until the approval lands.

## Where the tokens live

The tokens go into the OS keychain: macOS Keychain, Windows Credential
Manager, or Secret Service on Linux (GNOME Keyring, KWallet). A host with no
keychain, an SSH session for instance, signs in with

```shell
authup login --insecure-storage
```

which keeps the tokens in the hosts file instead, `0600`, next to the entry
that names the client. The choice is recorded with the entry, so no later
command needs the flag. A keychain that cannot be opened is an error; the CLI
never falls back to the file on its own.

Everything else lives in `$XDG_CONFIG_HOME/authup/hosts.json` (default
`~/.config/authup/hosts.json`): one entry per server with the client, the realm
and the storage, plus which server is current.

## Entity commands

Every entity the API serves is a command, named in kebab-case: `user`,
`client`, `realm`, `role`, `permission`, `policy`, `scope`, `key`,
`trust-anchor`, `session`, `session-token`, `event`, `consent`,
`identity-provider`, `identity-provider-account`,
`identity-provider-role-mapping`, `client-permission`, `client-role`,
`client-scope`, `role-permission`, `user-role`, `user-permission`,
`role-attribute`, `user-attribute`, `user-authenticator`, `permission-policy`.
Each carries the verbs its API has: `list`, `get <id>`, `create`,
`update <id>`, `delete <id>`. A session cannot be created here and a
`user-role` binding cannot be updated, because the API has no such call;
`authup <entity> --help` lists what exists.

```shell
authup user list --filter 'name=~ali&realm.name=master' --sort -createdAt --limit 10
authup user get 3f2a... --include realm
authup user create --data '{"name":"alice","realmId":"..."}'
authup user update 3f2a... --data @alice.json
authup user delete 3f2a...
```

`--filter`, `--sort`, `--fields` and `--include` take the values the
[API query language](../development/api-query-language.md) documents; several
filter conditions ride one `--filter`, joined by `&`. `--data` holds a JSON
object inline, `@<path>` reads a file, `@-` reads stdin. The response body is
printed as JSON, so `authup user list | jq '.data[].name'` composes. The
signed-in user's permissions govern every call, as they do in the consoles.

## Who am I, and signing out

```shell
authup whoami
authup logout
```

`whoami` names the signed-in user, the realm, the server, the client and
where the tokens are kept. `logout` revokes the access and the refresh token
and forgets the server. It does not end the browser session the approval
came from: the device grant's tokens share that session, so ending it would
sign the browser out too.

An access token that lapsed is renewed with the refresh token on the next
command, and the rotated pair replaces the stored one. Two commands renewing
at the same moment take a lock, so a refresh token is never presented twice.
