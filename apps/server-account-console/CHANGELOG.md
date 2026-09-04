# Changelog

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### ⚠ BREAKING CHANGES

* **authup,server-core:** `authup core` is `authup start core`, `authup console [name]` is `authup start console [name]`, and `authup start --worker` is `authup start worker` (the flag is refused with a message naming the role). In a container, pass the command directly (`start`, `start worker`, `migration run`); the `server/core` prefix is deprecated and prints a notice. `PORT` and `HOST` are honored inside the container instead of being forced.
* **server-config:** an `authup.yml` section moves to the document root (`server.core.port` -> `core.port`, `server.adminConsole.enabled` -> `adminConsole.enabled`, and so on for the other two consoles). No environment variable changes. The prefix arrived with `authup.yml` in the current beta and never shipped in a release, so no migration is offered; the file read is permissive, so a document still carrying `server:` has that whole subtree skipped in silence.
* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522))
* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513))

### Features

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522)) ([1bb3ab5](https://github.com/authup/authup/commit/1bb3ab50ae496051865650c1d0432ff46e5549cb))
* **authup,server-core:** start takes a role, and the container command is the CLI's own argv ([#3541](https://github.com/authup/authup/issues/3541)) ([779c95d](https://github.com/authup/authup/commit/779c95d4c6cfcfc8862cbc9fb55e7d9cfd0ddda2))
* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513)) ([adb6073](https://github.com/authup/authup/commit/adb6073b7ef7006f1f963c6769844453b6ba7543))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))
* resolve beta.64 release blockers ([#3553](https://github.com/authup/authup/issues/3553)) ([7016523](https://github.com/authup/authup/commit/7016523d6fa6c179a8c3b7a5330a6ee5c6478897))
* **server-config,server-auth-console,authup:** reach the API on an internal address ([#3551](https://github.com/authup/authup/issues/3551)) ([a7f56f5](https://github.com/authup/authup/commit/a7f56f5b80b0f97d40cafafa4153477933a5e84b)), closes [#3550](https://github.com/authup/authup/issues/3550)
* **server-core,docs:** boot on sqlite when no database is configured ([#3549](https://github.com/authup/authup/issues/3549)) ([a730461](https://github.com/authup/authup/commit/a730461746457be2d2a74a055e7c1470a76413b2))


### Code Refactoring

* **server-config:** drop the server. prefix from every config section ([#3533](https://github.com/authup/authup/issues/3533)) ([775d095](https://github.com/authup/authup/commit/775d095b5fd49e66422153fa97b08eb375e241ab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-account-console bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-config-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-config bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-console-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
