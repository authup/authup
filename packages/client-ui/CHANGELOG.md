# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.37.1](https://github.com/authup/authup/compare/v0.37.0...v0.37.1) (2023-06-14)


### Bug Fixes

* bump hapic to v2.x ([2dd66ed](https://github.com/authup/authup/commit/2dd66ed87e89338be682a93bec4fe12ca86be712))
* bump minimatch to v9.x ([0c63d48](https://github.com/authup/authup/commit/0c63d481d20dbae273130595bde4453b476eca37))
* bump vue-layout dependencies + rename validation create fn ([ea0c679](https://github.com/authup/authup/commit/ea0c679207cd0d3cd6503d80779a825fdb6091d5))
* **deps:** bump @hapic/oauth2 from 2.0.0-alpha.10 to 2.0.0-alpha.11 ([#1162](https://github.com/authup/authup/issues/1162)) ([f54db63](https://github.com/authup/authup/commit/f54db63b1a4bf31ea7c7931ed96158ec62e5d2f8))





# [0.37.0](https://github.com/authup/authup/compare/v0.36.0...v0.37.0) (2023-05-31)


### Features

* implemented ilingo v3 ([5b0e632](https://github.com/authup/authup/commit/5b0e6321cd8b7569e1e92262014a8ffc00098d63))





# [0.36.0](https://github.com/authup/authup/compare/v0.35.0...v0.36.0) (2023-05-27)


### Bug Fixes

* rename register-timer to set-timer ([77793bc](https://github.com/authup/authup/commit/77793bc961e4695520dd08187182238647aee2ba))


### Features

* cleanup and relocate auth store + set token max age for oauth2 grant types ([13643fd](https://github.com/authup/authup/commit/13643fd76e8c471f8d90b555c386041a34bcb2ff))
* refactor and optimized client response error token hook ([fae52c8](https://github.com/authup/authup/commit/fae52c8cfcc0aa563d6edd0702f3438ab76e6e5a))





# [0.35.0](https://github.com/authup/authup/compare/v0.34.0...v0.35.0) (2023-05-25)


### Bug Fixes

* update auth store after token creation ([697b3d5](https://github.com/authup/authup/commit/697b3d5806c84dbe31e65470378545044d956b20))





# [0.34.0](https://github.com/authup/authup/compare/v0.33.0...v0.34.0) (2023-05-24)


### Bug Fixes

* better token error handling + token error verification ([e323e83](https://github.com/authup/authup/commit/e323e834b2f4f695fd9b0c8dc1629d6a4b265ebe))
* **deps:** bump @vue-layout/* packages ([f7d6e4c](https://github.com/authup/authup/commit/f7d6e4c8089c693e9d6a86ed8e19725bf8c78a42))
* **server-adapter:** cookie middleware extraction for http middleware ([d990176](https://github.com/authup/authup/commit/d990176ff9f39ae6c288acc142a23864098250cb))
* update current user on settings page ([91aa2df](https://github.com/authup/authup/commit/91aa2dfba1569f9d5a96c4cd14540de2542c6138))


### Features

* switch to bootstrap table view for domain lists ([2faa379](https://github.com/authup/authup/commit/2faa37910732863bb730588b6e3334c27b353c16))
* use bootstrap toasts instead of vue-toastification ([50ee4ef](https://github.com/authup/authup/commit/50ee4efe93efa29903185ba864ce654647aed422))





# [0.33.0](https://github.com/authup/authup/compare/v0.32.3...v0.33.0) (2023-04-24)


### Bug Fixes

* **deps:** bump continu from 1.2.0 to 1.3.1 ([#1010](https://github.com/authup/authup/issues/1010)) ([21730dd](https://github.com/authup/authup/commit/21730dd64284198c6111f14f5cf31a55774d89fb))
* http client (error) hook implementation ([86ddd6c](https://github.com/authup/authup/commit/86ddd6c341a36ab37cf76844129552031618c926))
* page component typings ([b815cb6](https://github.com/authup/authup/commit/b815cb6359472c4247d1246a8c4fb7667d4e4bce))


### Features

* bump hapic to v2.0.0-alpha.x (axios -> fetch) ([#1036](https://github.com/authup/authup/issues/1036)) ([e09c919](https://github.com/authup/authup/commit/e09c91930d65b41725e5b1c4e26c21f9a5c67342))
* implemented hapic v2.0 alpha ([f1da95b](https://github.com/authup/authup/commit/f1da95bb3be6d1fe0cfd195a44a63c5a8d60dc6c))





## [0.32.2](https://github.com/authup/authup/compare/v0.32.1...v0.32.2) (2023-04-05)


### Bug Fixes

* restructured ability-manger in module + force version bump ([b59f485](https://github.com/authup/authup/commit/b59f485eec2e6e7ddf6d771f7eaad0f1ef46b569))





## [0.32.1](https://github.com/authup/authup/compare/v0.32.0...v0.32.1) (2023-04-04)


### Bug Fixes

* **deps:** bump vue-layout to v1.1.0 ([ff7f4d1](https://github.com/authup/authup/commit/ff7f4d15d101cb9b3c33e1b67f7764a4e09df110))





# [0.32.0](https://github.com/authup/authup/compare/v0.31.3...v0.32.0) (2023-04-03)


### Features

* use core token-interceptor for ui token session management ([33ec6e0](https://github.com/authup/authup/commit/33ec6e0ad835c7203d3d848f074a2210507e0ad3))





## [0.31.3](https://github.com/authup/authup/compare/v0.31.2...v0.31.3) (2023-04-03)

**Note:** Version bump only for package @authup/client-ui





## [0.31.2](https://github.com/authup/authup/compare/v0.31.1...v0.31.2) (2023-04-03)

**Note:** Version bump only for package @authup/client-ui





## [0.31.1](https://github.com/authup/authup/compare/v0.31.0...v0.31.1) (2023-04-03)

**Note:** Version bump only for package @authup/client-ui





# [0.31.0](https://github.com/authup/authup/compare/v0.30.1...v0.31.0) (2023-04-03)

**Note:** Version bump only for package @authup/client-ui





## [0.30.1](https://github.com/authup/authup/compare/v0.30.0...v0.30.1) (2023-04-03)

**Note:** Version bump only for package @authup/client-ui





# [0.30.0](https://github.com/authup/authup/compare/v0.29.0...v0.30.0) (2023-04-03)


### Features

* support interceptor mounting on client and client driver instance ([a26dafe](https://github.com/authup/authup/commit/a26dafe8174cf9c6de0bf85c294baf8e32d6261a))





# [0.29.0](https://github.com/authup/authup/compare/v0.28.0...v0.29.0) (2023-04-01)


### Bug Fixes

* adjusted README.md, package.json files + renamed http client ([fcf8423](https://github.com/authup/authup/commit/fcf8423228fa73aa2a61ba8de96c0af51dfb0c5f))
* enhance executorÂ ([31624c1](https://github.com/authup/authup/commit/31624c1a6a91c33a0fd29a9e33f451e9133d5cf1))


### Features

* add realm & identity-provider selection to login form ([5678540](https://github.com/authup/authup/commit/5678540256e7fb59443548e5fe4eb4705d9346f1))





# [0.28.0](https://github.com/authup/authup/compare/v0.27.0...v0.28.0) (2023-04-01)

**Note:** Version bump only for package @authup/client-ui





# [0.27.0](https://github.com/authup/authup/compare/v0.26.0...v0.27.0) (2023-04-01)


### Features

* load config file for frontend ui if present ([7776430](https://github.com/authup/authup/commit/7776430963d6bc469887fa1261ccc8b65c49fd0a))





# [0.26.0](https://github.com/authup/authup/compare/v0.25.0...v0.26.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-ui





# [0.25.0](https://github.com/authup/authup/compare/v0.24.0...v0.25.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-ui





# [0.24.0](https://github.com/authup/authup/compare/v0.23.1...v0.24.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-ui





# [0.23.0](https://github.com/authup/authup/compare/v0.22.0...v0.23.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-ui





# [0.22.0](https://github.com/tada5hi/authup/compare/v0.21.0...v0.22.0) (2023-03-26)

**Note:** Version bump only for package @authup/client-ui





# [0.21.0](https://github.com/tada5hi/authup/compare/v0.20.1...v0.21.0) (2023-03-26)

**Note:** Version bump only for package @authup/client-ui





# [0.20.0](https://github.com/tada5hi/authup/compare/v0.19.0...v0.20.0) (2023-03-24)

**Note:** Version bump only for package @authup/client-ui





# [0.19.0](https://github.com/tada5hi/authup/compare/v0.18.0...v0.19.0) (2023-03-23)

**Note:** Version bump only for package @authup/client-ui





# [0.18.0](https://github.com/tada5hi/authup/compare/v0.17.2...v0.18.0) (2023-03-23)


### Features

* add realm- & scope-subscriber + minor cleanup + enum referencing ([dc4f1ba](https://github.com/tada5hi/authup/commit/dc4f1ba167259f6c7c8f381a8569fe255646e85d))
* add vault client support for robot credentials syncing ([66b2300](https://github.com/tada5hi/authup/commit/66b23007fdfa4221c48f2d66f5524fdb5b4f3ed3))





## [0.17.2](https://github.com/tada5hi/authup/compare/v0.17.1...v0.17.2) (2023-03-20)


### Bug Fixes

* **deps:** bump hapci/** to v1.3.0 ([2e7068a](https://github.com/tada5hi/authup/commit/2e7068ae21e5a4d0dae0b9cde90a308efbc247de))





## [0.17.1](https://github.com/tada5hi/authup/compare/v0.17.0...v0.17.1) (2023-03-14)

**Note:** Version bump only for package @authup/client-ui





# [0.17.0](https://github.com/tada5hi/authup/compare/v0.16.0...v0.17.0) (2023-03-13)

**Note:** Version bump only for package @authup/client-ui





# [0.16.0](https://github.com/tada5hi/authup/compare/v0.15.4...v0.16.0) (2023-02-28)

**Note:** Version bump only for package @authup/client-ui





## [0.15.4](https://github.com/tada5hi/authup/compare/v0.15.3...v0.15.4) (2023-02-24)

**Note:** Version bump only for package @authup/client-ui





## [0.15.3](https://github.com/tada5hi/authup/compare/v0.15.2...v0.15.3) (2023-02-23)

**Note:** Version bump only for package @authup/client-ui





## [0.15.2](https://github.com/tada5hi/authup/compare/v0.15.1...v0.15.2) (2023-02-14)

**Note:** Version bump only for package @authup/client-ui





## [0.15.1](https://github.com/tada5hi/authup/compare/v0.15.0...v0.15.1) (2023-02-08)

**Note:** Version bump only for package @authup/client-ui





# [0.15.0](https://github.com/tada5hi/authup/compare/v0.14.1...v0.15.0) (2023-02-07)


### Bug Fixes

* **deps:** bump vue from 3.2.45 to 3.2.47 ([#825](https://github.com/tada5hi/authup/issues/825)) ([69d44a6](https://github.com/tada5hi/authup/commit/69d44a62684e980225cb5c416d4ccb4d5e5f902d))





# [0.14.0](https://github.com/tada5hi/authup/compare/v0.13.0...v0.14.0) (2023-01-29)

**Note:** Version bump only for package @authup/client-ui





# [0.13.0](https://github.com/tada5hi/authup/compare/v0.12.1...v0.13.0) (2023-01-28)

**Note:** Version bump only for package @authup/client-ui





## [0.12.1](https://github.com/tada5hi/authup/compare/v0.12.0...v0.12.1) (2023-01-28)


### Bug Fixes

* peer-dependency version + updated license information ([f693215](https://github.com/tada5hi/authup/commit/f69321538afbd2923287209593cdebcedaa29637))





# [0.12.0](https://github.com/tada5hi/authup/compare/v0.11.1...v0.12.0) (2023-01-28)

**Note:** Version bump only for package @authup/client-ui





## [0.11.1](https://github.com/tada5hi/authup/compare/v0.11.0...v0.11.1) (2023-01-27)


### Bug Fixes

* **deps:** bump ilingo to v2.2.1 ([eebc902](https://github.com/tada5hi/authup/commit/eebc902495debf127679f8c2619deef00249b041))
* **deps:** updated dependencies ([b3d221c](https://github.com/tada5hi/authup/commit/b3d221c862c4f4dbd0ccf018566ef00796fcd591))





# [0.11.0](https://github.com/tada5hi/authup/compare/v0.10.1...v0.11.0) (2023-01-27)


### Bug Fixes

* **deps:** updated nuxt to v3.1.1 ([8070cf0](https://github.com/tada5hi/authup/commit/8070cf083b7efe2a21b4fd2e8106a612eaba5de4))
* **ui:** add nav toggling + add additional nesting layer header/sidebar ([07ea051](https://github.com/tada5hi/authup/commit/07ea051a5226a266699d1e849a21b6c5c85d0613))


### Features

* **ui:** add initial head meta tags ([536cb08](https://github.com/tada5hi/authup/commit/536cb08fad8e887ec7b334d577dd40bfe685f310))





## [0.10.1](https://github.com/tada5hi/authup/compare/v0.10.0...v0.10.1) (2023-01-23)

**Note:** Version bump only for package @authup/client-ui





# [0.10.0](https://github.com/tada5hi/authup/compare/v0.9.0...v0.10.0) (2023-01-20)

**Note:** Version bump only for package @authup/client-ui





# [0.9.0](https://github.com/tada5hi/authup/compare/v0.8.0...v0.9.0) (2023-01-20)


### Features

* lazy password grant + minor entity management ui guards ([127ec1c](https://github.com/tada5hi/authup/commit/127ec1c13f108f2a032aba67dd3b662d35251dc7))
* **ui:** fix store usage + implemented realm state ([4384c55](https://github.com/tada5hi/authup/commit/4384c55d66dcc7919df3508e4f96b5189cbc3a60))
* **ui:** implemented realm switching in admin area ([d902af7](https://github.com/tada5hi/authup/commit/d902af78d85c270f75425eef01e191a1cc7504ac))





# [0.8.0](https://github.com/tada5hi/authup/compare/v0.7.0...v0.8.0) (2023-01-16)

**Note:** Version bump only for package @authup/client-ui





# [0.7.0](https://github.com/tada5hi/authup/compare/v0.6.3...v0.7.0) (2023-01-11)

**Note:** Version bump only for package @authup/client-ui





## [0.6.3](https://github.com/tada5hi/authup/compare/v0.6.2...v0.6.3) (2023-01-10)

**Note:** Version bump only for package @authup/client-ui





## [0.6.2](https://github.com/tada5hi/authup/compare/v0.6.1...v0.6.2) (2023-01-10)


### Bug Fixes

* **deps:** updated peer-dependencies + oauth2 client library ([d91981e](https://github.com/tada5hi/authup/commit/d91981e7cafe0def6fef26e5daa3042524c9a3e0))





# [0.6.0](https://github.com/tada5hi/authup/compare/v0.5.0...v0.6.0) (2023-01-08)

**Note:** Version bump only for package @authup/client-ui





# [0.5.0](https://github.com/tada5hi/authup/compare/v0.4.0...v0.5.0) (2023-01-08)

**Note:** Version bump only for package @authup/client-ui





# [0.4.0](https://github.com/tada5hi/authup/compare/v0.3.1...v0.4.0) (2022-12-21)


### Features

* add scope management (http-endpoint, db-entity, ...) ([2ab4236](https://github.com/tada5hi/authup/commit/2ab42364e44f032cb93c9946c40a9fd71f287c44))
* further enhancement for client & scope management ([29d1f3e](https://github.com/tada5hi/authup/commit/29d1f3ee5ecde14afa0b692dd9589887bc2df54e))
* **ui:** add oauth2 authorization modal ([858e972](https://github.com/tada5hi/authup/commit/858e9723dc3bd319b5b05f4a29f5c1a6d1e690fd))





## [0.3.1](https://github.com/tada5hi/authup/compare/v0.3.0...v0.3.1) (2022-12-12)


### Bug Fixes

* **ui:** minor enahcenement to auth store & middleware ([80b97d0](https://github.com/tada5hi/authup/commit/80b97d02977795ece02d60d4daff5eae58d03028))





# [0.3.0](https://github.com/tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)


### Bug Fixes

* **ui:** minor fixes (list-builder,{client,permission}-form,...) ([666b41f](https://github.com/tada5hi/authup/commit/666b41f2fccc370815046087a621882f0159f1cc))


### Features

* add client/application management ([5327e9b](https://github.com/tada5hi/authup/commit/5327e9bf411dfeeadef60d8f28ea81e0bc638f38))
* refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))





## [0.2.2](https://github.com/tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)

**Note:** Version bump only for package @authup/client-ui





# [0.2.0](https://github.com/tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)

**Note:** Version bump only for package @authup/client-ui





## [0.1.5](https://github.com/tada5hi/authup/compare/v0.1.4...v0.1.5) (2022-12-08)


### Bug Fixes

* **ui:** make output file executable ([ba21fad](https://github.com/tada5hi/authup/commit/ba21fadd4ff062091283ca5ff632bb5279f1655b))





## [0.1.4](https://github.com/tada5hi/authup/compare/v0.1.3...v0.1.4) (2022-12-08)


### Bug Fixes

* use package-name for npx execution ([401dd26](https://github.com/tada5hi/authup/commit/401dd267ea556ba86c126ffb3ba4a16388c04475))





## [0.1.1](https://github.com/tada5hi/authup/compare/v0.1.0...v0.1.1) (2022-12-08)


### Bug Fixes

* **server-http:** make local package.json existence optional ([d6105fa](https://github.com/tada5hi/authup/commit/d6105fa9213cde311bf6238b35b381cc5832320b))





# 0.1.0 (2022-12-08)


### Bug Fixes

* **deps:** updated hapic-* ([e6bc7b9](https://github.com/tada5hi/authup/commit/e6bc7b9d388a4dda2d9f194a23b8ab37cf05e2b6))


### Features

* add global cli & enhanced config handling ([95a1549](https://github.com/tada5hi/authup/commit/95a1549c70ed18e9bc58e2f4fb5734712ab20a35))
* prepare global cli ([ed4539c](https://github.com/tada5hi/authup/commit/ed4539c0b736f8b522e7a1af716ff6e3ab2d8200))
* **server-core:** replaced http framework ([6273ae6](https://github.com/tada5hi/authup/commit/6273ae680f82a4e27ba527b9eb260bb81ee75d20))
