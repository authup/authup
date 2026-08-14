# Changelog

## [1.0.0-beta.61](https://github.com/authup/authup/compare/v1.0.0-beta.60...v1.0.0-beta.61) (2026-08-14)


### Bug Fixes

* ensure consistent version for release ([0369d9f](https://github.com/authup/authup/commit/0369d9f2d8fbb0ee7bf1d742af5b31e7a16f55e6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61

## [1.0.0-beta.60](https://github.com/authup/authup/compare/v1.0.0-beta.59...v1.0.0-beta.60) (2026-08-13)


### Bug Fixes

* redo the v1.0.0-beta.60 release with consistent versions ([#3444](https://github.com/authup/authup/issues/3444)) ([5c04dc8](https://github.com/authup/authup/commit/5c04dc8daf28a01037949d8cb17e1de67ba10e6b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60

## [1.0.0-beta.59](https://github.com/authup/authup/compare/v1.0.0-beta.58...v1.0.0-beta.59) (2026-08-04)


### Bug Fixes

* ensure consistent version for release ([95d42be](https://github.com/authup/authup/commit/95d42be70feeeab7fe45c7dc81638aedb0c4324b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59

## [1.0.0-beta.58](https://github.com/authup/authup/compare/v1.0.0-beta.57...v1.0.0-beta.58) (2026-07-31)


### Bug Fixes

* ensure consistent version for release ([d3d06f6](https://github.com/authup/authup/commit/d3d06f6a81a8fc548825bec9af551d0113eb2c89))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58

## [1.0.0-beta.57](https://github.com/authup/authup/compare/v1.0.0-beta.56...v1.0.0-beta.57) (2026-07-29)


### Bug Fixes

* ensure consistent version for release ([40beaee](https://github.com/authup/authup/commit/40beaeefb89028a5e8b0ae60e48f6fb1c921b124))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57

## [1.0.0-beta.56](https://github.com/authup/authup/compare/v1.0.0-beta.55...v1.0.0-beta.56) (2026-07-24)


### Bug Fixes

* ensure consistent version for release ([5dd90cd](https://github.com/authup/authup/commit/5dd90cdadacc0c1068ad46fb2dc3df4eb897e356))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56

## [1.0.0-beta.55](https://github.com/authup/authup/compare/v1.0.0-beta.54...v1.0.0-beta.55) (2026-07-24)


### Bug Fixes

* ensure consistent version for release ([a6670d2](https://github.com/authup/authup/commit/a6670d29697ae12dc697dd99112609cb40881927))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55

## [1.0.0-beta.54](https://github.com/authup/authup/compare/v1.0.0-beta.53...v1.0.0-beta.54) (2026-07-22)


### Bug Fixes

* ensure consistent version for release ([d0f3dd2](https://github.com/authup/authup/commit/d0f3dd2ef93054ac7b677cf0fb26bbe8e64771bd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54

## [1.0.0-beta.53](https://github.com/authup/authup/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2026-07-17)


### ⚠ BREAKING CHANGES

* **server-adapter:** TokenVerifier.verify(token) without a thumbprint now fails closed (JWTError) on a certificate-bound token instead of returning it. Direct callers must pass the presented certificate's SHA-256 DER thumbprint via verify(token, { certificateThumbprint }).
* replace Client.is_confidential with auth_method and token_binding_method.

### Features

* add OAuth mutual TLS authentication ([#3261](https://github.com/authup/authup/issues/3261)) ([d3d88c6](https://github.com/authup/authup/commit/d3d88c6942059bf1a460d41f0a19c31932893b1c))


### Bug Fixes

* **server-adapter:** enforce certificate binding inside TokenVerifier.verify() ([#3270](https://github.com/authup/authup/issues/3270)) ([0741dbc](https://github.com/authup/authup/commit/0741dbc0cd84fd0ee077d4ad5428556fde40efa7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53

## [1.0.0-beta.52](https://github.com/authup/authup/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-07-11)


### Bug Fixes

* ensure consistent version for release ([130cc2e](https://github.com/authup/authup/commit/130cc2ec394ac940dcba771d25ef41b7dbc85964))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52

## [1.0.0-beta.51](https://github.com/authup/authup/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-07-02)


### Bug Fixes

* **deps:** normalize peer/dependency/dev classification across packages ([#3172](https://github.com/authup/authup/issues/3172)) ([c09f383](https://github.com/authup/authup/commit/c09f38315e5c569990b6540baf87cef0f3d8b663))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51

## [1.0.0-beta.50](https://github.com/authup/authup/compare/v1.0.0-beta.49...v1.0.0-beta.50) (2026-06-24)


### ⚠ BREAKING CHANGES

* **deps:** node >= 22.13 is now required; node 20 is no longer supported.

### Bug Fixes

* ensure consistent version for release ([5554980](https://github.com/authup/authup/commit/55549808f266eaab8599018107c0fc1afb9f8e48))


### Miscellaneous Chores

* **deps:** upgrade hapic to v3, @hapic/oauth2 to v4, require node &gt;= 22 ([#3134](https://github.com/authup/authup/issues/3134)) ([07503bc](https://github.com/authup/authup/commit/07503bc87b43227cf1b5e03573242d22722a0b08))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50

## [1.0.0-beta.49](https://github.com/authup/authup/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2026-06-13)


### Bug Fixes

* ensure consistent version for release ([eb1cfcf](https://github.com/authup/authup/commit/eb1cfcfd676322fd6abb48f0a2f5ebfca5e146ad))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49

## [1.0.0-beta.48](https://github.com/authup/authup/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([4f983df](https://github.com/authup/authup/commit/4f983dff265156d412fad8b1f3e88d2f632c3e6d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48

## [1.0.0-beta.47](https://github.com/authup/authup/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([15b08e3](https://github.com/authup/authup/commit/15b08e33c6475c68f3c950da537b14eab7ddaae4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47

## [1.0.0-beta.46](https://github.com/authup/authup/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([99f858b](https://github.com/authup/authup/commit/99f858b94e75e3c21c8293333aba53e8adbfbcdc))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46

## [1.0.0-beta.45](https://github.com/authup/authup/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([86e35f4](https://github.com/authup/authup/commit/86e35f476e4c213b434909098399f73fd59f2b77))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45

## [1.0.0-beta.44](https://github.com/authup/authup/compare/v1.0.0-beta.42...v1.0.0-beta.44) (2026-06-07)


### Bug Fixes

* ensure consistent version for release ([5159a23](https://github.com/authup/authup/commit/5159a233a5978bc910119b68f27130e0c2d570a7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44

## [1.0.0-beta.42](https://github.com/authup/authup/compare/v1.0.0-beta.41...v1.0.0-beta.42) (2026-05-15)


### Bug Fixes

* ensure consistent version for release ([183b5dd](https://github.com/authup/authup/commit/183b5dd882b1ed5a27212a0051648850e7693917))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42

## [1.0.0-beta.41](https://github.com/authup/authup/compare/v1.0.0-beta.40...v1.0.0-beta.41) (2026-05-08)


### ⚠ BREAKING CHANGES

* **server-adapter:** rename http→node, add web with verify primitives ([#3038](https://github.com/authup/authup/issues/3038))

### Bug Fixes

* ensure consistent version for release ([18bbe73](https://github.com/authup/authup/commit/18bbe73c332f19d388536b801ddfa88241df762e))


### Code Refactoring

* **server-adapter:** rename http→node, add web with verify primitives ([#3038](https://github.com/authup/authup/issues/3038)) ([f66347a](https://github.com/authup/authup/commit/f66347a4d0d8c87f484796831b1ae02d92eecabe))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
