# @authelion ⛩	

[![main](https://github.com/Tada5hi/authelion/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/authelion/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/authelion/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/authelion)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/authelion/badge.svg)](https://snyk.io/test/github/Tada5hi/authelion)

`Authelion` is a monorepo, containing a collection of different packages for frontend and backend authentication & authorization.

**Table of Contents**

- [Features](#features)
- [Packages](#Packages)
  - [Shared](#shared)
    - [Common](#authelioncommon-)
  - [Backend](#backend)
    - [Api](#authelionapi-)
    - [ApiAdapter](#authelionapi-adapter-)
    - [ApiCore](#authelionapi-core-)
    - [ApiUtils](#authelionapi-utils-)
  - [Frontend](#frontend)
    - [Vue](#authelionvue-)
- [Installation & Usage](#installation--usage)

## Features

## Packages

### Shared

#### @authelion/common 🎉
[![npm version](https://badge.fury.io/js/@authelion%2Fcommon.svg)](https://badge.fury.io/js/@authelion%2Fcommon)

The main purpose of this package, is to provide general classes, interfaces & types for all packages.

[README.md](https://github.com/Tada5hi/authelion/tree/master/packages/common/common#README.md)

### Backend

#### @authelion/api ♟
[![npm version](https://badge.fury.io/js/@authelion%2Fapi.svg)](https://badge.fury.io/js/@authelion%2Fapi)

This package contains a simple standalone api application.

[README.md](https://github.com/Tada5hi/authelion/tree/master/packages/backend/api#README.md)

#### @authelion/api-adapter 🌉
[![npm version](https://badge.fury.io/js/@authelion%2Fapi-adapter.svg)](https://badge.fury.io/js/@authelion%2Fapi-adapter)

The main purpose of this package, is to provide middlewares for (micro-) services, which are based on a http (express) or (web-) socket (socket.io) server.

[README.md](https://github.com/Tada5hi/authelion/tree/master/packages/backend/api-adapter#README.md)

#### @authelion/api-core 🍀
[![npm version](https://badge.fury.io/js/@authelion%2Fapi-core.svg)](https://badge.fury.io/js/@authelion%2Fapi-core)

This package should be used as an extension to an existing (express) application and
should therefore only be used on the server-side.

[README.md](https://github.com/Tada5hi/authelion/tree/master/packages/backend/api-core#README.md)

#### @authelion/api-utils 🛡
[![npm version](https://badge.fury.io/js/@authelion%2Fapi-utils.svg)](https://badge.fury.io/js/@authelion%2Fapi-utils)

The main purpose of this package, is to provide general utilities for authorization & authentication on the server-side.

[README.md](https://github.com/Tada5hi/authelion/tree/master/packages/backend/api-utils#README.md)

### Frontend

#### @authelion/vue 🏝
[![npm version](https://badge.fury.io/js/@authelion%2Fvue.svg)](https://badge.fury.io/js/@authelion%2Fvue)

This repository contains different vue components for the domain entities.

[README.md](https://github.com/Tada5hi/authelion/tree/master/packages/frontend/vue#README.md)

## Installation & Usage
Please follow the `README.md` instructions in the respective package folder.

