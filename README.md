# authup 🎴	

[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

`Authup` is an authentication & authorization system.
It is designed to be easy to use and flexible, with support for multiple authentication strategies.
With Authup, developers can quickly and easily add authentication & authorization to their applications.

**Table of Contents**

- [Features](#features)
- [Documentation](#documentation)
- [Usage](#usage)
- [License](#license)

## Features

- 🛡️ **Identity- & Access-Management** - Manage user identities and control access to resources
- 🏭 **Clustering** - Cluster and scale authup for high availability and performance
- 🚀 **Fast & Reliable** - Fast and reliable system due to microservice architecture
- ️‍️🕵️‍♀️ **Logging & Monitoring** - Logs and monitors activities and transactions to detect potential security issues
- **Single-Sign On** - Login once to multiple applications
- 📜 **Standard Protocols** - [OAuth2.0](https://tools.ietf.org/html/rfc6749) & [OpenID Connect](https://openid.net/connect/)
- 👍 **Social Login** - Easy enable social login
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

### Docker

The **recommended** and optimal way to set up authup is using one or more docker container instances.

```shell
$ docker run authup/authup:latest 
  -v authup:/usr/src/writable
  -p 3000:3000 # Mount ui port 3000 to external port 3000
  -p 3001:3001 # Mount api port 3001 to external port 3001
  cli start
```

This will lunch the following application with default settings:
- Frontend Application: `http://localhost:3000/`
- Backend Application: `http://localhost:3001/`

## Contributing

Before starting to work on a pull request, it is important to review the guidelines for
[contributing](./CONTRIBUTING.md) and the [code of conduct](./CODE_OF_CONDUCT.md).
These guidelines will help to ensure that contributions are made effectively and are accepted.


## License

Made with 💚

Published under [MIT License](./LICENSE).
