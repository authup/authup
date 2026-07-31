# Changelog

## [1.0.0-beta.58](https://github.com/authup/authup/compare/v1.0.0-beta.57...v1.0.0-beta.58) (2026-07-31)


### Bug Fixes

* ensure consistent version for release ([d3d06f6](https://github.com/authup/authup/commit/d3d06f6a81a8fc548825bec9af551d0113eb2c89))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/core-kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/server-kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58

## [1.0.0-beta.57](https://github.com/authup/authup/compare/v1.0.0-beta.56...v1.0.0-beta.57) (2026-07-29)


### Bug Fixes

* complete schema field projections and re-target role client FK ([#3324](https://github.com/authup/authup/issues/3324)) ([9eec343](https://github.com/authup/authup/commit/9eec343965bf98990560b0092d26bd0c82a2561f))
* **deps:** bump @rapiq/* to 2.0.0-beta.11 ([#3333](https://github.com/authup/authup/issues/3333)) ([728dbb1](https://github.com/authup/authup/commit/728dbb1f16deb14c5901f0406a34ae50c791dbd6))
* **deps:** replace @rapiq/{typeorm,sql,memory} with @rapiq/adapter-* ([9219e75](https://github.com/authup/authup/commit/9219e75c10bf1ba9164804f8676b049b44dc549c)), closes [#3341](https://github.com/authup/authup/issues/3341)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/core-kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/server-kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57

## [1.0.0-beta.56](https://github.com/authup/authup/compare/v1.0.0-beta.55...v1.0.0-beta.56) (2026-07-24)


### Bug Fixes

* **deps:** bump @rapiq/* to 2.0.0-beta.9 ([6475f2b](https://github.com/authup/authup/commit/6475f2b0ec1ad69b4412540a3385d03eca5c3746))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/core-kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/server-kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56

## [1.0.0-beta.55](https://github.com/authup/authup/compare/v1.0.0-beta.54...v1.0.0-beta.55) (2026-07-24)


### Bug Fixes

* repair build pipeline and bump rapiq to 2.0.0-beta.8 ([7a8f8f7](https://github.com/authup/authup/commit/7a8f8f7d4a3e84a9782823622e010242c34c0982))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/core-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/server-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55

## [1.0.0-beta.54](https://github.com/authup/authup/compare/v1.0.0-beta.53...v1.0.0-beta.54) (2026-07-22)


### ⚠ BREAKING CHANGES

* move the rapiq schema registry out of the database module ([#3283](https://github.com/authup/authup/issues/3283))
* camelCase entity properties, domain types & management API ([#3273](https://github.com/authup/authup/issues/3273))

### Features

* **access:** lower pending policies to rapiq conditions (toCondition / WHERE pushdown) ([#3291](https://github.com/authup/authup/issues/3291)) ([92b0827](https://github.com/authup/authup/commit/92b08270208fbb18a2b84f1ae86e808314330abf))
* compile permissions to row conditions for getMany authorization ([#3292](https://github.com/authup/authup/issues/3292)) ([dfcf6b8](https://github.com/authup/authup/commit/dfcf6b81bcf1f157ee9278fc5b663b7f562a8f94))
* **server-core:** validate entity schemas against typeorm metadata at boot ([#3285](https://github.com/authup/authup/issues/3285)) ([25577f9](https://github.com/authup/authup/commit/25577f95a6dfe0818ed2b6cb735adb1b12e43830))


### Bug Fixes

* **server-core:** authorize relation paths reached via filter/sort/field keys ([#3310](https://github.com/authup/authup/issues/3310)) ([b98e6c1](https://github.com/authup/authup/commit/b98e6c1ca8542b6961cb89e65873ccb9abd92e5f))


### Code Refactoring

* camelCase entity properties, domain types & management API ([#3273](https://github.com/authup/authup/issues/3273)) ([c31b20e](https://github.com/authup/authup/commit/c31b20ee9fd037e96bbcaee2eae1d6386174f52b))
* move the rapiq schema registry out of the database module ([#3283](https://github.com/authup/authup/issues/3283)) ([135d7e1](https://github.com/authup/authup/commit/135d7e14d477212d0d719bb12074c3653cd09ad4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/core-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/server-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54

## [1.0.0-beta.53](https://github.com/authup/authup/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2026-07-17)


### Features

* key management api + lifecycle states ([#3256](https://github.com/authup/authup/issues/3256)) ([c69e9a2](https://github.com/authup/authup/commit/c69e9a2fc070a2c6bea71ec9e89bee2341e0cd88))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/core-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/server-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53

## [1.0.0-beta.52](https://github.com/authup/authup/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-07-11)


### Bug Fixes

* ensure consistent version for release ([130cc2e](https://github.com/authup/authup/commit/130cc2ec394ac940dcba771d25ef41b7dbc85964))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/core-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/server-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52

## [1.0.0-beta.51](https://github.com/authup/authup/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-07-02)


### Bug Fixes

* **deps:** normalize peer/dependency/dev classification across packages ([#3172](https://github.com/authup/authup/issues/3172)) ([c09f383](https://github.com/authup/authup/commit/c09f38315e5c569990b6540baf87cef0f3d8b663))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/core-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/server-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51

## [1.0.0-beta.50](https://github.com/authup/authup/compare/v1.0.0-beta.49...v1.0.0-beta.50) (2026-06-24)


### ⚠ BREAKING CHANGES

* **deps:** node >= 22.13 is now required; node 20 is no longer supported.

### Bug Fixes

* ensure consistent version for release ([5554980](https://github.com/authup/authup/commit/55549808f266eaab8599018107c0fc1afb9f8e48))


### Miscellaneous Chores

* **deps:** upgrade hapic to v3, @hapic/oauth2 to v4, require node &gt;= 22 ([#3134](https://github.com/authup/authup/issues/3134)) ([07503bc](https://github.com/authup/authup/commit/07503bc87b43227cf1b5e03573242d22722a0b08))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/server-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/server-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50

## [1.0.0-beta.49](https://github.com/authup/authup/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2026-06-13)


### Bug Fixes

* ensure consistent version for release ([eb1cfcf](https://github.com/authup/authup/commit/eb1cfcfd676322fd6abb48f0a2f5ebfca5e146ad))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/server-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/server-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49

## [1.0.0-beta.48](https://github.com/authup/authup/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([4f983df](https://github.com/authup/authup/commit/4f983dff265156d412fad8b1f3e88d2f632c3e6d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/server-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/server-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48

## [1.0.0-beta.47](https://github.com/authup/authup/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([15b08e3](https://github.com/authup/authup/commit/15b08e33c6475c68f3c950da537b14eab7ddaae4))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/server-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/server-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47

## [1.0.0-beta.46](https://github.com/authup/authup/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([99f858b](https://github.com/authup/authup/commit/99f858b94e75e3c21c8293333aba53e8adbfbcdc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/server-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/server-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46

## [1.0.0-beta.45](https://github.com/authup/authup/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([86e35f4](https://github.com/authup/authup/commit/86e35f476e4c213b434909098399f73fd59f2b77))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/server-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/server-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45

## [1.0.0-beta.44](https://github.com/authup/authup/compare/v1.0.0-beta.42...v1.0.0-beta.44) (2026-06-07)


### Bug Fixes

* ensure consistent version for release ([5159a23](https://github.com/authup/authup/commit/5159a233a5978bc910119b68f27130e0c2d570a7))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/server-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/server-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44

## [1.0.0-beta.42](https://github.com/authup/authup/compare/v1.0.0-beta.41...v1.0.0-beta.42) (2026-05-15)


### Bug Fixes

* ensure consistent version for release ([183b5dd](https://github.com/authup/authup/commit/183b5dd882b1ed5a27212a0051648850e7693917))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/server-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/server-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
