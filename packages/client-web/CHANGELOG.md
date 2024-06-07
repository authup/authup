# Change Log

## [1.0.0-beta.16](https://github.com/authup/authup/compare/v1.0.1-beta.14...v1.0.0-beta.16) (2024-06-07)


### Bug Fixes

* use store access in page components ([8d75d0d](https://github.com/authup/authup/commit/8d75d0dca0614e099abf3ff6febd532b694c7643))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.15 to ^1.0.0-beta.16

## [1.0.1-beta.14](https://github.com/authup/authup/compare/v1.0.0-beta.14...v1.0.1-beta.14) (2024-05-13)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.14 to ^1.0.0-beta.15

## [1.0.0-beta.14](https://github.com/authup/authup/compare/v1.0.0-beta.13...v1.0.0-beta.14) (2024-05-13)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.14

## [1.0.0-beta.13](https://github.com/authup/authup/compare/v1.0.0-beta.12...v1.0.0-beta.13) (2024-05-13)


### Features

* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))


### Bug Fixes

* encforcing entity unique constraints on create/update operation ([a9680df](https://github.com/authup/authup/commit/a9680df90c7f24bc463051068f8afba3493c36b7))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/client-web-config bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13

## [1.0.0-beta.12](https://github.com/authup/authup/compare/v1.0.0-beta.11...v1.0.0-beta.12) (2024-05-10)


### Features

* implement interaction between timeago and ilingo library ([5b44aaf](https://github.com/authup/authup/commit/5b44aaf7bb3133d8ace60cb84a4affd4ff1c85bf))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* migrated to bootstrap-vue-next v0.17 ([7d32617](https://github.com/authup/authup/commit/7d32617db8d78665e952eb0601996b740e9dd195))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified validation handling in login.vue component ([320e049](https://github.com/authup/authup/commit/320e0497572f5b30219e41cbd67523260b23b8fa))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))
* package name of plugin packages ([2c8a5ca](https://github.com/authup/authup/commit/2c8a5cab37b9483af57f94151e9a43b9d4decb10))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-http-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/client-web-config bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12

## [1.0.1-beta.10](https://github.com/authup/authup/compare/v1.0.0-beta.10...v1.0.1-beta.10) (2024-05-09)


### Bug Fixes

* package name of plugin packages ([2c8a5ca](https://github.com/authup/authup/commit/2c8a5cab37b9483af57f94151e9a43b9d4decb10))

## [1.0.0-beta.10](https://github.com/authup/authup/compare/v1.0.0-beta.9...v1.0.0-beta.10) (2024-05-08)


### Features

* implement interaction between timeago and ilingo library ([5b44aaf](https://github.com/authup/authup/commit/5b44aaf7bb3133d8ace60cb84a4affd4ff1c85bf))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* migrated to bootstrap-vue-next v0.17 ([7d32617](https://github.com/authup/authup/commit/7d32617db8d78665e952eb0601996b740e9dd195))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified validation handling in login.vue component ([320e049](https://github.com/authup/authup/commit/320e0497572f5b30219e41cbd67523260b23b8fa))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/config bumped from ^1.0.0-beta.9 to ^1.0.1-beta.9
    * @authup/kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-http-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/client-web-config bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10

## [1.0.0-beta.9](https://github.com/authup/authup/compare/client-web-v1.0.0-beta.8...client-web-v1.0.0-beta.9) (2024-04-10)


### Bug Fixes

* **deps:** bump @hapic/oauth2 from 2.4.1 to 2.4.2 ([#1835](https://github.com/authup/authup/issues/1835)) ([d870a11](https://github.com/authup/authup/commit/d870a117850b1c0ccb3fbc988e43478d1d1cb826))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-vue bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9
    * @authup/config bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9
    * @authup/core bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9
    * @authup/client-web-config bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9

## [1.0.0-beta.8](https://github.com/authup/authup/compare/client-web-v1.0.0-beta.7...client-web-v1.0.0-beta.8) (2024-03-26)


### Miscellaneous Chores

* **client-web:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-vue bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8
    * @authup/config bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8
    * @authup/core bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8
    * @authup/client-web-config bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8

## [1.0.0-beta.7](https://github.com/authup/authup/compare/client-web-v1.0.0-beta.6...client-web-v1.0.0-beta.7) (2024-03-06)


### Bug Fixes

* permission restriction in identity-provider routes ([18077d3](https://github.com/authup/authup/commit/18077d3c7684ec600da2d1b43fac0d1785d9def2))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-vue bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7
    * @authup/config bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7
    * @authup/core bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7
    * @authup/client-web-config bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7

## [1.0.0-beta.6](https://github.com/authup/authup/compare/client-web-v1.0.0-beta.5...client-web-v1.0.0-beta.6) (2024-02-28)


### Miscellaneous Chores

* **client-web:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-vue bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6
    * @authup/config bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6
    * @authup/core bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6
    * @authup/client-web-config bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6

## [1.0.0-beta.5](https://github.com/authup/authup/compare/client-web-v1.0.0-beta.4...client-web-v1.0.0-beta.5) (2024-02-26)


### Features

* remove permission name regex restriction ([#1754](https://github.com/authup/authup/issues/1754)) ([c81a249](https://github.com/authup/authup/commit/c81a2499fe48cdbe258cac89d6084cb777ac27fc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-vue bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5
    * @authup/config bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5
    * @authup/core bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5
    * @authup/client-web-config bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5

## [1.0.0-beta.4](https://github.com/authup/authup/compare/client-web-v1.0.0-beta.3...client-web-v1.0.0-beta.4) (2024-02-19)


### Features

* ldap identity provider ([#1721](https://github.com/authup/authup/issues/1721)) ([3cf6858](https://github.com/authup/authup/commit/3cf68587b8ed44c3dbbf745fcbec6166e615f85b))


### Bug Fixes

* client web scope list view ([b76cffb](https://github.com/authup/authup/commit/b76cffbe7f600cea2ca426e89112cf2247e210d0))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-vue bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4
    * @authup/config bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4
    * @authup/core bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4
    * @authup/client-web-config bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4

## [1.0.0-beta.3](https://github.com/authup/authup/compare/client-web-v1.0.0-beta.2...client-web-v1.0.0-beta.3) (2024-02-06)


### Bug Fixes

* remove nuxt module for loading configuration file ([3ad5f8c](https://github.com/authup/authup/commit/3ad5f8ca00ecbefb79ba41ea0784e6a36e38492a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-vue bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3
    * @authup/config bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3
    * @authup/core bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3
    * @authup/client-web-config bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3

## [1.0.0-beta.2](https://github.com/authup/authup/compare/client-web-v1.0.0-beta.1...client-web-v1.0.0-beta.2) (2024-01-14)


### Miscellaneous Chores

* **client-web:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-vue bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2
    * @authup/config bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2
    * @authup/core bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2
    * @authup/client-web-config bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2

## [1.0.0-beta.1](https://github.com/authup/authup/compare/client-web-v1.0.0-beta.0...client-web-v1.0.0-beta.1) (2024-01-09)


### Bug Fixes

* **deps:** bump @hapic/oauth2 from 2.4.0 to 2.4.1 ([#1628](https://github.com/authup/authup/issues/1628)) ([e963096](https://github.com/authup/authup/commit/e963096552ff0fca2e9685d6d7712d0d6f5202a7))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-vue bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1
    * @authup/config bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1
    * @authup/core bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1
    * @authup/client-web-config bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1

## [1.0.0-beta.0](https://github.com/authup/authup/compare/client-web-v0.45.10...client-web-v1.0.0-beta.0) (2024-01-05)


### Miscellaneous Chores

* **client-web:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-vue bumped from ^0.45.10 to ^1.0.0-beta.0
    * @authup/config bumped from ^0.0.0 to ^1.0.0-beta.0
    * @authup/core bumped from ^0.45.10 to ^1.0.0-beta.0
    * @authup/client-web-config bumped from ^0.0.0 to ^1.0.0-beta.0

## 0.45.10

### Patch Changes

- [`ecf8797f`](https://github.com/authup/authup/commit/ecf8797fcacff6a560564fb9d01561c04b56cc63) Thanks [@tada5hi](https://github.com/tada5hi)! - fix throwing error

## 0.45.9

### Patch Changes

- [`f0b015a0`](https://github.com/authup/authup/commit/f0b015a07c960610031412368f83fc07ba4dde40) Thanks [@tada5hi](https://github.com/tada5hi)! - patch ecosystem

## 0.45.8

### Patch Changes

- [`63b4414e`](https://github.com/authup/authup/commit/63b4414eed4442a40dd25aab7c0dd69d0bd46f26) Thanks [@tada5hi](https://github.com/tada5hi)! - fix docker build

## 0.45.7

### Patch Changes

- [`7faa3d10`](https://github.com/authup/authup/commit/7faa3d10dc0a048a84792d6d0d7a2dc717f13e1b) Thanks [@tada5hi](https://github.com/tada5hi)! - next patch release

## 0.45.6

### Patch Changes

- [`9b94d2be`](https://github.com/authup/authup/commit/9b94d2be82498faa4e28d63450d8e8c1beda5d37) Thanks [@tada5hi](https://github.com/tada5hi)! - force docker publish to docker.io

## 0.45.5

### Patch Changes

- [`3f5d3d72`](https://github.com/authup/authup/commit/3f5d3d728576a51ec96fac740a2738451d2d2cd1) Thanks [@tada5hi](https://github.com/tada5hi)! - release docker

## 0.45.4

### Patch Changes

- [`622729b0`](https://github.com/authup/authup/commit/622729b086d0a833b4e18bcb0ce9c046ebe0d1d8) Thanks [@tada5hi](https://github.com/tada5hi)! - force docker release

## 0.45.3

### Patch Changes

- [`05849783`](https://github.com/authup/authup/commit/058497834a176c5efa4412408fda5de144a3bc61) Thanks [@tada5hi](https://github.com/tada5hi)! - trigger release workflow

## 0.45.2

### Patch Changes

- [`c4f56913`](https://github.com/authup/authup/commit/c4f56913ceb64100ec86f443d1eceddb4adc0d1c) Thanks [@tada5hi](https://github.com/tada5hi)! - bump to next patch version

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.45.1](https://github.com/authup/authup/compare/v0.45.0...v0.45.1) (2023-10-23)

### Bug Fixes

- include .nuxt directory for publishing ([adc8101](https://github.com/authup/authup/commit/adc8101f91da1a12aceb22a8964df7241fda086b))

# [0.45.0](https://github.com/authup/authup/compare/v0.44.0...v0.45.0) (2023-10-23)

**Note:** Version bump only for package @authup/client-ui

# [0.44.0](https://github.com/authup/authup/compare/v0.42.0...v0.44.0) (2023-10-07)

**Note:** Version bump only for package @authup/client-ui

# [0.43.0](https://github.com/authup/authup/compare/v0.42.0...v0.43.0) (2023-10-05)

**Note:** Version bump only for package @authup/client-ui

# [0.42.0](https://github.com/authup/authup/compare/v0.41.0...v0.42.0) (2023-10-05)

### Bug Fixes

- **deps:** bump zod from 3.22.2 to 3.22.3 ([#1386](https://github.com/authup/authup/issues/1386)) ([1663dc8](https://github.com/authup/authup/commit/1663dc845aa8235db9f73aaa9c5dd1324da87f03))
- **deps:** bump zod from 3.22.3 to 3.22.4 ([#1404](https://github.com/authup/authup/issues/1404)) ([abcedb9](https://github.com/authup/authup/commit/abcedb929cff68c3c6105b023563fd30d7c4119d))

### Features

- bump routup to v3.0 ([f46f066](https://github.com/authup/authup/commit/f46f0661923a64b392fd62a845a5bab9a2f0891c))

# [0.41.0](https://github.com/authup/authup/compare/v0.40.3...v0.41.0) (2023-09-01)

### Bug Fixes

- **deps:** bump hapic to v2.3.0 ([23d59bd](https://github.com/authup/authup/commit/23d59bd02f09ffbdfbae7534914b7004894b1b52))
- **deps:** bump zod from 3.22.1 to 3.22.2 ([#1346](https://github.com/authup/authup/issues/1346)) ([584e804](https://github.com/authup/authup/commit/584e804fb2f6ac4288297ccf2814abff82dce328))

## [0.40.3](https://github.com/authup/authup/compare/v0.40.2...v0.40.3) (2023-08-21)

**Note:** Version bump only for package @authup/client-ui

## [0.40.2](https://github.com/authup/authup/compare/v0.40.1...v0.40.2) (2023-08-20)

### Bug Fixes

- list total entries incr/decr ([fbf0a17](https://github.com/authup/authup/commit/fbf0a17a5c2eb931e501eb58d7d38a317a0c8706))
- renamed list-query to list-meta + restructured meta type ([6abb3fd](https://github.com/authup/authup/commit/6abb3fd9122244de0e84afb9094d04e1f35bf0fd))

## [0.40.1](https://github.com/authup/authup/compare/v0.40.0...v0.40.1) (2023-08-16)

### Bug Fixes

- **deps:** bump zod from 3.21.4 to 3.22.1 ([#1312](https://github.com/authup/authup/issues/1312)) ([976bdf5](https://github.com/authup/authup/commit/976bdf54059da4d47d10eab2402ac5abced77f84))

# [0.40.0](https://github.com/authup/authup/compare/v0.39.1...v0.40.0) (2023-08-15)

### Bug Fixes

- api-client/store usage with provide & inject ([779a0ff](https://github.com/authup/authup/commit/779a0ff6a0ef143b11e6e4b155d2a0928724d01f))
- minor cleanup + enhance vue install fn ([5c6eb53](https://github.com/authup/authup/commit/5c6eb537ecdd65c17c460217263edaa450ef9cfc))

### Features

- simplified entity assign actions ([c22ab45](https://github.com/authup/authup/commit/c22ab4528b1df0e81500bfdc59ab6bcf08517a08))

## [0.39.1](https://github.com/authup/authup/compare/v0.39.0...v0.39.1) (2023-07-22)

**Note:** Version bump only for package @authup/client-ui

# [0.39.0](https://github.com/authup/authup/compare/v0.38.0...v0.39.0) (2023-07-18)

### Bug Fixes

- env parse and apply for client-ui via cli service ([135f85c](https://github.com/authup/authup/commit/135f85c7abbad39d67ee0eb600503bb90d32becf))
- oauth2 github identity-provider workflow ([f6843e2](https://github.com/authup/authup/commit/f6843e2957224f87ff8cd2dc44a94623afc84016))
- rename realm column drop_able to built_in ([dd93239](https://github.com/authup/authup/commit/dd932393ba7391b9b0196dc3bbb63718a1f89ec0))
- simplify imports + better defaults for list-controls ([870cd0b](https://github.com/authup/authup/commit/870cd0b5a5a6925a059d29748d844b4e544ca20b))

### Features

- extended identity-provider form to manage protocols and protocol-configs ([0d01e7f](https://github.com/authup/authup/commit/0d01e7f49510722ec3fdd32050c22d64f931e478))
- implemented entity-manager + created domain entity components ([391969d](https://github.com/authup/authup/commit/391969d4c4ba0abd325a2fbc032da4eef0eab66c))
- split identity-provider form fields + additional utitlity components ([a50a695](https://github.com/authup/authup/commit/a50a695614f8261083776e1d0d34418dba2ceeec))
- use timeago component for {updated,created}-at columns ([af92236](https://github.com/authup/authup/commit/af92236231d064d25969ce07996ef5586ab671f8))

# [0.38.0](https://github.com/authup/authup/compare/v0.37.1...v0.38.0) (2023-06-29)

### Features

- enhanced and unified slot- & prop-typing and capabilities ([6d4caa6](https://github.com/authup/authup/commit/6d4caa6202349e7ea0f431da56a7e6881b49f41c))

## [0.37.1](https://github.com/authup/authup/compare/v0.37.0...v0.37.1) (2023-06-14)

### Bug Fixes

- bump hapic to v2.x ([2dd66ed](https://github.com/authup/authup/commit/2dd66ed87e89338be682a93bec4fe12ca86be712))
- bump minimatch to v9.x ([0c63d48](https://github.com/authup/authup/commit/0c63d481d20dbae273130595bde4453b476eca37))
- bump vue-layout dependencies + rename validation create fn ([ea0c679](https://github.com/authup/authup/commit/ea0c679207cd0d3cd6503d80779a825fdb6091d5))
- **deps:** bump @hapic/oauth2 from 2.0.0-alpha.10 to 2.0.0-alpha.11 ([#1162](https://github.com/authup/authup/issues/1162)) ([f54db63](https://github.com/authup/authup/commit/f54db63b1a4bf31ea7c7931ed96158ec62e5d2f8))

# [0.37.0](https://github.com/authup/authup/compare/v0.36.0...v0.37.0) (2023-05-31)

### Features

- implemented ilingo v3 ([5b0e632](https://github.com/authup/authup/commit/5b0e6321cd8b7569e1e92262014a8ffc00098d63))

# [0.36.0](https://github.com/authup/authup/compare/v0.35.0...v0.36.0) (2023-05-27)

### Bug Fixes

- rename register-timer to set-timer ([77793bc](https://github.com/authup/authup/commit/77793bc961e4695520dd08187182238647aee2ba))

### Features

- cleanup and relocate auth store + set token max age for oauth2 grant types ([13643fd](https://github.com/authup/authup/commit/13643fd76e8c471f8d90b555c386041a34bcb2ff))
- refactor and optimized client response error token hook ([fae52c8](https://github.com/authup/authup/commit/fae52c8cfcc0aa563d6edd0702f3438ab76e6e5a))

# [0.35.0](https://github.com/authup/authup/compare/v0.34.0...v0.35.0) (2023-05-25)

### Bug Fixes

- update auth store after token creation ([697b3d5](https://github.com/authup/authup/commit/697b3d5806c84dbe31e65470378545044d956b20))

# [0.34.0](https://github.com/authup/authup/compare/v0.33.0...v0.34.0) (2023-05-24)

### Bug Fixes

- better token error handling + token error verification ([e323e83](https://github.com/authup/authup/commit/e323e834b2f4f695fd9b0c8dc1629d6a4b265ebe))
- **deps:** bump @vue-layout/\* packages ([f7d6e4c](https://github.com/authup/authup/commit/f7d6e4c8089c693e9d6a86ed8e19725bf8c78a42))
- **server-adapter:** cookie middleware extraction for http middleware ([d990176](https://github.com/authup/authup/commit/d990176ff9f39ae6c288acc142a23864098250cb))
- update current user on settings page ([91aa2df](https://github.com/authup/authup/commit/91aa2dfba1569f9d5a96c4cd14540de2542c6138))

### Features

- switch to bootstrap table view for domain lists ([2faa379](https://github.com/authup/authup/commit/2faa37910732863bb730588b6e3334c27b353c16))
- use bootstrap toasts instead of vue-toastification ([50ee4ef](https://github.com/authup/authup/commit/50ee4efe93efa29903185ba864ce654647aed422))

# [0.33.0](https://github.com/authup/authup/compare/v0.32.3...v0.33.0) (2023-04-24)

### Bug Fixes

- **deps:** bump continu from 1.2.0 to 1.3.1 ([#1010](https://github.com/authup/authup/issues/1010)) ([21730dd](https://github.com/authup/authup/commit/21730dd64284198c6111f14f5cf31a55774d89fb))
- http client (error) hook implementation ([86ddd6c](https://github.com/authup/authup/commit/86ddd6c341a36ab37cf76844129552031618c926))
- page component typings ([b815cb6](https://github.com/authup/authup/commit/b815cb6359472c4247d1246a8c4fb7667d4e4bce))

### Features

- bump hapic to v2.0.0-alpha.x (axios -> fetch) ([#1036](https://github.com/authup/authup/issues/1036)) ([e09c919](https://github.com/authup/authup/commit/e09c91930d65b41725e5b1c4e26c21f9a5c67342))
- implemented hapic v2.0 alpha ([f1da95b](https://github.com/authup/authup/commit/f1da95bb3be6d1fe0cfd195a44a63c5a8d60dc6c))

## [0.32.2](https://github.com/authup/authup/compare/v0.32.1...v0.32.2) (2023-04-05)

### Bug Fixes

- restructured ability-manger in module + force version bump ([b59f485](https://github.com/authup/authup/commit/b59f485eec2e6e7ddf6d771f7eaad0f1ef46b569))

## [0.32.1](https://github.com/authup/authup/compare/v0.32.0...v0.32.1) (2023-04-04)

### Bug Fixes

- **deps:** bump vue-layout to v1.1.0 ([ff7f4d1](https://github.com/authup/authup/commit/ff7f4d15d101cb9b3c33e1b67f7764a4e09df110))

# [0.32.0](https://github.com/authup/authup/compare/v0.31.3...v0.32.0) (2023-04-03)

### Features

- use core token-interceptor for ui token session management ([33ec6e0](https://github.com/authup/authup/commit/33ec6e0ad835c7203d3d848f074a2210507e0ad3))

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

- support interceptor mounting on client and client driver instance ([a26dafe](https://github.com/authup/authup/commit/a26dafe8174cf9c6de0bf85c294baf8e32d6261a))

# [0.29.0](https://github.com/authup/authup/compare/v0.28.0...v0.29.0) (2023-04-01)

### Bug Fixes

- adjusted README.md, package.json files + renamed http client ([fcf8423](https://github.com/authup/authup/commit/fcf8423228fa73aa2a61ba8de96c0af51dfb0c5f))
- enhance executorÂ ([31624c1](https://github.com/authup/authup/commit/31624c1a6a91c33a0fd29a9e33f451e9133d5cf1))

### Features

- add realm & identity-provider selection to login form ([5678540](https://github.com/authup/authup/commit/5678540256e7fb59443548e5fe4eb4705d9346f1))

# [0.28.0](https://github.com/authup/authup/compare/v0.27.0...v0.28.0) (2023-04-01)

**Note:** Version bump only for package @authup/client-ui

# [0.27.0](https://github.com/authup/authup/compare/v0.26.0...v0.27.0) (2023-04-01)

### Features

- load config file for frontend ui if present ([7776430](https://github.com/authup/authup/commit/7776430963d6bc469887fa1261ccc8b65c49fd0a))

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

- add realm- & scope-subscriber + minor cleanup + enum referencing ([dc4f1ba](https://github.com/tada5hi/authup/commit/dc4f1ba167259f6c7c8f381a8569fe255646e85d))
- add vault client support for robot credentials syncing ([66b2300](https://github.com/tada5hi/authup/commit/66b23007fdfa4221c48f2d66f5524fdb5b4f3ed3))

## [0.17.2](https://github.com/tada5hi/authup/compare/v0.17.1...v0.17.2) (2023-03-20)

### Bug Fixes

- **deps:** bump hapci/\*\* to v1.3.0 ([2e7068a](https://github.com/tada5hi/authup/commit/2e7068ae21e5a4d0dae0b9cde90a308efbc247de))

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

- **deps:** bump vue from 3.2.45 to 3.2.47 ([#825](https://github.com/tada5hi/authup/issues/825)) ([69d44a6](https://github.com/tada5hi/authup/commit/69d44a62684e980225cb5c416d4ccb4d5e5f902d))

# [0.14.0](https://github.com/tada5hi/authup/compare/v0.13.0...v0.14.0) (2023-01-29)

**Note:** Version bump only for package @authup/client-ui

# [0.13.0](https://github.com/tada5hi/authup/compare/v0.12.1...v0.13.0) (2023-01-28)

**Note:** Version bump only for package @authup/client-ui

## [0.12.1](https://github.com/tada5hi/authup/compare/v0.12.0...v0.12.1) (2023-01-28)

### Bug Fixes

- peer-dependency version + updated license information ([f693215](https://github.com/tada5hi/authup/commit/f69321538afbd2923287209593cdebcedaa29637))

# [0.12.0](https://github.com/tada5hi/authup/compare/v0.11.1...v0.12.0) (2023-01-28)

**Note:** Version bump only for package @authup/client-ui

## [0.11.1](https://github.com/tada5hi/authup/compare/v0.11.0...v0.11.1) (2023-01-27)

### Bug Fixes

- **deps:** bump ilingo to v2.2.1 ([eebc902](https://github.com/tada5hi/authup/commit/eebc902495debf127679f8c2619deef00249b041))
- **deps:** updated dependencies ([b3d221c](https://github.com/tada5hi/authup/commit/b3d221c862c4f4dbd0ccf018566ef00796fcd591))

# [0.11.0](https://github.com/tada5hi/authup/compare/v0.10.1...v0.11.0) (2023-01-27)

### Bug Fixes

- **deps:** updated nuxt to v3.1.1 ([8070cf0](https://github.com/tada5hi/authup/commit/8070cf083b7efe2a21b4fd2e8106a612eaba5de4))
- **ui:** add nav toggling + add additional nesting layer header/sidebar ([07ea051](https://github.com/tada5hi/authup/commit/07ea051a5226a266699d1e849a21b6c5c85d0613))

### Features

- **ui:** add initial head meta tags ([536cb08](https://github.com/tada5hi/authup/commit/536cb08fad8e887ec7b334d577dd40bfe685f310))

## [0.10.1](https://github.com/tada5hi/authup/compare/v0.10.0...v0.10.1) (2023-01-23)

**Note:** Version bump only for package @authup/client-ui

# [0.10.0](https://github.com/tada5hi/authup/compare/v0.9.0...v0.10.0) (2023-01-20)

**Note:** Version bump only for package @authup/client-ui

# [0.9.0](https://github.com/tada5hi/authup/compare/v0.8.0...v0.9.0) (2023-01-20)

### Features

- lazy password grant + minor entity management ui guards ([127ec1c](https://github.com/tada5hi/authup/commit/127ec1c13f108f2a032aba67dd3b662d35251dc7))
- **ui:** fix store usage + implemented realm state ([4384c55](https://github.com/tada5hi/authup/commit/4384c55d66dcc7919df3508e4f96b5189cbc3a60))
- **ui:** implemented realm switching in admin area ([d902af7](https://github.com/tada5hi/authup/commit/d902af78d85c270f75425eef01e191a1cc7504ac))

# [0.8.0](https://github.com/tada5hi/authup/compare/v0.7.0...v0.8.0) (2023-01-16)

**Note:** Version bump only for package @authup/client-ui

# [0.7.0](https://github.com/tada5hi/authup/compare/v0.6.3...v0.7.0) (2023-01-11)

**Note:** Version bump only for package @authup/client-ui

## [0.6.3](https://github.com/tada5hi/authup/compare/v0.6.2...v0.6.3) (2023-01-10)

**Note:** Version bump only for package @authup/client-ui

## [0.6.2](https://github.com/tada5hi/authup/compare/v0.6.1...v0.6.2) (2023-01-10)

### Bug Fixes

- **deps:** updated peer-dependencies + oauth2 client library ([d91981e](https://github.com/tada5hi/authup/commit/d91981e7cafe0def6fef26e5daa3042524c9a3e0))

# [0.6.0](https://github.com/tada5hi/authup/compare/v0.5.0...v0.6.0) (2023-01-08)

**Note:** Version bump only for package @authup/client-ui

# [0.5.0](https://github.com/tada5hi/authup/compare/v0.4.0...v0.5.0) (2023-01-08)

**Note:** Version bump only for package @authup/client-ui

# [0.4.0](https://github.com/tada5hi/authup/compare/v0.3.1...v0.4.0) (2022-12-21)

### Features

- add scope management (http-endpoint, db-entity, ...) ([2ab4236](https://github.com/tada5hi/authup/commit/2ab42364e44f032cb93c9946c40a9fd71f287c44))
- further enhancement for client & scope management ([29d1f3e](https://github.com/tada5hi/authup/commit/29d1f3ee5ecde14afa0b692dd9589887bc2df54e))
- **ui:** add oauth2 authorization modal ([858e972](https://github.com/tada5hi/authup/commit/858e9723dc3bd319b5b05f4a29f5c1a6d1e690fd))

## [0.3.1](https://github.com/tada5hi/authup/compare/v0.3.0...v0.3.1) (2022-12-12)

### Bug Fixes

- **ui:** minor enahcenement to auth store & middleware ([80b97d0](https://github.com/tada5hi/authup/commit/80b97d02977795ece02d60d4daff5eae58d03028))

# [0.3.0](https://github.com/tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)

### Bug Fixes

- **ui:** minor fixes (list-builder,{client,permission}-form,...) ([666b41f](https://github.com/tada5hi/authup/commit/666b41f2fccc370815046087a621882f0159f1cc))

### Features

- add client/application management ([5327e9b](https://github.com/tada5hi/authup/commit/5327e9bf411dfeeadef60d8f28ea81e0bc638f38))
- refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))

## [0.2.2](https://github.com/tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)

**Note:** Version bump only for package @authup/client-ui

# [0.2.0](https://github.com/tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)

**Note:** Version bump only for package @authup/client-ui

## [0.1.5](https://github.com/tada5hi/authup/compare/v0.1.4...v0.1.5) (2022-12-08)

### Bug Fixes

- **ui:** make output file executable ([ba21fad](https://github.com/tada5hi/authup/commit/ba21fadd4ff062091283ca5ff632bb5279f1655b))

## [0.1.4](https://github.com/tada5hi/authup/compare/v0.1.3...v0.1.4) (2022-12-08)

### Bug Fixes

- use package-name for npx execution ([401dd26](https://github.com/tada5hi/authup/commit/401dd267ea556ba86c126ffb3ba4a16388c04475))

## [0.1.1](https://github.com/tada5hi/authup/compare/v0.1.0...v0.1.1) (2022-12-08)

### Bug Fixes

- **server-http:** make local package.json existence optional ([d6105fa](https://github.com/tada5hi/authup/commit/d6105fa9213cde311bf6238b35b381cc5832320b))

# 0.1.0 (2022-12-08)

### Bug Fixes

- **deps:** updated hapic-\* ([e6bc7b9](https://github.com/tada5hi/authup/commit/e6bc7b9d388a4dda2d9f194a23b8ab37cf05e2b6))

### Features

- add global cli & enhanced config handling ([95a1549](https://github.com/tada5hi/authup/commit/95a1549c70ed18e9bc58e2f4fb5734712ab20a35))
- prepare global cli ([ed4539c](https://github.com/tada5hi/authup/commit/ed4539c0b736f8b522e7a1af716ff6e3ab2d8200))
- **server-core:** replaced http framework ([6273ae6](https://github.com/tada5hi/authup/commit/6273ae680f82a4e27ba527b9eb260bb81ee75d20))
