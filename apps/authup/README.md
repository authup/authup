# authup 💎

[![npm version](https://badge.fury.io/js/authup.svg)](https://badge.fury.io/js/authup)
[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)

This package contains the CLI — a thin supervisor that boots the authup applications
(`@authup/server-core`, `@authup/client-web`) as child processes.

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

This will launch the following applications with default settings:
- Frontend Application: `http://localhost:3000/`
- Backend Application: `http://localhost:3001/`

The CLI forwards `SIGINT`/`SIGTERM` to both applications and exits with the
first application's exit code when one of them stops.

## Commands

```shell
$ authup start                 # start server-core and client-web
$ authup start server.core     # start a subset (client.web, server.core)
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

client.web.port=3000
client.web.host=0.0.0.0
client.web.apiUrl=http://localhost:3001
client.web.cookieDomain=example.com
```

The `server.core` section is passed through to the server process
(`--configFile`/`--configDirectory` are forwarded as well); the `client.web`
section is mapped onto the web application's environment
(`PORT`, `HOST`, `NUXT_PUBLIC_API_URL`, `NUXT_PUBLIC_COOKIE_DOMAIN`).
When `client.web.apiUrl` is not set, it is derived from `server.core.publicUrl`.

## License

Made with 💚

Published under the [AGPL-3.0 License](./LICENSE).
A commercial license is available for organizations that cannot meet the AGPL's conditions —
see [LICENSING.md](../../LICENSING.md) or contact **contact@tada5hi.net**.
