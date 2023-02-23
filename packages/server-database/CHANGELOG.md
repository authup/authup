# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.15.3](https://github.com/Tada5hi/authup/compare/v0.15.2...v0.15.3) (2023-02-23)


### Bug Fixes

* **deps:** bump typeorm-extension from 2.5.0 to 2.5.2 ([#884](https://github.com/Tada5hi/authup/issues/884)) ([7689aea](https://github.com/Tada5hi/authup/commit/7689aea07323e28fac7f97e692fb3c11e44d3f80))





## [0.15.2](https://github.com/Tada5hi/authup/compare/v0.15.1...v0.15.2) (2023-02-14)


### Bug Fixes

* **deps:** bump zod from 3.20.2 to 3.20.6 ([#843](https://github.com/Tada5hi/authup/issues/843)) ([b94e056](https://github.com/Tada5hi/authup/commit/b94e056c8d4fe100845bb446019da381a61322e5))
* **server-database:** readable/writable query resources ([a542df1](https://github.com/Tada5hi/authup/commit/a542df174c9810766a5463099ca313c8c7f8d966))





## [0.15.1](https://github.com/Tada5hi/authup/compare/v0.15.0...v0.15.1) (2023-02-08)


### Bug Fixes

* **deps:** bump typeorm from 0.3.11 to 0.3.12 ([#838](https://github.com/Tada5hi/authup/issues/838)) ([ead58dd](https://github.com/Tada5hi/authup/commit/ead58dd35f18659d7a2df6f244d40919ec78b167))





# [0.15.0](https://github.com/Tada5hi/authup/compare/v0.14.1...v0.15.0) (2023-02-07)


### Bug Fixes

* **deps:** bump redis-extension from 1.2.2 to 1.2.3 ([#824](https://github.com/Tada5hi/authup/issues/824)) ([914fe7e](https://github.com/Tada5hi/authup/commit/914fe7e6c72989eeaf4c5b0134e419340c5c964a))
* **server-database:** use default database options as fallback ([3fdc229](https://github.com/Tada5hi/authup/commit/3fdc2298d161324459bca957b7d3a227776728a6))


### Features

* renamed process env handling ([4fbdef2](https://github.com/Tada5hi/authup/commit/4fbdef2a661948969a8bfad5bfced5a4289ed465))





# [0.14.0](https://github.com/Tada5hi/authup/compare/v0.13.0...v0.14.0) (2023-01-29)


### Features

* minor code cleanup + fixed redis caching strategy ([a5286b7](https://github.com/Tada5hi/authup/commit/a5286b716e6432bd872cda2e06def8f0c3ab9111))





# [0.13.0](https://github.com/Tada5hi/authup/compare/v0.12.1...v0.13.0) (2023-01-28)

**Note:** Version bump only for package @authup/server-database





## [0.12.1](https://github.com/Tada5hi/authup/compare/v0.12.0...v0.12.1) (2023-01-28)


### Bug Fixes

* peer-dependency version + updated license information ([f693215](https://github.com/Tada5hi/authup/commit/f69321538afbd2923287209593cdebcedaa29637))





# [0.12.0](https://github.com/Tada5hi/authup/compare/v0.11.1...v0.12.0) (2023-01-28)


### Features

* use tsc for transpiling of decorator packages ([2c41385](https://github.com/Tada5hi/authup/commit/2c41385201f6555b0bacaf09af5ad9779ab2a6c5))





## [0.11.1](https://github.com/Tada5hi/authup/compare/v0.11.0...v0.11.1) (2023-01-27)


### Bug Fixes

* **deps:** updated dependencies ([b3d221c](https://github.com/Tada5hi/authup/commit/b3d221c862c4f4dbd0ccf018566ef00796fcd591))





# [0.11.0](https://github.com/Tada5hi/authup/compare/v0.10.1...v0.11.0) (2023-01-27)


### Bug Fixes

* **deps:** bump redis-extension from 1.2.0 to 1.2.1 ([#795](https://github.com/Tada5hi/authup/issues/795)) ([17afd4e](https://github.com/Tada5hi/authup/commit/17afd4e3ffaaf4320d1f5847a91ef160a5acbafe))





## [0.10.1](https://github.com/Tada5hi/authup/compare/v0.10.0...v0.10.1) (2023-01-23)

**Note:** Version bump only for package @authup/server-database





# [0.10.0](https://github.com/Tada5hi/authup/compare/v0.9.0...v0.10.0) (2023-01-20)

**Note:** Version bump only for package @authup/server-database





# [0.9.0](https://github.com/Tada5hi/authup/compare/v0.8.0...v0.9.0) (2023-01-20)


### Bug Fixes

* **server-common:** use logger for env loading error ([985bee9](https://github.com/Tada5hi/authup/commit/985bee9ae0842aa8c2583561fe971b04d5376d0c))


### Features

* lazy password grant + minor entity management ui guards ([127ec1c](https://github.com/Tada5hi/authup/commit/127ec1c13f108f2a032aba67dd3b662d35251dc7))





# [0.8.0](https://github.com/Tada5hi/authup/compare/v0.7.0...v0.8.0) (2023-01-16)


### Bug Fixes

* **deps:** bump continu from 1.0.4 to 1.0.5 ([069a816](https://github.com/Tada5hi/authup/commit/069a81689500f95d0e32542b9eb2e0493c18ce43))
* **deps:** bump smob from 0.0.6 to 0.0.7 ([535685c](https://github.com/Tada5hi/authup/commit/535685cfb55e58dfa88635d1f08c0e3909d417dd))


### Features

* replaced ts-jest & partially rollup with swc ([bf2b1aa](https://github.com/Tada5hi/authup/commit/bf2b1aa7ed4f0ee9e63fabf0d1d38754bbfa3310))





# [0.7.0](https://github.com/Tada5hi/authup/compare/v0.6.3...v0.7.0) (2023-01-11)


### Features

* unified entity columns for sqlite, mysql & postgres ([f379caa](https://github.com/Tada5hi/authup/commit/f379caac7b7f95145629734b692a7d38a472c9b2))





## [0.6.3](https://github.com/Tada5hi/authup/compare/v0.6.2...v0.6.3) (2023-01-10)

**Note:** Version bump only for package @authup/server-database





## [0.6.2](https://github.com/Tada5hi/authup/compare/v0.6.1...v0.6.2) (2023-01-10)

**Note:** Version bump only for package @authup/server-database





## [0.6.1](https://github.com/Tada5hi/authup/compare/v0.6.0...v0.6.1) (2023-01-08)


### Bug Fixes

* robot secret env parsing ([19e81cb](https://github.com/Tada5hi/authup/commit/19e81cb3efb20d92101f39b5feff4c0b3ab5fc39))





# [0.6.0](https://github.com/Tada5hi/authup/compare/v0.5.0...v0.6.0) (2023-01-08)

**Note:** Version bump only for package @authup/server-database





# [0.5.0](https://github.com/Tada5hi/authup/compare/v0.4.0...v0.5.0) (2023-01-08)


### Bug Fixes

* **deps:** bump typeorm-extension from 2.4.0 to 2.4.1 ([406b70b](https://github.com/Tada5hi/authup/commit/406b70b95ee7be043ca09b5b2c2057422f1d33dc))
* **server-database:** enable/disable robot depending on config value ([080cd83](https://github.com/Tada5hi/authup/commit/080cd8375cb151dde656bb3fdda3666351a1d1a1))
* **server:** reset migrations + run migration transaction individually ([82d70a5](https://github.com/Tada5hi/authup/commit/82d70a56250bb18a29d32832571db6e13c1652a5))


### Features

* add robot/user renaming constraints + non owned permission assign ([ea12e73](https://github.com/Tada5hi/authup/commit/ea12e7309c6d539ec005cc5460ef50a2ebe8c931))
* **server-database:** updated indexes + realmified resources ([cb5e19e](https://github.com/Tada5hi/authup/commit/cb5e19ef1e49cdde6c0e63c6e59167638a9f79d6))
* **server-http:** allow name/slug identifier for fetching resource ([c05a69f](https://github.com/Tada5hi/authup/commit/c05a69f46da14e08966acd636644e65addc83370))





# [0.4.0](https://github.com/Tada5hi/authup/compare/v0.3.1...v0.4.0) (2022-12-21)


### Bug Fixes

* **deps:** bump typeorm-extension from 2.3.1 to 2.4.0 ([17b1307](https://github.com/Tada5hi/authup/commit/17b1307b5d466cdf95523dec42688f6564fb8069))
* **deps:** bump zod from 3.19.1 to 3.20.1 ([8c7075e](https://github.com/Tada5hi/authup/commit/8c7075e27f7105f89dddf7bec2c341e146788771))
* **deps:** bump zod from 3.20.1 to 3.20.2 ([4477c61](https://github.com/Tada5hi/authup/commit/4477c6160da7a579db589e49f81c22aaca4e414c))


### Features

* add scope management (http-endpoint, db-entity, ...) ([2ab4236](https://github.com/Tada5hi/authup/commit/2ab42364e44f032cb93c9946c40a9fd71f287c44))
* further enhancement for client & scope management ([29d1f3e](https://github.com/Tada5hi/authup/commit/29d1f3ee5ecde14afa0b692dd9589887bc2df54e))
* **ui:** add oauth2 authorization modal ([858e972](https://github.com/Tada5hi/authup/commit/858e9723dc3bd319b5b05f4a29f5c1a6d1e690fd))
* use continu for config management ([88b057d](https://github.com/Tada5hi/authup/commit/88b057dd6f15fb77c6a25197b51e6e0765e4fbe5))





# [0.3.0](https://github.com/Tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)


### Bug Fixes

* **server-database:** better constraints for robot-,client-&role-entity ([d519cfd](https://github.com/Tada5hi/authup/commit/d519cfd90b4ce0f7f7b0cf5f1af1f48cbe4b2c64))
* **server-http:** enhance {user,role,robot} endpoint validation ([842afcc](https://github.com/Tada5hi/authup/commit/842afccee90a0c3f7510ba61edf1cfe9f7840033))


### Features

* add client/application management ([5327e9b](https://github.com/Tada5hi/authup/commit/5327e9bf411dfeeadef60d8f28ea81e0bc638f38))
* allow non realm assigned clients ([3be4011](https://github.com/Tada5hi/authup/commit/3be401106c5b03f1151c182e63eae0a0d543fa36))
* enhanced & extended permission management ([3c33bd0](https://github.com/Tada5hi/authup/commit/3c33bd0e0dcf1035d546fce375a76bb1c1312a05))
* refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/Tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))





## [0.2.2](https://github.com/Tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)


### Bug Fixes

* **deps:** bump typeorm-extension from 2.3.0 to 2.3.1 ([aaccef7](https://github.com/Tada5hi/authup/commit/aaccef744d37f10146c9905611d9b819bc080a30))





# [0.2.0](https://github.com/Tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)


### Features

* **server-database:** add migration generate fn ([7a5b364](https://github.com/Tada5hi/authup/commit/7a5b364eebf5f0e0da0c9bc3e51fed89b2a2e547))





# 0.1.0 (2022-12-08)


### Features

* add global cli & enhanced config handling ([95a1549](https://github.com/Tada5hi/authup/commit/95a1549c70ed18e9bc58e2f4fb5734712ab20a35))
* better config handling ([b1582b7](https://github.com/Tada5hi/authup/commit/b1582b798174c2c44e06271f3250db637a159bfd))
* enhance check for readable & writable realm resources ([a048358](https://github.com/Tada5hi/authup/commit/a048358f3e6bc1ddfbffe2ec76148b1ebee276ed))
