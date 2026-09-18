# authup 💎

[![npm version](https://badge.fury.io/js/authup.svg)](https://badge.fury.io/js/authup)
[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)

This package contains the operator CLI. It runs the authup server
(`@authup/server-core`) **in the same process**: there is no child process and
no supervisor, so signals, the exit code and the environment reach the server
directly. `start` composes the console services (the admin console, the
account console and the hosted auth pages) onto the server's listener.

Authup is designed to be easy to use and flexible, with support for multiple authentication strategies.
With Authup, developers can quickly and easily add authentication & authorization to their applications.


**Table of Contents**

- [Documentation](#documentation)
- [Usage](#usage)
- [Commands](#commands)
- [Login and API requests](#login-and-api-requests)
- [Configuration](#configuration)
- [License](#license)

## Documentation

To read the docs, visit [https://authup.org](https://authup.org)

## Usage

The easiest way to get the framework up and running, is by using the global CLI.
Therefore, execute the following shell command.

```shell
$ npx authup start
```

This launches the server with default settings:
- API: `http://localhost:3000/`
- Admin console: `http://localhost:3000/console/admin`
- Account console: `http://localhost:3000/console/account`

`SIGINT`/`SIGTERM` tear the server down and exit with its outcome. A second
signal exits immediately, and a teardown that outlasts 10 seconds is forced.

## Commands

```shell
$ authup start                 # the API and every enabled console on one listener
$ authup start core            # the API and the IdP alone, mounting no console
$ authup start worker          # the background sweeps alone, with no HTTP listener
$ authup start console         # every enabled console service, each on its own port
$ authup start console admin   # one console service: admin, account or auth
$ authup migration run         # apply pending database migrations
$ authup healthcheck           # probe the running API
$ authup config validate       # report what does not hold in the configuration
$ authup config schema         # print the JSON Schema of authup.yml
```

`start` is the one listener command, and its positional argument is a role:
`core`, `worker` or `console`, the last followed by an optional console name.
A mis-typed role is refused before anything boots: an unknown role
(`authup start server.core`, `authup start client.admin-console`), a name
after a role that takes none (`authup start core admin`), an unknown console
name (`authup start console web`) and a second argument after the console
name. The retired `--worker` flag is refused as well, with a message naming
`authup start worker`.

`authup dev` is the EXPERIMENTAL development variant of `start`; see the
documentation.

## Login and API requests

Use a public OAuth2 client (`authMethod: none`) in the realm you want to manage.
Its `grantTypes` must explicitly include
`urn:ietf:params:oauth:grant-type:device_code`; include `refresh_token` to keep
using the login after the access token expires. A null grant allowlist does
not enable the device flow. Supply the client's UUID, not a client secret.
The signed-in user's permissions still govern every API request.

```shell
# Local server (default http://localhost:3000/)
authup login --client-id <client-uuid>
authup api 'users?page[limit]=10'

# Remote server; --server <url> overrides AUTHUP_SERVER_URL
export AUTHUP_SERVER_URL=https://auth.example.com/
authup login --client-id <client-uuid>
# Open the printed URL in a browser and approve the displayed code.
authup api 'users?filter[name]=alice'
authup api users --method POST --data '{"name":"alice","realmId":"<realm-uuid>"}'
authup api users/<user-uuid> --method POST --data '{"displayName":"Alice"}'
authup api users/<user-uuid> --method DELETE
authup logout
```

For resource operations, use the `resource` prefix:

```shell
authup resource users list --query 'page[limit]=10'
authup resource users get <user-uuid>
authup resource users create --data '{"name":"alice","realmId":"<realm-uuid>"}'
authup resource users update <user-uuid> --data '{"displayName":"Alice"}'
authup resource users delete <user-uuid>
```

Supported resources are `users`, `clients`, `realms`, `roles`, `permissions`,
`policies` and `scopes`. `list`/`get` accept `--query`; `create`/`update` require
a JSON object in `--data`. These commands share authentication and request
handling with `api`; use `api` for other endpoints and workflow operations.

`--scope 'scope-a scope-b'` requests explicit scopes during login. Client scope
restrictions and user permissions are enforced by the server as usual.
API paths are relative to the configured base URL, including any path prefix;
quote query strings so the shell does not interpret brackets. `--method` (`-X`)
defaults to GET; `--data` (`-d`) takes JSON for POST, PUT, PATCH or DELETE.
Successful responses go to stdout as JSON (no output for HEAD or 204).
Progress and errors go to stderr; failures exit nonzero. Requests time out
after 30 seconds and do not follow redirects. Remote servers require HTTPS;
HTTP is accepted for localhost, 127.0.0.1 and [::1].

The default credential store is the OS keychain through `@napi-rs/keyring`:
macOS Keychain, Windows Credential Manager, or Linux Secret Service. Linux
requires a running Secret Service (for example GNOME Keyring or KWallet);
the CLI does not use the temporary kernel keyring. Each normalized server
URL has a separate entry under the `authup` service.

If the keychain is unavailable, use `--credential-store=file` explicitly,
or set `AUTHUP_CREDENTIAL_STORE=file` for all client commands:

```shell
export AUTHUP_CREDENTIAL_STORE=file
authup login --client-id <client-uuid>
authup resource users list
authup logout
```

Keychain errors never silently switch to file storage. File storage uses
`$XDG_CONFIG_HOME/authup/credentials` (fallback `~/.config/authup/credentials`)
with a private directory (0700) and **unencrypted token files** (0600) on
POSIX; Windows access follows the user's filesystem ACLs. Select the same
store for login, requests and logout. Stores are independent; logout removes
the entry from the selected store only.

The CLI refreshes expiring access tokens and saves rotated refresh tokens
before sending an API request. Failed mutations are never automatically replayed.

Only one command per server runs at a time, to prevent refresh-token races.
Ctrl-C releases the lock; after a forced kill or crash, remove the stale lock
named in the error once no command is running. `logout` removes the local
login only; revoke the session on the server to invalidate its tokens.

These client commands select their target through `--server` or
`AUTHUP_SERVER_URL`; they do not read `authup.yml`. `healthcheck` and
`config validate` remain independent of login.

## Configuration

Configuration is read from an `authup.yml` file (current working directory, or
`--configDirectory <dir>` / `--configFile <file>`):

```yaml
# yaml-language-server: $schema=https://authup.org/schema/config.json
publicUrl: http://localhost:3000

core:
    port: 3000
    host: 0.0.0.0
```

The deployment-wide values (`publicUrl`, `db`, `redis`, `smtp`,
`trustedOrigins`, `theme`) sit at the top level, everything the API itself
reads under `core`, and each console under its own
`<name>Console` section.

Every option can be set in the environment instead, and the environment always
wins over the file. `PORT` and `HOST` are ordinary options under that rule, so
a platform that injects `PORT` decides where the server listens.

A `client.admin-console` section is not read: the admin console is served at
`<publicUrl>/console/admin` by its own console service, which `start` composes
onto the server's listener.

## License

Made with 💚

Published under the [AGPL-3.0 License](./LICENSE).
A commercial license is available for organizations that cannot meet the AGPL's conditions,
see [LICENSING.md](../../LICENSING.md) or contact **contact@tada5hi.net**.
