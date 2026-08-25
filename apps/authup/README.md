# authup 💎

[![npm version](https://badge.fury.io/js/authup.svg)](https://badge.fury.io/js/authup)
[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)

This package contains the CLI: a thin supervisor that boots the authup server
(`@authup/server-core`) as a child process. The server serves the admin console,
the account console and the hosted auth pages itself.

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
- API: `http://localhost:3001/`
- Admin console: `http://localhost:3001/admin`
- Account console: `http://localhost:3001/account`

The server always receives its `PORT`/`HOST` from the CLI (see
[Configuration](#configuration)), so an ambient `PORT` in the environment
cannot decide where it listens.

The CLI forwards `SIGINT`/`SIGTERM` to the server and exits `0` once it stops;
when the server stops on its own, the CLI exits with its exit code.

## Commands

```shell
$ authup start                 # start server-core (which serves every console)
$ authup start server.core     # the same; `client.admin-console` alone warns and starts nothing
$ authup migration run         # forwarded to server-core only
$ authup healthcheck           # forwarded to server-core only
```

## Configuration

Configuration is read from an `authup.conf` file (current working directory, or
`--configDirectory <dir>` / `--configFile <file>`):

```conf
server.core.port=3001
server.core.host=0.0.0.0
server.core.publicUrl=http://localhost:3001
```

The `server.core` section is passed through to the server process
(`--configFile`/`--configDirectory` are forwarded as well). A
`client.admin-console` section is read and answered with a warning: the admin
console is served by server-core at `<publicUrl>/admin` and no longer runs as
its own process.

The application otherwise inherits the CLI's environment, with one deliberate
exception: `PORT` and `HOST` are **always** set, from the section above or
from the defaults shown there. Without that, an ambient `PORT` (a PaaS
injects one) would decide where the server listens and the
second one would fail to bind.

## License

Made with 💚

Published under the [AGPL-3.0 License](./LICENSE).
A commercial license is available for organizations that cannot meet the AGPL's conditions —
see [LICENSING.md](../../LICENSING.md) or contact **contact@tada5hi.net**.
