# Changelog

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### ⚠ BREAKING CHANGES

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

## [1.0.0-beta.63](https://github.com/authup/authup/compare/v1.0.0-beta.62...v1.0.0-beta.63) (2026-08-20)


### Features

* **server-core:** complete a federated login through the hosted authorize ladder ([#3475](https://github.com/authup/authup/issues/3475)) ([31ad488](https://github.com/authup/authup/commit/31ad488ded840bf09ebd089e5619f32fbdb75589))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/client-web-theme bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/core-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/i18n bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63

## [1.0.0-beta.62](https://github.com/authup/authup/compare/v1.0.0-beta.61...v1.0.0-beta.62) (2026-08-18)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 16 updates ([#3461](https://github.com/authup/authup/issues/3461)) ([bb1a33a](https://github.com/authup/authup/commit/bb1a33aa639016f2e0aee54121182cac88b471be))
* **deps:** bump the minorandpatch group across 1 directory with 9 updates ([#3470](https://github.com/authup/authup/issues/3470)) ([b1f9376](https://github.com/authup/authup/commit/b1f9376157ca2f0cb513f03f9c34b1bbe45ab2f2))
* **server-core:** harden the federated login callback ([#3464](https://github.com/authup/authup/issues/3464)) ([d70de50](https://github.com/authup/authup/commit/d70de50e3121970e7647392c82ab24d44d42a32d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/client-web-theme bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/core-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/i18n bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62

## [1.0.0-beta.61](https://github.com/authup/authup/compare/v1.0.0-beta.60...v1.0.0-beta.61) (2026-08-14)


### Bug Fixes

* ensure consistent version for release ([0369d9f](https://github.com/authup/authup/commit/0369d9f2d8fbb0ee7bf1d742af5b31e7a16f55e6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/client-web-theme bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/core-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/i18n bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61

## [1.0.0-beta.60](https://github.com/authup/authup/compare/v1.0.0-beta.59...v1.0.0-beta.60) (2026-08-13)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#3414](https://github.com/authup/authup/issues/3414)) ([f0706f2](https://github.com/authup/authup/commit/f0706f211884be8154766bd24ea45f3f696211ed))
* redo the v1.0.0-beta.60 release with consistent versions ([#3444](https://github.com/authup/authup/issues/3444)) ([5c04dc8](https://github.com/authup/authup/commit/5c04dc8daf28a01037949d8cb17e1de67ba10e6b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/client-web-theme bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/core-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/i18n bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60

## [1.0.0-beta.59](https://github.com/authup/authup/compare/v1.0.0-beta.58...v1.0.0-beta.59) (2026-08-04)


### ⚠ BREAKING CHANGES

* `**` is no longer accepted inside the host of a redirect pattern or a TRUSTED_ORIGINS entry. It matches the rest of the value outright, so `https://**.example.com/**` read as "any subdomain" but accepted every origin. A single `*` is unchanged. Stored patterns are not rewritten; new writes are rejected and an offending TRUSTED_ORIGINS value fails the boot with a message naming it.
* the five settings pages are gone and their URLs now leave the application, redirecting to <apiUrl>/account instead.
* @authup/server-core no longer embeds the auth UI under dist/ui; it resolves the @authup/client-auth-console package instead. The account console runtime-config global window.__AUTHUP_ACCOUNT__ (never released) is renamed to window.__AUTHUP__.

### Features

* theme the served consoles from a mounted directory ([#3385](https://github.com/authup/authup/issues/3385)) ([8ffbbb1](https://github.com/authup/authup/commit/8ffbbb1551cc86e5f2dd919413dfb617ad5f47e6))


### Bug Fixes

* redirect-pattern matching, plus fixes from the beta.58 release audit ([#3397](https://github.com/authup/authup/issues/3397)) ([e00c6ba](https://github.com/authup/authup/commit/e00c6ba635d206a16b5ad19467bd5540d021c37e))
* repair the embedded vite SSR integration ([#3380](https://github.com/authup/authup/issues/3380)) ([acc6f48](https://github.com/authup/authup/commit/acc6f482617ec131fb8ab6a864e0f08710ec308c))


### Code Refactoring

* consolidate self-service into the account console ([#3392](https://github.com/authup/authup/issues/3392)) ([f380f5f](https://github.com/authup/authup/commit/f380f5f90ee55c4a661e9e32cadc02c5f66ac2ef))
* extract the SSR auth UI into apps/client-auth-console ([#3375](https://github.com/authup/authup/issues/3375)) ([b131e2a](https://github.com/authup/authup/commit/b131e2ae81dfaf1aa46d44eaa0b32329d5227fbe))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/client-web-theme bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/core-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/i18n bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
