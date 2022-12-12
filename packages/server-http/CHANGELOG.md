# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.3.0](https://github.com/Tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)


### Bug Fixes

* **server-http:** enhance {user,role,robot} endpoint validation ([842afcc](https://github.com/Tada5hi/authup/commit/842afccee90a0c3f7510ba61edf1cfe9f7840033))
* **server-http:** minor issue with user validation ([1bc4a65](https://github.com/Tada5hi/authup/commit/1bc4a655e6f3ed6b9dca5679a13db32d1978da9b))


### Features

* add client/application management ([5327e9b](https://github.com/Tada5hi/authup/commit/5327e9bf411dfeeadef60d8f28ea81e0bc638f38))
* allow non realm assigned clients ([3be4011](https://github.com/Tada5hi/authup/commit/3be401106c5b03f1151c182e63eae0a0d543fa36))
* enhanced & extended permission management ([3c33bd0](https://github.com/Tada5hi/authup/commit/3c33bd0e0dcf1035d546fce375a76bb1c1312a05))
* refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/Tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))
* **server-http:** set realm_name in token payload ([b6a5783](https://github.com/Tada5hi/authup/commit/b6a578329d77b240d4117fb626065512dcfcef2c))





## [0.2.2](https://github.com/Tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)


### Bug Fixes

* **deps:** bump typeorm-extension from 2.3.0 to 2.3.1 ([aaccef7](https://github.com/Tada5hi/authup/commit/aaccef744d37f10146c9905611d9b819bc080a30))
* **routup-http:** updated rotuup dependencies ([da6a6a7](https://github.com/Tada5hi/authup/commit/da6a6a7ebd75fc20f05db9b7540070e6fea2d187))





## [0.2.1](https://github.com/Tada5hi/authup/compare/v0.2.0...v0.2.1) (2022-12-09)


### Bug Fixes

* **server-http:** add missing type export ([5c0a994](https://github.com/Tada5hi/authup/commit/5c0a994116655e091d847d99d291b817b6ff02db))





# [0.2.0](https://github.com/Tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)


### Bug Fixes

* **server-http:** expose use-request-env util ([201fdab](https://github.com/Tada5hi/authup/commit/201fdabe29eeec7faadeb52b11db419ce4129119))


### Features

* **server-database:** add migration generate fn ([7a5b364](https://github.com/Tada5hi/authup/commit/7a5b364eebf5f0e0da0c9bc3e51fed89b2a2e547))





## [0.1.1](https://github.com/Tada5hi/authup/compare/v0.1.0...v0.1.1) (2022-12-08)


### Bug Fixes

* **server-http:** make local package.json existence optional ([d6105fa](https://github.com/Tada5hi/authup/commit/d6105fa9213cde311bf6238b35b381cc5832320b))





# 0.1.0 (2022-12-08)


### Features

* add global cli & enhanced config handling ([95a1549](https://github.com/Tada5hi/authup/commit/95a1549c70ed18e9bc58e2f4fb5734712ab20a35))
* add void logger ([14a321e](https://github.com/Tada5hi/authup/commit/14a321ec4f39559da156ebc592fa8118dc5d5be0))
* better config handling ([b1582b7](https://github.com/Tada5hi/authup/commit/b1582b798174c2c44e06271f3250db637a159bfd))
* enhance check for readable & writable realm resources ([a048358](https://github.com/Tada5hi/authup/commit/a048358f3e6bc1ddfbffe2ec76148b1ebee276ed))
* only allow robot/role permission assignment for owned permissions ([9dfd9d3](https://github.com/Tada5hi/authup/commit/9dfd9d39ed4420f5d42b4fa9e03e88f04f840189))
