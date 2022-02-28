# @typescript-auth ⛩	

[![main](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/typescript-auth/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/typescript-auth)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/typescript-auth/badge.svg)](https://snyk.io/test/github/Tada5hi/typescript-auth)

This monorepo contains different auth packages for frontend and backend.

**Table of Contents**

- [Packages](#Packages)
  - [Common](#common)
    - [Domains](#typescript-authdomains-)
  - [Backend](#backend)
    - [Server](#typescript-authserver-)
    - [ServerAdapter](#typescript-authserver-adapter-)
    - [ServerCore](#typescript-authserver-core-)
    - [ServerUtils](#typescript-authserver-utils-)
  - [Frontend](#frontend)
    - [Vue](#typescript-authvue-)
- [Installation & Usage](#installation--usage)

## Packages

### Common

#### @typescript-auth/domains 🎉
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fdomains.svg)](https://badge.fury.io/js/@typescript-auth%2Fdomains)

The main propose of this package, is to provide general classes, interfaces & types for all packages.

[README.md](https://github.com/Tada5hi/typescript-auth/tree/master/packages/common/domains#README.md)

### Backend

#### @typescript-auth/server ♟
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver)

This package contains a simple standalone server.

[README.md](https://github.com/Tada5hi/typescript-auth/tree/master/packages/backend/server#README.md)

#### @typescript-auth/server-adapter 🌉
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver-adapter.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver-adapter)

The main propose of this package, is to provide middlewares for microservices, which are based on a http (express) or (web-) socket (socket.io) server.

[README.md](https://github.com/Tada5hi/typescript-auth/tree/master/packages/backend/server-adapter#README.md)

#### @typescript-auth/server-core 🍀
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver-core.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver-core)

This package should be used as an extension to an existing (express) application and
should therefore only be used on the server-side.

[README.md](https://github.com/Tada5hi/typescript-auth/tree/master/packages/backend/server-core#README.md)

#### @typescript-auth/server-utils 🛡
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver-utils.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver-utils)

The main propose of this package, is to provide general utilities for authorization & authentication.

[README.md](https://github.com/Tada5hi/typescript-auth/tree/master/packages/backend/server-utils#README.md)

### Frontend

#### @typescript-auth/vue 🏝
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fvue.svg)](https://badge.fury.io/js/@typescript-auth%2Fvue)

This repository contains different vue components for the domain entities.

[README.md](https://github.com/Tada5hi/typescript-auth/tree/master/packages/frontend/vue#README.md)

## Installation & Usage
Please follow the `README.md` instructions in the respective package folder.

