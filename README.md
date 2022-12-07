# authup 💎	

[![main](https://github.com/Tada5hi/authup/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/authup/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/authup/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/authup)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/authup/badge.svg)](https://snyk.io/test/github/Tada5hi/authup)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

`Authup` is an authentication & authorization framework.

**Table of Contents**

- [Features](#features)
- [Documentation](#documentation)
- [Usage](#usage)
- [License](#license)

## Features

- **Single-Sign On** - Login once to multiple applications
- **Standard Protocols** - [OAuth2.0](https://tools.ietf.org/html/rfc6749) & [OpenID Connect](https://openid.net/connect/)
- **Social Login** - Easy enable social login
- **Identity Brokering** - OpenID Connect
- **Simple claim based** and fully featured **subject and attribute based** authorization
- **Isomorphic** & **declarative** permission management. Serialize and share permissions between UI, API & microservices
- **TypeScript** and **JavaScript** support
- & much **more**

## Documentation

To read the docs, visit [https://authup.org](https://authup.org)

## Usage

The easiest way to get the framework up and running, is by using the global CLI.
Therefore, execute the following shell command.

```shell
$ npx authup start
```

This will lunch the following application with default settings:
- Frontend Application: `http://localhost:3000/`
- Backend Application: `http://localhost:3010/`

To customize the settings follow the [documentation](#documentation).

## License

Made with 💚

Published under [MIT License](./LICENSE).
