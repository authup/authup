# Changelog

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### ⚠ BREAKING CHANGES

* `authup worker` and `server/core worker` are gone; use `authup start --worker` / `server/core start --worker`. `COMPONENTS_ENABLED` and `core.componentsEnabled` are no longer read; use `WORKER_ENABLED` and `core.worker.enabled`. A worker process fed `WORKER_ENABLED=false` refuses to start.
* **server-config:** an `authup.yml` section moves to the document root (`server.core.port` -> `core.port`, `server.adminConsole.enabled` -> `adminConsole.enabled`, and so on for the other two consoles). No environment variable changes. The prefix arrived with `authup.yml` in the current beta and never shipped in a release, so no migration is offered; the file read is permissive, so a document still carrying `server:` has that whole subtree skipped in silence.
* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513))
* **server-core,authup:** one authup.yml replaces the conf file family ([#3509](https://github.com/authup/authup/issues/3509))

### Features

* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))
* **server-config-kit,server-core:** declare the config schema as one registry ([#3508](https://github.com/authup/authup/issues/3508)) ([d263547](https://github.com/authup/authup/commit/d263547bb437df5f71706420dd06c89b6691b2d7))
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513)) ([adb6073](https://github.com/authup/authup/commit/adb6073b7ef7006f1f963c6769844453b6ba7543))
* **server-core,authup:** one authup.yml replaces the conf file family ([#3509](https://github.com/authup/authup/issues/3509)) ([7fa9217](https://github.com/authup/authup/commit/7fa9217f7bc03afef4bc46756ceb884d37c8c62b))
* the worker is a flag on start, and componentsEnabled becomes core.worker.enabled ([#3538](https://github.com/authup/authup/issues/3538)) ([55d740e](https://github.com/authup/authup/commit/55d740ea2142c28de7442c34096a0deab7bebb99))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))


### Code Refactoring

* **server-config:** drop the server. prefix from every config section ([#3533](https://github.com/authup/authup/issues/3533)) ([775d095](https://github.com/authup/authup/commit/775d095b5fd49e66422153fa97b08eb375e241ab))
