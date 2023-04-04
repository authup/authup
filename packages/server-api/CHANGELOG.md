# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.32.1](https://github.com/authup/authup/compare/v0.32.0...v0.32.1) (2023-04-04)


### Bug Fixes

* remove metrics controller ([d6b82bc](https://github.com/authup/authup/commit/d6b82bc408cb89da1fed30426901b5ef21fa7de8))





# [0.32.0](https://github.com/authup/authup/compare/v0.31.3...v0.32.0) (2023-04-03)

**Note:** Version bump only for package @authup/server-api





## [0.31.3](https://github.com/authup/authup/compare/v0.31.2...v0.31.3) (2023-04-03)


### Bug Fixes

* config database option validator ([82afa32](https://github.com/authup/authup/commit/82afa3286fbd84cce8a9bdedc29fcbb84aa92962))





## [0.31.2](https://github.com/authup/authup/compare/v0.31.1...v0.31.2) (2023-04-03)

**Note:** Version bump only for package @authup/server-api





## [0.31.1](https://github.com/authup/authup/compare/v0.31.0...v0.31.1) (2023-04-03)

**Note:** Version bump only for package @authup/server-api





# [0.31.0](https://github.com/authup/authup/compare/v0.30.1...v0.31.0) (2023-04-03)

**Note:** Version bump only for package @authup/server-api





## [0.30.1](https://github.com/authup/authup/compare/v0.30.0...v0.30.1) (2023-04-03)

**Note:** Version bump only for package @authup/server-api





# [0.30.0](https://github.com/authup/authup/compare/v0.29.0...v0.30.0) (2023-04-03)


### Bug Fixes

* move vault configuration to server-api package from server-core package ([4783326](https://github.com/authup/authup/commit/4783326e2c0984bb10615d25d76e5cddff936e94))


### Features

* support interceptor mounting on client and client driver instance ([a26dafe](https://github.com/authup/authup/commit/a26dafe8174cf9c6de0bf85c294baf8e32d6261a))





# [0.29.0](https://github.com/authup/authup/compare/v0.28.0...v0.29.0) (2023-04-01)


### Bug Fixes

* adjusted README.md, package.json files + renamed http client ([fcf8423](https://github.com/authup/authup/commit/fcf8423228fa73aa2a61ba8de96c0af51dfb0c5f))
* enhance executorÂ ([31624c1](https://github.com/authup/authup/commit/31624c1a6a91c33a0fd29a9e33f451e9133d5cf1))





# [0.28.0](https://github.com/authup/authup/compare/v0.27.0...v0.28.0) (2023-04-01)


### Bug Fixes

* resolve http controller path for swagger generation ([4612cc5](https://github.com/authup/authup/commit/4612cc55e4531d9b4fe3d1e91302802304f13cc4))


### Features

* allow database configuration via config file ([077cd11](https://github.com/authup/authup/commit/077cd1124f37c116cedd1dbafb4d9d685c8a7e50))





# [0.27.0](https://github.com/authup/authup/compare/v0.26.0...v0.27.0) (2023-04-01)


### Bug Fixes

* **deps:** bump redis-extension from 1.2.3 to 1.3.0 ([#992](https://github.com/authup/authup/issues/992)) ([2ac9ede](https://github.com/authup/authup/commit/2ac9ede2692c9d3cd19a2c7fc201f993b5a35cce))
* swagger look-up path for controllers ([ea75c11](https://github.com/authup/authup/commit/ea75c11363785365a03f1fba5c1015322c53b927))
* use constants for env variable names ([3122698](https://github.com/authup/authup/commit/3122698db86acc38729e74bd0bc546c41201882f))





# [0.26.0](https://github.com/authup/authup/compare/v0.25.0...v0.26.0) (2023-03-30)

**Note:** Version bump only for package @authup/server-api





# [0.25.0](https://github.com/authup/authup/compare/v0.24.0...v0.25.0) (2023-03-30)


### Bug Fixes

* move domains from database sub-folder to root src folder ([5e0d9b6](https://github.com/authup/authup/commit/5e0d9b610994f8ce83568cfd5d3df461d22e422c))
* remove console.log for config logging ([e39eb34](https://github.com/authup/authup/commit/e39eb34e8e3e23f8e17bb8ebfeded5327612c709))


### Features

* add https proxy tunnel support for identity providers ([6a7b859](https://github.com/authup/authup/commit/6a7b859e31bad6f10dd2fde22cdc6dfab3da2285))





# [0.24.0](https://github.com/authup/authup/compare/v0.23.1...v0.24.0) (2023-03-30)


### Features

* dynamic config getter for public-url ([5e17b05](https://github.com/authup/authup/commit/5e17b055c4e29fe43938fda90e465eccc7157d8e))





## [0.23.1](https://github.com/authup/authup/compare/v0.23.0...v0.23.1) (2023-03-30)


### Bug Fixes

* config validation for redis-,smtp- & vault-config ([19dd368](https://github.com/authup/authup/commit/19dd368cc833a1592676df2e1387f0699cc72f0f))





# [0.23.0](https://github.com/authup/authup/compare/v0.22.0...v0.23.0) (2023-03-30)


### Bug Fixes

* adjusted docker entrypoint + typos + cli start script ([f63296c](https://github.com/authup/authup/commit/f63296ce48e3ce20d8926fd5473f140379b89a02))
* **deps:** bump continu from 1.0.5 to 1.1.0 ([#982](https://github.com/authup/authup/issues/982)) ([91d901d](https://github.com/authup/authup/commit/91d901d1200cacf140dbda407813db5ad1a1f2b3))


### Features

* add support for docker image to run multiple apps simultanously ([dfae6d5](https://github.com/authup/authup/commit/dfae6d54539a2d14620eed4d97aec56f6817b50f))
* merge server-{,http,database} packages ([488070d](https://github.com/authup/authup/commit/488070dd73f8ba972fc5e01433b935d48e77bccd))
* refactored config loading & building ([07de0e3](https://github.com/authup/authup/commit/07de0e38542f2760d00ba3df77c76d673f76b6a8))
* replaced manual proxy parsing with http client detection ([18c3751](https://github.com/authup/authup/commit/18c3751f3dd3defdd9dfa34ec41522ac14d3b476))





# [0.22.0](https://github.com/Tada5hi/authup/compare/v0.21.0...v0.22.0) (2023-03-26)

**Note:** Version bump only for package @authup/server-api





# [0.21.0](https://github.com/Tada5hi/authup/compare/v0.20.1...v0.21.0) (2023-03-26)


### Bug Fixes

* replaced migration generate utility fn ([73a6e4a](https://github.com/Tada5hi/authup/commit/73a6e4a83092009956540a9e165bdcfbfcd12d38))
* soft robot credentials save on startup ([0340dd5](https://github.com/Tada5hi/authup/commit/0340dd50f7144247dc8aed22b0f02b859db2c603))





## [0.20.1](https://github.com/Tada5hi/authup/compare/v0.20.0...v0.20.1) (2023-03-25)


### Bug Fixes

* vault config load/apply + error middleware + http user-attributes reading ([411df82](https://github.com/Tada5hi/authup/commit/411df829439a0a52982a78048858e80ae745ebe7))





# [0.20.0](https://github.com/Tada5hi/authup/compare/v0.19.0...v0.20.0) (2023-03-24)

**Note:** Version bump only for package @authup/server-api





# [0.19.0](https://github.com/Tada5hi/authup/compare/v0.18.0...v0.19.0) (2023-03-23)

**Note:** Version bump only for package @authup/server-api





# [0.18.0](https://github.com/Tada5hi/authup/compare/v0.17.2...v0.18.0) (2023-03-23)


### Bug Fixes

* **deps:** bump smob from 0.1.0 to 1.0.0 ([#952](https://github.com/Tada5hi/authup/issues/952)) ([363fc69](https://github.com/Tada5hi/authup/commit/363fc6902848a16982626f4fbe3cb7e5c1afd053))


### Features

* add vault client support for robot credentials syncing ([66b2300](https://github.com/Tada5hi/authup/commit/66b23007fdfa4221c48f2d66f5524fdb5b4f3ed3))





## [0.17.2](https://github.com/Tada5hi/authup/compare/v0.17.1...v0.17.2) (2023-03-20)

**Note:** Version bump only for package @authup/server-api





## [0.17.1](https://github.com/Tada5hi/authup/compare/v0.17.0...v0.17.1) (2023-03-14)


### Bug Fixes

* **deps:** bump better-sqlite3 from 8.1.0 to 8.2.0 ([#935](https://github.com/Tada5hi/authup/issues/935)) ([29908c1](https://github.com/Tada5hi/authup/commit/29908c1b774c951166232940add6933700103b90))
* **deps:** bump pg from 8.9.0 to 8.10.0 ([#934](https://github.com/Tada5hi/authup/issues/934)) ([3e5d857](https://github.com/Tada5hi/authup/commit/3e5d857888f071e6bf5593872b94ff107df7fd66))
* **deps:** bump typeorm-extension from 2.5.3 to 2.5.4 ([#929](https://github.com/Tada5hi/authup/issues/929)) ([7884f49](https://github.com/Tada5hi/authup/commit/7884f49b200ad90717ed165ab817e569dfaa6b25))
* **deps:** bump typeorm-extension to v2.5.3 ([abe31c1](https://github.com/Tada5hi/authup/commit/abe31c18fbd2ecf61a7681f0812fea7b23560f44))





# [0.17.0](https://github.com/Tada5hi/authup/compare/v0.16.0...v0.17.0) (2023-03-13)


### Bug Fixes

* **deps:** bump zod from 3.20.6 to 3.21.4 ([#919](https://github.com/Tada5hi/authup/issues/919)) ([e24a5ef](https://github.com/Tada5hi/authup/commit/e24a5efcc7201aba2b747d9352927a648d88e954))





# [0.16.0](https://github.com/Tada5hi/authup/compare/v0.15.4...v0.16.0) (2023-02-28)

**Note:** Version bump only for package @authup/server-api





## [0.15.4](https://github.com/Tada5hi/authup/compare/v0.15.3...v0.15.4) (2023-02-24)

**Note:** Version bump only for package @authup/server-api





## [0.15.3](https://github.com/Tada5hi/authup/compare/v0.15.2...v0.15.3) (2023-02-23)


### Bug Fixes

* bum routup dependencies + adjusted docs url in star command ([cdd7f5a](https://github.com/Tada5hi/authup/commit/cdd7f5acde04155d3fd4d694583265bd5724dcba))
* **deps:** bump typeorm-extension from 2.5.0 to 2.5.2 ([#884](https://github.com/Tada5hi/authup/issues/884)) ([7689aea](https://github.com/Tada5hi/authup/commit/7689aea07323e28fac7f97e692fb3c11e44d3f80))
* **deps:** bump yargs from 17.6.2 to 17.7.0 ([#874](https://github.com/Tada5hi/authup/issues/874)) ([e1aa371](https://github.com/Tada5hi/authup/commit/e1aa371bf833a255dfa07da33ce88fd7f1ee61ff))
* **deps:** bump yargs from 17.7.0 to 17.7.1 ([#890](https://github.com/Tada5hi/authup/issues/890)) ([2035fd8](https://github.com/Tada5hi/authup/commit/2035fd8fe70bbbdc4fbf51f646b9c5344790cf4b))
* **deps:** updated typeorm-extension ([fc74f4a](https://github.com/Tada5hi/authup/commit/fc74f4ad114904a74d0e46416aa564306ec32082))





## [0.15.2](https://github.com/Tada5hi/authup/compare/v0.15.1...v0.15.2) (2023-02-14)


### Bug Fixes

* **deps:** bump zod from 3.20.2 to 3.20.6 ([#843](https://github.com/Tada5hi/authup/issues/843)) ([b94e056](https://github.com/Tada5hi/authup/commit/b94e056c8d4fe100845bb446019da381a61322e5))





## [0.15.1](https://github.com/Tada5hi/authup/compare/v0.15.0...v0.15.1) (2023-02-08)


### Bug Fixes

* **deps:** bump better-sqlite3 from 8.0.1 to 8.1.0 ([#837](https://github.com/Tada5hi/authup/issues/837)) ([74879e9](https://github.com/Tada5hi/authup/commit/74879e9d69c49bc5dbc14ae69d5022d9ac955d0d))
* **deps:** bump typeorm from 0.3.11 to 0.3.12 ([#838](https://github.com/Tada5hi/authup/issues/838)) ([ead58dd](https://github.com/Tada5hi/authup/commit/ead58dd35f18659d7a2df6f244d40919ec78b167))





# [0.15.0](https://github.com/Tada5hi/authup/compare/v0.14.1...v0.15.0) (2023-02-07)


### Bug Fixes

* **deps:** bump redis-extension from 1.2.2 to 1.2.3 ([#824](https://github.com/Tada5hi/authup/issues/824)) ([914fe7e](https://github.com/Tada5hi/authup/commit/914fe7e6c72989eeaf4c5b0134e419340c5c964a))


### Features

* renamed process env handling ([4fbdef2](https://github.com/Tada5hi/authup/commit/4fbdef2a661948969a8bfad5bfced5a4289ed465))





## [0.14.1](https://github.com/Tada5hi/authup/compare/v0.14.0...v0.14.1) (2023-01-30)


### Bug Fixes

* **server:** bump locter dependency ([d0d0ad2](https://github.com/Tada5hi/authup/commit/d0d0ad2ea29c7d6ab0a64beb37835f4df40afde5))
* **server:** saving seeder result on setup command ([d75f9ba](https://github.com/Tada5hi/authup/commit/d75f9ba82a76d07f3d337d45ca8877f41c3c810d))





# [0.14.0](https://github.com/Tada5hi/authup/compare/v0.13.0...v0.14.0) (2023-01-29)


### Features

* minor code cleanup + fixed redis caching strategy ([a5286b7](https://github.com/Tada5hi/authup/commit/a5286b716e6432bd872cda2e06def8f0c3ab9111))





# [0.13.0](https://github.com/Tada5hi/authup/compare/v0.12.1...v0.13.0) (2023-01-28)

**Note:** Version bump only for package @authup/server-api





## [0.12.1](https://github.com/Tada5hi/authup/compare/v0.12.0...v0.12.1) (2023-01-28)


### Bug Fixes

* peer-dependency version + updated license information ([f693215](https://github.com/Tada5hi/authup/commit/f69321538afbd2923287209593cdebcedaa29637))





# [0.12.0](https://github.com/Tada5hi/authup/compare/v0.11.1...v0.12.0) (2023-01-28)


### Features

* use tsc for transpiling of decorator packages ([2c41385](https://github.com/Tada5hi/authup/commit/2c41385201f6555b0bacaf09af5ad9779ab2a6c5))





## [0.11.1](https://github.com/Tada5hi/authup/compare/v0.11.0...v0.11.1) (2023-01-27)


### Bug Fixes

* **deps:** bump pg from 8.8.0 to 8.9.0 ([#807](https://github.com/Tada5hi/authup/issues/807)) ([9b607d6](https://github.com/Tada5hi/authup/commit/9b607d6c170fb79e35300c8e074a5cbac4353ec8))
* **deps:** updated dependencies ([b3d221c](https://github.com/Tada5hi/authup/commit/b3d221c862c4f4dbd0ccf018566ef00796fcd591))





# [0.11.0](https://github.com/Tada5hi/authup/compare/v0.10.1...v0.11.0) (2023-01-27)


### Bug Fixes

* **deps:** bump rc9 from 2.0.0 to 2.0.1 ([#789](https://github.com/Tada5hi/authup/issues/789)) ([943df77](https://github.com/Tada5hi/authup/commit/943df77563c2d282ff1fc716179409fd41e30036))
* **deps:** bump redis-extension from 1.2.0 to 1.2.1 ([#795](https://github.com/Tada5hi/authup/issues/795)) ([17afd4e](https://github.com/Tada5hi/authup/commit/17afd4e3ffaaf4320d1f5847a91ef160a5acbafe))





## [0.10.1](https://github.com/Tada5hi/authup/compare/v0.10.0...v0.10.1) (2023-01-23)

**Note:** Version bump only for package @authup/server-api





# [0.10.0](https://github.com/Tada5hi/authup/compare/v0.9.0...v0.10.0) (2023-01-20)

**Note:** Version bump only for package @authup/server-api





# [0.9.0](https://github.com/Tada5hi/authup/compare/v0.8.0...v0.9.0) (2023-01-20)


### Bug Fixes

* **deps:** bump locter from 0.6.2 to 0.7.1 ([9e1d44b](https://github.com/Tada5hi/authup/commit/9e1d44b580826202f8e210c7e4f2e45531398b22))
* **deps:** updated typeorm-extension ([3b0aee9](https://github.com/Tada5hi/authup/commit/3b0aee95c23fbe619b611f67c11f77832c2a582e))





# [0.8.0](https://github.com/Tada5hi/authup/compare/v0.7.0...v0.8.0) (2023-01-16)


### Bug Fixes

* **deps:** bump smob from 0.0.6 to 0.0.7 ([535685c](https://github.com/Tada5hi/authup/commit/535685cfb55e58dfa88635d1f08c0e3909d417dd))





# [0.7.0](https://github.com/Tada5hi/authup/compare/v0.6.3...v0.7.0) (2023-01-11)


### Bug Fixes

* **deps:** bump locter from 0.6.1 to 0.6.2 ([b50a892](https://github.com/Tada5hi/authup/commit/b50a892101f677a91d8661c1d74627310c8d54c6))


### Features

* unified entity columns for sqlite, mysql & postgres ([f379caa](https://github.com/Tada5hi/authup/commit/f379caac7b7f95145629734b692a7d38a472c9b2))





## [0.6.3](https://github.com/Tada5hi/authup/compare/v0.6.2...v0.6.3) (2023-01-10)

**Note:** Version bump only for package @authup/server-api





## [0.6.2](https://github.com/Tada5hi/authup/compare/v0.6.1...v0.6.2) (2023-01-10)

**Note:** Version bump only for package @authup/server-api





## [0.6.1](https://github.com/Tada5hi/authup/compare/v0.6.0...v0.6.1) (2023-01-08)

**Note:** Version bump only for package @authup/server-api





# [0.6.0](https://github.com/Tada5hi/authup/compare/v0.5.0...v0.6.0) (2023-01-08)

**Note:** Version bump only for package @authup/server-api





# [0.5.0](https://github.com/Tada5hi/authup/compare/v0.4.0...v0.5.0) (2023-01-08)


### Bug Fixes

* **deps:** bump typeorm-extension from 2.4.0 to 2.4.1 ([406b70b](https://github.com/Tada5hi/authup/commit/406b70b95ee7be043ca09b5b2c2057422f1d33dc))
* **server:** reset migrations + run migration transaction individually ([82d70a5](https://github.com/Tada5hi/authup/commit/82d70a56250bb18a29d32832571db6e13c1652a5))


### Features

* add healthcheck cli command ([208c62f](https://github.com/Tada5hi/authup/commit/208c62fbde68da0c1ae63378e47692d9a889d3cc))





# [0.4.0](https://github.com/Tada5hi/authup/compare/v0.3.1...v0.4.0) (2022-12-21)


### Bug Fixes

* **deps:** bump locter from 0.6.0 to 0.6.1 ([236bf62](https://github.com/Tada5hi/authup/commit/236bf627fc338e670671615c2a6b036811aff086))
* **deps:** bump typeorm-extension from 2.3.1 to 2.4.0 ([17b1307](https://github.com/Tada5hi/authup/commit/17b1307b5d466cdf95523dec42688f6564fb8069))
* **deps:** bump zod from 3.19.1 to 3.20.1 ([8c7075e](https://github.com/Tada5hi/authup/commit/8c7075e27f7105f89dddf7bec2c341e146788771))
* **deps:** bump zod from 3.20.1 to 3.20.2 ([4477c61](https://github.com/Tada5hi/authup/commit/4477c6160da7a579db589e49f81c22aaca4e414c))


### Features

* add scope management (http-endpoint, db-entity, ...) ([2ab4236](https://github.com/Tada5hi/authup/commit/2ab42364e44f032cb93c9946c40a9fd71f287c44))
* further enhancement for client & scope management ([29d1f3e](https://github.com/Tada5hi/authup/commit/29d1f3ee5ecde14afa0b692dd9589887bc2df54e))
* use continu for config management ([88b057d](https://github.com/Tada5hi/authup/commit/88b057dd6f15fb77c6a25197b51e6e0765e4fbe5))





# [0.3.0](https://github.com/Tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)


### Bug Fixes

* **server-http:** minor issue with user validation ([1bc4a65](https://github.com/Tada5hi/authup/commit/1bc4a655e6f3ed6b9dca5679a13db32d1978da9b))


### Features

* refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/Tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))





## [0.2.2](https://github.com/Tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)


### Bug Fixes

* **deps:** bump typeorm-extension from 2.3.0 to 2.3.1 ([aaccef7](https://github.com/Tada5hi/authup/commit/aaccef744d37f10146c9905611d9b819bc080a30))





## [0.2.1](https://github.com/Tada5hi/authup/compare/v0.2.0...v0.2.1) (2022-12-09)

**Note:** Version bump only for package @authup/server-api





# [0.2.0](https://github.com/Tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)


### Features

* **server-database:** add migration generate fn ([7a5b364](https://github.com/Tada5hi/authup/commit/7a5b364eebf5f0e0da0c9bc3e51fed89b2a2e547))





## [0.1.1](https://github.com/Tada5hi/authup/compare/v0.1.0...v0.1.1) (2022-12-08)

**Note:** Version bump only for package @authup/server-api





# 0.1.0 (2022-12-08)


### Bug Fixes

* **deps:** bump better-sqlite3 from 7.6.2 to 8.0.0 ([0a0a3b4](https://github.com/Tada5hi/authup/commit/0a0a3b4075c60864d55ac3e7f163b0c18c092e5a))


### Features

* add global cli & enhanced config handling ([95a1549](https://github.com/Tada5hi/authup/commit/95a1549c70ed18e9bc58e2f4fb5734712ab20a35))
* better config handling ([b1582b7](https://github.com/Tada5hi/authup/commit/b1582b798174c2c44e06271f3250db637a159bfd))
* only allow robot/role permission assignment for owned permissions ([9dfd9d3](https://github.com/Tada5hi/authup/commit/9dfd9d39ed4420f5d42b4fa9e03e88f04f840189))
* prepare global cli ([ed4539c](https://github.com/Tada5hi/authup/commit/ed4539c0b736f8b522e7a1af716ff6e3ab2d8200))
