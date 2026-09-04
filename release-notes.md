:robot: I have created a release *beep* *boop*
---


<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **server-core,core-kit:** Client.scope and Client.rootUrl are gone from the domain type, the validator, the API payloads and the query schema, and the migration drops both columns with their data.
* **client-web-kit:** `store.user`, the `USER_UPDATED` payload and the `setUser` parameter widen from `Pick<User, 'id' | 'name' | 'displayName'>` to include `email`. Reading `store.user` is unaffected. A caller that CONSTRUCTS one, `store.setUser({ id, name, displayName })`, no longer compiles; pass the whole user row, or add `email`. This is the mirror image of #3481, which narrowed the same alias and was released as breaking for the same reason.
* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.
* **server-core,authup:** move the operator CLI into the authup package ([#3507](https://github.com/authup/authup/issues/3507))
* **server-core,client-web-kit:** /admin, /account and /public move to /console/admin, /console/account and /console/auth/assets with no redirect. Rebuild and redeploy every console together with the server (a dist built for the old base serves a blank console); update proxy rules and bookmarks. buildConsoleLoginURL's output changed, so kit and server must be on the same release. Standalone hosts injecting basePath keep working with their own value; the defaults changed.
* **server-core:** `IClient` gains a required `account` member.

### Features

* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))
* **server-core,authup:** move the operator CLI into the authup package ([#3507](https://github.com/authup/authup/issues/3507)) ([3dcfbcd](https://github.com/authup/authup/commit/3dcfbcd50497f99f9683d14b3ed64b2f6a2e0ae0))
* **server-core,client-web-kit:** mount the consoles under /console/{admin,account,auth} ([#3503](https://github.com/authup/authup/issues/3503)) ([581e52c](https://github.com/authup/authup/commit/581e52cb9bd70ecb0753d065d4d3f2e5331d5492))
* **server-core,core-kit:** back-channel logout, locked user/client writes, client column cleanup ([#3540](https://github.com/authup/authup/issues/3540)) ([ba6215a](https://github.com/authup/authup/commit/ba6215ac28f07dec84cc829fdad9d02d8572d2d5))
* **server-core:** authenticate the account console with an opaque session cookie ([#3498](https://github.com/authup/authup/issues/3498)) ([d84b730](https://github.com/authup/authup/commit/d84b730b293c4c8f86af41d752ca1b771772600f))


### Bug Fixes

* **client-account-console:** scope console session cookies to the deployment base path ([#3496](https://github.com/authup/authup/issues/3496)) ([8c7cf38](https://github.com/authup/authup/commit/8c7cf3885580bd76a831bf2b498c7c7ee8a45169)), closes [#3495](https://github.com/authup/authup/issues/3495)
* **client-web-kit:** retain the introspection email on store.user ([#3517](https://github.com/authup/authup/issues/3517)) ([107aff4](https://github.com/authup/authup/commit/107aff4337abdabcabe2c5046281160e55726294)), closes [#3506](https://github.com/authup/authup/issues/3506)
* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))
* **server-core,docs:** boot on sqlite when no database is configured ([#3549](https://github.com/authup/authup/issues/3549)) ([a730461](https://github.com/authup/authup/commit/a730461746457be2d2a74a055e7c1470a76413b2))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/client-web-theme bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-http-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/i18n bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/specs bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522))
* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.
* **server-core,client-web-kit:** /admin, /account and /public move to /console/admin, /console/account and /console/auth/assets with no redirect. Rebuild and redeploy every console together with the server (a dist built for the old base serves a blank console); update proxy rules and bookmarks. buildConsoleLoginURL's output changed, so kit and server must be on the same release. Standalone hosts injecting basePath keep working with their own value; the defaults changed.
* **server-core,client-admin-console,authup:** @authup/client-admin-console is a runtime dependency of server-core and is served by it (plan 081).

### Features

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522)) ([1bb3ab5](https://github.com/authup/authup/commit/1bb3ab50ae496051865650c1d0432ff46e5549cb))
* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))
* **server-core,client-admin-console,authup:** serve the admin console from server-core as a static SPA ([#3501](https://github.com/authup/authup/issues/3501)) ([1ea842c](https://github.com/authup/authup/commit/1ea842cf10e64559b140876ec1a757d9f338377c))
* **server-core,client-web-kit:** mount the consoles under /console/{admin,account,auth} ([#3503](https://github.com/authup/authup/issues/3503)) ([581e52c](https://github.com/authup/authup/commit/581e52cb9bd70ecb0753d065d4d3f2e5331d5492))


### Bug Fixes

* **client-web-theme,client-admin-console:** restore the admin console full height chain ([#3523](https://github.com/authup/authup/issues/3523)) ([5ab0264](https://github.com/authup/authup/commit/5ab0264d2aa7b526c39a2168b349fc4cef737c4f))
* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))
* resolve beta.64 release blockers ([#3553](https://github.com/authup/authup/issues/3553)) ([7016523](https://github.com/authup/authup/commit/7016523d6fa6c179a8c3b7a5330a6ee5c6478897))
* **server-core,docs:** boot on sqlite when no database is configured ([#3549](https://github.com/authup/authup/issues/3549)) ([a730461](https://github.com/authup/authup/commit/a730461746457be2d2a74a055e7c1470a76413b2))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/client-web-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/client-web-theme bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-http-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/i18n bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/specs bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522))
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511))
* **server-core,client-web-kit:** /admin, /account and /public move to /console/admin, /console/account and /console/auth/assets with no redirect. Rebuild and redeploy every console together with the server (a dist built for the old base serves a blank console); update proxy rules and bookmarks. buildConsoleLoginURL's output changed, so kit and server must be on the same release. Standalone hosts injecting basePath keep working with their own value; the defaults changed.

### Features

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522)) ([1bb3ab5](https://github.com/authup/authup/commit/1bb3ab50ae496051865650c1d0432ff46e5549cb))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511)) ([5d0df26](https://github.com/authup/authup/commit/5d0df26d8df77deee1e9e40e8065ce850cbf7111))
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513)) ([adb6073](https://github.com/authup/authup/commit/adb6073b7ef7006f1f963c6769844453b6ba7543))
* **server-core,client-web-kit:** mount the consoles under /console/{admin,account,auth} ([#3503](https://github.com/authup/authup/issues/3503)) ([581e52c](https://github.com/authup/authup/commit/581e52cb9bd70ecb0753d065d4d3f2e5331d5492))


### Bug Fixes

* **client-account-console:** scope console session cookies to the deployment base path ([#3496](https://github.com/authup/authup/issues/3496)) ([8c7cf38](https://github.com/authup/authup/commit/8c7cf3885580bd76a831bf2b498c7c7ee8a45169)), closes [#3495](https://github.com/authup/authup/issues/3495)
* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/client-web-theme bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/i18n bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **server-core,core-kit:** Client.scope and Client.rootUrl are gone from the domain type, the validator, the API payloads and the query schema, and the migration drops both columns with their data.
* `email_verified` no longer reflects `User.active`. Every existing user backfills to unverified, so a relying party gating on the claim stops matching until the addresses are verified again or an admin sets the field. Claims that mirror a nullable column are now omitted rather than answered as `null` on both introspection endpoints and in every id_token; test for absence rather than for `null`. `User` gains a required `emailVerified` property.
* **client-web-kit:** `store.user`, the `USER_UPDATED` payload and the `setUser` parameter widen from `Pick<User, 'id' | 'name' | 'displayName'>` to include `email`. Reading `store.user` is unaffected. A caller that CONSTRUCTS one, `store.setUser({ id, name, displayName })`, no longer compiles; pass the whole user row, or add `email`. This is the mirror image of #3481, which narrowed the same alias and was released as breaking for the same reason.
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513))
* **server-core,client-web-kit:** /admin, /account and /public move to /console/admin, /console/account and /console/auth/assets with no redirect. Rebuild and redeploy every console together with the server (a dist built for the old base serves a blank console); update proxy rules and bookmarks. buildConsoleLoginURL's output changed, so kit and server must be on the same release. Standalone hosts injecting basePath keep working with their own value; the defaults changed.
* **server-core,client-admin-console,authup:** @authup/client-admin-console is a runtime dependency of server-core and is served by it (plan 081).
* **server-core:** `IClient` gains a required `account` member.

### Features

* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513)) ([adb6073](https://github.com/authup/authup/commit/adb6073b7ef7006f1f963c6769844453b6ba7543))
* **server-core,client-admin-console,authup:** serve the admin console from server-core as a static SPA ([#3501](https://github.com/authup/authup/issues/3501)) ([1ea842c](https://github.com/authup/authup/commit/1ea842cf10e64559b140876ec1a757d9f338377c))
* **server-core,client-web-kit:** mount the consoles under /console/{admin,account,auth} ([#3503](https://github.com/authup/authup/issues/3503)) ([581e52c](https://github.com/authup/authup/commit/581e52cb9bd70ecb0753d065d4d3f2e5331d5492))
* **server-core,core-kit:** back-channel logout, locked user/client writes, client column cleanup ([#3540](https://github.com/authup/authup/issues/3540)) ([ba6215a](https://github.com/authup/authup/commit/ba6215ac28f07dec84cc829fdad9d02d8572d2d5))
* **server-core:** authenticate the account console with an opaque session cookie ([#3498](https://github.com/authup/authup/issues/3498)) ([d84b730](https://github.com/authup/authup/commit/d84b730b293c4c8f86af41d752ca1b771772600f))


### Bug Fixes

* **client-web-kit:** retain the introspection email on store.user ([#3517](https://github.com/authup/authup/issues/3517)) ([107aff4](https://github.com/authup/authup/commit/107aff4337abdabcabe2c5046281160e55726294)), closes [#3506](https://github.com/authup/authup/issues/3506)
* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))
* email_verified gets a column of its own, and the OIDC claims get declared ([#3525](https://github.com/authup/authup/issues/3525)) ([05d2783](https://github.com/authup/authup/commit/05d2783b43eca4fc01adb1b7eba1d9989339cb19))
* resolve beta.64 release blockers ([#3553](https://github.com/authup/authup/issues/3553)) ([7016523](https://github.com/authup/authup/commit/7016523d6fa6c179a8c3b7a5330a6ee5c6478897))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-http-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/i18n bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/specs bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Bug Fixes

* ensure consistent version for release ([0fa4627](https://github.com/authup/authup/commit/0fa4627735bb21bcf8ae4d980259fc488b2a95a2))


### Dependencies

* The following workspace dependencies were updated
  * peerDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Features

* **client-web-nuxt:** allow namespacing the session cookies ([#3529](https://github.com/authup/authup/issues/3529)) ([d526bcc](https://github.com/authup/authup/commit/d526bcc62724965ad2f1dc89aa67e008ecf71728))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/client-web-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-http-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Bug Fixes

* **client-web-theme,client-admin-console:** restore the admin console full height chain ([#3523](https://github.com/authup/authup/issues/3523)) ([5ab0264](https://github.com/authup/authup/commit/5ab0264d2aa7b526c39a2168b349fc4cef737c4f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **server-core,core-kit:** Client.scope and Client.rootUrl are gone from the domain type, the validator, the API payloads and the query schema, and the migration drops both columns with their data.
* `email_verified` no longer reflects `User.active`. Every existing user backfills to unverified, so a relying party gating on the claim stops matching until the addresses are verified again or an admin sets the field. Claims that mirror a nullable column are now omitted rather than answered as `null` on both introspection endpoints and in every id_token; test for absence rather than for `null`. `User` gains a required `emailVerified` property.
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511))
* **server-core,client-admin-console,authup:** @authup/client-admin-console is a runtime dependency of server-core and is served by it (plan 081).
* **server-core:** `IClient` gains a required `account` member.

### Features

* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511)) ([5d0df26](https://github.com/authup/authup/commit/5d0df26d8df77deee1e9e40e8065ce850cbf7111))
* **server-core,client-admin-console,authup:** serve the admin console from server-core as a static SPA ([#3501](https://github.com/authup/authup/issues/3501)) ([1ea842c](https://github.com/authup/authup/commit/1ea842cf10e64559b140876ec1a757d9f338377c))
* **server-core,core-http-kit:** authorize info endpoint ([#3510](https://github.com/authup/authup/issues/3510)) ([9ba7b8d](https://github.com/authup/authup/commit/9ba7b8de36ff19718cb2294aa37b7a5d9b51dc35))
* **server-core,core-kit:** back-channel logout, locked user/client writes, client column cleanup ([#3540](https://github.com/authup/authup/issues/3540)) ([ba6215a](https://github.com/authup/authup/commit/ba6215ac28f07dec84cc829fdad9d02d8572d2d5))
* **server-core:** authenticate the account console with an opaque session cookie ([#3498](https://github.com/authup/authup/issues/3498)) ([d84b730](https://github.com/authup/authup/commit/d84b730b293c4c8f86af41d752ca1b771772600f))


### Bug Fixes

* email_verified gets a column of its own, and the OIDC claims get declared ([#3525](https://github.com/authup/authup/issues/3525)) ([05d2783](https://github.com/authup/authup/commit/05d2783b43eca4fc01adb1b7eba1d9989339cb19))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/specs bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **server-core,core-kit:** Client.scope and Client.rootUrl are gone from the domain type, the validator, the API payloads and the query schema, and the migration drops both columns with their data.
* `email_verified` no longer reflects `User.active`. Every existing user backfills to unverified, so a relying party gating on the claim stops matching until the addresses are verified again or an admin sets the field. Claims that mirror a nullable column are now omitted rather than answered as `null` on both introspection endpoints and in every id_token; test for absence rather than for `null`. `User` gains a required `emailVerified` property.
* **server-core:** `IClient` gains a required `account` member.
* **server-core:** POST/GET /token/introspect answer 401 to a request carrying no credentials. Send a live bearer (the introspected token itself, or the caller's own) or confidential client credentials. Public (authMethod 'none') clients cannot introspect by client_id alone.

### Features

* **server-core,core-kit:** back-channel logout, locked user/client writes, client column cleanup ([#3540](https://github.com/authup/authup/issues/3540)) ([ba6215a](https://github.com/authup/authup/commit/ba6215ac28f07dec84cc829fdad9d02d8572d2d5))
* **server-core:** authenticate the account console with an opaque session cookie ([#3498](https://github.com/authup/authup/issues/3498)) ([d84b730](https://github.com/authup/authup/commit/d84b730b293c4c8f86af41d752ca1b771772600f))
* **server-core:** require authorization on the token introspection endpoint ([#3493](https://github.com/authup/authup/issues/3493)) ([4ea479a](https://github.com/authup/authup/commit/4ea479a744d6f2b96c28e6ea1709a7c2ac23511e))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))
* email_verified gets a column of its own, and the OIDC claims get declared ([#3525](https://github.com/authup/authup/issues/3525)) ([05d2783](https://github.com/authup/authup/commit/05d2783b43eca4fc01adb1b7eba1d9989339cb19))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/specs bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Bug Fixes

* ensure consistent version for release ([0fa4627](https://github.com/authup/authup/commit/0fa4627735bb21bcf8ae4d980259fc488b2a95a2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Bug Fixes

* ensure consistent version for release ([0fa4627](https://github.com/authup/authup/commit/0fa4627735bb21bcf8ae4d980259fc488b2a95a2))
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **server-core,core-kit:** Client.scope and Client.rootUrl are gone from the domain type, the validator, the API payloads and the query schema, and the migration drops both columns with their data.
* `email_verified` no longer reflects `User.active`. Every existing user backfills to unverified, so a relying party gating on the claim stops matching until the addresses are verified again or an admin sets the field. Claims that mirror a nullable column are now omitted rather than answered as `null` on both introspection endpoints and in every id_token; test for absence rather than for `null`. `User` gains a required `emailVerified` property.

### Features

* **server-core,core-kit:** back-channel logout, locked user/client writes, client column cleanup ([#3540](https://github.com/authup/authup/issues/3540)) ([ba6215a](https://github.com/authup/authup/commit/ba6215ac28f07dec84cc829fdad9d02d8572d2d5))


### Bug Fixes

* email_verified gets a column of its own, and the OIDC claims get declared ([#3525](https://github.com/authup/authup/issues/3525)) ([05d2783](https://github.com/authup/authup/commit/05d2783b43eca4fc01adb1b7eba1d9989339cb19))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Bug Fixes

* ensure consistent version for release ([0fa4627](https://github.com/authup/authup/commit/0fa4627735bb21bcf8ae4d980259fc488b2a95a2))
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **docker,server-config:** FHS image layout, and one directory per concern ([#3546](https://github.com/authup/authup/issues/3546))
* **authup,server-core:** `authup core` is `authup start core`, `authup console [name]` is `authup start console [name]`, and `authup start --worker` is `authup start worker` (the flag is refused with a message naming the role). In a container, pass the command directly (`start`, `start worker`, `migration run`); the `server/core` prefix is deprecated and prints a notice. `PORT` and `HOST` are honored inside the container instead of being forced.
* **server-core,core-kit:** Client.scope and Client.rootUrl are gone from the domain type, the validator, the API payloads and the query schema, and the migration drops both columns with their data.
* `authup worker` and `server/core worker` are gone; use `authup start --worker` / `server/core start --worker`. `COMPONENTS_ENABLED` and `core.componentsEnabled` are no longer read; use `WORKER_ENABLED` and `core.worker.enabled`. A worker process fed `WORKER_ENABLED=false` refuses to start.
* **server-config:** an `authup.yml` section moves to the document root (`server.core.port` -> `core.port`, `server.adminConsole.enabled` -> `adminConsole.enabled`, and so on for the other two consoles). No environment variable changes. The prefix arrived with `authup.yml` in the current beta and never shipped in a release, so no migration is offered; the file read is permissive, so a document still carrying `server:` has that whole subtree skipped in silence.
* `email_verified` no longer reflects `User.active`. Every existing user backfills to unverified, so a relying party gating on the claim stops matching until the addresses are verified again or an admin sets the field. Claims that mirror a nullable column are now omitted rather than answered as `null` on both introspection endpoints and in every id_token; test for absence rather than for `null`. `User` gains a required `emailVerified` property.
* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522))
* **client-web-kit:** `store.user`, the `USER_UPDATED` payload and the `setUser` parameter widen from `Pick<User, 'id' | 'name' | 'displayName'>` to include `email`. Reading `store.user` is unaffected. A caller that CONSTRUCTS one, `store.setUser({ id, name, displayName })`, no longer compiles; pass the whole user row, or add `email`. This is the mirror image of #3481, which narrowed the same alias and was released as breaking for the same reason.
* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511))
* **server-core,authup:** one authup.yml replaces the conf file family ([#3509](https://github.com/authup/authup/issues/3509))
* **server-core,authup:** move the operator CLI into the authup package ([#3507](https://github.com/authup/authup/issues/3507))
* **server-core,client-web-kit:** /admin, /account and /public move to /console/admin, /console/account and /console/auth/assets with no redirect. Rebuild and redeploy every console together with the server (a dist built for the old base serves a blank console); update proxy rules and bookmarks. buildConsoleLoginURL's output changed, so kit and server must be on the same release. Standalone hosts injecting basePath keep working with their own value; the defaults changed.
* **server-core:** `authup-server start|worker` refuse positional arguments, and the undocumented `--cD` / `--cF` spellings are removed. Use `--configDirectory` / `--configFile`.
* **server-core,client-admin-console,authup:** @authup/client-admin-console is a runtime dependency of server-core and is served by it (plan 081).
* **server-core:** `IClient` gains a required `account` member.
* **server-core:** POST/GET /token/introspect answer 401 to a request carrying no credentials. Send a live bearer (the introspected token itself, or the caller's own) or confidential client credentials. Public (authMethod 'none') clients cannot introspect by client_id alone.

### Features

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522)) ([1bb3ab5](https://github.com/authup/authup/commit/1bb3ab50ae496051865650c1d0432ff46e5549cb))
* **authup,server-core:** start takes a role, and the container command is the CLI's own argv ([#3541](https://github.com/authup/authup/issues/3541)) ([779c95d](https://github.com/authup/authup/commit/779c95d4c6cfcfc8862cbc9fb55e7d9cfd0ddda2))
* **client-web-nuxt:** allow namespacing the session cookies ([#3529](https://github.com/authup/authup/issues/3529)) ([d526bcc](https://github.com/authup/authup/commit/d526bcc62724965ad2f1dc89aa67e008ecf71728))
* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))
* **docker,server-config:** FHS image layout, and one directory per concern ([#3546](https://github.com/authup/authup/issues/3546)) ([d092d17](https://github.com/authup/authup/commit/d092d179822bb3b60db8157370284ef6328c1cde))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511)) ([5d0df26](https://github.com/authup/authup/commit/5d0df26d8df77deee1e9e40e8065ce850cbf7111))
* **server-config-kit,server-core:** declare the config schema as one registry ([#3508](https://github.com/authup/authup/issues/3508)) ([d263547](https://github.com/authup/authup/commit/d263547bb437df5f71706420dd06c89b6691b2d7))
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513)) ([adb6073](https://github.com/authup/authup/commit/adb6073b7ef7006f1f963c6769844453b6ba7543))
* **server-core,authup:** move the operator CLI into the authup package ([#3507](https://github.com/authup/authup/issues/3507)) ([3dcfbcd](https://github.com/authup/authup/commit/3dcfbcd50497f99f9683d14b3ed64b2f6a2e0ae0))
* **server-core,authup:** one authup.yml replaces the conf file family ([#3509](https://github.com/authup/authup/issues/3509)) ([7fa9217](https://github.com/authup/authup/commit/7fa9217f7bc03afef4bc46756ceb884d37c8c62b))
* **server-core,client-admin-console,authup:** serve the admin console from server-core as a static SPA ([#3501](https://github.com/authup/authup/issues/3501)) ([1ea842c](https://github.com/authup/authup/commit/1ea842cf10e64559b140876ec1a757d9f338377c))
* **server-core,client-web-kit:** mount the consoles under /console/{admin,account,auth} ([#3503](https://github.com/authup/authup/issues/3503)) ([581e52c](https://github.com/authup/authup/commit/581e52cb9bd70ecb0753d065d4d3f2e5331d5492))
* **server-core,core-http-kit:** authorize info endpoint ([#3510](https://github.com/authup/authup/issues/3510)) ([9ba7b8d](https://github.com/authup/authup/commit/9ba7b8de36ff19718cb2294aa37b7a5d9b51dc35))
* **server-core,core-kit:** back-channel logout, locked user/client writes, client column cleanup ([#3540](https://github.com/authup/authup/issues/3540)) ([ba6215a](https://github.com/authup/authup/commit/ba6215ac28f07dec84cc829fdad9d02d8572d2d5))
* **server-core:** authenticate the account console with an opaque session cookie ([#3498](https://github.com/authup/authup/issues/3498)) ([d84b730](https://github.com/authup/authup/commit/d84b730b293c4c8f86af41d752ca1b771772600f))
* **server-core:** optional worker role ([#3497](https://github.com/authup/authup/issues/3497)) ([212b2af](https://github.com/authup/authup/commit/212b2af219b7c31c1c740ed6bbbcb545f095591a))
* **server-core:** require authorization on the token introspection endpoint ([#3493](https://github.com/authup/authup/issues/3493)) ([4ea479a](https://github.com/authup/authup/commit/4ea479a744d6f2b96c28e6ea1709a7c2ac23511e))
* the worker is a flag on start, and componentsEnabled becomes core.worker.enabled ([#3538](https://github.com/authup/authup/issues/3538)) ([55d740e](https://github.com/authup/authup/commit/55d740ea2142c28de7442c34096a0deab7bebb99))


### Bug Fixes

* **authup:** subtract the deployment path prefix from the console mount ([#3534](https://github.com/authup/authup/issues/3534)) ([96e8425](https://github.com/authup/authup/commit/96e8425b0f74689319274b42f0832dec2b88bc20)), closes [#3531](https://github.com/authup/authup/issues/3531)
* **client-account-console:** scope console session cookies to the deployment base path ([#3496](https://github.com/authup/authup/issues/3496)) ([8c7cf38](https://github.com/authup/authup/commit/8c7cf3885580bd76a831bf2b498c7c7ee8a45169)), closes [#3495](https://github.com/authup/authup/issues/3495)
* **client-web-kit:** retain the introspection email on store.user ([#3517](https://github.com/authup/authup/issues/3517)) ([107aff4](https://github.com/authup/authup/commit/107aff4337abdabcabe2c5046281160e55726294)), closes [#3506](https://github.com/authup/authup/issues/3506)
* **client-web-theme,client-admin-console:** restore the admin console full height chain ([#3523](https://github.com/authup/authup/issues/3523)) ([5ab0264](https://github.com/authup/authup/commit/5ab0264d2aa7b526c39a2168b349fc4cef737c4f))
* **deps:** bump nodemailer in the minorandpatch group ([#3552](https://github.com/authup/authup/issues/3552)) ([52036e9](https://github.com/authup/authup/commit/52036e907d13731fc50d6cf6a32c00183ac85976))
* **deps:** bump qs from 6.15.3 to 6.16.0 ([#3548](https://github.com/authup/authup/issues/3548)) ([f0e65d1](https://github.com/authup/authup/commit/f0e65d138ca0bd3a1f339014471eaf5c4a6a4b73))
* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))
* email_verified gets a column of its own, and the OIDC claims get declared ([#3525](https://github.com/authup/authup/issues/3525)) ([05d2783](https://github.com/authup/authup/commit/05d2783b43eca4fc01adb1b7eba1d9989339cb19))
* ensure consistent version for release ([0fa4627](https://github.com/authup/authup/commit/0fa4627735bb21bcf8ae4d980259fc488b2a95a2))
* resolve beta.64 release blockers ([#3553](https://github.com/authup/authup/issues/3553)) ([7016523](https://github.com/authup/authup/commit/7016523d6fa6c179a8c3b7a5330a6ee5c6478897))
* **server-config,server-auth-console,authup:** reach the API on an internal address ([#3551](https://github.com/authup/authup/issues/3551)) ([a7f56f5](https://github.com/authup/authup/commit/a7f56f5b80b0f97d40cafafa4153477933a5e84b)), closes [#3550](https://github.com/authup/authup/issues/3550)
* **server-core,docs:** boot on sqlite when no database is configured ([#3549](https://github.com/authup/authup/issues/3549)) ([a730461](https://github.com/authup/authup/commit/a730461746457be2d2a74a055e7c1470a76413b2))
* **server-core,server-kit:** write the entity audit row on the persist transaction ([#3545](https://github.com/authup/authup/issues/3545)) ([38bf1f5](https://github.com/authup/authup/commit/38bf1f5c36c13f5f87cff164030c6a877ccd168b))
* **server-core:** make the just-in-time dev mode reachable ([#3492](https://github.com/authup/authup/issues/3492)) ([cca0247](https://github.com/authup/authup/commit/cca02471c853194199829948eea16826b83609a5))
* **server-core:** read the CLI meta from the package, refuse stray positionals on start/worker ([#3502](https://github.com/authup/authup/issues/3502)) ([68e81d7](https://github.com/authup/authup/commit/68e81d7c013bc9d60676f1e5e2ad60e6d3ffd91d))
* **server-core:** refuse an unknown migration operation instead of applying migrations ([#3544](https://github.com/authup/authup/issues/3544)) ([0c8d288](https://github.com/authup/authup/commit/0c8d288bc5a204f74a6422540373504fdae95e7c)), closes [#3542](https://github.com/authup/authup/issues/3542)


### Code Refactoring

* **server-config:** drop the server. prefix from every config section ([#3533](https://github.com/authup/authup/issues/3533)) ([775d095](https://github.com/authup/authup/commit/775d095b5fd49e66422153fa97b08eb375e241ab))
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

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
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* `email_verified` no longer reflects `User.active`. Every existing user backfills to unverified, so a relying party gating on the claim stops matching until the addresses are verified again or an admin sets the field. Claims that mirror a nullable column are now omitted rather than answered as `null` on both introspection endpoints and in every id_token; test for absence rather than for `null`. `User` gains a required `emailVerified` property.

### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))
* email_verified gets a column of its own, and the OIDC claims get declared ([#3525](https://github.com/authup/authup/issues/3525)) ([05d2783](https://github.com/authup/authup/commit/05d2783b43eca4fc01adb1b7eba1d9989339cb19))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/specs bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Bug Fixes

* ensure consistent version for release ([0fa4627](https://github.com/authup/authup/commit/0fa4627735bb21bcf8ae4d980259fc488b2a95a2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Bug Fixes

* ensure consistent version for release ([0fa4627](https://github.com/authup/authup/commit/0fa4627735bb21bcf8ae4d980259fc488b2a95a2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.

### Features

* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

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


### Code Refactoring

* **server-config:** drop the server. prefix from every config section ([#3533](https://github.com/authup/authup/issues/3533)) ([775d095](https://github.com/authup/authup/commit/775d095b5fd49e66422153fa97b08eb375e241ab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-admin-console bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-config-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-config bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-console-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

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
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **docker,server-config:** FHS image layout, and one directory per concern ([#3546](https://github.com/authup/authup/issues/3546))
* **authup,server-core:** `authup core` is `authup start core`, `authup console [name]` is `authup start console [name]`, and `authup start --worker` is `authup start worker` (the flag is refused with a message naming the role). In a container, pass the command directly (`start`, `start worker`, `migration run`); the `server/core` prefix is deprecated and prints a notice. `PORT` and `HOST` are honored inside the container instead of being forced.
* `authup worker` and `server/core worker` are gone; use `authup start --worker` / `server/core start --worker`. `COMPONENTS_ENABLED` and `core.componentsEnabled` are no longer read; use `WORKER_ENABLED` and `core.worker.enabled`. A worker process fed `WORKER_ENABLED=false` refuses to start.
* **server-config:** an `authup.yml` section moves to the document root (`server.core.port` -> `core.port`, `server.adminConsole.enabled` -> `adminConsole.enabled`, and so on for the other two consoles). No environment variable changes. The prefix arrived with `authup.yml` in the current beta and never shipped in a release, so no migration is offered; the file read is permissive, so a document still carrying `server:` has that whole subtree skipped in silence.
* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513))

### Features

* **authup,server-core:** start takes a role, and the container command is the CLI's own argv ([#3541](https://github.com/authup/authup/issues/3541)) ([779c95d](https://github.com/authup/authup/commit/779c95d4c6cfcfc8862cbc9fb55e7d9cfd0ddda2))
* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))
* **docker,server-config:** FHS image layout, and one directory per concern ([#3546](https://github.com/authup/authup/issues/3546)) ([d092d17](https://github.com/authup/authup/commit/d092d179822bb3b60db8157370284ef6328c1cde))
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513)) ([adb6073](https://github.com/authup/authup/commit/adb6073b7ef7006f1f963c6769844453b6ba7543))
* the worker is a flag on start, and componentsEnabled becomes core.worker.enabled ([#3538](https://github.com/authup/authup/issues/3538)) ([55d740e](https://github.com/authup/authup/commit/55d740ea2142c28de7442c34096a0deab7bebb99))


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
    * @authup/core-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-config-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

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
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

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
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **docker,server-config:** FHS image layout, and one directory per concern ([#3546](https://github.com/authup/authup/issues/3546))
* **authup,server-core:** `authup core` is `authup start core`, `authup console [name]` is `authup start console [name]`, and `authup start --worker` is `authup start worker` (the flag is refused with a message naming the role). In a container, pass the command directly (`start`, `start worker`, `migration run`); the `server/core` prefix is deprecated and prints a notice. `PORT` and `HOST` are honored inside the container instead of being forced.
* **server-core,core-kit:** Client.scope and Client.rootUrl are gone from the domain type, the validator, the API payloads and the query schema, and the migration drops both columns with their data.
* `authup worker` and `server/core worker` are gone; use `authup start --worker` / `server/core start --worker`. `COMPONENTS_ENABLED` and `core.componentsEnabled` are no longer read; use `WORKER_ENABLED` and `core.worker.enabled`. A worker process fed `WORKER_ENABLED=false` refuses to start.
* **server-config:** an `authup.yml` section moves to the document root (`server.core.port` -> `core.port`, `server.adminConsole.enabled` -> `adminConsole.enabled`, and so on for the other two consoles). No environment variable changes. The prefix arrived with `authup.yml` in the current beta and never shipped in a release, so no migration is offered; the file read is permissive, so a document still carrying `server:` has that whole subtree skipped in silence.
* `email_verified` no longer reflects `User.active`. Every existing user backfills to unverified, so a relying party gating on the claim stops matching until the addresses are verified again or an admin sets the field. Claims that mirror a nullable column are now omitted rather than answered as `null` on both introspection endpoints and in every id_token; test for absence rather than for `null`. `User` gains a required `emailVerified` property.
* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522))
* **client-web-kit:** `store.user`, the `USER_UPDATED` payload and the `setUser` parameter widen from `Pick<User, 'id' | 'name' | 'displayName'>` to include `email`. Reading `store.user` is unaffected. A caller that CONSTRUCTS one, `store.setUser({ id, name, displayName })`, no longer compiles; pass the whole user row, or add `email`. This is the mirror image of #3481, which narrowed the same alias and was released as breaking for the same reason.
* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511))
* **server-core,authup:** one authup.yml replaces the conf file family ([#3509](https://github.com/authup/authup/issues/3509))
* **server-core,authup:** move the operator CLI into the authup package ([#3507](https://github.com/authup/authup/issues/3507))
* **server-core,client-web-kit:** /admin, /account and /public move to /console/admin, /console/account and /console/auth/assets with no redirect. Rebuild and redeploy every console together with the server (a dist built for the old base serves a blank console); update proxy rules and bookmarks. buildConsoleLoginURL's output changed, so kit and server must be on the same release. Standalone hosts injecting basePath keep working with their own value; the defaults changed.
* **server-core:** `authup-server start|worker` refuse positional arguments, and the undocumented `--cD` / `--cF` spellings are removed. Use `--configDirectory` / `--configFile`.
* **server-core,client-admin-console,authup:** @authup/client-admin-console is a runtime dependency of server-core and is served by it (plan 081).
* **server-core:** `IClient` gains a required `account` member.
* **server-core:** POST/GET /token/introspect answer 401 to a request carrying no credentials. Send a live bearer (the introspected token itself, or the caller's own) or confidential client credentials. Public (authMethod 'none') clients cannot introspect by client_id alone.

### Features

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522)) ([1bb3ab5](https://github.com/authup/authup/commit/1bb3ab50ae496051865650c1d0432ff46e5549cb))
* **authup,server-core:** start takes a role, and the container command is the CLI's own argv ([#3541](https://github.com/authup/authup/issues/3541)) ([779c95d](https://github.com/authup/authup/commit/779c95d4c6cfcfc8862cbc9fb55e7d9cfd0ddda2))
* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))
* **docker,server-config:** FHS image layout, and one directory per concern ([#3546](https://github.com/authup/authup/issues/3546)) ([d092d17](https://github.com/authup/authup/commit/d092d179822bb3b60db8157370284ef6328c1cde))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511)) ([5d0df26](https://github.com/authup/authup/commit/5d0df26d8df77deee1e9e40e8065ce850cbf7111))
* **server-config-kit,server-core:** declare the config schema as one registry ([#3508](https://github.com/authup/authup/issues/3508)) ([d263547](https://github.com/authup/authup/commit/d263547bb437df5f71706420dd06c89b6691b2d7))
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513)) ([adb6073](https://github.com/authup/authup/commit/adb6073b7ef7006f1f963c6769844453b6ba7543))
* **server-core,authup:** move the operator CLI into the authup package ([#3507](https://github.com/authup/authup/issues/3507)) ([3dcfbcd](https://github.com/authup/authup/commit/3dcfbcd50497f99f9683d14b3ed64b2f6a2e0ae0))
* **server-core,authup:** one authup.yml replaces the conf file family ([#3509](https://github.com/authup/authup/issues/3509)) ([7fa9217](https://github.com/authup/authup/commit/7fa9217f7bc03afef4bc46756ceb884d37c8c62b))
* **server-core,client-admin-console,authup:** serve the admin console from server-core as a static SPA ([#3501](https://github.com/authup/authup/issues/3501)) ([1ea842c](https://github.com/authup/authup/commit/1ea842cf10e64559b140876ec1a757d9f338377c))
* **server-core,client-web-kit:** mount the consoles under /console/{admin,account,auth} ([#3503](https://github.com/authup/authup/issues/3503)) ([581e52c](https://github.com/authup/authup/commit/581e52cb9bd70ecb0753d065d4d3f2e5331d5492))
* **server-core,core-http-kit:** authorize info endpoint ([#3510](https://github.com/authup/authup/issues/3510)) ([9ba7b8d](https://github.com/authup/authup/commit/9ba7b8de36ff19718cb2294aa37b7a5d9b51dc35))
* **server-core,core-kit:** back-channel logout, locked user/client writes, client column cleanup ([#3540](https://github.com/authup/authup/issues/3540)) ([ba6215a](https://github.com/authup/authup/commit/ba6215ac28f07dec84cc829fdad9d02d8572d2d5))
* **server-core:** authenticate the account console with an opaque session cookie ([#3498](https://github.com/authup/authup/issues/3498)) ([d84b730](https://github.com/authup/authup/commit/d84b730b293c4c8f86af41d752ca1b771772600f))
* **server-core:** optional worker role ([#3497](https://github.com/authup/authup/issues/3497)) ([212b2af](https://github.com/authup/authup/commit/212b2af219b7c31c1c740ed6bbbcb545f095591a))
* **server-core:** require authorization on the token introspection endpoint ([#3493](https://github.com/authup/authup/issues/3493)) ([4ea479a](https://github.com/authup/authup/commit/4ea479a744d6f2b96c28e6ea1709a7c2ac23511e))
* the worker is a flag on start, and componentsEnabled becomes core.worker.enabled ([#3538](https://github.com/authup/authup/issues/3538)) ([55d740e](https://github.com/authup/authup/commit/55d740ea2142c28de7442c34096a0deab7bebb99))


### Bug Fixes

* **client-web-kit:** retain the introspection email on store.user ([#3517](https://github.com/authup/authup/issues/3517)) ([107aff4](https://github.com/authup/authup/commit/107aff4337abdabcabe2c5046281160e55726294)), closes [#3506](https://github.com/authup/authup/issues/3506)
* **deps:** bump nodemailer in the minorandpatch group ([#3552](https://github.com/authup/authup/issues/3552)) ([52036e9](https://github.com/authup/authup/commit/52036e907d13731fc50d6cf6a32c00183ac85976))
* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))
* email_verified gets a column of its own, and the OIDC claims get declared ([#3525](https://github.com/authup/authup/issues/3525)) ([05d2783](https://github.com/authup/authup/commit/05d2783b43eca4fc01adb1b7eba1d9989339cb19))
* resolve beta.64 release blockers ([#3553](https://github.com/authup/authup/issues/3553)) ([7016523](https://github.com/authup/authup/commit/7016523d6fa6c179a8c3b7a5330a6ee5c6478897))
* **server-config,server-auth-console,authup:** reach the API on an internal address ([#3551](https://github.com/authup/authup/issues/3551)) ([a7f56f5](https://github.com/authup/authup/commit/a7f56f5b80b0f97d40cafafa4153477933a5e84b)), closes [#3550](https://github.com/authup/authup/issues/3550)
* **server-core,docs:** boot on sqlite when no database is configured ([#3549](https://github.com/authup/authup/issues/3549)) ([a730461](https://github.com/authup/authup/commit/a730461746457be2d2a74a055e7c1470a76413b2))
* **server-core,server-kit:** write the entity audit row on the persist transaction ([#3545](https://github.com/authup/authup/issues/3545)) ([38bf1f5](https://github.com/authup/authup/commit/38bf1f5c36c13f5f87cff164030c6a877ccd168b))
* **server-core:** make the just-in-time dev mode reachable ([#3492](https://github.com/authup/authup/issues/3492)) ([cca0247](https://github.com/authup/authup/commit/cca02471c853194199829948eea16826b83609a5))
* **server-core:** read the CLI meta from the package, refuse stray positionals on start/worker ([#3502](https://github.com/authup/authup/issues/3502)) ([68e81d7](https://github.com/authup/authup/commit/68e81d7c013bc9d60676f1e5e2ad60e6d3ffd91d))
* **server-core:** refuse an unknown migration operation instead of applying migrations ([#3544](https://github.com/authup/authup/issues/3544)) ([0c8d288](https://github.com/authup/authup/commit/0c8d288bc5a204f74a6422540373504fdae95e7c)), closes [#3542](https://github.com/authup/authup/issues/3542)


### Code Refactoring

* **server-config:** drop the server. prefix from every config section ([#3533](https://github.com/authup/authup/issues/3533)) ([775d095](https://github.com/authup/authup/commit/775d095b5fd49e66422153fa97b08eb375e241ab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-http-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/i18n bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-config-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-config bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-console-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/specs bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
  * devDependencies
    * @authup/server-test-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Bug Fixes

* **server-core,server-kit:** write the entity audit row on the persist transaction ([#3545](https://github.com/authup/authup/issues/3545)) ([38bf1f5](https://github.com/authup/authup/commit/38bf1f5c36c13f5f87cff164030c6a877ccd168b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/specs bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### Bug Fixes

* ensure consistent version for release ([0fa4627](https://github.com/authup/authup/commit/0fa4627735bb21bcf8ae4d980259fc488b2a95a2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/core-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **server-core,core-kit:** Client.scope and Client.rootUrl are gone from the domain type, the validator, the API payloads and the query schema, and the migration drops both columns with their data.
* `email_verified` no longer reflects `User.active`. Every existing user backfills to unverified, so a relying party gating on the claim stops matching until the addresses are verified again or an admin sets the field. Claims that mirror a nullable column are now omitted rather than answered as `null` on both introspection endpoints and in every id_token; test for absence rather than for `null`. `User` gains a required `emailVerified` property.

### Features

* **server-core,core-kit:** back-channel logout, locked user/client writes, client column cleanup ([#3540](https://github.com/authup/authup/issues/3540)) ([ba6215a](https://github.com/authup/authup/commit/ba6215ac28f07dec84cc829fdad9d02d8572d2d5))


### Bug Fixes

* email_verified gets a column of its own, and the OIDC claims get declared ([#3525](https://github.com/authup/authup/issues/3525)) ([05d2783](https://github.com/authup/authup/commit/05d2783b43eca4fc01adb1b7eba1d9989339cb19))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

<details><summary>1.0.0-beta.64</summary>

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


###   BREAKING CHANGES

* **docker,server-config:** FHS image layout, and one directory per concern ([#3546](https://github.com/authup/authup/issues/3546))
* **authup,server-core:** `authup core` is `authup start core`, `authup console [name]` is `authup start console [name]`, and `authup start --worker` is `authup start worker` (the flag is refused with a message naming the role). In a container, pass the command directly (`start`, `start worker`, `migration run`); the `server/core` prefix is deprecated and prints a notice. `PORT` and `HOST` are honored inside the container instead of being forced.
* `authup worker` and `server/core worker` are gone; use `authup start --worker` / `server/core start --worker`. `COMPONENTS_ENABLED` and `core.componentsEnabled` are no longer read; use `WORKER_ENABLED` and `core.worker.enabled`. A worker process fed `WORKER_ENABLED=false` refuses to start.
* **server-config:** an `authup.yml` section moves to the document root (`server.core.port` -> `core.port`, `server.adminConsole.enabled` -> `adminConsole.enabled`, and so on for the other two consoles). No environment variable changes. The prefix arrived with `authup.yml` in the current beta and never shipped in a release, so no migration is offered; the file read is permissive, so a document still carrying `server:` has that whole subtree skipped in silence.
* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522))
* `defineCLIConfigCommand` is no longer exported by `@authup/server-core`, and the package no longer ships `dist/config-schema.json`.
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511))
* **server-core,authup:** one authup.yml replaces the conf file family ([#3509](https://github.com/authup/authup/issues/3509))
* **server-core,authup:** move the operator CLI into the authup package ([#3507](https://github.com/authup/authup/issues/3507))
* **server-core,client-web-kit:** /admin, /account and /public move to /console/admin, /console/account and /console/auth/assets with no redirect. Rebuild and redeploy every console together with the server (a dist built for the old base serves a blank console); update proxy rules and bookmarks. buildConsoleLoginURL's output changed, so kit and server must be on the same release. Standalone hosts injecting basePath keep working with their own value; the defaults changed.
* **server-core,client-admin-console,authup:** @authup/client-admin-console is a runtime dependency of server-core and is served by it (plan 081).

### Features

* **authup,server-console-kit,server-admin-console,server-account-console,server-auth-console,server-core:** an experimental dev command serves the consoles from source ([#3522](https://github.com/authup/authup/issues/3522)) ([1bb3ab5](https://github.com/authup/authup/commit/1bb3ab50ae496051865650c1d0432ff46e5549cb))
* **authup,server-core:** start takes a role, and the container command is the CLI's own argv ([#3541](https://github.com/authup/authup/issues/3541)) ([779c95d](https://github.com/authup/authup/commit/779c95d4c6cfcfc8862cbc9fb55e7d9cfd0ddda2))
* configuration is a property of the document, and a console is a service ([#3515](https://github.com/authup/authup/issues/3515)) ([b6fe8ef](https://github.com/authup/authup/commit/b6fe8ef5ceefc7f9564c0c85680fc18f1df9286b))
* **docker,server-config:** FHS image layout, and one directory per concern ([#3546](https://github.com/authup/authup/issues/3546)) ([d092d17](https://github.com/authup/authup/commit/d092d179822bb3b60db8157370284ef6328c1cde))
* **server-auth-console,server-core:** the auth pages render in their own service ([#3511](https://github.com/authup/authup/issues/3511)) ([5d0df26](https://github.com/authup/authup/commit/5d0df26d8df77deee1e9e40e8065ce850cbf7111))
* **server-console-kit,server-admin-console,server-account-console,authup,server-core:** the consoles become services ([#3513](https://github.com/authup/authup/issues/3513)) ([adb6073](https://github.com/authup/authup/commit/adb6073b7ef7006f1f963c6769844453b6ba7543))
* **server-core,authup:** move the operator CLI into the authup package ([#3507](https://github.com/authup/authup/issues/3507)) ([3dcfbcd](https://github.com/authup/authup/commit/3dcfbcd50497f99f9683d14b3ed64b2f6a2e0ae0))
* **server-core,authup:** one authup.yml replaces the conf file family ([#3509](https://github.com/authup/authup/issues/3509)) ([7fa9217](https://github.com/authup/authup/commit/7fa9217f7bc03afef4bc46756ceb884d37c8c62b))
* **server-core,client-admin-console,authup:** serve the admin console from server-core as a static SPA ([#3501](https://github.com/authup/authup/issues/3501)) ([1ea842c](https://github.com/authup/authup/commit/1ea842cf10e64559b140876ec1a757d9f338377c))
* **server-core,client-web-kit:** mount the consoles under /console/{admin,account,auth} ([#3503](https://github.com/authup/authup/issues/3503)) ([581e52c](https://github.com/authup/authup/commit/581e52cb9bd70ecb0753d065d4d3f2e5331d5492))
* the worker is a flag on start, and componentsEnabled becomes core.worker.enabled ([#3538](https://github.com/authup/authup/issues/3538)) ([55d740e](https://github.com/authup/authup/commit/55d740ea2142c28de7442c34096a0deab7bebb99))


### Bug Fixes

* **authup:** subtract the deployment path prefix from the console mount ([#3534](https://github.com/authup/authup/issues/3534)) ([96e8425](https://github.com/authup/authup/commit/96e8425b0f74689319274b42f0832dec2b88bc20)), closes [#3531](https://github.com/authup/authup/issues/3531)
* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#3537](https://github.com/authup/authup/issues/3537)) ([0ba8493](https://github.com/authup/authup/commit/0ba8493d76b742ee22572f15d65bfcc76bf71032))
* **server-config,server-auth-console,authup:** reach the API on an internal address ([#3551](https://github.com/authup/authup/issues/3551)) ([a7f56f5](https://github.com/authup/authup/commit/a7f56f5b80b0f97d40cafafa4153477933a5e84b)), closes [#3550](https://github.com/authup/authup/issues/3550)
* **server-core,docs:** boot on sqlite when no database is configured ([#3549](https://github.com/authup/authup/issues/3549)) ([a730461](https://github.com/authup/authup/commit/a730461746457be2d2a74a055e7c1470a76413b2))


### Code Refactoring

* **server-config:** drop the server. prefix from every config section ([#3533](https://github.com/authup/authup/issues/3533)) ([775d095](https://github.com/authup/authup/commit/775d095b5fd49e66422153fa97b08eb375e241ab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-account-console bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-admin-console bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-auth-console bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-config-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-console-kit bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
    * @authup/server-core bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
  * devDependencies
    * @authup/client-auth-console bumped from ^1.0.0-beta.63 to ^1.0.0-beta.64
</details>

---
This PR was generated with [Release Please](https://github.com/googleapis/release-please). See [documentation](https://github.com/googleapis/release-please#release-please).