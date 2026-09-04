# Changelog

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
