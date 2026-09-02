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
