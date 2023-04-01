# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.27.0](https://github.com/authup/authup/compare/v0.26.0...v0.27.0) (2023-04-01)

**Note:** Version bump only for package @authup/common





# [0.26.0](https://github.com/authup/authup/compare/v0.25.0...v0.26.0) (2023-03-30)


### Features

* explicit exclude sub folder files for docker build ([79cffe1](https://github.com/authup/authup/commit/79cffe151d27449420c9c6122206b0540c536acb))





# [0.25.0](https://github.com/authup/authup/compare/v0.24.0...v0.25.0) (2023-03-30)


### Features

* add https proxy tunnel support for identity providers ([6a7b859](https://github.com/authup/authup/commit/6a7b859e31bad6f10dd2fde22cdc6dfab3da2285))





# [0.24.0](https://github.com/authup/authup/compare/v0.23.1...v0.24.0) (2023-03-30)

**Note:** Version bump only for package @authup/common





# [0.23.0](https://github.com/authup/authup/compare/v0.22.0...v0.23.0) (2023-03-30)


### Features

* replaced manual proxy parsing with http client detection ([18c3751](https://github.com/authup/authup/commit/18c3751f3dd3defdd9dfa34ec41522ac14d3b476))





# [0.22.0](https://github.com/Tada5hi/authup/compare/v0.21.0...v0.22.0) (2023-03-26)


### Features

* add oauth2 client as http-client property ([ab5c260](https://github.com/Tada5hi/authup/commit/ab5c2609fe7e88b63bc75b4077846f1875ba0571))





# [0.21.0](https://github.com/Tada5hi/authup/compare/v0.20.1...v0.21.0) (2023-03-26)


### Bug Fixes

* allow robot integrity check by name ([d6b2a6e](https://github.com/Tada5hi/authup/commit/d6b2a6e82de12c4c4980f0bd5db498398c86e9e7))


### Features

* explicit endpoint to check/reset robot account ([4fe0e14](https://github.com/Tada5hi/authup/commit/4fe0e14e5b824506fa0231ab6dc7fb308bcbe2ae))





# [0.20.0](https://github.com/Tada5hi/authup/compare/v0.19.0...v0.20.0) (2023-03-24)


### Features

* add integrity check for robot credentials in vault ([5700c80](https://github.com/Tada5hi/authup/commit/5700c8077329ca7a01b0f4dee919c7749b304e60))





# [0.19.0](https://github.com/Tada5hi/authup/compare/v0.18.0...v0.19.0) (2023-03-23)

**Note:** Version bump only for package @authup/common





# [0.18.0](https://github.com/Tada5hi/authup/compare/v0.17.2...v0.18.0) (2023-03-23)


### Bug Fixes

* **deps:** bump @ebec/http from 0.2.2 to 1.0.0 ([#953](https://github.com/Tada5hi/authup/issues/953)) ([4786cd2](https://github.com/Tada5hi/authup/commit/4786cd2e7a8d849b6ec6a164c4bfc1c48e469851))
* **deps:** bump smob from 0.1.0 to 1.0.0 ([#952](https://github.com/Tada5hi/authup/issues/952)) ([363fc69](https://github.com/Tada5hi/authup/commit/363fc6902848a16982626f4fbe3cb7e5c1afd053))


### Features

* add realm- & scope-subscriber + minor cleanup + enum referencing ([dc4f1ba](https://github.com/Tada5hi/authup/commit/dc4f1ba167259f6c7c8f381a8569fe255646e85d))
* add vault client support for robot credentials syncing ([66b2300](https://github.com/Tada5hi/authup/commit/66b23007fdfa4221c48f2d66f5524fdb5b4f3ed3))
* adjusted lerna config ([215b3a5](https://github.com/Tada5hi/authup/commit/215b3a55916d8c923f404434985a68826650c136))
* broadcast redis events for changed domain entities ([4b2fd5e](https://github.com/Tada5hi/authup/commit/4b2fd5e44aa94a2d43d6c8b872bb0f298e0b4da2))
* support direct & socket domain events ([b9225c2](https://github.com/Tada5hi/authup/commit/b9225c21b5437ced4c6d0a02b75de3f35f1f64a3))





## [0.17.2](https://github.com/Tada5hi/authup/compare/v0.17.1...v0.17.2) (2023-03-20)


### Bug Fixes

* **deps:** bump hapci/** to v1.3.0 ([2e7068a](https://github.com/Tada5hi/authup/commit/2e7068ae21e5a4d0dae0b9cde90a308efbc247de))





# [0.17.0](https://github.com/Tada5hi/authup/compare/v0.16.0...v0.17.0) (2023-03-13)

**Note:** Version bump only for package @authup/common





# [0.16.0](https://github.com/Tada5hi/authup/compare/v0.15.4...v0.16.0) (2023-02-28)

**Note:** Version bump only for package @authup/common





## [0.15.4](https://github.com/Tada5hi/authup/compare/v0.15.3...v0.15.4) (2023-02-24)


### Bug Fixes

* allow dot character in user name ([e430b4c](https://github.com/Tada5hi/authup/commit/e430b4c6b54dee72303bceeb33dcc8692abde73a))





## [0.15.3](https://github.com/Tada5hi/authup/compare/v0.15.2...v0.15.3) (2023-02-23)


### Bug Fixes

* **deps:** bump @ucast/mongo2js from 1.3.3 to 1.3.4 ([#863](https://github.com/Tada5hi/authup/issues/863)) ([baee990](https://github.com/Tada5hi/authup/commit/baee990378cc7fe613042ebae66b80f0139fe713))





# [0.15.0](https://github.com/Tada5hi/authup/compare/v0.14.1...v0.15.0) (2023-02-07)


### Features

* **server-http:** restructured & optimized oauth2 sub module ([8d8802d](https://github.com/Tada5hi/authup/commit/8d8802d002616880e289b9eacc3ad60df5d3e2b6))





# [0.14.0](https://github.com/Tada5hi/authup/compare/v0.13.0...v0.14.0) (2023-01-29)


### Features

* minor code cleanup + fixed redis caching strategy ([a5286b7](https://github.com/Tada5hi/authup/commit/a5286b716e6432bd872cda2e06def8f0c3ab9111))





# [0.13.0](https://github.com/Tada5hi/authup/compare/v0.12.1...v0.13.0) (2023-01-28)

**Note:** Version bump only for package @authup/common





## [0.12.1](https://github.com/Tada5hi/authup/compare/v0.12.0...v0.12.1) (2023-01-28)


### Bug Fixes

* peer-dependency version + updated license information ([f693215](https://github.com/Tada5hi/authup/commit/f69321538afbd2923287209593cdebcedaa29637))





# [0.12.0](https://github.com/Tada5hi/authup/compare/v0.11.1...v0.12.0) (2023-01-28)

**Note:** Version bump only for package @authup/common





## [0.11.1](https://github.com/Tada5hi/authup/compare/v0.11.0...v0.11.1) (2023-01-27)


### Bug Fixes

* **deps:** updated dependencies ([b3d221c](https://github.com/Tada5hi/authup/commit/b3d221c862c4f4dbd0ccf018566ef00796fcd591))





# [0.11.0](https://github.com/Tada5hi/authup/compare/v0.10.1...v0.11.0) (2023-01-27)

**Note:** Version bump only for package @authup/common





## [0.10.1](https://github.com/Tada5hi/authup/compare/v0.10.0...v0.10.1) (2023-01-23)


### Bug Fixes

* **deps:** reverted minimatch version to v5 ([7385d0d](https://github.com/Tada5hi/authup/commit/7385d0d25b729087000f81d2d04c2033f7464958))





# [0.10.0](https://github.com/Tada5hi/authup/compare/v0.9.0...v0.10.0) (2023-01-20)


### Features

* bump (peer-) dependency version ([f2faacb](https://github.com/Tada5hi/authup/commit/f2faacb0f19b81251bb063dd49a2d91539e4e39d))





# [0.9.0](https://github.com/Tada5hi/authup/compare/v0.8.0...v0.9.0) (2023-01-20)


### Bug Fixes

* **deps:** bump minimatch from 5.1.2 to 6.1.5 ([#763](https://github.com/Tada5hi/authup/issues/763)) ([179226c](https://github.com/Tada5hi/authup/commit/179226cc1c312cc7c95c2fe1711164df15b1dfe1))


### Features

* lazy password grant + minor entity management ui guards ([127ec1c](https://github.com/Tada5hi/authup/commit/127ec1c13f108f2a032aba67dd3b662d35251dc7))





# [0.8.0](https://github.com/Tada5hi/authup/compare/v0.7.0...v0.8.0) (2023-01-16)


### Bug Fixes

* **deps:** bump @types/jsonwebtoken from 9.0.0 to 9.0.1 ([f2ef31c](https://github.com/Tada5hi/authup/commit/f2ef31c46eae74a9d8b8d219a3bcb418d2d48bb0))
* **deps:** bump smob from 0.0.6 to 0.0.7 ([535685c](https://github.com/Tada5hi/authup/commit/535685cfb55e58dfa88635d1f08c0e3909d417dd))


### Features

* replaced ts-jest & partially rollup with swc ([bf2b1aa](https://github.com/Tada5hi/authup/commit/bf2b1aa7ed4f0ee9e63fabf0d1d38754bbfa3310))





# [0.7.0](https://github.com/Tada5hi/authup/compare/v0.6.3...v0.7.0) (2023-01-11)


### Features

* unified entity columns for sqlite, mysql & postgres ([f379caa](https://github.com/Tada5hi/authup/commit/f379caac7b7f95145629734b692a7d38a472c9b2))





## [0.6.3](https://github.com/Tada5hi/authup/compare/v0.6.2...v0.6.3) (2023-01-10)


### Bug Fixes

* **common:** peer-dependency version ([76902ca](https://github.com/Tada5hi/authup/commit/76902ca1aadbcf9f96de147f428c2e322bfee916))





## [0.6.2](https://github.com/Tada5hi/authup/compare/v0.6.1...v0.6.2) (2023-01-10)

**Note:** Version bump only for package @authup/common





# [0.6.0](https://github.com/Tada5hi/authup/compare/v0.5.0...v0.6.0) (2023-01-08)


### Bug Fixes

* oauth2 authorization code grant flow ([6422a9b](https://github.com/Tada5hi/authup/commit/6422a9b207474596363b3d48ce12e0c8e184ae8d))





# [0.5.0](https://github.com/Tada5hi/authup/compare/v0.4.0...v0.5.0) (2023-01-08)


### Bug Fixes

* **deps:** bump @types/jsonwebtoken from 8.5.9 to 9.0.0 ([17bc27b](https://github.com/Tada5hi/authup/commit/17bc27b85466a34a61b0d4c89e516760d549d42e))


### Features

* add robot/user renaming constraints + non owned permission assign ([ea12e73](https://github.com/Tada5hi/authup/commit/ea12e7309c6d539ec005cc5460ef50a2ebe8c931))
* **server-database:** updated indexes + realmified resources ([cb5e19e](https://github.com/Tada5hi/authup/commit/cb5e19ef1e49cdde6c0e63c6e59167638a9f79d6))
* **server-http:** allow name/slug identifier for fetching resource ([c05a69f](https://github.com/Tada5hi/authup/commit/c05a69f46da14e08966acd636644e65addc83370))





# [0.4.0](https://github.com/Tada5hi/authup/compare/v0.3.1...v0.4.0) (2022-12-21)


### Bug Fixes

* **deps:** bump minimatch from 5.1.1 to 5.1.2 ([c656530](https://github.com/Tada5hi/authup/commit/c656530601d987367e957a917b11e28bf09868c4))


### Features

* add scope management (http-endpoint, db-entity, ...) ([2ab4236](https://github.com/Tada5hi/authup/commit/2ab42364e44f032cb93c9946c40a9fd71f287c44))
* further enhancement for client & scope management ([29d1f3e](https://github.com/Tada5hi/authup/commit/29d1f3ee5ecde14afa0b692dd9589887bc2df54e))
* **ui:** add oauth2 authorization modal ([858e972](https://github.com/Tada5hi/authup/commit/858e9723dc3bd319b5b05f4a29f5c1a6d1e690fd))





# [0.3.0](https://github.com/Tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)


### Bug Fixes

* **server-http:** enhance {user,role,robot} endpoint validation ([842afcc](https://github.com/Tada5hi/authup/commit/842afccee90a0c3f7510ba61edf1cfe9f7840033))
* **ui:** minor fixes (list-builder,{client,permission}-form,...) ([666b41f](https://github.com/Tada5hi/authup/commit/666b41f2fccc370815046087a621882f0159f1cc))


### Features

* add client/application management ([5327e9b](https://github.com/Tada5hi/authup/commit/5327e9bf411dfeeadef60d8f28ea81e0bc638f38))
* allow non realm assigned clients ([3be4011](https://github.com/Tada5hi/authup/commit/3be401106c5b03f1151c182e63eae0a0d543fa36))
* enhanced & extended permission management ([3c33bd0](https://github.com/Tada5hi/authup/commit/3c33bd0e0dcf1035d546fce375a76bb1c1312a05))
* refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/Tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))





## [0.2.2](https://github.com/Tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)

**Note:** Version bump only for package @authup/common





# [0.2.0](https://github.com/Tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)

**Note:** Version bump only for package @authup/common





# 0.1.0 (2022-12-08)


### Bug Fixes

* bump typeorm-extension, rapiq & routup version ([e37b993](https://github.com/Tada5hi/authup/commit/e37b993bfbf3d11b24c696d59f1382cc4379a72c))
* **deps:** bump @ebec/http from 0.0.4 to 0.1.0 ([016baa2](https://github.com/Tada5hi/authup/commit/016baa22fd25390b0320e90d77a0fb870716c294))


### Features

* better config handling ([b1582b7](https://github.com/Tada5hi/authup/commit/b1582b798174c2c44e06271f3250db637a159bfd))
* enhance check for readable & writable realm resources ([a048358](https://github.com/Tada5hi/authup/commit/a048358f3e6bc1ddfbffe2ec76148b1ebee276ed))
* **server-core:** replaced http framework ([6273ae6](https://github.com/Tada5hi/authup/commit/6273ae680f82a4e27ba527b9eb260bb81ee75d20))
