# Change Log

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.64...v1.0.0-beta.64) (2026-09-05)


### ⚠ BREAKING CHANGES

* resolveConfig and readConfigFromEnv of the three console services return a Promise; an embedder calling either directly needs an await.

### Bug Fixes

* work the beta.64 audit backlog ([#3555](https://github.com/authup/authup/issues/3555)) ([2332346](https://github.com/authup/authup/commit/23323463284dde07befd743479d20bf160c1e567))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/client-web-theme bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/core-http-kit bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/i18n bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/kit bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/specs bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### ⚠ BREAKING CHANGES

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

## [1.0.0-beta.63](https://github.com/authup/authup/compare/v1.0.0-beta.62...v1.0.0-beta.63) (2026-08-20)


### ⚠ BREAKING CHANGES

* AuthorizationRequest.target is removed. Set the destination as a `redirect` parameter on the redirect_uri instead. A client whose registered redirect pattern is the exact callback URL with no wildcard must widen it to match the query.

### Bug Fixes

* carry the post-login destination through the authorize flow ([#3476](https://github.com/authup/authup/issues/3476)) ([9d89a21](https://github.com/authup/authup/commit/9d89a21c180bd67612c1d640bdecab562dfb2f1e))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/client-web-theme bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/core-http-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/core-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/i18n bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63

## [1.0.0-beta.62](https://github.com/authup/authup/compare/v1.0.0-beta.61...v1.0.0-beta.62) (2026-08-18)


### Bug Fixes

* **client-admin-console:** reset pagination when the sessions subject-kind filter changes ([#3462](https://github.com/authup/authup/issues/3462)) ([86e3af6](https://github.com/authup/authup/commit/86e3af6b724f1ec31a2e90324b54cc484d6199e7)), closes [#3443](https://github.com/authup/authup/issues/3443)
* **deps:** bump @rapiq/* to ^2.2.0 ([46c660b](https://github.com/authup/authup/commit/46c660b05fa2ad34d7ea233ebbbdd6baa40122c9))
* **deps:** bump the minorandpatch group across 1 directory with 16 updates ([#3461](https://github.com/authup/authup/issues/3461)) ([bb1a33a](https://github.com/authup/authup/commit/bb1a33aa639016f2e0aee54121182cac88b471be))
* **deps:** bump the minorandpatch group across 1 directory with 9 updates ([#3470](https://github.com/authup/authup/issues/3470)) ([b1f9376](https://github.com/authup/authup/commit/b1f9376157ca2f0cb513f03f9c34b1bbe45ab2f2))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/client-web-theme bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/core-http-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/core-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/i18n bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62

## [1.0.0-beta.61](https://github.com/authup/authup/compare/v1.0.0-beta.60...v1.0.0-beta.61) (2026-08-14)


### Bug Fixes

* ensure consistent version for release ([0369d9f](https://github.com/authup/authup/commit/0369d9f2d8fbb0ee7bf1d742af5b31e7a16f55e6))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/client-web-theme bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/core-http-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/core-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/i18n bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61

## [1.0.0-beta.60](https://github.com/authup/authup/compare/v1.0.0-beta.59...v1.0.0-beta.60) (2026-08-13)


### Features

* admin sessions overview ([#3420](https://github.com/authup/authup/issues/3420)) ([57e8af1](https://github.com/authup/authup/commit/57e8af1202d93d7ee0457bf52d67c5183c5b849c))
* audit event session attribution ([#3422](https://github.com/authup/authup/issues/3422)) ([6d7759b](https://github.com/authup/authup/commit/6d7759bd6fa4f773cd3155c6540649f50536593d))
* identity-provider account linking ([#3419](https://github.com/authup/authup/issues/3419)) ([f21d0e3](https://github.com/authup/authup/commit/f21d0e3ae96404ed2aca4215fe97c579f10ad18a))
* schema index declarations backed by entity indexes (rapiq 2.0.0-beta.20) ([#3425](https://github.com/authup/authup/issues/3425)) ([d34afb7](https://github.com/authup/authup/commit/d34afb76143f08119e9c449201f975d8ba797788))
* session token visibility (admin user tab + account console) ([#3421](https://github.com/authup/authup/issues/3421)) ([776239d](https://github.com/authup/authup/commit/776239d468c7db2979c2670d728c9f5cbc619945))
* title-row action, breadcrumbs and record sub titles for the admin console ([#3430](https://github.com/authup/authup/issues/3430)) ([a4c590d](https://github.com/authup/authup/commit/a4c590d9035d28be0b8857ce78b6113deb24e7f7))


### Bug Fixes

* **deps:** bump @rapiq/* to 2.0.0-beta.18 ([a01fabb](https://github.com/authup/authup/commit/a01fabbb6c7bf6671f3ccb757cd0c4c695510679))
* **deps:** bump @rapiq/* to 2.0.0-beta.19 ([21c92fb](https://github.com/authup/authup/commit/21c92fb67aead43a68c0152ef8d15507c2bf9130))
* redo the v1.0.0-beta.60 release with consistent versions ([#3444](https://github.com/authup/authup/issues/3444)) ([5c04dc8](https://github.com/authup/authup/commit/5c04dc8daf28a01037949d8cb17e1de67ba10e6b))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/client-web-theme bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/core-http-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/core-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/i18n bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60

## [1.0.0-beta.59](https://github.com/authup/authup/compare/v1.0.0-beta.58...v1.0.0-beta.59) (2026-08-04)


### ⚠ BREAKING CHANGES

* `**` is no longer accepted inside the host of a redirect pattern or a TRUSTED_ORIGINS entry. It matches the rest of the value outright, so `https://**.example.com/**` read as "any subdomain" but accepted every origin. A single `*` is unchanged. Stored patterns are not rewritten; new writes are rejected and an offending TRUSTED_ORIGINS value fails the boot with a message naming it.
* the five settings pages are gone and their URLs now leave the application, redirecting to <apiUrl>/account instead.
* @authup/server-core no longer embeds the auth UI under dist/ui; it resolves the @authup/client-auth-console package instead. The account console runtime-config global window.__AUTHUP_ACCOUNT__ (never released) is renamed to window.__AUTHUP__.
* rename client-web app to client-admin-console ([#3370](https://github.com/authup/authup/issues/3370))

### Features

* add the account console (/account self-service surface) ([#3373](https://github.com/authup/authup/issues/3373)) ([2e11e5f](https://github.com/authup/authup/commit/2e11e5f9895a84d0eca4cfd4ae1803dcfa90db5e))
* provision per-app system clients (admin-console, account-console) ([#3371](https://github.com/authup/authup/issues/3371)) ([140e9d2](https://github.com/authup/authup/commit/140e9d22789e2b0ed69517ce4cf4473c8d0c0b59))


### Bug Fixes

* **client-account-console:** mount the alert-dialog provider host ([b160113](https://github.com/authup/authup/commit/b1601132a6544feb5fe0d2a62f3622f922bdcf67))
* **deps:** bump @rapiq/* to 2.0.0-beta.15 ([66958e7](https://github.com/authup/authup/commit/66958e7f11a3462dce3cea6b74f0435c780524e7))
* redirect-pattern matching, plus fixes from the beta.58 release audit ([#3397](https://github.com/authup/authup/issues/3397)) ([e00c6ba](https://github.com/authup/authup/commit/e00c6ba635d206a16b5ad19467bd5540d021c37e))


### Code Refactoring

* consolidate self-service into the account console ([#3392](https://github.com/authup/authup/issues/3392)) ([f380f5f](https://github.com/authup/authup/commit/f380f5f90ee55c4a661e9e32cadc02c5f66ac2ef))
* extract the SSR auth UI into apps/client-auth-console ([#3375](https://github.com/authup/authup/issues/3375)) ([b131e2a](https://github.com/authup/authup/commit/b131e2ae81dfaf1aa46d44eaa0b32329d5227fbe))
* rename client-web app to client-admin-console ([#3370](https://github.com/authup/authup/issues/3370)) ([77d48a4](https://github.com/authup/authup/commit/77d48a45b39df21eae0e04c41c2ec3df001a7f64))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/client-web-theme bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/core-http-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/core-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/i18n bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59

## [1.0.0-beta.58](https://github.com/authup/authup/compare/v1.0.0-beta.57...v1.0.0-beta.58) (2026-07-31)


### Features

* hand server-rendered data to the client instead of fetching it twice ([#3358](https://github.com/authup/authup/issues/3358)) ([0748d85](https://github.com/authup/authup/commit/0748d85a0475b1dbddbad80c10b9ce5f4a099ab2))


### Bug Fixes

* a user (or client) never moves between realms ([#3362](https://github.com/authup/authup/issues/3362)) ([d45cc67](https://github.com/authup/authup/commit/d45cc677a79330b43bb6b319b70d438fbba24576))
* **deps:** bump ilingo, validup and trapi to their latest versions ([6d69f90](https://github.com/authup/authup/commit/6d69f90665f23022de5bf3ef8c6916a50c449494))
* enforce the permission guard on entity index detail links ([#3363](https://github.com/authup/authup/issues/3363)) ([28c9c18](https://github.com/authup/authup/commit/28c9c18aee3a7c56561746f05febef8fa59ddecc))


### Performance Improvements

* **ui:** bundle only the icons the apps render ([#3365](https://github.com/authup/authup/issues/3365)) ([7b1e041](https://github.com/authup/authup/commit/7b1e041ef006e3ac240fa8b5d49f0841f97e49f4)), closes [#3345](https://github.com/authup/authup/issues/3345)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/client-web-theme bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/core-http-kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/core-kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/i18n bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58

## [1.0.0-beta.57](https://github.com/authup/authup/compare/v1.0.0-beta.56...v1.0.0-beta.57) (2026-07-29)


### ⚠ BREAKING CHANGES

* API consumers reading bare record bodies must unwrap data; old clients against a new server break (lockstep beta release).

### Features

* add a post-logout redirect-uri list to the client form ([#3350](https://github.com/authup/authup/issues/3350)) ([bdf23d1](https://github.com/authup/authup/commit/bdf23d12322171322e554fdafd0bdb190ad72e4f))
* query-capability discovery via meta.schema + entity record response envelope ([#3332](https://github.com/authup/authup/issues/3332)) ([00f2f4c](https://github.com/authup/authup/commit/00f2f4c3aec069fef4b8eecc2da4d39ba19f0483))
* restore file config, harden the launcher and dedupe the UI bootstrap ([#3344](https://github.com/authup/authup/issues/3344)) ([13b611d](https://github.com/authup/authup/commit/13b611da9ee980d97887a2a542b84beae5f730ff))


### Bug Fixes

* complete schema field projections and re-target role client FK ([#3324](https://github.com/authup/authup/issues/3324)) ([9eec343](https://github.com/authup/authup/commit/9eec343965bf98990560b0092d26bd0c82a2561f))
* **deps:** bump @rapiq/* to 2.0.0-beta.11 ([#3333](https://github.com/authup/authup/issues/3333)) ([728dbb1](https://github.com/authup/authup/commit/728dbb1f16deb14c5901f0406a34ae50c791dbd6))
* **deps:** bump the minorandpatch group across 1 directory with 6 updates ([#3334](https://github.com/authup/authup/issues/3334)) ([4545dee](https://github.com/authup/authup/commit/4545deed8011b32a914dad979d5ce2e13d702650))
* **deps:** replace @rapiq/{typeorm,sql,memory} with @rapiq/adapter-* ([9219e75](https://github.com/authup/authup/commit/9219e75c10bf1ba9164804f8676b049b44dc549c)), closes [#3341](https://github.com/authup/authup/issues/3341)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/client-web-theme bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/core-http-kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/core-kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/i18n bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57

## [1.0.0-beta.56](https://github.com/authup/authup/compare/v1.0.0-beta.55...v1.0.0-beta.56) (2026-07-24)


### Bug Fixes

* **deps:** bump @rapiq/* to 2.0.0-beta.9 ([6475f2b](https://github.com/authup/authup/commit/6475f2b0ec1ad69b4412540a3385d03eca5c3746))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/client-web-theme bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/core-http-kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/core-kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/i18n bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56

## [1.0.0-beta.55](https://github.com/authup/authup/compare/v1.0.0-beta.54...v1.0.0-beta.55) (2026-07-24)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 24 updates ([#3317](https://github.com/authup/authup/issues/3317)) ([e7a2b6b](https://github.com/authup/authup/commit/e7a2b6be6d1be3043a8e5b8578e80b1cef08d52e))
* repair build pipeline and bump rapiq to 2.0.0-beta.8 ([7a8f8f7](https://github.com/authup/authup/commit/7a8f8f7d4a3e84a9782823622e010242c34c0982))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/client-web-theme bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/core-http-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/core-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/i18n bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55

## [1.0.0-beta.54](https://github.com/authup/authup/compare/v1.0.0-beta.53...v1.0.0-beta.54) (2026-07-22)


### ⚠ BREAKING CHANGES

* **client-web-kit:** compose queries in the rapiq IR instead of forwarding build input ([#3280](https://github.com/authup/authup/issues/3280))
* consumers now build queries with rapiq v2 canonical parameter keys (filters/relations) and typed operator objects.
* robot accounts and the robot_credentials grant are removed; recreate machine identities as OAuth2 clients (client_credentials grant). Existing robot rows and their role/permission bindings are dropped without data migration.
* camelCase entity properties, domain types & management API ([#3273](https://github.com/authup/authup/issues/3273))

### Features

* **access:** lower pending policies to rapiq conditions (toCondition / WHERE pushdown) ([#3291](https://github.com/authup/authup/issues/3291)) ([92b0827](https://github.com/authup/authup/commit/92b08270208fbb18a2b84f1ae86e808314330abf))
* **server-core:** validate entity schemas against typeorm metadata at boot ([#3285](https://github.com/authup/authup/issues/3285)) ([25577f9](https://github.com/authup/authup/commit/25577f95a6dfe0818ed2b6cb735adb1b12e43830))


### Bug Fixes

* **deps:** bump [@rapiq](https://github.com/rapiq) packages to v2.0.0-beta.2 ([#3281](https://github.com/authup/authup/issues/3281)) ([cc48cbb](https://github.com/authup/authup/commit/cc48cbb162b74fb36bb3265bea6b7a985f9d6918))
* preserve API sub-path when building authorize & OAuth2 URLs ([#3301](https://github.com/authup/authup/issues/3301)) ([71d9c88](https://github.com/authup/authup/commit/71d9c881bcb43f34ddb33b575a22ff296af493c3))
* **server-core:** authorize relation paths reached via filter/sort/field keys ([#3310](https://github.com/authup/authup/issues/3310)) ([b98e6c1](https://github.com/authup/authup/commit/b98e6c1ca8542b6961cb89e65873ccb9abd92e5f))


### Code Refactoring

* camelCase entity properties, domain types & management API ([#3273](https://github.com/authup/authup/issues/3273)) ([c31b20e](https://github.com/authup/authup/commit/c31b20ee9fd037e96bbcaee2eae1d6386174f52b))
* **client-web-kit:** compose queries in the rapiq IR instead of forwarding build input ([#3280](https://github.com/authup/authup/issues/3280)) ([3b83e60](https://github.com/authup/authup/commit/3b83e608d1e4a6f3a9dcce034beb161884b4aa31)), closes [#3278](https://github.com/authup/authup/issues/3278)
* migrate to rapiq v2, typeorm 1.1.0 and typeorm-extension v4 ([#3276](https://github.com/authup/authup/issues/3276)) ([ee8c9f7](https://github.com/authup/authup/commit/ee8c9f708a195cc5dd385965d16189b6640e38dc))
* remove robot entity in favor of clients ([#3275](https://github.com/authup/authup/issues/3275)) ([800684d](https://github.com/authup/authup/commit/800684dc9a620652b210baf16c50fb34e54bb224))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/client-web-theme bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/core-http-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/core-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/i18n bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54

## [1.0.0-beta.53](https://github.com/authup/authup/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2026-07-17)


### ⚠ BREAKING CHANGES

* replace Client.is_confidential with auth_method and token_binding_method.

### Features

* add OAuth mutual TLS authentication ([#3261](https://github.com/authup/authup/issues/3261)) ([d3d88c6](https://github.com/authup/authup/commit/d3d88c6942059bf1a460d41f0a19c31932893b1c))
* add realm trust anchor management ([#3260](https://github.com/authup/authup/issues/3260)) ([3a822d8](https://github.com/authup/authup/commit/3a822d836a852dc8af3547ea288f10a45c2a583d))
* authorize access policy + persisted per-scope consent ([#3246](https://github.com/authup/authup/issues/3246)) ([b4b96c7](https://github.com/authup/authup/commit/b4b96c74e0bec4d332c39f5477744aa8cca1d44f))
* **client-web-kit:** mfa challenge step, enrollment ui, settings + admin tabs ([#3234](https://github.com/authup/authup/issues/3234)) ([aca3fd7](https://github.com/authup/authup/commit/aca3fd7d307b67bdb9bf996a8fb3022c37aa5cad))
* **client-web-kit:** mfa enrollment picker tiles + modal add flow, split settings security tab ([66eb500](https://github.com/authup/authup/commit/66eb5006d153bdf64be253355d61f23e177dc297))
* key management api + lifecycle states ([#3256](https://github.com/authup/authup/issues/3256)) ([c69e9a2](https://github.com/authup/authup/commit/c69e9a2fc070a2c6bea71ec9e89bee2341e0cd88))
* security event log with entity tracking, login throttle, metrics & admin ui ([#3229](https://github.com/authup/authup/issues/3229)) ([5a30950](https://github.com/authup/authup/commit/5a30950a4c819206a1cbafd221a0c3be692f53e6))


### Bug Fixes

* **deps:** bump @vuecs/forms to v5.3.3 and @vuecs/theme-tailwind to v6.3.1 ([d3bb7fd](https://github.com/authup/authup/commit/d3bb7fdf565c16999c017c6fda75a58ef0d74538))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/client-web-theme bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/core-http-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/core-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/i18n bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53

## [1.0.0-beta.52](https://github.com/authup/authup/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-07-11)


### ⚠ BREAKING CHANGES

* all in-flight refresh tokens are invalidated on upgrade (the new table is empty), so active users sign in again once. The default access-token lifetime drops from 3600s to 900s.

### Features

* add "log out other devices" action and gate admin sessions tab on session_read ([#3192](https://github.com/authup/authup/issues/3192)) ([f8ac851](https://github.com/authup/authup/commit/f8ac851f1d1fbc6e3234a45d7e49d006dcba8603))
* admin bulk session revocation and current-session marking ([#3193](https://github.com/authup/authup/issues/3193)) ([2fb862b](https://github.com/authup/authup/commit/2fb862bd00b63ce4f6785100900c3f7d0729f7f4))
* drop implicit & hybrid oauth2 response types ([#3199](https://github.com/authup/authup/issues/3199)) ([0c3108a](https://github.com/authup/authup/commit/0c3108a638f1e3ae86b9f00f21a346a6b063fb04))
* retain the id_token in the kit store & round-trip client-web logout ([#3201](https://github.com/authup/authup/issues/3201)) ([500d4df](https://github.com/authup/authup/commit/500d4df6ab52907ad80f69f1ea3e74b62d6d2120))
* session-management UI ([#3189](https://github.com/authup/authup/issues/3189)) ([7b617c8](https://github.com/authup/authup/commit/7b617c84213990d13fcf3d7961353274bfed02ff))


### Bug Fixes

* add accessible names to icon-only action buttons on entity index pages ([#3182](https://github.com/authup/authup/issues/3182)) ([86e7eba](https://github.com/authup/authup/commit/86e7eba1ef9141d5b9160f8e14498687adafd520)), closes [#3153](https://github.com/authup/authup/issues/3153)
* post-review hardening for OAuth2 authorize + RP-initiated logout ([#3216](https://github.com/authup/authup/issues/3216)) ([423849d](https://github.com/authup/authup/commit/423849d186bb5577b129c3138fb3ef72365a3578))
* remove non-functional session search field ([be557fd](https://github.com/authup/authup/commit/be557fdfd89d15a1422c2dbe72b92716edab18d4))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/client-web-theme bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/core-http-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/core-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/i18n bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52

## [1.0.0-beta.51](https://github.com/authup/authup/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-07-02)


### ⚠ BREAKING CHANGES

* **access,server-core:** PermissionEvaluationContext.input is renamed to data. Callers of permissionEvaluator.evaluate/preEvaluate/*OneOf must pass { data } instead of { input }.

### Features

* **client-web-kit:** confirm entity deletion via AlertDialog + upgrade @vuecs/* to latest ([#3173](https://github.com/authup/authup/issues/3173)) ([f48cdbf](https://github.com/authup/authup/commit/f48cdbf26ba34c4615d973c059a8a739f81cc069))


### Code Refactoring

* **access,server-core:** resource realm via the realmMatch policy key + typed PolicyData construction ([#3157](https://github.com/authup/authup/issues/3157)) ([07a0c92](https://github.com/authup/authup/commit/07a0c923cd8c9c07a6342b311bbd995d5fc6bbeb))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/client-web-theme bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/core-http-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/core-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/i18n bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51

## [1.0.0-beta.50](https://github.com/authup/authup/compare/v1.0.0-beta.49...v1.0.0-beta.50) (2026-06-24)


### ⚠ BREAKING CHANGES

* **deps:** node >= 22.13 is now required; node 20 is no longer supported.

### Features

* localized error toasts, conformant OpenID discovery, UI cleanups ([#3137](https://github.com/authup/authup/issues/3137)) ([77bc9e5](https://github.com/authup/authup/commit/77bc9e580d961e6af63f79f8bcbad5b09155d23a))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 22 updates ([#3136](https://github.com/authup/authup/issues/3136)) ([491ee21](https://github.com/authup/authup/commit/491ee210aa793d6c6b143d6b8376e41c9e9785ea))


### Miscellaneous Chores

* **deps:** upgrade hapic to v3, @hapic/oauth2 to v4, require node &gt;= 22 ([#3134](https://github.com/authup/authup/issues/3134)) ([07503bc](https://github.com/authup/authup/commit/07503bc87b43227cf1b5e03573242d22722a0b08))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/client-web-theme bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-http-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/i18n bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50

## [1.0.0-beta.49](https://github.com/authup/authup/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2026-06-13)


### Features

* complete i18n UI coverage sweep (plan 021) ([#3121](https://github.com/authup/authup/issues/3121)) ([2a50bbe](https://github.com/authup/authup/commit/2a50bbe15feaa03320bb986b555f65036682dc05))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/client-web-theme bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-http-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/i18n bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49

## [1.0.0-beta.48](https://github.com/authup/authup/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([4f983df](https://github.com/authup/authup/commit/4f983dff265156d412fad8b1f3e88d2f632c3e6d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/client-web-theme bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-http-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/i18n bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48

## [1.0.0-beta.47](https://github.com/authup/authup/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2026-06-12)


### ⚠ BREAKING CHANGES

* apps/server-core, apps/client-web and apps/authup are now licensed under AGPL-3.0-only (previously Apache-2.0). Releases up to and including v1.0.0-beta.46 remain Apache-2.0.
* @authup/client-web-kit no longer exports ./dist/style.css. Its component styles are now delivered through @authup/client-web-kit-theme (via the @authup/client-web-theme @import chain). Consumers importing '@authup/client-web-kit/dist/style.css' must remove that import.

### Features

* per-realm web client login, realm chooser & backend-served auth workflow UI ([#3104](https://github.com/authup/authup/issues/3104)) ([80a1cce](https://github.com/authup/authup/commit/80a1cce4f137c4e94e70fd0c27404e6b5637a200))


### Miscellaneous Chores

* dual-license server, web client & CLI under AGPL-3.0 ([885742f](https://github.com/authup/authup/commit/885742f3a181b1aef6d985a7128aadf1e2b36da5))


### Code Refactoring

* move client-web-kit component styles into client-web-kit-theme ([#3103](https://github.com/authup/authup/issues/3103)) ([f186a59](https://github.com/authup/authup/commit/f186a592a88d6a9dd460109be62818095593d8eb))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/client-web-theme bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-http-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/i18n bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47

## [1.0.0-beta.46](https://github.com/authup/authup/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2026-06-09)


### ⚠ BREAKING CHANGES

* `@authup/client-web-kit` no longer re-exports `@authup/i18n`, `@authup/access` no longer re-exports `DecisionStrategy`, and `@authup/client-web-theme` no longer re-exports `clientWebKitTheme` / `merge`. Import these from their source packages directly.

### Bug Fixes

* stop re-exporting external packages through internal barrels (fixes @authup/i18n runtime crash) ([#3101](https://github.com/authup/authup/issues/3101)) ([5dd751a](https://github.com/authup/authup/commit/5dd751ad980ac730d0805f7fd7057450ea079418))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/client-web-theme bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-http-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/i18n bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46

## [1.0.0-beta.45](https://github.com/authup/authup/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2026-06-09)


### Features

* **client-web:** brand theme overhaul — logo, surface tokens, dark-mode fixes ([#3096](https://github.com/authup/authup/issues/3096)) ([fed755b](https://github.com/authup/authup/commit/fed755b46bc3c0dc8b6cc0e73e4ccc798b2f8ca3))
* **i18n:** apply translations across client-web & client-web-kit UI ([#3095](https://github.com/authup/authup/issues/3095)) ([33dbe72](https://github.com/authup/authup/commit/33dbe72cf71ebd674d297dc378b5509b441b7de1))
* **kit:** add generateName helper and regenerate buttons for entity name forms ([#3092](https://github.com/authup/authup/issues/3092)) ([833a4a1](https://github.com/authup/authup/commit/833a4a12f0859da9e4be51d63433d8161f65935e))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/client-web-theme bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-http-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45

## [1.0.0-beta.44](https://github.com/authup/authup/compare/v1.0.0-beta.42...v1.0.0-beta.44) (2026-06-07)


### ⚠ BREAKING CHANGES

* migrate forms to validup-vue and nav to @vuecs/navigation ([#3086](https://github.com/authup/authup/issues/3086))
* **icons:** drop @fortawesome/fontawesome-free, route all icons thr… ([#3082](https://github.com/authup/authup/issues/3082))
* migrate from Bootstrap to Tailwind v4 (+ vuecs theme-tailwind) ([#3075](https://github.com/authup/authup/issues/3075))
* consumers of `@authup/client-web-kit` must install `@vuecs/{core,button,elements,forms,icon,list,overlays,pagination, table}` 1.x as peer deps and pre-install `@vuecs/core` *before* any per-package vuecs plugin (the kit no longer installs `@vuecs/forms` / `@vuecs/pagination` to avoid freezing the theme manager).

### Features

* **icons:** drop @fortawesome/fontawesome-free, route all icons thr… ([#3082](https://github.com/authup/authup/issues/3082)) ([b50c117](https://github.com/authup/authup/commit/b50c11701f6310cec310f25d14778a15a14b2e50))
* migrate forms to validup-vue and nav to @vuecs/navigation ([#3086](https://github.com/authup/authup/issues/3086)) ([ce88592](https://github.com/authup/authup/commit/ce885927b01fa0550a059b3c99f1809318671fa6))
* migrate from Bootstrap to Tailwind v4 (+ vuecs theme-tailwind) ([#3075](https://github.com/authup/authup/issues/3075)) ([a49d1da](https://github.com/authup/authup/commit/a49d1da9ed4509f9bb4d24e6578286367a635cc4))
* migrate to vuecs 1.x packages, drop bootstrap-vue-next ([#3069](https://github.com/authup/authup/issues/3069)) ([61e828c](https://github.com/authup/authup/commit/61e828cc595a316429013c3a9ecd708e2f265e22))
* **theme,app:** light/dark color-mode toggle + chrome refactor + post-Tailwind-v4 polish ([#3077](https://github.com/authup/authup/issues/3077)) ([fd4002d](https://github.com/authup/authup/commit/fd4002d6607d01064782864d99d1991c89f0d2fb))


### Bug Fixes

* ensure consistent version for release ([5159a23](https://github.com/authup/authup/commit/5159a233a5978bc910119b68f27130e0c2d570a7))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/client-web-theme bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-http-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44

## [1.0.0-beta.42](https://github.com/authup/authup/compare/v1.0.0-beta.41...v1.0.0-beta.42) (2026-05-15)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 21 updates ([#3053](https://github.com/authup/authup/issues/3053)) ([d0723c6](https://github.com/authup/authup/commit/d0723c6ddcff1bf8a6c197bcd2e66a00f1232cfd))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-http-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42

## [1.0.0-beta.41](https://github.com/authup/authup/compare/v1.0.0-beta.40...v1.0.0-beta.41) (2026-05-08)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 15 updates ([#3028](https://github.com/authup/authup/issues/3028)) ([45a5732](https://github.com/authup/authup/commit/45a57324183ef849ab5fddea60dc11d3723b926c))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/core-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/core-http-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41

## [1.0.0-beta.40](https://github.com/authup/authup/compare/v1.0.0-beta.39...v1.0.0-beta.40) (2026-04-30)


### Bug Fixes

* ensure consistent version for release ([c8da21d](https://github.com/authup/authup/commit/c8da21d2db725ab437dc3f5a976f8ea453014cbc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/core-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/core-http-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40

## [1.0.0-beta.39](https://github.com/authup/authup/compare/v1.0.0-beta.38...v1.0.0-beta.39) (2026-04-29)


### Bug Fixes

* ensure consistent version for release ([2cad5ac](https://github.com/authup/authup/commit/2cad5acd83d3c1ed9973be7c5a90dfa59a8c782a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/core-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/core-http-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39

## [1.0.0-beta.38](https://github.com/authup/authup/compare/v1.0.0-beta.37...v1.0.0-beta.38) (2026-04-28)


### Features

* declarative self-manage permissions via ATTRIBUTE_NAMES policies ([#3019](https://github.com/authup/authup/issues/3019)) ([240eb45](https://github.com/authup/authup/commit/240eb45c0be5eb02adefbfe8306e3a134e91b0d4))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/core-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/core-http-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38

## [1.0.0-beta.37](https://github.com/authup/authup/compare/v1.0.0-beta.36...v1.0.0-beta.37) (2026-04-23)


### Bug Fixes

* ensure consistent version for release ([642b0e2](https://github.com/authup/authup/commit/642b0e23a21d707cc9b389cd0eb824af487bd4ce))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/core-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/core-http-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37

## [1.0.0-beta.36](https://github.com/authup/authup/compare/v1.0.0-beta.35...v1.0.0-beta.36) (2026-04-22)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 10 updates ([#3004](https://github.com/authup/authup/issues/3004)) ([4c2cb91](https://github.com/authup/authup/commit/4c2cb918f4d1eb734ddf6a33655679c558cb4623))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/core-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/core-http-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/client-web-nuxt bumped from ^1.0.1-beta.34 to ^1.0.0-beta.36

## [1.0.0-beta.35](https://github.com/authup/authup/compare/v1.0.0-beta.34...v1.0.0-beta.35) (2026-04-16)


### Bug Fixes

* ensure consistent version for release ([e11b6c9](https://github.com/authup/authup/commit/e11b6c9050127d1651ecf5f5ea3ac10b05208111))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/core-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/core-http-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.34 to ^1.0.1-beta.34

## [1.0.0-beta.34](https://github.com/authup/authup/compare/v1.0.0-beta.33...v1.0.0-beta.34) (2026-04-15)


### Bug Fixes

* touched missing file & updated version-bump skill ([9acbca9](https://github.com/authup/authup/commit/9acbca9fd01b042451615f7ba5b76154334aae8a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/core-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/core-http-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34

## [1.0.0-beta.33](https://github.com/authup/authup/compare/v1.0.0-beta.32...v1.0.0-beta.33) (2026-04-15)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 16 updates ([#2973](https://github.com/authup/authup/issues/2973)) ([b95589a](https://github.com/authup/authup/commit/b95589a06e8907cefcb8b1c704682928d513766e))
* **deps:** bump the minorandpatch group across 1 directory with 7 updates ([#2961](https://github.com/authup/authup/issues/2961)) ([3422973](https://github.com/authup/authup/commit/342297313ec1d76d2d367551e1e0bc484a66d158))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/core-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/core-http-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33

## [1.0.0-beta.32](https://github.com/authup/authup/compare/v1.0.0-beta.31...v1.0.0-beta.32) (2026-03-30)


### Bug Fixes

* enhance keywoards in package.json ([c45d1fc](https://github.com/authup/authup/commit/c45d1fcd8705192a4d8365ba70772e47f0f23497))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/core-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/core-http-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32

## [1.0.0-beta.31](https://github.com/authup/authup/compare/v1.0.0-beta.30...v1.0.0-beta.31) (2026-03-29)


### Features

* move applications/services to apps directory ([#2875](https://github.com/authup/authup/issues/2875)) ([b39354a](https://github.com/authup/authup/commit/b39354a8bd568e09493179413724e9e4bb018aa2))
* policy-based realm scoping and global entity support ([#2928](https://github.com/authup/authup/issues/2928)) ([1ae7d10](https://github.com/authup/authup/commit/1ae7d101bae1b43b32e7df2eb3c5a18e6328ac87))


### Bug Fixes

* **client-web:** remove head-variant property ([2c46f74](https://github.com/authup/authup/commit/2c46f748cb447823a518eb844457a857e7887f2d))
* **deps:** bump the minorandpatch group across 1 directory with 14 updates ([#2895](https://github.com/authup/authup/issues/2895)) ([7ecc0ad](https://github.com/authup/authup/commit/7ecc0ada93a81d9b57f7c89d4823c5ee06c7d7c0))
* **deps:** bump the minorandpatch group across 1 directory with 6 updates ([#2947](https://github.com/authup/authup/issues/2947)) ([918f642](https://github.com/authup/authup/commit/918f6424a1a78a666dd4d6f910564b97074b28b4))
* **deps:** bump the minorandpatch group across 1 directory with 7 updates ([#2918](https://github.com/authup/authup/issues/2918)) ([3115cdd](https://github.com/authup/authup/commit/3115cdd016569cca2164844e2b0c0235cf17c233))
* enable typecheck in client-web build and fix all type errors ([#2934](https://github.com/authup/authup/issues/2934)) ([6a6c42a](https://github.com/authup/authup/commit/6a6c42a402e23904daf0ca1482f061924482ea9f))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/core-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/core-http-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31

## [1.0.0-beta.30](https://github.com/authup/authup/compare/v1.0.0-beta.29...v1.0.0-beta.30) (2026-02-26)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#2862](https://github.com/authup/authup/issues/2862)) ([b21809a](https://github.com/authup/authup/commit/b21809a82e94646fd2e906fe0ef0c9ee087115bd))
* **deps:** bump the minorandpatch group across 1 directory with 23 updates ([#2856](https://github.com/authup/authup/issues/2856)) ([b037a7a](https://github.com/authup/authup/commit/b037a7ac40b69067fb87db1f5d10562f59bda273))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/core-kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/core-http-kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30

## [1.0.0-beta.29](https://github.com/authup/authup/compare/v1.0.0-beta.28...v1.0.0-beta.29) (2026-02-17)


### Features

* add built_in + global column to roles & permissions table ([7a456f6](https://github.com/authup/authup/commit/7a456f616ab6eb792fa256d9a8956adb36f58704))
* show built_in column in scopes view ([166de87](https://github.com/authup/authup/commit/166de87c4238b3dcef8612f5d950f3bf50dd25d0))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 13 updates ([#2833](https://github.com/authup/authup/issues/2833)) ([ab22d62](https://github.com/authup/authup/commit/ab22d62ff8f98bd04e8e960c37be25479a6c77b8))
* **deps:** bump the minorandpatch group across 1 directory with 19 updates ([#2815](https://github.com/authup/authup/issues/2815)) ([e301e20](https://github.com/authup/authup/commit/e301e205d283ee51196495faf6523763a5a632c5))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/core-kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/core-http-kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29

## [1.0.0-beta.28](https://github.com/authup/authup/compare/v1.0.0-beta.27...v1.0.0-beta.28) (2026-01-13)


### ⚠ BREAKING CHANGES

* require esm import capabilities
* email non null column

### Features

* generate and hash client secret if required ([#2800](https://github.com/authup/authup/issues/2800)) ([36debf9](https://github.com/authup/authup/commit/36debf9167a37a21086675f21c378d76b2582eed))
* make email address mandatory ([#2782](https://github.com/authup/authup/issues/2782)) ([c8e5e08](https://github.com/authup/authup/commit/c8e5e08b6abdb1af8bdc9771bd4a7ae822e71360))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 13 updates ([#2780](https://github.com/authup/authup/issues/2780)) ([41eba21](https://github.com/authup/authup/commit/41eba214494520ad418d4a3ac3ccee3cd96dc19e))
* **deps:** bump the minorandpatch group across 1 directory with 8 updates ([#2764](https://github.com/authup/authup/issues/2764)) ([04ee74b](https://github.com/authup/authup/commit/04ee74b8abdb275c3de3c97170a33c3ca8e1069f))
* **deps:** bump the minorandpatch group across 1 directory with 8 updates ([#2786](https://github.com/authup/authup/issues/2786)) ([784234d](https://github.com/authup/authup/commit/784234da3a83a576c4e6932069de843187f6d733))
* **deps:** bump the minorandpatch group with 34 updates ([#2756](https://github.com/authup/authup/issues/2756)) ([9240ce1](https://github.com/authup/authup/commit/9240ce18515ea9501a6790a53efe375a4c2b28ac))
* **deps:** bump the minorandpatch group with 5 updates ([#2770](https://github.com/authup/authup/issues/2770)) ([141c50d](https://github.com/authup/authup/commit/141c50d4a76e5d5aa27b336365ca02e9f12ddf7b))


### Miscellaneous Chores

* set min node engine version ([2d6e8a7](https://github.com/authup/authup/commit/2d6e8a794b731ccaa73f3da8c4e0e81fd1178a58))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/core-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/core-http-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28

## [1.0.0-beta.27](https://github.com/authup/authup/compare/v1.0.0-beta.26...v1.0.0-beta.27) (2025-07-17)


### Features

* export route meta key in nuxt module ([4715eea](https://github.com/authup/authup/commit/4715eead0a20b32ec4fa08c2a2d75a6320003cee))
* move authorize & login component to kit package ([#2663](https://github.com/authup/authup/issues/2663)) ([defcdda](https://github.com/authup/authup/commit/defcdda91e944f7a113d872b8528c32646204000))
* serve authorization component form via api ([#2666](https://github.com/authup/authup/issues/2666)) ([c88a13f](https://github.com/authup/authup/commit/c88a13f2f5f60b28a76526b0469b623c73b3ab78))


### Bug Fixes

* **deps:** bump dependencies ([c5e66dd](https://github.com/authup/authup/commit/c5e66ddd50ea4f4b596e47ff99e3a3d6c8133e22))
* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#2672](https://github.com/authup/authup/issues/2672)) ([242bedd](https://github.com/authup/authup/commit/242bedd9c611b84293ba75cc9427892c7ac962c6))
* **deps:** bump the minorandpatch group across 1 directory with 21 updates ([#2653](https://github.com/authup/authup/issues/2653)) ([eb5cdcd](https://github.com/authup/authup/commit/eb5cdcd775466506ec4d86166e6de55e9868f46b))
* **deps:** bump the minorandpatch group across 1 directory with 22 updates ([#2687](https://github.com/authup/authup/issues/2687)) ([f10970b](https://github.com/authup/authup/commit/f10970b89ae166cb33de9841bb221b40eb28081c))
* **deps:** bump the minorandpatch group across 1 directory with 6 updates ([#2692](https://github.com/authup/authup/issues/2692)) ([b0c963a](https://github.com/authup/authup/commit/b0c963a3135ebfccc908f0b1bec2900faccdc59a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/core-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/core-http-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27

## [1.0.0-beta.26](https://github.com/authup/authup/compare/v1.0.0-beta.25...v1.0.0-beta.26) (2025-04-14)


### Bug Fixes

* add e-mail to LICENSE file + set next version ([004ee6a](https://github.com/authup/authup/commit/004ee6a2a7fb93506535c8baeebff5981667036a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/core-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/core-http-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26

## [1.0.0-beta.25](https://github.com/authup/authup/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2025-04-08)


### ⚠ BREAKING CHANGES

* sqlite not longer supported for production

### Features

* client-{permission,role} relations ([#2570](https://github.com/authup/authup/issues/2570)) ([95e5e85](https://github.com/authup/authup/commit/95e5e855083b20fc17e7df9047a97948d66aac3d))
* correct client usage in security context ([#2579](https://github.com/authup/authup/issues/2579)) ([26f0118](https://github.com/authup/authup/commit/26f0118184c98bf04f499d19526b1cf0d034cad6))
* dedicated realm picker component ([#2573](https://github.com/authup/authup/issues/2573)) ([f98b7e7](https://github.com/authup/authup/commit/f98b7e71cd934e2fecbe1e8d46e2f12fe531b1e2))
* deprecate sqlite for production environment ([#2574](https://github.com/authup/authup/issues/2574)) ([75fc3aa](https://github.com/authup/authup/commit/75fc3aa4164d2ceda9bb8084dca9cf4f51252c5c))
* enhance policy components ([#2598](https://github.com/authup/authup/issues/2598)) ([39361d3](https://github.com/authup/authup/commit/39361d3f2927ec5912383163334b03d7bcbfed47))
* flatten admin pages to root path & remove id table column(s) ([#2576](https://github.com/authup/authup/issues/2576)) ([657b39c](https://github.com/authup/authup/commit/657b39cc4dd6b40a05572b4feb20a985917db13b))
* initial policy components ([#2562](https://github.com/authup/authup/issues/2562)) ([f73cd74](https://github.com/authup/authup/commit/f73cd7476970f563a07307ee12e1742de9eeaf32))
* make relational list entities searchable ([59007b2](https://github.com/authup/authup/commit/59007b239435e1f8a3b1d8efd1a3400dafede889))
* remove isRealmResource{Readable,Writable} helper ([ac06e71](https://github.com/authup/authup/commit/ac06e71f32c47fa250e381197dc6069ccc2cb9fa))


### Bug Fixes

* policy ancestor assignment ([#2568](https://github.com/authup/authup/issues/2568)) ([ca4cad7](https://github.com/authup/authup/commit/ca4cad73d3051ea4da53b56a7d7848a0e2e15f95))
* update year range in LICENSE file ([8dd6da9](https://github.com/authup/authup/commit/8dd6da98cbfd8f910397de7391402af1e7517cc9))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/core-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/core-http-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25

## [1.0.0-beta.24](https://github.com/authup/authup/compare/v1.0.0-beta.23...v1.0.0-beta.24) (2025-01-18)


### Features

* implemented oauth2 PKCE specification ([#2487](https://github.com/authup/authup/issues/2487)) ([d6f6e65](https://github.com/authup/authup/commit/d6f6e659ac0eb319183778ddeaa8dd03d2269bbd))
* merge packages rules & schema to security ([#2506](https://github.com/authup/authup/issues/2506)) ([2ea6407](https://github.com/authup/authup/commit/2ea6407390cad4900416994e1af78dca1b36a170))
* refactor & split security package ([#2551](https://github.com/authup/authup/issues/2551)) ([1b38eed](https://github.com/authup/authup/commit/1b38eed204658cdde11b92f93027b843f47f43bf))
* split kit package in errors, rules & schema package ([#2500](https://github.com/authup/authup/issues/2500)) ([ff5a6e7](https://github.com/authup/authup/commit/ff5a6e731f4ea71faaefd1cd6fe02fbc0dc398e6))


### Bug Fixes

* **deps:** bump @hapic/oauth2 to v3.x ([c83f480](https://github.com/authup/authup/commit/c83f480cee897402d11ae701012ac7f239a5e566))
* **deps:** bump the minorandpatch group across 1 directory with 18 updates ([#2494](https://github.com/authup/authup/issues/2494)) ([cc6562e](https://github.com/authup/authup/commit/cc6562eed230f76c984e1ee26942ce705dd03fdf))
* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#2524](https://github.com/authup/authup/issues/2524)) ([0c9dd69](https://github.com/authup/authup/commit/0c9dd697705b0156412cb9c3bad09a83caea5948))
* **deps:** bump the minorandpatch group with 12 updates ([#2554](https://github.com/authup/authup/issues/2554)) ([cbccab3](https://github.com/authup/authup/commit/cbccab35970ec9cc5d3a6e9950f932b773e07c07))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/core-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/core-http-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24

## [1.0.0-beta.23](https://github.com/authup/authup/compare/v1.0.0-beta.22...v1.0.0-beta.23) (2024-11-10)


### Features

* emit hooks in module middleware & refactored navigation building ([#2480](https://github.com/authup/authup/issues/2480)) ([ffa8d7e](https://github.com/authup/authup/commit/ffa8d7eb01a164525f0533def455b8c5f0032373))


### Bug Fixes

* renamed useStore to injectStore ([e57e13b](https://github.com/authup/authup/commit/e57e13bc7bd26f28b8873fc9d4507346cf7293fd))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/core-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23

## [1.0.0-beta.22](https://github.com/authup/authup/compare/v1.0.0-beta.21...v1.0.0-beta.22) (2024-10-23)


### Features

* enhance identity provider picker view ([6e44be9](https://github.com/authup/authup/commit/6e44be986dd59d124cf91d88e9b9fdfe5ed5c0ac))
* enhance sidenav & topnav ([0150250](https://github.com/authup/authup/commit/0150250f534ab6a6e9c471f0192e15db33aa76ad))
* refactored client store & introduce event-bus for store ([#2415](https://github.com/authup/authup/issues/2415)) ([e9a6eac](https://github.com/authup/authup/commit/e9a6eacf43a42c48493e32501e5b89b3c9888a40))
* renamed & optimized store-event-bus ([#2426](https://github.com/authup/authup/issues/2426)) ([8e9d2d2](https://github.com/authup/authup/commit/8e9d2d253326f880cc73d1cde3cb122fc8e64223))


### Bug Fixes

* bump vuecs packages & cleaned up layout config ([3e5cbdb](https://github.com/authup/authup/commit/3e5cbdbccfc723b72a9d69c21c181a6685d1c6e7))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/core-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22

## [1.0.0-beta.21](https://github.com/authup/authup/compare/v1.0.0-beta.20...v1.0.0-beta.21) (2024-10-13)


### Features

* cleaup and simplified nuxt package & enhanced cookie handling ([c744200](https://github.com/authup/authup/commit/c744200f7501d44d2515b4221a6c23076db23f9b))
* extended use-permisison-check api & created permission-check component ([50df06a](https://github.com/authup/authup/commit/50df06a0fd098eb62b543c67ae1c834bf7814f0d))
* initial nuxt package impplementation ([#2389](https://github.com/authup/authup/issues/2389)) ([3787402](https://github.com/authup/authup/commit/378740224cac1b21c47fb9ef7e016f45e581bef6))
* some optimizations for web kit store ([e81882c](https://github.com/authup/authup/commit/e81882c90b951028dc28fc0bf3a414b7c52441de))


### Bug Fixes

* execution of client response error token hook ([2b5d20a](https://github.com/authup/authup/commit/2b5d20a9fe40ff6b240977bacfd06597ecaf61c9))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/core-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/client-web-nuxt bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21

## [1.0.0-beta.20](https://github.com/authup/authup/compare/v1.0.0-beta.19...v1.0.0-beta.20) (2024-09-28)


### Features

* add built_in & display_name attribute to few entities ([#2193](https://github.com/authup/authup/issues/2193)) ([42d062f](https://github.com/authup/authup/commit/42d062f3e600aed43f69164b2f6297851d402070))
* enhance nav-tabs and table styling ([afd4f35](https://github.com/authup/authup/commit/afd4f35feb3b2e8b068186ee62b5163c878bcc3c))
* make permission/ability fns async ([#2116](https://github.com/authup/authup/issues/2116)) ([c0491c1](https://github.com/authup/authup/commit/c0491c1ea3fdec651c7ad83d60b929c42cca715a))
* moved built-in policy parser, attributes query fixer, ... ([0599b54](https://github.com/authup/authup/commit/0599b5423d203583845782c74cd1755ef06bd7c6))
* permission repository for permission manager ([#2129](https://github.com/authup/authup/issues/2129)) ([afe3700](https://github.com/authup/authup/commit/afe3700e9822e3983b8867cad927ea74b9747133))


### Bug Fixes

* enforce uniqueness for all database types ([48cd4a7](https://github.com/authup/authup/commit/48cd4a70b62993ee99864aa68babbc29eacfa0a1))
* route access in page components ([1648b1d](https://github.com/authup/authup/commit/1648b1d7cb44933f742d8ad450d1fadbd9e4bab9))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20
    * @authup/kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20
    * @authup/core-kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20

## [1.0.0-beta.19](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.19) (2024-06-30)


### Features

* reworked ability management and access ([#2102](https://github.com/authup/authup/issues/2102)) ([b3dc45c](https://github.com/authup/authup/commit/b3dc45c2a1d0cd403e8ab545bd87ce4e49738758))


### Bug Fixes

* **deps:** bump nuxt to v3.12.2 ([86e9be4](https://github.com/authup/authup/commit/86e9be4d77128680cca58cb25be94f49ba0b9a7a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/client-web-config bumped from ^1.0.0-beta.18 to ^1.0.1-beta.18

## [1.0.0-beta.18](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.18) (2024-06-24)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* implement interaction between timeago and ilingo library ([5b44aaf](https://github.com/authup/authup/commit/5b44aaf7bb3133d8ace60cb84a4affd4ff1c85bf))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* migrated to bootstrap-vue-next v0.17 ([7d32617](https://github.com/authup/authup/commit/7d32617db8d78665e952eb0601996b740e9dd195))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* simplified validation handling in login.vue component ([320e049](https://github.com/authup/authup/commit/320e0497572f5b30219e41cbd67523260b23b8fa))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))
* **deps:** bump zod from 3.23.7 to 3.23.8 ([#1962](https://github.com/authup/authup/issues/1962)) ([25f63cb](https://github.com/authup/authup/commit/25f63cb29e9bcd1f3e5a8eb0cfdd27f95f4912fc))
* encforcing entity unique constraints on create/update operation ([a9680df](https://github.com/authup/authup/commit/a9680df90c7f24bc463051068f8afba3493c36b7))
* package name of plugin packages ([2c8a5ca](https://github.com/authup/authup/commit/2c8a5cab37b9483af57f94151e9a43b9d4decb10))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use store access in page components ([8d75d0d](https://github.com/authup/authup/commit/8d75d0dca0614e099abf3ff6febd532b694c7643))
* using useCookie composable in kit plugin configuration ([e718bef](https://github.com/authup/authup/commit/e718befc373606a3981059c749e4b6d1fa7fb70b))

## [1.0.1-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.1-beta.17) (2024-06-23)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.17 to ^1.0.1-beta.17
    * @authup/core-kit bumped from ^1.0.0-beta.17 to ^1.0.0-beta.18

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.0-beta.17) (2024-06-23)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* implement interaction between timeago and ilingo library ([5b44aaf](https://github.com/authup/authup/commit/5b44aaf7bb3133d8ace60cb84a4affd4ff1c85bf))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* migrated to bootstrap-vue-next v0.17 ([7d32617](https://github.com/authup/authup/commit/7d32617db8d78665e952eb0601996b740e9dd195))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* simplified validation handling in login.vue component ([320e049](https://github.com/authup/authup/commit/320e0497572f5b30219e41cbd67523260b23b8fa))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))
* **deps:** bump zod from 3.23.7 to 3.23.8 ([#1962](https://github.com/authup/authup/issues/1962)) ([25f63cb](https://github.com/authup/authup/commit/25f63cb29e9bcd1f3e5a8eb0cfdd27f95f4912fc))
* encforcing entity unique constraints on create/update operation ([a9680df](https://github.com/authup/authup/commit/a9680df90c7f24bc463051068f8afba3493c36b7))
* package name of plugin packages ([2c8a5ca](https://github.com/authup/authup/commit/2c8a5cab37b9483af57f94151e9a43b9d4decb10))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use store access in page components ([8d75d0d](https://github.com/authup/authup/commit/8d75d0dca0614e099abf3ff6febd532b694c7643))
* using useCookie composable in kit plugin configuration ([e718bef](https://github.com/authup/authup/commit/e718befc373606a3981059c749e4b6d1fa7fb70b))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-config bumped from ^1.0.1-beta.13 to ^1.0.0-beta.17

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.16...v1.0.0-beta.17) (2024-06-23)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* implement interaction between timeago and ilingo library ([5b44aaf](https://github.com/authup/authup/commit/5b44aaf7bb3133d8ace60cb84a4affd4ff1c85bf))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* migrated to bootstrap-vue-next v0.17 ([7d32617](https://github.com/authup/authup/commit/7d32617db8d78665e952eb0601996b740e9dd195))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* simplified validation handling in login.vue component ([320e049](https://github.com/authup/authup/commit/320e0497572f5b30219e41cbd67523260b23b8fa))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))
* **deps:** bump zod from 3.23.7 to 3.23.8 ([#1962](https://github.com/authup/authup/issues/1962)) ([25f63cb](https://github.com/authup/authup/commit/25f63cb29e9bcd1f3e5a8eb0cfdd27f95f4912fc))
* encforcing entity unique constraints on create/update operation ([a9680df](https://github.com/authup/authup/commit/a9680df90c7f24bc463051068f8afba3493c36b7))
* package name of plugin packages ([2c8a5ca](https://github.com/authup/authup/commit/2c8a5cab37b9483af57f94151e9a43b9d4decb10))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use store access in page components ([8d75d0d](https://github.com/authup/authup/commit/8d75d0dca0614e099abf3ff6febd532b694c7643))
* using useCookie composable in kit plugin configuration ([e718bef](https://github.com/authup/authup/commit/e718befc373606a3981059c749e4b6d1fa7fb70b))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.16 to ^1.0.0-beta.17
    * @authup/kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/client-web-config bumped from ^1.0.0-beta.13 to ^1.0.1-beta.13

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
