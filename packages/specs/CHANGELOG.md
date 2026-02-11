# Changelog

## [1.0.0-beta.28](https://github.com/authup/authup/compare/v1.0.0-beta.28...v1.0.0-beta.28) (2026-02-11)


### Bug Fixes

* **deps:** bump the majorprod group across 1 directory with 2 updates ([#2827](https://github.com/authup/authup/issues/2827)) ([2683f17](https://github.com/authup/authup/commit/2683f17f567333a46fe64616e40053a71b6e10b1))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.28 to ^1.0.1-beta.28
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.28 to ^1.0.1-beta.28

## [1.0.0-beta.28](https://github.com/authup/authup/compare/v1.0.0-beta.27...v1.0.0-beta.28) (2026-01-13)


### ⚠ BREAKING CHANGES

* require esm import capabilities
* ESM only

### Features

* generate and hash client secret if required ([#2800](https://github.com/authup/authup/issues/2800)) ([36debf9](https://github.com/authup/authup/commit/36debf9167a37a21086675f21c378d76b2582eed))
* session management ([#2785](https://github.com/authup/authup/issues/2785)) ([c035b11](https://github.com/authup/authup/commit/c035b118ccdfc76ee61249ebeb4ee149f6792acb))


### Bug Fixes

* migrate from jest to vitest ([#2754](https://github.com/authup/authup/issues/2754)) ([191fd23](https://github.com/authup/authup/commit/191fd23035ee31eeca444f6d2165256a4f79ae72))
* normalize scope names to lower-case + renamed client-scope to scope repo ([cb5e23b](https://github.com/authup/authup/commit/cb5e23b39e8313f7068fdae10be3c83322f47cdd))
* use strict mode in server-kit package ([10bda02](https://github.com/authup/authup/commit/10bda02615ddbad44dc8e9db6c76790aae87a4f5))


### Miscellaneous Chores

* set min node engine version ([2d6e8a7](https://github.com/authup/authup/commit/2d6e8a794b731ccaa73f3da8c4e0e81fd1178a58))


### Code Refactoring

* migrated to esm only packages ([f988074](https://github.com/authup/authup/commit/f9880742e8fa6487afaf5878aedc520b37622a37))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28

## [1.0.0-beta.27](https://github.com/authup/authup/compare/v1.0.0-beta.26...v1.0.0-beta.27) (2025-07-17)


### Features

* refactored internal scope handling & authorize error formatting ([#2676](https://github.com/authup/authup/issues/2676)) ([9444ec2](https://github.com/authup/authup/commit/9444ec23a12e00c3397eda2bb28cbc08193f9a69))
* track authroization through idp redirect & callback ([#2669](https://github.com/authup/authup/issues/2669)) ([5cab0f4](https://github.com/authup/authup/commit/5cab0f405c2d9361f62d1aeb03f83fe8e23c7326))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27

## [1.0.0-beta.26](https://github.com/authup/authup/compare/v1.0.0-beta.25...v1.0.0-beta.26) (2025-04-14)


### Bug Fixes

* add e-mail to LICENSE file + set next version ([004ee6a](https://github.com/authup/authup/commit/004ee6a2a7fb93506535c8baeebff5981667036a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26

## [1.0.0-beta.25](https://github.com/authup/authup/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2025-04-08)


### Features

* correct client usage in security context ([#2579](https://github.com/authup/authup/issues/2579)) ([26f0118](https://github.com/authup/authup/commit/26f0118184c98bf04f499d19526b1cf0d034cad6))


### Bug Fixes

* update year range in LICENSE file ([8dd6da9](https://github.com/authup/authup/commit/8dd6da98cbfd8f910397de7391402af1e7517cc9))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25

## [1.0.0-beta.24](https://github.com/authup/authup/compare/v1.0.0-beta.23...v1.0.0-beta.24) (2025-01-18)


### Features

* refactor & split security package ([#2551](https://github.com/authup/authup/issues/2551)) ([1b38eed](https://github.com/authup/authup/commit/1b38eed204658cdde11b92f93027b843f47f43bf))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
