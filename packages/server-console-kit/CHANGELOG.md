# Changelog

## [1.0.0-beta.68](https://github.com/authup/authup/compare/v1.0.0-beta.67...v1.0.0-beta.68) (2026-09-25)


### Bug Fixes

* **authup:** inline dev stylesheets; ship a default console favicon ([#3677](https://github.com/authup/authup/issues/3677)) ([929b008](https://github.com/authup/authup/commit/929b008b33699aafcbfe0cb0f27e3ced794349ca))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.67 to ^1.0.0-beta.68
    * @authup/kit bumped from ^1.0.0-beta.67 to ^1.0.0-beta.68

## [1.0.0-beta.67](https://github.com/authup/authup/compare/v1.0.0-beta.66...v1.0.0-beta.67) (2026-09-24)


### Bug Fixes

* ensure consistent version for release ([101db34](https://github.com/authup/authup/commit/101db3427f1ab362bd0b4b4aad6c2b7e81f4e993))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.66 to ^1.0.0-beta.67
    * @authup/kit bumped from ^1.0.0-beta.66 to ^1.0.0-beta.67

## [1.0.0-beta.66](https://github.com/authup/authup/compare/v1.0.0-beta.65...v1.0.0-beta.66) (2026-09-21)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 19 updates ([#3625](https://github.com/authup/authup/issues/3625)) ([99f4ad5](https://github.com/authup/authup/commit/99f4ad52db40a979fde073f37b08e02172fe945a))
* ensure consistent version for release ([6c4868d](https://github.com/authup/authup/commit/6c4868d7fc634c4b39710965cc536f80a1be1f1a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.65 to ^1.0.0-beta.66
    * @authup/kit bumped from ^1.0.0-beta.65 to ^1.0.0-beta.66

## [1.0.0-beta.65](https://github.com/authup/authup/compare/v1.0.0-beta.64...v1.0.0-beta.65) (2026-09-08)


### ⚠ BREAKING CHANGES

* resolveConfig and readConfigFromEnv of the three console services return a Promise; an embedder calling either directly needs an await.

### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 14 updates ([#3573](https://github.com/authup/authup/issues/3573)) ([867a3a2](https://github.com/authup/authup/commit/867a3a230c825649213194be824b69ab6fd6aac4))
* work the beta.64 audit backlog ([#3555](https://github.com/authup/authup/issues/3555)) ([2332346](https://github.com/authup/authup/commit/23323463284dde07befd743479d20bf160c1e567))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.64 to ^1.0.0-beta.65
    * @authup/kit bumped from ^1.0.0-beta.64 to ^1.0.0-beta.65

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### ⚠ BREAKING CHANGES

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522))
* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511))

### Features

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522)) ([1bb3ab5](https://github.com/authup/authup/commit/1bb3ab50ae496051865650c1d0432ff46e5549cb))
* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511)) ([5d0df26](https://github.com/authup/authup/commit/5d0df26d8df77deee1e9e40e8065ce850cbf7111))
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513)) ([adb6073](https://github.com/authup/authup/commit/adb6073b7ef7006f1f963c6769844453b6ba7543))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
