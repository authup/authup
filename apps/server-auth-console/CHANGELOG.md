# Changelog

## [1.0.0-beta.66](https://github.com/authup/authup/compare/v1.0.0-beta.65...v1.0.0-beta.66) (2026-09-21)


### Features

* carry the RP's language and color mode into the hosted pages ([#3620](https://github.com/authup/authup/issues/3620)) ([31817c5](https://github.com/authup/authup/commit/31817c5abd9c7b13b2933f03d19625712d746a6c))
* device authorization grant (RFC 8628) ([#3587](https://github.com/authup/authup/issues/3587)) ([3ce3fd4](https://github.com/authup/authup/commit/3ce3fd42f4b506fc11087a41bfc2ebb1441cf238))
* identity-provider login on the device page, bounded lookup forgiveness, access-policy deny rows ([#3610](https://github.com/authup/authup/issues/3610)) ([045583a](https://github.com/authup/authup/commit/045583aeecd295e79a27c18cbaef89ed906998e6))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 19 updates ([#3625](https://github.com/authup/authup/issues/3625)) ([99f4ad5](https://github.com/authup/authup/commit/99f4ad52db40a979fde073f37b08e02172fe945a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-auth-console bumped from ^1.0.0-beta.65 to ^1.0.0-beta.66
    * @authup/core-http-kit bumped from ^1.0.0-beta.65 to ^1.0.0-beta.66
    * @authup/errors bumped from ^1.0.0-beta.65 to ^1.0.0-beta.66
    * @authup/kit bumped from ^1.0.0-beta.65 to ^1.0.0-beta.66
    * @authup/server-config bumped from ^1.0.0-beta.65 to ^1.0.0-beta.66
    * @authup/server-config-kit bumped from ^1.0.0-beta.65 to ^1.0.0-beta.66
    * @authup/server-console-kit bumped from ^1.0.0-beta.65 to ^1.0.0-beta.66
    * @authup/specs bumped from ^1.0.0-beta.65 to ^1.0.0-beta.66

## [1.0.0-beta.65](https://github.com/authup/authup/compare/v1.0.0-beta.64...v1.0.0-beta.65) (2026-09-08)


### ⚠ BREAKING CHANGES

* resolveConfig and readConfigFromEnv of the three console services return a Promise; an embedder calling either directly needs an await.

### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 14 updates ([#3573](https://github.com/authup/authup/issues/3573)) ([867a3a2](https://github.com/authup/authup/commit/867a3a230c825649213194be824b69ab6fd6aac4))
* work the beta.64 audit backlog ([#3555](https://github.com/authup/authup/issues/3555)) ([2332346](https://github.com/authup/authup/commit/23323463284dde07befd743479d20bf160c1e567))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-auth-console bumped from ^1.0.0-beta.64 to ^1.0.0-beta.65
    * @authup/core-http-kit bumped from ^1.0.0-beta.64 to ^1.0.0-beta.65
    * @authup/errors bumped from ^1.0.0-beta.64 to ^1.0.0-beta.65
    * @authup/kit bumped from ^1.0.0-beta.64 to ^1.0.0-beta.65
    * @authup/server-config bumped from ^1.0.0-beta.64 to ^1.0.0-beta.65
    * @authup/server-config-kit bumped from ^1.0.0-beta.64 to ^1.0.0-beta.65
    * @authup/server-console-kit bumped from ^1.0.0-beta.64 to ^1.0.0-beta.65

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### ⚠ BREAKING CHANGES

* **authup,server-core:** `authup core` is `authup start core`, `authup console [name]` is `authup start console [name]`, and `authup start --worker` is `authup start worker` (the flag is refused with a message naming the role). In a container, pass the command directly (`start`, `start worker`, `migration run`); the `server/core` prefix is deprecated and prints a notice. `PORT` and `HOST` are honored inside the container instead of being forced.
* **server-config:** an `authup.yml` section moves to the document root (`server.core.port` -> `core.port`, `server.adminConsole.enabled` -> `adminConsole.enabled`, and so on for the other two consoles). No environment variable changes. The prefix arrived with `authup.yml` in the current beta and never shipped in a release, so no migration is offered; the file read is permissive, so a document still carrying `server:` has that whole subtree skipped in silence.
* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522))
* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511))

### Features

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522)) ([1bb3ab5](https://github.com/authup/authup/commit/1bb3ab50ae496051865650c1d0432ff46e5549cb))
* **authup,server-core:** start takes a role, and the container command is the CLI's own argv ([#3541](https://github.com/authup/authup/issues/3541)) ([779c95d](https://github.com/authup/authup/commit/779c95d4c6cfcfc8862cbc9fb55e7d9cfd0ddda2))
* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511)) ([5d0df26](https://github.com/authup/authup/commit/5d0df26d8df77deee1e9e40e8065ce850cbf7111))
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513)) ([adb6073](https://github.com/authup/authup/commit/adb6073b7ef7006f1f963c6769844453b6ba7543))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))
* resolve beta.64 release blockers ([#3553](https://github.com/authup/authup/issues/3553)) ([7016523](https://github.com/authup/authup/commit/7016523d6fa6c179a8c3b7a5330a6ee5c6478897))
* **server-config,server-auth-console,authup:** reach the API on an internal address ([#3551](https://github.com/authup/authup/issues/3551)) ([a7f56f5](https://github.com/authup/authup/commit/a7f56f5b80b0f97d40cafafa4153477933a5e84b)), closes [#3550](https://github.com/authup/authup/issues/3550)


### Code Refactoring

* **server-config:** drop the server. prefix from every config section ([#3533](https://github.com/authup/authup/issues/3533)) ([775d095](https://github.com/authup/authup/commit/775d095b5fd49e66422153fa97b08eb375e241ab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-auth-console bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-http-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-config-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-config bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-console-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
