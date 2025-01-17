<div align="center">

[![Authup banner](./.github/assets/banner.png)](https://authup.org)

</div>

[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

## What is Authup?
Authup is an authentication & authorization system.
It is designed to be easy to use and flexible, with support for multiple authentication strategies.
With Authup, developers can quickly and easily add authentication & authorization to their applications.

**Table of Contents**

- [Features](#features)
- [Documentation](#documentation)
- [Usage](#usage)
- [Packages](#packages)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🌐 **Integration** - Easy integration into existing systems and only use the components you need
- 🛡️ **Identity- & Access-Management** - Manage user identities and control access to resources
- 🏭 **Clustering** - Cluster and scale authup for high availability and performance with Docker/Kubernetes
- ⚡  **Blazing Fast** - Fast and reliable system due to microservice architecture
- ️‍️🕵️‍♀️ **Logging & Monitoring** - Logs and monitors activities and transactions to detect potential security issues
- 👤 **Single-Sign On** - Login once to multiple applications
- 📜 **Standard Protocols** - [LDAP](https://datatracker.ietf.org/doc/html/rfc4511), [OAuth2.0](https://tools.ietf.org/html/rfc6749) & [OpenID Connect](https://openid.net/connect/)
- 👍 **Social Login** - Easy enable social login (GitHub, Google, Facebook, ...)
- 🤝 **Identity Brokering** - OpenID Connect
- 🔓 **Simple claim based** and fully featured **subject and attribute based** authorization
- 🧩 **Isomorphic** & **declarative** permission management. Serialize and share permissions between UI, API & microservices
- 💻 **TypeScript** and **JavaScript** support
- 📚 **Client** libraries
- & much **more**

## Documentation

To read the docs, visit [https://authup.org](https://authup.org)

## Usage

How Authup can be configured and set up in detail, you can find out [here](https://authup.org/guide/deployment/).

### Docker

The **recommended** and optimal way to set up authup is using docker.

To run the backend application with default settings on http://localhost:3001/, execute the following command:

```shell
$ docker run \
  -v authup:/usr/src/writable \
  -p 3001:3000 \
  authup/authup:latest server/core start
```

To run the frontend application with default settings on http://localhost:3000/, execute the following command:

```shell
$ docker run \
  -p 3000:3000 \
  authup/authup:latest client/web start
```

### Bare Metal

The easiest way to get the framework up and running, is by using the global CLI.
Therefore, execute the following shell command.

```shell
$ npx authup@latest start
```

To find out how to configure and set up the bare metal variant in detail, click here.

This will lunch the following application with default settings:
- Frontend Application: `http://localhost:3000/`
- Backend Application: `http://localhost:3001/`

## Packages
The repository contains the following packages:

| Name                                            | Type        | Description                                                                                               |
|-------------------------------------------------|-------------|-----------------------------------------------------------------------------------------------------------|
| [access](packages/access)                       | Library     | A package for evaluating permissions and policies.                                                        |
| [authup](packages/authup)                       | CLI         | A command line interface for interacting with various applications and services within the ecosystem.     |
| [client-web](packages/client-web)               | Application | A web application interface for end users.                                                                |
| [client-web-kit](packages/client-web-kit)       | Library     | A package containing reusable components, composition aids and utilities for the web application.         |
| [client-web-nuxt](packages/client-web-nuxt)     | Library     | A package for the integration in a nuxt web application.                                                  |
| [core-kit](packages/core-kit)                   | Library     | A package providing functions, interfaces and utilities for the core service.                             |
| [core-http-kit](packages/core-http-kit)         | Library     | A package providing a http client with different sub api clients for resources and workflows.             |
| [core-realtime-kit](packages/core-realtime-kit) | Library     | A package for the core socket service.                                                                    |
| [errors](packages/errors)                       | Library     | A package containing error codes and a basic error class.                                                 |
| [kit](packages/kit)                             | Library     | A package containing general (context independent) utilities.                                             |
| [specs](packages/specs)                         | Library     | A package containing constants, interfaces, utils, ... for different specifications.                      |
| [server-core](packages/server-core)             | Service     | A service that forms the backbone of the server-side ecosystem.                                           |
| [server-kit](packages/server-kit)               | Library     | A package containing cryptographic algorithms, reusable abstractions for interacting with services, etc.. |

## Contributing

Before starting to work on a pull request, it is important to review the guidelines for
[contributing](./CONTRIBUTING.md) and the [code of conduct](./CODE_OF_CONDUCT.md).
These guidelines will help to ensure that contributions are made effectively and are accepted.

## Comparison

|                                                 | Authup | Keycloak | Authentic | Authelia |
|:------------------------------------------------|:------:|:--------:|:---------:|:--------:|
| Realm Resources (User, Roles, Permissions, ...) |   ✓    |    ✓     |     ✗     |    ✗     |
| Global Resources (Roles, Permissions, ...)      |   ✓    |    ✗     |     ✓     |    ✓     |
| Modular System                                  |   ✓    |    ✗     |     ✓     |    ✗     |
| Client Library                                  |   ✓    |    ✓     |     ✓     |    ✗     |
| Vue.JS Library                                  |   ✓    |    ✗     |     ✗     |    ✗     |
| OAuth2 Protocol                                 |   ✓    |    ✓     |     ✓     |    ✓     |
| OpenID Connect Protocol                         |   ✓    |    ✓     |     ✓     |    ✓     |
| LDAP Protocol                                   |   ✓    |    ✗     |     ✓     |    ✓     |



## License

Made with 💚

Published under [Apache 2.0 License](./LICENSE).
