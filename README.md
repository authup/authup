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
    - [ServerUtils](#typescript-authserver-utils-)
  - [Frontend](#frontend)
    - [Vue](#typescript-authvue-)
- [Installation & Usage](#installation--usage)

## Packages

### Common

#### @typescript-auth/domains 🎉
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fdomains.svg)](https://badge.fury.io/js/@typescript-auth%2Fdomains)

The main propose of this package, is to provide general classes, interfaces & types for authorization & authentication.

### Backend

#### @typescript-auth/server ⚔
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver)

This package can be used as simple standalone `server` or as an `extension` to an existent (express) resource API and
should therefore only be used for backend- applications & microservices.

#### @typescript-auth/server-adapter 🌉
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver-adapter.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver-adapter)

The main propose of this package, is to provide middlewares for microservices, which are based on a http (express) or (web-) socket (socket.io) server.

#### @typescript-auth/server-utils 🛡
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fserver-utils.svg)](https://badge.fury.io/js/@typescript-auth%2Fserver-utils)

The main propose of this package, is to provide general utilities for authorization & authentication.

### Frontend

#### @typescript-auth/vue 🏝
[![npm version](https://badge.fury.io/js/@typescript-auth%2Fvue.svg)](https://badge.fury.io/js/@typescript-auth%2Fvue)

This repository contains different vue components for the typescript-auth domain entities.

## Installation & Usage
Please follow the `README.md` instructions in the respective package folder.

