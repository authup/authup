# Change Log

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.64...v1.0.0-beta.64) (2026-09-05)


### ⚠ BREAKING CHANGES

* resolveConfig and readConfigFromEnv of the three console services return a Promise; an embedder calling either directly needs an await.

### Bug Fixes

* work the beta.64 audit backlog ([#3555](https://github.com/authup/authup/issues/3555)) ([2332346](https://github.com/authup/authup/commit/23323463284dde07befd743479d20bf160c1e567))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/core-http-kit bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/i18n bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/kit bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64
    * @authup/specs bumped from ^1.0.0-beta.64 to ^1.0.1-beta.64

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### ⚠ BREAKING CHANGES

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

## [1.0.0-beta.63](https://github.com/authup/authup/compare/v1.0.0-beta.62...v1.0.0-beta.63) (2026-08-20)


### ⚠ BREAKING CHANGES

* **server-core:** align the token endpoint with RFC 7662/7009 ([#3488](https://github.com/authup/authup/issues/3488))
* **client-web-kit:** `store.user` and the `USER_UPDATED` dispatcher payload narrow from `User` to `Pick<User, 'id' | 'name' | 'displayName'>`; a consumer reading any other field gets a compile error. The `user` cookie is no longer written, and a same-named cookie on the origin is deleted once per browser. The never-populated `OAuth2TokenPayload.sub_name` is removed.
* AuthorizationRequest.target is removed. Set the destination as a `redirect` parameter on the redirect_uri instead. A client whose registered redirect pattern is the exact callback URL with no wildcard must widen it to match the query.

### Features

* **server-core:** complete a federated login through the hosted authorize ladder ([#3475](https://github.com/authup/authup/issues/3475)) ([31ad488](https://github.com/authup/authup/commit/31ad488ded840bf09ebd089e5619f32fbdb75589))
* **server-core:** verify the upstream provider's amr/acr per identity provider ([#3479](https://github.com/authup/authup/issues/3479)) ([3bfdcd5](https://github.com/authup/authup/commit/3bfdcd5deb674415832692c13014cbf608e99e76))


### Bug Fixes

* carry the post-login destination through the authorize flow ([#3476](https://github.com/authup/authup/issues/3476)) ([9d89a21](https://github.com/authup/authup/commit/9d89a21c180bd67612c1d640bdecab562dfb2f1e))
* **client-web-kit:** derive the session user from the token introspection ([#3481](https://github.com/authup/authup/issues/3481)) ([2a7bbb9](https://github.com/authup/authup/commit/2a7bbb97aac40a05a3e45afc009ea73f56f42735))
* **server-core:** align the token endpoint with RFC 7662/7009 ([#3488](https://github.com/authup/authup/issues/3488)) ([50cb0f4](https://github.com/authup/authup/commit/50cb0f46749a59bec2abeca23edda64ae8378f89))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/core-http-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/core-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/i18n bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/specs bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63

## [1.0.0-beta.62](https://github.com/authup/authup/compare/v1.0.0-beta.61...v1.0.0-beta.62) (2026-08-18)


### Bug Fixes

* **deps:** bump @rapiq/* to ^2.2.0 ([46c660b](https://github.com/authup/authup/commit/46c660b05fa2ad34d7ea233ebbbdd6baa40122c9))
* **deps:** bump the minorandpatch group across 1 directory with 16 updates ([#3461](https://github.com/authup/authup/issues/3461)) ([bb1a33a](https://github.com/authup/authup/commit/bb1a33aa639016f2e0aee54121182cac88b471be))
* **deps:** bump the minorandpatch group across 1 directory with 9 updates ([#3470](https://github.com/authup/authup/issues/3470)) ([b1f9376](https://github.com/authup/authup/commit/b1f9376157ca2f0cb513f03f9c34b1bbe45ab2f2))
* **server-core:** declare a sort allow-list for the client-scope schema ([#3447](https://github.com/authup/authup/issues/3447)) ([8cf2cfe](https://github.com/authup/authup/commit/8cf2cfe9de74861471f73f0d6fe39c3aed9708fe))
* **server-core:** harden the federated login callback ([#3464](https://github.com/authup/authup/issues/3464)) ([d70de50](https://github.com/authup/authup/commit/d70de50e3121970e7647392c82ab24d44d42a32d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/core-http-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/core-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/i18n bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/specs bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62

## [1.0.0-beta.61](https://github.com/authup/authup/compare/v1.0.0-beta.60...v1.0.0-beta.61) (2026-08-14)


### Bug Fixes

* ensure consistent version for release ([0369d9f](https://github.com/authup/authup/commit/0369d9f2d8fbb0ee7bf1d742af5b31e7a16f55e6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/core-http-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/core-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/i18n bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/specs bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61

## [1.0.0-beta.60](https://github.com/authup/authup/compare/v1.0.0-beta.59...v1.0.0-beta.60) (2026-08-13)


### Features

* admin sessions overview ([#3420](https://github.com/authup/authup/issues/3420)) ([57e8af1](https://github.com/authup/authup/commit/57e8af1202d93d7ee0457bf52d67c5183c5b849c))
* identity-provider account linking ([#3419](https://github.com/authup/authup/issues/3419)) ([f21d0e3](https://github.com/authup/authup/commit/f21d0e3ae96404ed2aca4215fe97c579f10ad18a))
* schema index declarations backed by entity indexes (rapiq 2.0.0-beta.20) ([#3425](https://github.com/authup/authup/issues/3425)) ([d34afb7](https://github.com/authup/authup/commit/d34afb76143f08119e9c449201f975d8ba797788))
* title-row action, breadcrumbs and record sub titles for the admin console ([#3430](https://github.com/authup/authup/issues/3430)) ([a4c590d](https://github.com/authup/authup/commit/a4c590d9035d28be0b8857ce78b6113deb24e7f7))


### Bug Fixes

* **deps:** bump @rapiq/* to 2.0.0-beta.18 ([a01fabb](https://github.com/authup/authup/commit/a01fabbb6c7bf6671f3ccb757cd0c4c695510679))
* **deps:** bump @rapiq/* to 2.0.0-beta.19 ([21c92fb](https://github.com/authup/authup/commit/21c92fb67aead43a68c0152ef8d15507c2bf9130))
* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#3414](https://github.com/authup/authup/issues/3414)) ([f0706f2](https://github.com/authup/authup/commit/f0706f211884be8154766bd24ea45f3f696211ed))
* redo the v1.0.0-beta.60 release with consistent versions ([#3444](https://github.com/authup/authup/issues/3444)) ([5c04dc8](https://github.com/authup/authup/commit/5c04dc8daf28a01037949d8cb17e1de67ba10e6b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/core-http-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/core-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/i18n bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/specs bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60

## [1.0.0-beta.59](https://github.com/authup/authup/compare/v1.0.0-beta.58...v1.0.0-beta.59) (2026-08-04)


### ⚠ BREAKING CHANGES

* `**` is no longer accepted inside the host of a redirect pattern or a TRUSTED_ORIGINS entry. It matches the rest of the value outright, so `https://**.example.com/**` read as "any subdomain" but accepted every origin. A single `*` is unchanged. Stored patterns are not rewritten; new writes are rejected and an offending TRUSTED_ORIGINS value fails the boot with a message naming it.
* the five settings pages are gone and their URLs now leave the application, redirecting to <apiUrl>/account instead.
* @authup/server-core no longer embeds the auth UI under dist/ui; it resolves the @authup/client-auth-console package instead. The account console runtime-config global window.__AUTHUP_ACCOUNT__ (never released) is renamed to window.__AUTHUP__.
* rename client-web app to client-admin-console ([#3370](https://github.com/authup/authup/issues/3370))

### Features

* add the account console (/account self-service surface) ([#3373](https://github.com/authup/authup/issues/3373)) ([2e11e5f](https://github.com/authup/authup/commit/2e11e5f9895a84d0eca4cfd4ae1803dcfa90db5e))


### Bug Fixes

* **deps:** bump @rapiq/* to 2.0.0-beta.15 ([66958e7](https://github.com/authup/authup/commit/66958e7f11a3462dce3cea6b74f0435c780524e7))
* redirect-pattern matching, plus fixes from the beta.58 release audit ([#3397](https://github.com/authup/authup/issues/3397)) ([e00c6ba](https://github.com/authup/authup/commit/e00c6ba635d206a16b5ad19467bd5540d021c37e))
* repair the account console session and the userinfo email claim ([#3384](https://github.com/authup/authup/issues/3384)) ([d8ff846](https://github.com/authup/authup/commit/d8ff846599259c5ac943d842f3fcb5811d7a08c8))


### Performance Improvements

* carry only the translations ilingo cannot resolve synchronously ([#3367](https://github.com/authup/authup/issues/3367)) ([f66175b](https://github.com/authup/authup/commit/f66175b4747be12272deb08ed5b71b0dc9aa6ffa))


### Code Refactoring

* consolidate self-service into the account console ([#3392](https://github.com/authup/authup/issues/3392)) ([f380f5f](https://github.com/authup/authup/commit/f380f5f90ee55c4a661e9e32cadc02c5f66ac2ef))
* extract the SSR auth UI into apps/client-auth-console ([#3375](https://github.com/authup/authup/issues/3375)) ([b131e2a](https://github.com/authup/authup/commit/b131e2ae81dfaf1aa46d44eaa0b32329d5227fbe))
* rename client-web app to client-admin-console ([#3370](https://github.com/authup/authup/issues/3370)) ([77d48a4](https://github.com/authup/authup/commit/77d48a45b39df21eae0e04c41c2ec3df001a7f64))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/core-http-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/core-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/i18n bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/specs bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59

## [1.0.0-beta.58](https://github.com/authup/authup/compare/v1.0.0-beta.57...v1.0.0-beta.58) (2026-07-31)


### Features

* hand server-rendered data to the client instead of fetching it twice ([#3358](https://github.com/authup/authup/issues/3358)) ([0748d85](https://github.com/authup/authup/commit/0748d85a0475b1dbddbad80c10b9ce5f4a099ab2))


### Bug Fixes

* a user (or client) never moves between realms ([#3362](https://github.com/authup/authup/issues/3362)) ([d45cc67](https://github.com/authup/authup/commit/d45cc677a79330b43bb6b319b70d438fbba24576))
* **deps:** bump ilingo, validup and trapi to their latest versions ([6d69f90](https://github.com/authup/authup/commit/6d69f90665f23022de5bf3ef8c6916a50c449494))
* **deps:** bump the minorandpatch group with 4 updates ([#3359](https://github.com/authup/authup/issues/3359)) ([e1dbd50](https://github.com/authup/authup/commit/e1dbd509e2c0dd4931b8f1bb73c0e69a296bdadf))
* enforce the permission guard on entity index detail links ([#3363](https://github.com/authup/authup/issues/3363)) ([28c9c18](https://github.com/authup/authup/commit/28c9c18aee3a7c56561746f05febef8fa59ddecc))


### Performance Improvements

* **ui:** bundle only the icons the apps render ([#3365](https://github.com/authup/authup/issues/3365)) ([7b1e041](https://github.com/authup/authup/commit/7b1e041ef006e3ac240fa8b5d49f0841f97e49f4)), closes [#3345](https://github.com/authup/authup/issues/3345)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/core-http-kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/core-kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/i18n bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/specs bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58

## [1.0.0-beta.57](https://github.com/authup/authup/compare/v1.0.0-beta.56...v1.0.0-beta.57) (2026-07-29)


### ⚠ BREAKING CHANGES

* API consumers reading bare record bodies must unwrap data; old clients against a new server break (lockstep beta release).

### Features

* add a grant-types form control to the client form ([#3348](https://github.com/authup/authup/issues/3348)) ([0f4b675](https://github.com/authup/authup/commit/0f4b67513cf1bee06fc769668f636831f9de9c93))
* add a post-logout redirect-uri list to the client form ([#3350](https://github.com/authup/authup/issues/3350)) ([bdf23d1](https://github.com/authup/authup/commit/bdf23d12322171322e554fdafd0bdb190ad72e4f))
* query-capability discovery via meta.schema + entity record response envelope ([#3332](https://github.com/authup/authup/issues/3332)) ([00f2f4c](https://github.com/authup/authup/commit/00f2f4c3aec069fef4b8eecc2da4d39ba19f0483))
* restore file config, harden the launcher and dedupe the UI bootstrap ([#3344](https://github.com/authup/authup/issues/3344)) ([13b611d](https://github.com/authup/authup/commit/13b611da9ee980d97887a2a542b84beae5f730ff))


### Bug Fixes

* complete schema field projections and re-target role client FK ([#3324](https://github.com/authup/authup/issues/3324)) ([9eec343](https://github.com/authup/authup/commit/9eec343965bf98990560b0092d26bd0c82a2561f))
* **deps:** bump @rapiq/* to 2.0.0-beta.11 ([#3333](https://github.com/authup/authup/issues/3333)) ([728dbb1](https://github.com/authup/authup/commit/728dbb1f16deb14c5901f0406a34ae50c791dbd6))
* **deps:** bump the minorandpatch group across 1 directory with 6 updates ([#3334](https://github.com/authup/authup/issues/3334)) ([4545dee](https://github.com/authup/authup/commit/4545deed8011b32a914dad979d5ce2e13d702650))
* **deps:** replace @rapiq/{typeorm,sql,memory} with @rapiq/adapter-* ([9219e75](https://github.com/authup/authup/commit/9219e75c10bf1ba9164804f8676b049b44dc549c)), closes [#3341](https://github.com/authup/authup/issues/3341)
* space the redirect-uri list off the grant-types selection ([1c23b7b](https://github.com/authup/authup/commit/1c23b7b2f0e9d3d6492f624a44edd25022aa01a1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/core-http-kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/core-kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/i18n bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/specs bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57

## [1.0.0-beta.56](https://github.com/authup/authup/compare/v1.0.0-beta.55...v1.0.0-beta.56) (2026-07-24)


### Bug Fixes

* **deps:** bump @rapiq/* to 2.0.0-beta.9 ([6475f2b](https://github.com/authup/authup/commit/6475f2b0ec1ad69b4412540a3385d03eca5c3746))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/core-http-kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/core-kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/i18n bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/specs bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56

## [1.0.0-beta.55](https://github.com/authup/authup/compare/v1.0.0-beta.54...v1.0.0-beta.55) (2026-07-24)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 24 updates ([#3317](https://github.com/authup/authup/issues/3317)) ([e7a2b6b](https://github.com/authup/authup/commit/e7a2b6be6d1be3043a8e5b8578e80b1cef08d52e))
* repair build pipeline and bump rapiq to 2.0.0-beta.8 ([7a8f8f7](https://github.com/authup/authup/commit/7a8f8f7d4a3e84a9782823622e010242c34c0982))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/core-http-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/core-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/i18n bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/specs bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55

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

* **client-web-kit:** build ASearch name filter via contains() helper ([#3300](https://github.com/authup/authup/issues/3300)) ([cff8af0](https://github.com/authup/authup/commit/cff8af08ce6cac1992fa2bd584eb8aff6e48292c))
* **deps:** bump [@rapiq](https://github.com/rapiq) packages to v2.0.0-beta.2 ([#3281](https://github.com/authup/authup/issues/3281)) ([cc48cbb](https://github.com/authup/authup/commit/cc48cbb162b74fb36bb3265bea6b7a985f9d6918))
* **server-core:** authorize relation paths reached via filter/sort/field keys ([#3310](https://github.com/authup/authup/issues/3310)) ([b98e6c1](https://github.com/authup/authup/commit/b98e6c1ca8542b6961cb89e65873ccb9abd92e5f))


### Code Refactoring

* camelCase entity properties, domain types & management API ([#3273](https://github.com/authup/authup/issues/3273)) ([c31b20e](https://github.com/authup/authup/commit/c31b20ee9fd037e96bbcaee2eae1d6386174f52b))
* **client-web-kit:** compose queries in the rapiq IR instead of forwarding build input ([#3280](https://github.com/authup/authup/issues/3280)) ([3b83e60](https://github.com/authup/authup/commit/3b83e608d1e4a6f3a9dcce034beb161884b4aa31)), closes [#3278](https://github.com/authup/authup/issues/3278)
* migrate to rapiq v2, typeorm 1.1.0 and typeorm-extension v4 ([#3276](https://github.com/authup/authup/issues/3276)) ([ee8c9f7](https://github.com/authup/authup/commit/ee8c9f708a195cc5dd385965d16189b6640e38dc))
* remove robot entity in favor of clients ([#3275](https://github.com/authup/authup/issues/3275)) ([800684d](https://github.com/authup/authup/commit/800684dc9a620652b210baf16c50fb34e54bb224))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/core-http-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/core-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/i18n bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/specs bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54

## [1.0.0-beta.53](https://github.com/authup/authup/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2026-07-17)


### ⚠ BREAKING CHANGES

* **server-core:** wrap authenticator enroll response in data/meta envelope ([#3272](https://github.com/authup/authup/issues/3272))
* replace Client.is_confidential with auth_method and token_binding_method.

### Features

* add OAuth mutual TLS authentication ([#3261](https://github.com/authup/authup/issues/3261)) ([d3d88c6](https://github.com/authup/authup/commit/d3d88c6942059bf1a460d41f0a19c31932893b1c))
* add realm trust anchor management ([#3260](https://github.com/authup/authup/issues/3260)) ([3a822d8](https://github.com/authup/authup/commit/3a822d836a852dc8af3547ea288f10a45c2a583d))
* authorize access policy + persisted per-scope consent ([#3246](https://github.com/authup/authup/issues/3246)) ([b4b96c7](https://github.com/authup/authup/commit/b4b96c74e0bec4d332c39f5477744aa8cca1d44f))
* **client-web-kit:** mfa challenge step, enrollment ui, settings + admin tabs ([#3234](https://github.com/authup/authup/issues/3234)) ([aca3fd7](https://github.com/authup/authup/commit/aca3fd7d307b67bdb9bf996a8fb3022c37aa5cad))
* **client-web-kit:** mfa enrollment picker tiles + modal add flow, split settings security tab ([66eb500](https://github.com/authup/authup/commit/66eb5006d153bdf64be253355d61f23e177dc297))
* email otp as a second-factor kind ([#3235](https://github.com/authup/authup/issues/3235)) ([23fe82f](https://github.com/authup/authup/commit/23fe82f1b579d2722e092f94a309603f46a8bfda))
* key management api + lifecycle states ([#3256](https://github.com/authup/authup/issues/3256)) ([c69e9a2](https://github.com/authup/authup/commit/c69e9a2fc070a2c6bea71ec9e89bee2341e0cd88))
* nudge recovery-code enrollment after email/webauthn factors ([#3247](https://github.com/authup/authup/issues/3247)) ([1642ca0](https://github.com/authup/authup/commit/1642ca076e202cc50953e3b90b12285f041de088))
* publish imported key certificates in JWKS ([#3257](https://github.com/authup/authup/issues/3257)) ([e59a075](https://github.com/authup/authup/commit/e59a0753bc2d7264ed4ad9dfa2a797d787d5a359))
* security event log with entity tracking, login throttle, metrics & admin ui ([#3229](https://github.com/authup/authup/issues/3229)) ([5a30950](https://github.com/authup/authup/commit/5a30950a4c819206a1cbafd221a0c3be692f53e6))
* webauthn / passkeys as a second factor ([#3236](https://github.com/authup/authup/issues/3236)) ([0e30e59](https://github.com/authup/authup/commit/0e30e59739fdad2b2f70c4d302c50e841741dabb))


### Bug Fixes

* **client-web-kit:** render client secret and certificate fields per auth method ([0186dba](https://github.com/authup/authup/commit/0186dbad4a0038d27a4f07b21641c3bab0441263))
* complete fresh email/webauthn-only mfa logins via a pending ticket ([#3244](https://github.com/authup/authup/issues/3244)) ([fe28588](https://github.com/authup/authup/commit/fe2858810e47af248b677db47816daa7a50294ff))
* **deps:** bump @vuecs/forms to v5.3.3 and @vuecs/theme-tailwind to v6.3.1 ([d3bb7fd](https://github.com/authup/authup/commit/d3bb7fdf565c16999c017c6fda75a58ef0d74538))
* make MFA login work + stop admins planting a user's second factor ([#3241](https://github.com/authup/authup/issues/3241)) ([3756869](https://github.com/authup/authup/commit/3756869289f2bb2e32bfd5d28a1abb00e83c8a0b))


### Code Refactoring

* **server-core:** wrap authenticator enroll response in data/meta envelope ([#3272](https://github.com/authup/authup/issues/3272)) ([85b855c](https://github.com/authup/authup/commit/85b855ceaccd39ef132c3033c4484ce15bc4a68b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/core-http-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/core-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/i18n bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/specs bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53

## [1.0.0-beta.52](https://github.com/authup/authup/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-07-11)


### ⚠ BREAKING CHANGES

* master-realm admins can no longer authorize into another realm's app via the built-in web client (login_required at /authorize, invalid_grant at /token). Previously-issued cross-realm artifacts were malformed, so intentional reliance is implausible; use realm-local accounts.
* all in-flight refresh tokens are invalidated on upgrade (the new table is empty), so active users sign in again once. The default access-token lifetime drops from 3600s to 900s.
* a name-identified client on the authorization_code or refresh_token grant without a realm hint now always resolves in the master realm; pass realm_id/realm_name or the client UUID for clients in other realms.

### Features

* accept oidc prompt params and add auth_time/sid id_token claims ([#3195](https://github.com/authup/authup/issues/3195)) ([10da494](https://github.com/authup/authup/commit/10da494077471ee5b0e54aab24f3ab03610159ae))
* add rp-initiated logout (end_session_endpoint) ([#3196](https://github.com/authup/authup/issues/3196)) ([865520c](https://github.com/authup/authup/commit/865520c245504d731b4f65e5d5688d6a447c72ad))
* admin bulk session revocation and current-session marking ([#3193](https://github.com/authup/authup/issues/3193)) ([2fb862b](https://github.com/authup/authup/commit/2fb862bd00b63ce4f6785100900c3f7d0729f7f4))
* **client-web-kit:** add store auth status and lastAuthOrigin state ([#3215](https://github.com/authup/authup/issues/3215)) ([049d865](https://github.com/authup/authup/commit/049d865cf9ea364c9da48038af9f0cba0ab02fc7))
* **client-web-kit:** commit store sessions atomically ([#3218](https://github.com/authup/authup/issues/3218)) ([0b7f4f9](https://github.com/authup/authup/commit/0b7f4f9492496d27d78755e2e7fa3d8402c6fa7e))
* **client-web-kit:** make entity form re-hydration reactive and edit-preserving ([#3223](https://github.com/authup/authup/issues/3223)) ([9c534a8](https://github.com/authup/authup/commit/9c534a86a5185e8ea79073cc2653d5ff67cc1a84))
* configurable scope for oauth2/oidc identity providers ([#3226](https://github.com/authup/authup/issues/3226)) ([9449339](https://github.com/authup/authup/commit/94493396bc95070c300fe5da4e09bdd27073c31f))
* realm-bind the authorize and token flow ([#3194](https://github.com/authup/authup/issues/3194)) ([b7fc25c](https://github.com/authup/authup/commit/b7fc25c162f20db2b7d28448719c08b5a5e27211))
* retain the id_token in the kit store & round-trip client-web logout ([#3201](https://github.com/authup/authup/issues/3201)) ([500d4df](https://github.com/authup/authup/commit/500d4df6ab52907ad80f69f1ea3e74b62d6d2120))
* session-management UI ([#3189](https://github.com/authup/authup/issues/3189)) ([7b617c8](https://github.com/authup/authup/commit/7b617c84213990d13fcf3d7961353274bfed02ff))
* silent prompt=none and prompt=login re-auth in the hosted authorize UI ([#3203](https://github.com/authup/authup/issues/3203)) ([e757c7c](https://github.com/authup/authup/commit/e757c7cbd078500f2bbe104ce7085db759f8669b))


### Bug Fixes

* add accessible names to icon-only action buttons on entity index pages ([#3182](https://github.com/authup/authup/issues/3182)) ([86e7eba](https://github.com/authup/authup/commit/86e7eba1ef9141d5b9160f8e14498687adafd520)), closes [#3153](https://github.com/authup/authup/issues/3153)
* **client-web-kit:** observe the promise-share wrapper's derived promise ([#3214](https://github.com/authup/authup/issues/3214)) ([4b6d65d](https://github.com/authup/authup/commit/4b6d65dc687dd4ba591f5cf7fb6a048c26d91280))
* **client-web-kit:** restrict assignFormProperties to declared form keys ([#3222](https://github.com/authup/authup/issues/3222)) ([df3bbf6](https://github.com/authup/authup/commit/df3bbf6abfaa4720225accb2770843c1baca6ce8))
* **client-web-kit:** treat a surviving refresh token as session presence ([#3221](https://github.com/authup/authup/issues/3221)) ([09805c2](https://github.com/authup/authup/commit/09805c23fd0e58b8fedd48df7cba9f600a1ca66a))
* **client-web-kit:** unwrap realmIsRoot ref guards and keep permission-check realm id ([#3217](https://github.com/authup/authup/issues/3217)) ([d43fea8](https://github.com/authup/authup/commit/d43fea82605b3b3356dc3647bc46eb1b0483684f))
* **deps:** bump the minorandpatch group across 1 directory with 7 updates ([#3190](https://github.com/authup/authup/issues/3190)) ([03ceff0](https://github.com/authup/authup/commit/03ceff02b1526268a0fc0b36f64a932da03f06eb))
* dispatch SSR self-calls against the listen address ([#3188](https://github.com/authup/authup/issues/3188)) ([e57ebc5](https://github.com/authup/authup/commit/e57ebc5e42896dc590e30b9d6ca1d6a49a3379cc))
* fall back to re-auth on a dead bearer in the authorize consent POST ([#3204](https://github.com/authup/authup/issues/3204)) ([70907d2](https://github.com/authup/authup/commit/70907d2ef00cdefead0b0657a655481faf3beec6))
* post-review hardening for OAuth2 authorize + RP-initiated logout ([#3216](https://github.com/authup/authup/issues/3216)) ([423849d](https://github.com/authup/authup/commit/423849d186bb5577b129c3138fb3ef72365a3578))
* post-review hardening for the store stack ([#3225](https://github.com/authup/authup/issues/3225)) ([6a0c5d1](https://github.com/authup/authup/commit/6a0c5d1135b2b30d061b5a006bfd2847d354fc1b))
* realm-scoping and provisioning-validation follow-ups ([#3177](https://github.com/authup/authup/issues/3177)) ([643f847](https://github.com/authup/authup/commit/643f8472c830d5597e2a24e673937d7cd6a15ced))
* refresh public-client-bound tokens without client auth ([#3212](https://github.com/authup/authup/issues/3212)) ([1d821fa](https://github.com/authup/authup/commit/1d821fab624ad00381c8602fdd3e0bcee255b82d))
* rp-initiated logout & authorize hardening (plan 041 audit follow-ups) ([#3197](https://github.com/authup/authup/issues/3197)) ([781c097](https://github.com/authup/authup/commit/781c097ef3a6fb911bc666eb76b580552afafa5e))
* scope the id_token_hint exp-bypass so an expired token cannot poison the claims cache ([#3210](https://github.com/authup/authup/issues/3210)) ([a5b9bc9](https://github.com/authup/authup/commit/a5b9bc922d7a260e55151e5ff873f9058a029dab))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/core-http-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/core-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/i18n bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/specs bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52

## [1.0.0-beta.51](https://github.com/authup/authup/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-07-02)


### ⚠ BREAKING CHANGES

* **access,server-core:** PermissionEvaluationContext.input is renamed to data. Callers of permissionEvaluator.evaluate/preEvaluate/*OneOf must pass { data } instead of { input }.
* **access,server-core:** actor-relative realm_scope with uniform entity + junction gating ([#3151](https://github.com/authup/authup/issues/3151))

### Features

* **client-web-kit:** confirm entity deletion via AlertDialog + upgrade @vuecs/* to latest ([#3173](https://github.com/authup/authup/issues/3173)) ([f48cdbf](https://github.com/authup/authup/commit/f48cdbf26ba34c4615d973c059a8a739f81cc069))
* **client-web-kit:** realm_scope UI follow-up — labels + assignment-time scope (plan 034) ([#3168](https://github.com/authup/authup/issues/3168)) ([aab1fb0](https://github.com/authup/authup/commit/aab1fb0a3e7e88f2edb9dc0ce23748b0cf8aae7a))


### Bug Fixes

* **access,server-core:** actor-relative realm_scope with uniform entity + junction gating ([#3151](https://github.com/authup/authup/issues/3151)) ([0617e44](https://github.com/authup/authup/commit/0617e4430585bb33ab1937b917d7b630f43c8b70))
* **deps:** normalize peer/dependency/dev classification across packages ([#3172](https://github.com/authup/authup/issues/3172)) ([c09f383](https://github.com/authup/authup/commit/c09f38315e5c569990b6540baf87cef0f3d8b663))
* repair identity provider creation flow ([#3176](https://github.com/authup/authup/issues/3176)) ([877b81f](https://github.com/authup/authup/commit/877b81fc3df6050f740dbcb30e855a81c8e1a58c))
* scope OAuth2 password grant user resolution to a realm (default master) ([#3175](https://github.com/authup/authup/issues/3175)) ([23d1362](https://github.com/authup/authup/commit/23d136221d18d1b8b2605092bb57bc0078c5f271))


### Code Refactoring

* **access,server-core:** resource realm via the realmMatch policy key + typed PolicyData construction ([#3157](https://github.com/authup/authup/issues/3157)) ([07a0c92](https://github.com/authup/authup/commit/07a0c923cd8c9c07a6342b311bbd995d5fc6bbeb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/core-http-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/core-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/i18n bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/specs bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51

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
    * @authup/access bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-http-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/errors bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/i18n bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/specs bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-http-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/errors bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/i18n bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/specs bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50

## [1.0.0-beta.49](https://github.com/authup/authup/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2026-06-13)


### Features

* complete i18n UI coverage sweep (plan 021) ([#3121](https://github.com/authup/authup/issues/3121)) ([2a50bbe](https://github.com/authup/authup/commit/2a50bbe15feaa03320bb986b555f65036682dc05))


### Bug Fixes

* show toast on authorize login failure ([754811e](https://github.com/authup/authup/commit/754811efa3afc300cb4a2a804d68e2b145e1b156))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-http-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/errors bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/i18n bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/specs bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-http-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/errors bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/i18n bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/specs bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49

## [1.0.0-beta.48](https://github.com/authup/authup/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([4f983df](https://github.com/authup/authup/commit/4f983dff265156d412fad8b1f3e88d2f632c3e6d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-http-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/errors bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/i18n bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/specs bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-http-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/errors bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/i18n bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/specs bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48

## [1.0.0-beta.47](https://github.com/authup/authup/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2026-06-12)


### ⚠ BREAKING CHANGES

* @authup/core-http-kit no longer re-exports @hapic/oauth2 types; EntityAPI/EntityAPISlim are renamed to IEntityAPI/IEntityAPISlim; BaseAPI.setClient removed; OAuth2 parameter types are now authup-owned (OAuth2Token*GrantParameters, OAuth2TokenRequestOptions, OAuth2AuthorizeParameters).
* @authup/client-web-kit no longer exports ./dist/style.css. Its component styles are now delivered through @authup/client-web-kit-theme (via the @authup/client-web-theme @import chain). Consumers importing '@authup/client-web-kit/dist/style.css' must remove that import.

### Features

* injectable HTTP client, contract-first IClient & authup-owned oauth2 layer ([#3114](https://github.com/authup/authup/issues/3114)) ([ab06f38](https://github.com/authup/authup/commit/ab06f389e69c2d2938cfc12ae961136e731d046d))
* per-realm web client login, realm chooser & backend-served auth workflow UI ([#3104](https://github.com/authup/authup/issues/3104)) ([80a1cce](https://github.com/authup/authup/commit/80a1cce4f137c4e94e70fd0c27404e6b5637a200))


### Code Refactoring

* move client-web-kit component styles into client-web-kit-theme ([#3103](https://github.com/authup/authup/issues/3103)) ([f186a59](https://github.com/authup/authup/commit/f186a592a88d6a9dd460109be62818095593d8eb))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-http-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/errors bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/i18n bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/specs bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-http-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/errors bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/i18n bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/specs bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47

## [1.0.0-beta.46](https://github.com/authup/authup/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2026-06-09)


### ⚠ BREAKING CHANGES

* `@authup/client-web-kit` no longer re-exports `@authup/i18n`, `@authup/access` no longer re-exports `DecisionStrategy`, and `@authup/client-web-theme` no longer re-exports `clientWebKitTheme` / `merge`. Import these from their source packages directly.

### Bug Fixes

* stop re-exporting external packages through internal barrels (fixes @authup/i18n runtime crash) ([#3101](https://github.com/authup/authup/issues/3101)) ([5dd751a](https://github.com/authup/authup/commit/5dd751ad980ac730d0805f7fd7057450ea079418))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-http-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/errors bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/i18n bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/specs bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-http-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/errors bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/i18n bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/specs bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46

## [1.0.0-beta.45](https://github.com/authup/authup/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2026-06-09)


### Features

* **client-web:** brand theme overhaul — logo, surface tokens, dark-mode fixes ([#3096](https://github.com/authup/authup/issues/3096)) ([fed755b](https://github.com/authup/authup/commit/fed755b46bc3c0dc8b6cc0e73e4ccc798b2f8ca3))
* **i18n:** apply translations across client-web & client-web-kit UI ([#3095](https://github.com/authup/authup/issues/3095)) ([33dbe72](https://github.com/authup/authup/commit/33dbe72cf71ebd674d297dc378b5509b441b7de1))
* **kit:** add generateName helper and regenerate buttons for entity name forms ([#3092](https://github.com/authup/authup/issues/3092)) ([833a4a1](https://github.com/authup/authup/commit/833a4a12f0859da9e4be51d63433d8161f65935e))


### Bug Fixes

* **client-web-kit:** prevent SSR hydration mismatch on generated name/secret defaults ([#3099](https://github.com/authup/authup/issues/3099)) ([5c0fbb3](https://github.com/authup/authup/commit/5c0fbb36f1868f34f94a5734291c1f7d1036c198))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-http-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/errors bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/i18n bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/specs bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-http-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/errors bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/i18n bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/specs bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45

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
    * @authup/access bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-http-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/errors bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/specs bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-http-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/errors bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/specs bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44

## [1.0.0-beta.42](https://github.com/authup/authup/compare/v1.0.0-beta.41...v1.0.0-beta.42) (2026-05-15)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 21 updates ([#3053](https://github.com/authup/authup/issues/3053)) ([d0723c6](https://github.com/authup/authup/commit/d0723c6ddcff1bf8a6c197bcd2e66a00f1232cfd))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-http-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/errors bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/specs bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-http-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/errors bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/specs bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42

## [1.0.0-beta.41](https://github.com/authup/authup/compare/v1.0.0-beta.40...v1.0.0-beta.41) (2026-05-08)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 15 updates ([#3028](https://github.com/authup/authup/issues/3028)) ([45a5732](https://github.com/authup/authup/commit/45a57324183ef849ab5fddea60dc11d3723b926c))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/core-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/core-http-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/errors bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/specs bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/core-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/core-http-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/errors bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/specs bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41

## [1.0.0-beta.40](https://github.com/authup/authup/compare/v1.0.0-beta.39...v1.0.0-beta.40) (2026-04-30)


### Bug Fixes

* ensure consistent version for release ([c8da21d](https://github.com/authup/authup/commit/c8da21d2db725ab437dc3f5a976f8ea453014cbc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/core-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/core-http-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/errors bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/specs bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/core-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/core-http-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/errors bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/specs bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40

## [1.0.0-beta.39](https://github.com/authup/authup/compare/v1.0.0-beta.38...v1.0.0-beta.39) (2026-04-29)


### Features

* restrict entity names to lowercase characters ([#3024](https://github.com/authup/authup/issues/3024)) ([6b6be70](https://github.com/authup/authup/commit/6b6be70e8a499c5b6ed958d0fa432648c6afd652))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/core-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/core-http-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/errors bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/specs bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/core-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/core-http-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/errors bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/specs bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39

## [1.0.0-beta.38](https://github.com/authup/authup/compare/v1.0.0-beta.37...v1.0.0-beta.38) (2026-04-28)


### Features

* declarative self-manage permissions via ATTRIBUTE_NAMES policies ([#3019](https://github.com/authup/authup/issues/3019)) ([240eb45](https://github.com/authup/authup/commit/240eb45c0be5eb02adefbfe8306e3a134e91b0d4))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/core-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/core-http-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/errors bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/specs bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/core-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/core-http-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/errors bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/specs bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38

## [1.0.0-beta.37](https://github.com/authup/authup/compare/v1.0.0-beta.36...v1.0.0-beta.37) (2026-04-23)


### Bug Fixes

* ensure consistent version for release ([642b0e2](https://github.com/authup/authup/commit/642b0e23a21d707cc9b389cd0eb824af487bd4ce))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/core-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/core-http-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/errors bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/specs bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/core-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/core-http-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/errors bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/specs bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37

## [1.0.0-beta.36](https://github.com/authup/authup/compare/v1.0.0-beta.35...v1.0.0-beta.36) (2026-04-22)


### Features

* add policy detail/preview to assignment components ([#3000](https://github.com/authup/authup/issues/3000)) ([916c462](https://github.com/authup/authup/commit/916c4629d462a161cb12dda09e9776a3b39bed99))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 10 updates ([#3004](https://github.com/authup/authup/issues/3004)) ([4c2cb91](https://github.com/authup/authup/commit/4c2cb918f4d1eb734ddf6a33655679c558cb4623))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/core-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/core-http-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/errors bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/specs bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/core-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/core-http-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/errors bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/specs bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36

## [1.0.0-beta.35](https://github.com/authup/authup/compare/v1.0.0-beta.34...v1.0.0-beta.35) (2026-04-16)


### Features

* add decision_strategy field to PermissionForm and CompositePoli… ([#2993](https://github.com/authup/authup/issues/2993)) ([dcd3517](https://github.com/authup/authup/commit/dcd3517e52f803c2b1a5ee66f7973c0d98ffc72f))
* add policy management for permission-binding junctions ([#2992](https://github.com/authup/authup/issues/2992)) ([b4abf9b](https://github.com/authup/authup/commit/b4abf9b5153c39b457ace48ee00d3738e74f2ad9))


### Bug Fixes

* handle updated, created, deleted event in entity collection ([54a6680](https://github.com/authup/authup/commit/54a6680d80f685028a9dfb0d0721a39705682c7e))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/core-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/core-http-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/errors bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/specs bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/core-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/core-http-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/errors bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/specs bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35

## [1.0.0-beta.34](https://github.com/authup/authup/compare/v1.0.0-beta.33...v1.0.0-beta.34) (2026-04-15)


### Bug Fixes

* touched missing file & updated version-bump skill ([9acbca9](https://github.com/authup/authup/commit/9acbca9fd01b042451615f7ba5b76154334aae8a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/core-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/core-http-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/errors bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/specs bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/core-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/core-http-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/errors bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/specs bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34

## [1.0.0-beta.33](https://github.com/authup/authup/compare/v1.0.0-beta.32...v1.0.0-beta.33) (2026-04-15)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 16 updates ([#2973](https://github.com/authup/authup/issues/2973)) ([b95589a](https://github.com/authup/authup/commit/b95589a06e8907cefcb8b1c704682928d513766e))
* **deps:** bump the minorandpatch group across 1 directory with 7 updates ([#2961](https://github.com/authup/authup/issues/2961)) ([3422973](https://github.com/authup/authup/commit/342297313ec1d76d2d367551e1e0bc484a66d158))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/core-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/core-http-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/errors bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/specs bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/core-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/core-http-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/errors bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/specs bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33

## [1.0.0-beta.32](https://github.com/authup/authup/compare/v1.0.0-beta.31...v1.0.0-beta.32) (2026-03-30)


### Bug Fixes

* enhance keywoards in package.json ([c45d1fc](https://github.com/authup/authup/commit/c45d1fcd8705192a4d8365ba70772e47f0f23497))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/core-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/core-http-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/errors bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/specs bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/core-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/core-http-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/errors bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/specs bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32

## [1.0.0-beta.31](https://github.com/authup/authup/compare/v1.0.0-beta.30...v1.0.0-beta.31) (2026-03-29)


### Features

* policy-based realm scoping and global entity support ([#2928](https://github.com/authup/authup/issues/2928)) ([1ae7d10](https://github.com/authup/authup/commit/1ae7d101bae1b43b32e7df2eb3c5a18e6328ac87))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 14 updates ([#2895](https://github.com/authup/authup/issues/2895)) ([7ecc0ad](https://github.com/authup/authup/commit/7ecc0ada93a81d9b57f7c89d4823c5ee06c7d7c0))
* **deps:** bump the minorandpatch group across 1 directory with 6 updates ([#2914](https://github.com/authup/authup/issues/2914)) ([34d2cbb](https://github.com/authup/authup/commit/34d2cbbbc4f5f349e0dbd521b45f0330ce52e5a6))
* **deps:** bump the minorandpatch group across 1 directory with 6 updates ([#2947](https://github.com/authup/authup/issues/2947)) ([918f642](https://github.com/authup/authup/commit/918f6424a1a78a666dd4d6f910564b97074b28b4))
* enable typecheck in client-web build and fix all type errors ([#2934](https://github.com/authup/authup/issues/2934)) ([6a6c42a](https://github.com/authup/authup/commit/6a6c42a402e23904daf0ca1482f061924482ea9f))
* remove policy_id property from APermissionForm ([6729dae](https://github.com/authup/authup/commit/6729dae63d5265981010f4e5c51c3d54ff46831c))
* replace server-side cookie handling with client-side authorization code flow ([#2937](https://github.com/authup/authup/issues/2937)) ([8edb612](https://github.com/authup/authup/commit/8edb612b179bf979cf7eb54a69fe9345bbffaeb8))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/core-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/core-http-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/errors bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/specs bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/core-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/core-http-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/errors bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/specs bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31

## [1.0.0-beta.30](https://github.com/authup/authup/compare/v1.0.0-beta.29...v1.0.0-beta.30) (2026-02-26)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#2862](https://github.com/authup/authup/issues/2862)) ([b21809a](https://github.com/authup/authup/commit/b21809a82e94646fd2e906fe0ef0c9ee087115bd))
* **deps:** bump the minorandpatch group across 1 directory with 23 updates ([#2856](https://github.com/authup/authup/issues/2856)) ([b037a7a](https://github.com/authup/authup/commit/b037a7ac40b69067fb87db1f5d10562f59bda273))
* passing issues in sanitize error(s) ([bf2d574](https://github.com/authup/authup/commit/bf2d5749a4aba1787956dde17192f115794fdf50))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/core-kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/core-http-kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/errors bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/specs bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/core-kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/core-http-kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/errors bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/specs bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30

## [1.0.0-beta.29](https://github.com/authup/authup/compare/v1.0.0-beta.28...v1.0.0-beta.29) (2026-02-17)


### Features

* **access:** abstractions for permission checker ([c26a1ce](https://github.com/authup/authup/commit/c26a1ce187296f60dee446bddd0adb70535e9882))
* add built_in + global column to roles & permissions table ([7a456f6](https://github.com/authup/authup/commit/7a456f616ab6eb792fa256d9a8956adb36f58704))
* refactor policy issue/error handling ([#2831](https://github.com/authup/authup/issues/2831)) ([5bf81f5](https://github.com/authup/authup/commit/5bf81f5de8feb1d5e349e9c570618b1321d6ff3b))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 13 updates ([#2833](https://github.com/authup/authup/issues/2833)) ([ab22d62](https://github.com/authup/authup/commit/ab22d62ff8f98bd04e8e960c37be25479a6c77b8))
* **deps:** bump the minorandpatch group across 1 directory with 19 updates ([#2815](https://github.com/authup/authup/issues/2815)) ([e301e20](https://github.com/authup/authup/commit/e301e205d283ee51196495faf6523763a5a632c5))
* **deps:** bump the minorandpatch group across 1 directory with 6 updates ([#2822](https://github.com/authup/authup/issues/2822)) ([f432070](https://github.com/authup/authup/commit/f4320708d9d54348c6f92da4ab23b6abc87f480e))
* **deps:** bump the minorandpatch group across 1 directory with 7 updates ([#2819](https://github.com/authup/authup/issues/2819)) ([7b42a9f](https://github.com/authup/authup/commit/7b42a9f2d6d2bd0d9b4caa5109b3ad3dc0178ff9))
* pass query fields on single resource request ([dc5fba6](https://github.com/authup/authup/commit/dc5fba634f2aaf612584640cf14c92a34492818d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/core-kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/core-http-kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/errors bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/specs bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/core-kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/core-http-kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/errors bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/specs bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29

## [1.0.0-beta.28](https://github.com/authup/authup/compare/v1.0.0-beta.27...v1.0.0-beta.28) (2026-01-13)


### ⚠ BREAKING CHANGES

* require esm import capabilities
* email non null column
* ESM only

### Features

* generate and hash client secret if required ([#2800](https://github.com/authup/authup/issues/2800)) ([36debf9](https://github.com/authup/authup/commit/36debf9167a37a21086675f21c378d76b2582eed))
* make email address mandatory ([#2782](https://github.com/authup/authup/issues/2782)) ([c8e5e08](https://github.com/authup/authup/commit/c8e5e08b6abdb1af8bdc9771bd4a7ae822e71360))


### Bug Fixes

* **deps:** bump the majorprod group with 4 updates ([#2749](https://github.com/authup/authup/issues/2749)) ([d1322cf](https://github.com/authup/authup/commit/d1322cf8efd2cdec823e389b22a6dc7c80f872d0))
* **deps:** bump the minorandpatch group across 1 directory with 13 updates ([#2780](https://github.com/authup/authup/issues/2780)) ([41eba21](https://github.com/authup/authup/commit/41eba214494520ad418d4a3ac3ccee3cd96dc19e))
* **deps:** bump the minorandpatch group across 1 directory with 14 updates ([#2797](https://github.com/authup/authup/issues/2797)) ([56489db](https://github.com/authup/authup/commit/56489db9f7e35a9467ff5c91b6833d243ab9c738))
* **deps:** bump the minorandpatch group across 1 directory with 8 updates ([#2764](https://github.com/authup/authup/issues/2764)) ([04ee74b](https://github.com/authup/authup/commit/04ee74b8abdb275c3de3c97170a33c3ca8e1069f))
* **deps:** bump the minorandpatch group across 1 directory with 8 updates ([#2786](https://github.com/authup/authup/issues/2786)) ([784234d](https://github.com/authup/authup/commit/784234da3a83a576c4e6932069de843187f6d733))
* **deps:** bump the minorandpatch group with 34 updates ([#2756](https://github.com/authup/authup/issues/2756)) ([9240ce1](https://github.com/authup/authup/commit/9240ce18515ea9501a6790a53efe375a4c2b28ac))
* **deps:** bump the minorandpatch group with 5 updates ([#2770](https://github.com/authup/authup/issues/2770)) ([141c50d](https://github.com/authup/authup/commit/141c50d4a76e5d5aa27b336365ca02e9f12ddf7b))
* **deps:** bump the minorandpatch group with 5 updates ([#2802](https://github.com/authup/authup/issues/2802)) ([d299619](https://github.com/authup/authup/commit/d29961929bee7fce0070adb6a61d1ff063036a77))
* **deps:** bump the minorandpatch group with 8 updates ([#2769](https://github.com/authup/authup/issues/2769)) ([d86fa30](https://github.com/authup/authup/commit/d86fa30bed013f4245cecc0d03758b1f8b219da1))


### Miscellaneous Chores

* set min node engine version ([2d6e8a7](https://github.com/authup/authup/commit/2d6e8a794b731ccaa73f3da8c4e0e81fd1178a58))


### Code Refactoring

* migrated to esm only packages ([f988074](https://github.com/authup/authup/commit/f9880742e8fa6487afaf5878aedc520b37622a37))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/core-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/core-http-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/errors bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/specs bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/core-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/core-http-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/errors bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/specs bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28

## [1.0.0-beta.27](https://github.com/authup/authup/compare/v1.0.0-beta.26...v1.0.0-beta.27) (2025-07-17)


### Features

* move authorize & login component to kit package ([#2663](https://github.com/authup/authup/issues/2663)) ([defcdda](https://github.com/authup/authup/commit/defcdda91e944f7a113d872b8528c32646204000))
* refactored internal scope handling & authorize error formatting ([#2676](https://github.com/authup/authup/issues/2676)) ([9444ec2](https://github.com/authup/authup/commit/9444ec23a12e00c3397eda2bb28cbc08193f9a69))
* serve authorization component form via api ([#2666](https://github.com/authup/authup/issues/2666)) ([c88a13f](https://github.com/authup/authup/commit/c88a13f2f5f60b28a76526b0469b623c73b3ab78))
* track authroization through idp redirect & callback ([#2669](https://github.com/authup/authup/issues/2669)) ([5cab0f4](https://github.com/authup/authup/commit/5cab0f405c2d9361f62d1aeb03f83fe8e23c7326))


### Bug Fixes

* cleanup policy evaluator function signature ([4cd41db](https://github.com/authup/authup/commit/4cd41db762d00b60303165630f93c8da3f8074da))
* **client-web-kit:** translator composable usage ([769f624](https://github.com/authup/authup/commit/769f6242f35d17397d6fadbde29c5c7403933c7b))
* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#2672](https://github.com/authup/authup/issues/2672)) ([242bedd](https://github.com/authup/authup/commit/242bedd9c611b84293ba75cc9427892c7ac962c6))
* **deps:** bump the minorandpatch group across 1 directory with 21 updates ([#2653](https://github.com/authup/authup/issues/2653)) ([eb5cdcd](https://github.com/authup/authup/commit/eb5cdcd775466506ec4d86166e6de55e9868f46b))
* **deps:** bump the minorandpatch group across 1 directory with 22 updates ([#2687](https://github.com/authup/authup/issues/2687)) ([f10970b](https://github.com/authup/authup/commit/f10970b89ae166cb33de9841bb221b40eb28081c))
* **deps:** bump the minorandpatch group across 1 directory with 6 updates ([#2692](https://github.com/authup/authup/issues/2692)) ([b0c963a](https://github.com/authup/authup/commit/b0c963a3135ebfccc908f0b1bec2900faccdc59a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/core-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/core-http-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/errors bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/specs bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/core-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/core-http-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/errors bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/specs bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27

## [1.0.0-beta.26](https://github.com/authup/authup/compare/v1.0.0-beta.25...v1.0.0-beta.26) (2025-04-14)


### Features

* cleanup & refactor client response hook  ([#2631](https://github.com/authup/authup/issues/2631)) ([ddccf0b](https://github.com/authup/authup/commit/ddccf0bcffd0d61fcc82995723b9c3d0e7eaa5c4))


### Bug Fixes

* add e-mail to LICENSE file + set next version ([004ee6a](https://github.com/authup/authup/commit/004ee6a2a7fb93506535c8baeebff5981667036a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/core-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/core-http-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/errors bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/specs bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/core-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/core-http-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/errors bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/specs bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26

## [1.0.0-beta.25](https://github.com/authup/authup/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2025-04-08)


### Features

* client-{permission,role} relations ([#2570](https://github.com/authup/authup/issues/2570)) ([95e5e85](https://github.com/authup/authup/commit/95e5e855083b20fc17e7df9047a97948d66aac3d))
* correct client usage in security context ([#2579](https://github.com/authup/authup/issues/2579)) ([26f0118](https://github.com/authup/authup/commit/26f0118184c98bf04f499d19526b1cf0d034cad6))
* dedicated realm picker component ([#2573](https://github.com/authup/authup/issues/2573)) ([f98b7e7](https://github.com/authup/authup/commit/f98b7e71cd934e2fecbe1e8d46e2f12fe531b1e2))
* enable realm specification in policy basic form ([d9553a2](https://github.com/authup/authup/commit/d9553a241c714d8541fd44f29d904008f42c8a9d))
* enhance policy components ([#2598](https://github.com/authup/authup/issues/2598)) ([39361d3](https://github.com/authup/authup/commit/39361d3f2927ec5912383163334b03d7bcbfed47))
* expose important policy related components ([1dc4430](https://github.com/authup/authup/commit/1dc4430e72a9d71be66d98129a64bf98ec19ebf8))
* initial policy components ([#2562](https://github.com/authup/authup/issues/2562)) ([f73cd74](https://github.com/authup/authup/commit/f73cd7476970f563a07307ee12e1742de9eeaf32))
* make relational list entities searchable ([59007b2](https://github.com/authup/authup/commit/59007b239435e1f8a3b1d8efd1a3400dafede889))
* remove identity provider slug field ([#2575](https://github.com/authup/authup/issues/2575)) ([19e111b](https://github.com/authup/authup/commit/19e111b96321c915014417ad5148307724dc93ee))
* remove isRealmResource{Readable,Writable} helper ([ac06e71](https://github.com/authup/authup/commit/ac06e71f32c47fa250e381197dc6069ccc2cb9fa))
* rename channel & namespace builder heplpers ([e86e18c](https://github.com/authup/authup/commit/e86e18c2821b6a0b9afa7c27efabbc6d0d9b5c7c))
* stricter restrictions for resource name attribute ([57965ea](https://github.com/authup/authup/commit/57965eae29523b59c46e86b6f12e7b44752ae301))
* unified entity picker mechanism ([#2581](https://github.com/authup/authup/issues/2581)) ([831aeb2](https://github.com/authup/authup/commit/831aeb20e1937f8106395e0e8f71c122b89bf256))


### Bug Fixes

* add '.' caharacter as allowed character in ui components ([cbd5b0a](https://github.com/authup/authup/commit/cbd5b0a8b2ba887889b73631b290673caa473cd4))
* **deps:** accept pinia v2.x and v3.x ([ade237a](https://github.com/authup/authup/commit/ade237a07dbbd982cccd5a1ca3dbb6afbd4f82b0))
* import for @vueuse/integrations package ([409e4c5](https://github.com/authup/authup/commit/409e4c578083c9e2a956eb0472714fc49a70e219))
* import for @vueuse/integrations package ([68a330a](https://github.com/authup/authup/commit/68a330aace898c3f2313112d7eaf25cbbc529148))
* policy ancestor assignment ([#2568](https://github.com/authup/authup/issues/2568)) ([ca4cad7](https://github.com/authup/authup/commit/ca4cad73d3051ea4da53b56a7d7848a0e2e15f95))
* rename domain-type to resource-type ([c01ec66](https://github.com/authup/authup/commit/c01ec66ff0cb8c06c6e360878b4f40a7eed30fb7))
* rename domain-type-map to resource-type-map ([131b296](https://github.com/authup/authup/commit/131b29665df32c82456e9543b50710278e90c479))
* renamed types & interfaces ([45c2fb7](https://github.com/authup/authup/commit/45c2fb78e8948fcc2d41e3615dad35d906e94b2f))
* typing in policy basic form ([7ee8b70](https://github.com/authup/authup/commit/7ee8b70210f50787d25d652a4353f9104ab1abf4))
* update year range in LICENSE file ([8dd6da9](https://github.com/authup/authup/commit/8dd6da98cbfd8f910397de7391402af1e7517cc9))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/access bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/core-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/core-http-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/errors bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/specs bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/core-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/core-http-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/errors bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/specs bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25

## [1.0.0-beta.24](https://github.com/authup/authup/compare/v1.0.0-beta.23...v1.0.0-beta.24) (2025-01-18)


### Features

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
    * @authup/access bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/core-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/core-http-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/errors bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/specs bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
  * peerDependencies
    * @authup/access bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/core-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/core-http-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/errors bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/specs bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24

## [1.0.0-beta.23](https://github.com/authup/authup/compare/v1.0.0-beta.22...v1.0.0-beta.23) (2024-11-10)


### Features

* emit hooks in module middleware & refactored navigation building ([#2480](https://github.com/authup/authup/issues/2480)) ([ffa8d7e](https://github.com/authup/authup/commit/ffa8d7eb01a164525f0533def455b8c5f0032373))
* refactored client resource management ([#2450](https://github.com/authup/authup/issues/2450)) ([17f81fa](https://github.com/authup/authup/commit/17f81fabe90e19422774899aeeefa1fe9b46d7fc))
* simplify domain type to shape mapping ([6b267d6](https://github.com/authup/authup/commit/6b267d6ddb42c05c0fb9969aa1f6f34c84a28337))


### Bug Fixes

* **deps:** bump @vueuse/integrations from 11.1.0 to 11.2.0 ([#2452](https://github.com/authup/authup/issues/2452)) ([03dec7c](https://github.com/authup/authup/commit/03dec7ce8671b2c27bb4da6f04b3b987b2ff9868))
* renamed useStore to injectStore ([e57e13b](https://github.com/authup/authup/commit/e57e13bc7bd26f28b8873fc9d4507346cf7293fd))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/core-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/core-http-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/core-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/core-http-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23

## [1.0.0-beta.22](https://github.com/authup/authup/compare/v1.0.0-beta.21...v1.0.0-beta.22) (2024-10-23)


### Features

* enhance identity provider picker view ([6e44be9](https://github.com/authup/authup/commit/6e44be986dd59d124cf91d88e9b9fdfe5ed5c0ac))
* enhance sidenav & topnav ([0150250](https://github.com/authup/authup/commit/0150250f534ab6a6e9c471f0192e15db33aa76ad))
* moved and seperated domains directory ([#2424](https://github.com/authup/authup/issues/2424)) ([fde5757](https://github.com/authup/authup/commit/fde5757243868cc1a5af0d2c9f75ab82dd2af8a2))
* refactored client store & introduce event-bus for store ([#2415](https://github.com/authup/authup/issues/2415)) ([e9a6eac](https://github.com/authup/authup/commit/e9a6eacf43a42c48493e32501e5b89b3c9888a40))
* renamed & optimized store-event-bus ([#2426](https://github.com/authup/authup/issues/2426)) ([8e9d2d2](https://github.com/authup/authup/commit/8e9d2d253326f880cc73d1cde3cb122fc8e64223))


### Bug Fixes

* bump vuecs packages & cleaned up layout config ([3e5cbdb](https://github.com/authup/authup/commit/3e5cbdbccfc723b72a9d69c21c181a6685d1c6e7))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/core-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/core-http-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/core-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/core-http-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22

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
    * @authup/kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/core-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/core-http-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/core-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/core-http-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21

## [1.0.0-beta.20](https://github.com/authup/authup/compare/v1.0.0-beta.19...v1.0.0-beta.20) (2024-09-28)


### Features

* add built_in & display_name attribute to few entities ([#2193](https://github.com/authup/authup/issues/2193)) ([42d062f](https://github.com/authup/authup/commit/42d062f3e600aed43f69164b2f6297851d402070))
* make permission/ability fns async ([#2116](https://github.com/authup/authup/issues/2116)) ([c0491c1](https://github.com/authup/authup/commit/c0491c1ea3fdec651c7ad83d60b929c42cca715a))
* move permission & policy logic to new package ([#2128](https://github.com/authup/authup/issues/2128)) ([53f9b33](https://github.com/authup/authup/commit/53f9b33b15e08d6a2def0f7d4659129a03a51252))
* permisison-binding policy & policy-engine + permission-checker override ([#2298](https://github.com/authup/authup/issues/2298)) ([5871d72](https://github.com/authup/authup/commit/5871d72e0404e71c372b3d70875c4b84c56f02e4))
* permission repository for permission manager ([#2129](https://github.com/authup/authup/issues/2129)) ([afe3700](https://github.com/authup/authup/commit/afe3700e9822e3983b8867cad927ea74b9747133))
* simplify permission manager & merge permissions of same realm ([#2133](https://github.com/authup/authup/issues/2133)) ([08c5cf7](https://github.com/authup/authup/commit/08c5cf7697f140663b6ffc396ec8028a3057c2e2))


### Bug Fixes

* **deps:** bump @vueuse/integrations from 10.11.0 to 11.0.0 ([#2227](https://github.com/authup/authup/issues/2227)) ([3430a53](https://github.com/authup/authup/commit/3430a538f1d6e0d56ec8c70efbc63e22d6a2e25f))
* **deps:** bump @vueuse/integrations from 11.0.0 to 11.1.0 ([#2320](https://github.com/authup/authup/issues/2320)) ([9fc1d0b](https://github.com/authup/authup/commit/9fc1d0b24c4afd2210ad71be3223a8a37c7c9cd9))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20
    * @authup/core-kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20
    * @authup/core-http-kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.20
    * @authup/core-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.20
    * @authup/core-http-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.20
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.20

## [1.0.0-beta.19](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.19) (2024-06-30)


### Bug Fixes

* cookie access in vue plugin & allow read on common attributes (realm/identity-provider) ([1cbb1a7](https://github.com/authup/authup/commit/1cbb1a7a08c1dce5aa7f7c60f776117e45dfdddc))
* **deps:** bump nuxt to v3.12.2 ([86e9be4](https://github.com/authup/authup/commit/86e9be4d77128680cca58cb25be94f49ba0b9a7a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-http-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.18 to ^1.0.1-beta.18
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-http-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.18 to ^1.0.1-beta.18

## [1.0.0-beta.18](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.18) (2024-06-24)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reenable defining pinia option for web-kit installation ([ca62249](https://github.com/authup/authup/commit/ca622491a2e03330d0377f6ae236f62564d04737))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified client socket manager interaction ([d31ccf5](https://github.com/authup/authup/commit/d31ccf5e3ca87c68f0edc52b7335ddf5ef73f39a))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* accessing domain api in entity delete component ([67b830e](https://github.com/authup/authup/commit/67b830ec228224445d5f6054cd6469557f765432))
* define key for action of relational resource assignments ([a7c3872](https://github.com/authup/authup/commit/a7c3872f8e1ed44a0d02a8a0f4162d201942b514))
* **deps:** bump @vueuse/integrations from 10.10.0 to 10.11.0 ([#2061](https://github.com/authup/authup/issues/2061)) ([95fa23b](https://github.com/authup/authup/commit/95fa23b02d08539f7e1e83d9387c815c6d8e7c61))
* **deps:** bump @vueuse/integrations from 10.9.0 to 10.10.0 ([#2017](https://github.com/authup/authup/issues/2017)) ([0c618b3](https://github.com/authup/authup/commit/0c618b3139a8becb14e8a9fe3e4ae274818ec5b2))
* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))
* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* remove unnecessary pinia option parameter ([e2b9124](https://github.com/authup/authup/commit/e2b9124768c1077a816c47a93a3cb2b5843ff991))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))

## [1.0.1-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.1-beta.17) (2024-06-23)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core-kit bumped from ^1.0.0-beta.17 to ^1.0.0-beta.18
    * @authup/core-http-kit bumped from ^1.0.0-beta.17 to ^1.0.1-beta.17
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.17 to ^1.0.1-beta.17
  * peerDependencies
    * @authup/core-kit bumped from ^1.0.0-beta.17 to ^1.0.0-beta.18
    * @authup/core-http-kit bumped from ^1.0.0-beta.17 to ^1.0.1-beta.17
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.17 to ^1.0.1-beta.17

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.0-beta.17) (2024-06-23)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reenable defining pinia option for web-kit installation ([ca62249](https://github.com/authup/authup/commit/ca622491a2e03330d0377f6ae236f62564d04737))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified client socket manager interaction ([d31ccf5](https://github.com/authup/authup/commit/d31ccf5e3ca87c68f0edc52b7335ddf5ef73f39a))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* accessing domain api in entity delete component ([67b830e](https://github.com/authup/authup/commit/67b830ec228224445d5f6054cd6469557f765432))
* define key for action of relational resource assignments ([a7c3872](https://github.com/authup/authup/commit/a7c3872f8e1ed44a0d02a8a0f4162d201942b514))
* **deps:** bump @vueuse/integrations from 10.10.0 to 10.11.0 ([#2061](https://github.com/authup/authup/issues/2061)) ([95fa23b](https://github.com/authup/authup/commit/95fa23b02d08539f7e1e83d9387c815c6d8e7c61))
* **deps:** bump @vueuse/integrations from 10.9.0 to 10.10.0 ([#2017](https://github.com/authup/authup/issues/2017)) ([0c618b3](https://github.com/authup/authup/commit/0c618b3139a8becb14e8a9fe3e4ae274818ec5b2))
* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))
* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* remove unnecessary pinia option parameter ([e2b9124](https://github.com/authup/authup/commit/e2b9124768c1077a816c47a93a3cb2b5843ff991))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core-realtime-kit bumped from ^1.0.1-beta.13 to ^1.0.0-beta.17
  * peerDependencies
    * @authup/core-realtime-kit bumped from ^1.0.1-beta.13 to ^1.0.0-beta.17

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.16...v1.0.0-beta.17) (2024-06-23)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reenable defining pinia option for web-kit installation ([ca62249](https://github.com/authup/authup/commit/ca622491a2e03330d0377f6ae236f62564d04737))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified client socket manager interaction ([d31ccf5](https://github.com/authup/authup/commit/d31ccf5e3ca87c68f0edc52b7335ddf5ef73f39a))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* accessing domain api in entity delete component ([67b830e](https://github.com/authup/authup/commit/67b830ec228224445d5f6054cd6469557f765432))
* define key for action of relational resource assignments ([a7c3872](https://github.com/authup/authup/commit/a7c3872f8e1ed44a0d02a8a0f4162d201942b514))
* **deps:** bump @vueuse/integrations from 10.10.0 to 10.11.0 ([#2061](https://github.com/authup/authup/issues/2061)) ([95fa23b](https://github.com/authup/authup/commit/95fa23b02d08539f7e1e83d9387c815c6d8e7c61))
* **deps:** bump @vueuse/integrations from 10.9.0 to 10.10.0 ([#2017](https://github.com/authup/authup/issues/2017)) ([0c618b3](https://github.com/authup/authup/commit/0c618b3139a8becb14e8a9fe3e4ae274818ec5b2))
* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))
* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* remove unnecessary pinia option parameter ([e2b9124](https://github.com/authup/authup/commit/e2b9124768c1077a816c47a93a3cb2b5843ff991))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-http-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.13 to ^1.0.1-beta.13
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-http-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.13 to ^1.0.1-beta.13

## [1.0.0-beta.16](https://github.com/authup/authup/compare/v1.0.0-beta.15...v1.0.0-beta.16) (2024-06-07)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified client socket manager interaction ([d31ccf5](https://github.com/authup/authup/commit/d31ccf5e3ca87c68f0edc52b7335ddf5ef73f39a))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* define key for action of relational resource assignments ([a7c3872](https://github.com/authup/authup/commit/a7c3872f8e1ed44a0d02a8a0f4162d201942b514))
* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))
* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* remove unnecessary pinia option parameter ([e2b9124](https://github.com/authup/authup/commit/e2b9124768c1077a816c47a93a3cb2b5843ff991))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))

## [1.0.0-beta.15](https://github.com/authup/authup/compare/v1.0.0-beta.14...v1.0.0-beta.15) (2024-05-13)


### Bug Fixes

* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))

## [1.0.0-beta.14](https://github.com/authup/authup/compare/v1.0.0-beta.13...v1.0.0-beta.14) (2024-05-13)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))

## [1.0.0-beta.13](https://github.com/authup/authup/compare/v1.0.0-beta.12...v1.0.0-beta.13) (2024-05-13)


### Features

* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-http-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-http-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13

## [1.0.0-beta.12](https://github.com/authup/authup/compare/v1.0.0-beta.11...v1.0.0-beta.12) (2024-05-10)


### Features

* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-http-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-http-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12

## [1.0.0-beta.10](https://github.com/authup/authup/compare/v1.0.0-beta.9...v1.0.0-beta.10) (2024-05-08)


### Features

* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-http-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-http-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10

## [1.0.0-beta.9](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.8...client-vue-v1.0.0-beta.9) (2024-04-10)


### Bug Fixes

* **deps:** bump smob from 1.4.1 to 1.5.0 ([#1843](https://github.com/authup/authup/issues/1843)) ([4741a8a](https://github.com/authup/authup/commit/4741a8a93ea069fe4fcb7ab897d789414e372d69))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9

## [1.0.0-beta.8](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.7...client-vue-v1.0.0-beta.8) (2024-03-26)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8

## [1.0.0-beta.7](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.6...client-vue-v1.0.0-beta.7) (2024-03-06)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7

## [1.0.0-beta.6](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.5...client-vue-v1.0.0-beta.6) (2024-02-28)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6

## [1.0.0-beta.5](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.4...client-vue-v1.0.0-beta.5) (2024-02-26)


### Features

* remove permission name regex restriction ([#1754](https://github.com/authup/authup/issues/1754)) ([c81a249](https://github.com/authup/authup/commit/c81a2499fe48cdbe258cac89d6084cb777ac27fc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5

## [1.0.0-beta.4](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.3...client-vue-v1.0.0-beta.4) (2024-02-19)


### Features

* ldap identity provider ([#1721](https://github.com/authup/authup/issues/1721)) ([3cf6858](https://github.com/authup/authup/commit/3cf68587b8ed44c3dbbf745fcbec6166e615f85b))
* ldap identity-provider {user,role}-filter attribute ([#1743](https://github.com/authup/authup/issues/1743)) ([f36f70e](https://github.com/authup/authup/commit/f36f70e67fddbe7c37c8dff82075598757e39599))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4

## [1.0.0-beta.3](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.2...client-vue-v1.0.0-beta.3) (2024-02-06)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3

## [1.0.0-beta.2](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.1...client-vue-v1.0.0-beta.2) (2024-01-14)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2

## [1.0.0-beta.1](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.0...client-vue-v1.0.0-beta.1) (2024-01-09)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1

## [1.0.0-beta.0](https://github.com/authup/authup/compare/client-vue-v0.45.10...client-vue-v1.0.0-beta.0) (2024-01-05)


### Features

* apply stricter linting rules ([#1611](https://github.com/authup/authup/issues/1611)) ([af0774d](https://github.com/authup/authup/commit/af0774d72a91d52f92b4d51c8391feca0f76f540))
* migrated from vue-layout to vuecs ([387e1e9](https://github.com/authup/authup/commit/387e1e940c3db69e84ef507df987d1fb84ffe96c))
* prefix & reogranize components ([#1610](https://github.com/authup/authup/issues/1610)) ([0e4c6ee](https://github.com/authup/authup/commit/0e4c6eeacad42f5a3ca96e3172546e442480047b))


### Bug Fixes

* relational resource componentns slot rendering ([b28de46](https://github.com/authup/authup/commit/b28de468f87a73b5402ee113f5a3caa11283bf5e))
* version range in peer dependency section for internal packages ([ef95901](https://github.com/authup/authup/commit/ef9590163463f1cc8c230f12d315ecc44b9c3454))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^0.45.10 to ^1.0.0-beta.0
  * peerDependencies
    * @authup/core bumped from ^0.45.10 to ^1.0.0-beta.0

## 0.45.10

### Patch Changes

- [`ecf8797f`](https://github.com/authup/authup/commit/ecf8797fcacff6a560564fb9d01561c04b56cc63) Thanks [@tada5hi](https://github.com/tada5hi)! - fix throwing error

- Updated dependencies [[`ecf8797f`](https://github.com/authup/authup/commit/ecf8797fcacff6a560564fb9d01561c04b56cc63)]:
  - @authup/core@0.45.10

## 0.45.9

### Patch Changes

- [`f0b015a0`](https://github.com/authup/authup/commit/f0b015a07c960610031412368f83fc07ba4dde40) Thanks [@tada5hi](https://github.com/tada5hi)! - patch ecosystem

- Updated dependencies [[`f0b015a0`](https://github.com/authup/authup/commit/f0b015a07c960610031412368f83fc07ba4dde40)]:
  - @authup/core@0.45.9

## 0.45.8

### Patch Changes

- [`63b4414e`](https://github.com/authup/authup/commit/63b4414eed4442a40dd25aab7c0dd69d0bd46f26) Thanks [@tada5hi](https://github.com/tada5hi)! - fix docker build

- Updated dependencies [[`63b4414e`](https://github.com/authup/authup/commit/63b4414eed4442a40dd25aab7c0dd69d0bd46f26)]:
  - @authup/core@0.45.8

## 0.45.7

### Patch Changes

- [`7faa3d10`](https://github.com/authup/authup/commit/7faa3d10dc0a048a84792d6d0d7a2dc717f13e1b) Thanks [@tada5hi](https://github.com/tada5hi)! - next patch release

- Updated dependencies [[`7faa3d10`](https://github.com/authup/authup/commit/7faa3d10dc0a048a84792d6d0d7a2dc717f13e1b)]:
  - @authup/core@0.45.7

## 0.45.6

### Patch Changes

- [`9b94d2be`](https://github.com/authup/authup/commit/9b94d2be82498faa4e28d63450d8e8c1beda5d37) Thanks [@tada5hi](https://github.com/tada5hi)! - force docker publish to docker.io

- Updated dependencies [[`9b94d2be`](https://github.com/authup/authup/commit/9b94d2be82498faa4e28d63450d8e8c1beda5d37)]:
  - @authup/core@0.45.6

## 0.45.5

### Patch Changes

- [`3f5d3d72`](https://github.com/authup/authup/commit/3f5d3d728576a51ec96fac740a2738451d2d2cd1) Thanks [@tada5hi](https://github.com/tada5hi)! - release docker

- Updated dependencies [[`3f5d3d72`](https://github.com/authup/authup/commit/3f5d3d728576a51ec96fac740a2738451d2d2cd1)]:
  - @authup/core@0.45.5

## 0.45.4

### Patch Changes

- [`622729b0`](https://github.com/authup/authup/commit/622729b086d0a833b4e18bcb0ce9c046ebe0d1d8) Thanks [@tada5hi](https://github.com/tada5hi)! - force docker release

- Updated dependencies [[`622729b0`](https://github.com/authup/authup/commit/622729b086d0a833b4e18bcb0ce9c046ebe0d1d8)]:
  - @authup/core@0.45.4

## 0.45.3

### Patch Changes

- [`05849783`](https://github.com/authup/authup/commit/058497834a176c5efa4412408fda5de144a3bc61) Thanks [@tada5hi](https://github.com/tada5hi)! - trigger release workflow

- Updated dependencies [[`05849783`](https://github.com/authup/authup/commit/058497834a176c5efa4412408fda5de144a3bc61)]:
  - @authup/core@0.45.3

## 0.45.2

### Patch Changes

- [`c4f56913`](https://github.com/authup/authup/commit/c4f56913ceb64100ec86f443d1eceddb4adc0d1c) Thanks [@tada5hi](https://github.com/tada5hi)! - bump to next patch version

- Updated dependencies [[`c4f56913`](https://github.com/authup/authup/commit/c4f56913ceb64100ec86f443d1eceddb4adc0d1c)]:
  - @authup/core@0.45.2

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.45.0](https://github.com/authup/authup/compare/v0.44.0...v0.45.0) (2023-10-23)

**Note:** Version bump only for package @authup/client-vue

# [0.44.0](https://github.com/authup/authup/compare/v0.42.0...v0.44.0) (2023-10-07)

**Note:** Version bump only for package @authup/client-vue

# [0.43.0](https://github.com/authup/authup/compare/v0.42.0...v0.43.0) (2023-10-05)

**Note:** Version bump only for package @authup/client-vue

# [0.42.0](https://github.com/authup/authup/compare/v0.41.0...v0.42.0) (2023-10-05)

**Note:** Version bump only for package @authup/client-vue

# [0.41.0](https://github.com/authup/authup/compare/v0.40.3...v0.41.0) (2023-09-01)

### Bug Fixes

- keep original argument order of provide pattern ([13b6f05](https://github.com/authup/authup/commit/13b6f05e18bb87d2ef15424e640321002c308a99))
- move translator sub module ([93f0b37](https://github.com/authup/authup/commit/93f0b37519b7a9508334a0abe7805e4b61081865))

### Features

- ensure singleton instance is not injected yet ([31d0e31](https://github.com/authup/authup/commit/31d0e3115d0feedc3a0cc4f097835cd52b2f44a8))

## [0.40.3](https://github.com/authup/authup/compare/v0.40.2...v0.40.3) (2023-08-21)

### Bug Fixes

- renamed socket-manager utility functions ([cce9584](https://github.com/authup/authup/commit/cce95848120cfa7b35d7829c9cda69c1157d48d5))
- set busy as list-meta property ([69af5f1](https://github.com/authup/authup/commit/69af5f14bc5a8a931f7c7fab9c5a8e235d0e9602))

## [0.40.2](https://github.com/authup/authup/compare/v0.40.1...v0.40.2) (2023-08-20)

### Bug Fixes

- cleanup list sub-module ([132bcbf](https://github.com/authup/authup/commit/132bcbff2387b6eefe7afd729be4cc90358067db))
- list total entries incr/decr ([fbf0a17](https://github.com/authup/authup/commit/fbf0a17a5c2eb931e501eb58d7d38a317a0c8706))
- module exports + simplified applying pagination meta ([7f233e5](https://github.com/authup/authup/commit/7f233e50029ca74be5c4dd804ac5b99067ed4f76))
- remove unnecessary watcher ([2f6beef](https://github.com/authup/authup/commit/2f6beef89d4dc4ab40a6afd47cfc0d241cf36b07))
- renamed list-query to list-meta + restructured meta type ([6abb3fd](https://github.com/authup/authup/commit/6abb3fd9122244de0e84afb9094d04e1f35bf0fd))

## [0.40.1](https://github.com/authup/authup/compare/v0.40.0...v0.40.1) (2023-08-16)

### Bug Fixes

- remove explicit dependency to pinia ([0e26dd7](https://github.com/authup/authup/commit/0e26dd7fa6a97caee1428ebd9b82ecc363030641))
- vue type imports ([93d8ada](https://github.com/authup/authup/commit/93d8ada1b85659bc9de3ec621fb69fb7c60ebb24))

# [0.40.0](https://github.com/authup/authup/compare/v0.39.1...v0.40.0) (2023-08-15)

### Bug Fixes

- api-client/store usage with provide & inject ([779a0ff](https://github.com/authup/authup/commit/779a0ff6a0ef143b11e6e4b155d2a0928724d01f))
- minor cleanup + enhance vue install fn ([5c6eb53](https://github.com/authup/authup/commit/5c6eb537ecdd65c17c460217263edaa450ef9cfc))
- remove explicit component naming + proper renderError usage for entity-manager ([71d3e0b](https://github.com/authup/authup/commit/71d3e0bf3f87fa9698d3f80cea8cbaa51617e5a0))

### Features

- simplified entity assign actions ([c22ab45](https://github.com/authup/authup/commit/c22ab4528b1df0e81500bfdc59ab6bcf08517a08))

## [0.39.1](https://github.com/authup/authup/compare/v0.39.0...v0.39.1) (2023-07-22)

**Note:** Version bump only for package @authup/client-vue

# [0.39.0](https://github.com/authup/authup/compare/v0.38.0...v0.39.0) (2023-07-18)

### Bug Fixes

- identity-provider fields components ([8682424](https://github.com/authup/authup/commit/8682424187a473198041f9188b75e5284ae68258))
- rename identity-provider protocol_config column to preset ([bf4020e](https://github.com/authup/authup/commit/bf4020e7033de7584fb3f27a4b58452afd8a6eeb))
- simplify imports + better defaults for list-controls ([870cd0b](https://github.com/authup/authup/commit/870cd0b5a5a6925a059d29748d844b4e544ca20b))

### Features

- better typing and structure for entity-{list,manager} ([abbfe43](https://github.com/authup/authup/commit/abbfe43587a02e8b0a6c4b3fd5ad10379a24acc4))
- extended identity-provider form to manage protocols and protocol-configs ([0d01e7f](https://github.com/authup/authup/commit/0d01e7f49510722ec3fdd32050c22d64f931e478))
- implemented entity-manager + created domain entity components ([391969d](https://github.com/authup/authup/commit/391969d4c4ba0abd325a2fbc032da4eef0eab66c))
- renamed and restructured domain-list to entity-list ([fa75fd8](https://github.com/authup/authup/commit/fa75fd881894af1abccb2d27fc7594b89bb8e228))
- split identity-provider form fields + additional utitlity components ([a50a695](https://github.com/authup/authup/commit/a50a695614f8261083776e1d0d34418dba2ceeec))

# [0.38.0](https://github.com/authup/authup/compare/v0.37.1...v0.38.0) (2023-06-29)

### Features

- enhanced and unified slot- & prop-typing and capabilities ([6d4caa6](https://github.com/authup/authup/commit/6d4caa6202349e7ea0f431da56a7e6881b49f41c))

## [0.37.1](https://github.com/authup/authup/compare/v0.37.0...v0.37.1) (2023-06-14)

### Bug Fixes

- bump hapic to v2.x ([2dd66ed](https://github.com/authup/authup/commit/2dd66ed87e89338be682a93bec4fe12ca86be712))
- bump vue-layout dependencies + rename validation create fn ([ea0c679](https://github.com/authup/authup/commit/ea0c679207cd0d3cd6503d80779a825fdb6091d5))

# [0.37.0](https://github.com/authup/authup/compare/v0.36.0...v0.37.0) (2023-05-31)

### Bug Fixes

- **deps:** bump smob to v1.4.0 ([8eefa83](https://github.com/authup/authup/commit/8eefa83a55271ad139dde2e0ccbacc8c937e6a4e))

### Features

- implemented ilingo v3 ([5b0e632](https://github.com/authup/authup/commit/5b0e6321cd8b7569e1e92262014a8ffc00098d63))

# [0.36.0](https://github.com/authup/authup/compare/v0.35.0...v0.36.0) (2023-05-27)

### Features

- cleanup and relocate auth store + set token max age for oauth2 grant types ([13643fd](https://github.com/authup/authup/commit/13643fd76e8c471f8d90b555c386041a34bcb2ff))

# [0.35.0](https://github.com/authup/authup/compare/v0.34.0...v0.35.0) (2023-05-25)

**Note:** Version bump only for package @authup/client-vue

# [0.34.0](https://github.com/authup/authup/compare/v0.33.0...v0.34.0) (2023-05-24)

### Bug Fixes

- **deps:** bump @vue-layout/\* packages ([f7d6e4c](https://github.com/authup/authup/commit/f7d6e4c8089c693e9d6a86ed8e19725bf8c78a42))
- **deps:** bump smob from 1.0.0 to 1.1.1 ([#1122](https://github.com/authup/authup/issues/1122)) ([0dc6667](https://github.com/authup/authup/commit/0dc66679c7b65c37f2eec5793727d00b0c35c013))
- minor fix for css styling of robot-form ([0d379f4](https://github.com/authup/authup/commit/0d379f41e2828f22072d32f65cfb7e63d7280edb))

### Features

- switch to bootstrap table view for domain lists ([2faa379](https://github.com/authup/authup/commit/2faa37910732863bb730588b6e3334c27b353c16))

# [0.33.0](https://github.com/authup/authup/compare/v0.32.3...v0.33.0) (2023-04-24)

**Note:** Version bump only for package @authup/client-vue

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

**Note:** Version bump only for package @authup/client-vue

## [0.31.2](https://github.com/authup/authup/compare/v0.31.1...v0.31.2) (2023-04-03)

### Bug Fixes

- mounting of http interceptor + better struct for verification data ([0ee1e40](https://github.com/authup/authup/commit/0ee1e403752e5576ae2d22a1b840ce05ae452c10))

## [0.31.1](https://github.com/authup/authup/compare/v0.31.0...v0.31.1) (2023-04-03)

**Note:** Version bump only for package @authup/client-vue

# [0.31.0](https://github.com/authup/authup/compare/v0.30.1...v0.31.0) (2023-04-03)

### Features

- add user-info domain api + renamed useHTTPClientAPI ([22d1cdc](https://github.com/authup/authup/commit/22d1cdce326bb7a0549d28b04b0157840b3f7623))

## [0.30.1](https://github.com/authup/authup/compare/v0.30.0...v0.30.1) (2023-04-03)

### Bug Fixes

- cleanup exports and bump min peer version ([a639294](https://github.com/authup/authup/commit/a639294b906b2c3e9358ab08223929acb7950fcf))

# [0.30.0](https://github.com/authup/authup/compare/v0.29.0...v0.30.0) (2023-04-03)

**Note:** Version bump only for package @authup/client-vue

# [0.29.0](https://github.com/authup/authup/compare/v0.28.0...v0.29.0) (2023-04-01)

### Bug Fixes

- adjusted README.md, package.json files + renamed http client ([fcf8423](https://github.com/authup/authup/commit/fcf8423228fa73aa2a61ba8de96c0af51dfb0c5f))

### Features

- add realm & identity-provider selection to login form ([5678540](https://github.com/authup/authup/commit/5678540256e7fb59443548e5fe4eb4705d9346f1))

# [0.28.0](https://github.com/authup/authup/compare/v0.27.0...v0.28.0) (2023-04-01)

**Note:** Version bump only for package @authup/client-vue

# [0.27.0](https://github.com/authup/authup/compare/v0.26.0...v0.27.0) (2023-04-01)

**Note:** Version bump only for package @authup/client-vue

# [0.26.0](https://github.com/authup/authup/compare/v0.25.0...v0.26.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-vue

# [0.25.0](https://github.com/authup/authup/compare/v0.24.0...v0.25.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-vue

# [0.24.0](https://github.com/authup/authup/compare/v0.23.1...v0.24.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-vue

# [0.23.0](https://github.com/authup/authup/compare/v0.22.0...v0.23.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-vue

# [0.22.0](https://github.com/Tada5hi/authup/compare/v0.21.0...v0.22.0) (2023-03-26)

**Note:** Version bump only for package @authup/client-vue

# [0.21.0](https://github.com/Tada5hi/authup/compare/v0.20.1...v0.21.0) (2023-03-26)

**Note:** Version bump only for package @authup/client-vue

# [0.20.0](https://github.com/Tada5hi/authup/compare/v0.19.0...v0.20.0) (2023-03-24)

**Note:** Version bump only for package @authup/client-vue

# [0.19.0](https://github.com/Tada5hi/authup/compare/v0.18.0...v0.19.0) (2023-03-23)

**Note:** Version bump only for package @authup/client-vue

# [0.18.0](https://github.com/Tada5hi/authup/compare/v0.17.2...v0.18.0) (2023-03-23)

### Bug Fixes

- **deps:** bump smob from 0.1.0 to 1.0.0 ([#952](https://github.com/Tada5hi/authup/issues/952)) ([363fc69](https://github.com/Tada5hi/authup/commit/363fc6902848a16982626f4fbe3cb7e5c1afd053))

### Features

- add realm- & scope-subscriber + minor cleanup + enum referencing ([dc4f1ba](https://github.com/Tada5hi/authup/commit/dc4f1ba167259f6c7c8f381a8569fe255646e85d))

## [0.17.2](https://github.com/Tada5hi/authup/compare/v0.17.1...v0.17.2) (2023-03-20)

**Note:** Version bump only for package @authup/client-vue

## [0.17.1](https://github.com/Tada5hi/authup/compare/v0.17.0...v0.17.1) (2023-03-14)

**Note:** Version bump only for package @authup/client-vue

# [0.17.0](https://github.com/Tada5hi/authup/compare/v0.16.0...v0.17.0) (2023-03-13)

**Note:** Version bump only for package @authup/client-vue

# [0.16.0](https://github.com/Tada5hi/authup/compare/v0.15.4...v0.16.0) (2023-02-28)

### Features

- add support to lock/unlock user name manipulation ([2fcb2c5](https://github.com/Tada5hi/authup/commit/2fcb2c5e50c62aa727b0109dd1dff0647b699231))

## [0.15.4](https://github.com/Tada5hi/authup/compare/v0.15.3...v0.15.4) (2023-02-24)

**Note:** Version bump only for package @authup/client-vue

## [0.15.3](https://github.com/Tada5hi/authup/compare/v0.15.2...v0.15.3) (2023-02-23)

**Note:** Version bump only for package @authup/client-vue

## [0.15.1](https://github.com/Tada5hi/authup/compare/v0.15.0...v0.15.1) (2023-02-08)

**Note:** Version bump only for package @authup/client-vue

# [0.15.0](https://github.com/Tada5hi/authup/compare/v0.14.1...v0.15.0) (2023-02-07)

### Bug Fixes

- **deps:** bump vue from 3.2.45 to 3.2.47 ([#825](https://github.com/Tada5hi/authup/issues/825)) ([69d44a6](https://github.com/Tada5hi/authup/commit/69d44a62684e980225cb5c416d4ccb4d5e5f902d))

# [0.14.0](https://github.com/Tada5hi/authup/compare/v0.13.0...v0.14.0) (2023-01-29)

**Note:** Version bump only for package @authup/client-vue

# [0.13.0](https://github.com/Tada5hi/authup/compare/v0.12.1...v0.13.0) (2023-01-28)

**Note:** Version bump only for package @authup/client-vue

## [0.12.1](https://github.com/Tada5hi/authup/compare/v0.12.0...v0.12.1) (2023-01-28)

### Bug Fixes

- peer-dependency version + updated license information ([f693215](https://github.com/Tada5hi/authup/commit/f69321538afbd2923287209593cdebcedaa29637))

# [0.12.0](https://github.com/Tada5hi/authup/compare/v0.11.1...v0.12.0) (2023-01-28)

**Note:** Version bump only for package @authup/client-vue

## [0.11.1](https://github.com/Tada5hi/authup/compare/v0.11.0...v0.11.1) (2023-01-27)

### Bug Fixes

- **deps:** bump ilingo to v2.2.1 ([eebc902](https://github.com/Tada5hi/authup/commit/eebc902495debf127679f8c2619deef00249b041))
- **deps:** updated dependencies ([b3d221c](https://github.com/Tada5hi/authup/commit/b3d221c862c4f4dbd0ccf018566ef00796fcd591))

# [0.11.0](https://github.com/Tada5hi/authup/compare/v0.10.1...v0.11.0) (2023-01-27)

### Bug Fixes

- prefix node module imports with node: ([e866876](https://github.com/Tada5hi/authup/commit/e866876f6a64f50946ca7fd9945fce0958ebd6d9))
- **vue:** replaced esbuild with swc core ([a59a667](https://github.com/Tada5hi/authup/commit/a59a667fb5ca580464703311b776159f91bbc91a))

## [0.10.1](https://github.com/Tada5hi/authup/compare/v0.10.0...v0.10.1) (2023-01-23)

**Note:** Version bump only for package @authup/client-vue

# [0.10.0](https://github.com/Tada5hi/authup/compare/v0.9.0...v0.10.0) (2023-01-20)

**Note:** Version bump only for package @authup/client-vue

# [0.9.0](https://github.com/Tada5hi/authup/compare/v0.8.0...v0.9.0) (2023-01-20)

### Features

- lazy password grant + minor entity management ui guards ([127ec1c](https://github.com/Tada5hi/authup/commit/127ec1c13f108f2a032aba67dd3b662d35251dc7))
- **ui:** implemented realm switching in admin area ([d902af7](https://github.com/Tada5hi/authup/commit/d902af78d85c270f75425eef01e191a1cc7504ac))

# [0.8.0](https://github.com/Tada5hi/authup/compare/v0.7.0...v0.8.0) (2023-01-16)

### Features

- replaced ts-jest & partially rollup with swc ([bf2b1aa](https://github.com/Tada5hi/authup/commit/bf2b1aa7ed4f0ee9e63fabf0d1d38754bbfa3310))

# [0.7.0](https://github.com/Tada5hi/authup/compare/v0.6.3...v0.7.0) (2023-01-11)

**Note:** Version bump only for package @authup/client-vue

## [0.6.3](https://github.com/Tada5hi/authup/compare/v0.6.2...v0.6.3) (2023-01-10)

**Note:** Version bump only for package @authup/client-vue

## [0.6.2](https://github.com/Tada5hi/authup/compare/v0.6.1...v0.6.2) (2023-01-10)

**Note:** Version bump only for package @authup/client-vue

# [0.6.0](https://github.com/Tada5hi/authup/compare/v0.5.0...v0.6.0) (2023-01-08)

**Note:** Version bump only for package @authup/client-vue

# [0.5.0](https://github.com/Tada5hi/authup/compare/v0.4.0...v0.5.0) (2023-01-08)

### Features

- add robot/user renaming constraints + non owned permission assign ([ea12e73](https://github.com/Tada5hi/authup/commit/ea12e7309c6d539ec005cc5460ef50a2ebe8c931))

# [0.4.0](https://github.com/Tada5hi/authup/compare/v0.3.1...v0.4.0) (2022-12-21)

### Features

- add scope management (http-endpoint, db-entity, ...) ([2ab4236](https://github.com/Tada5hi/authup/commit/2ab42364e44f032cb93c9946c40a9fd71f287c44))
- further enhancement for client & scope management ([29d1f3e](https://github.com/Tada5hi/authup/commit/29d1f3ee5ecde14afa0b692dd9589887bc2df54e))

# [0.3.0](https://github.com/Tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)

### Bug Fixes

- **ui:** minor fixes (list-builder,{client,permission}-form,...) ([666b41f](https://github.com/Tada5hi/authup/commit/666b41f2fccc370815046087a621882f0159f1cc))

### Features

- add client/application management ([5327e9b](https://github.com/Tada5hi/authup/commit/5327e9bf411dfeeadef60d8f28ea81e0bc638f38))
- enhanced & extended permission management ([3c33bd0](https://github.com/Tada5hi/authup/commit/3c33bd0e0dcf1035d546fce375a76bb1c1312a05))
- refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/Tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))

## [0.2.2](https://github.com/Tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)

**Note:** Version bump only for package @authup/client-vue

# [0.2.0](https://github.com/Tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)

**Note:** Version bump only for package @authup/client-vue

# 0.1.0 (2022-12-08)

### Bug Fixes

- bump typeorm-extension, rapiq & routup version ([e37b993](https://github.com/Tada5hi/authup/commit/e37b993bfbf3d11b24c696d59f1382cc4379a72c))

### Features

- **server-core:** replaced http framework ([6273ae6](https://github.com/Tada5hi/authup/commit/6273ae680f82a4e27ba527b9eb260bb81ee75d20))
