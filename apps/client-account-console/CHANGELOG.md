# Changelog

## [1.0.0-beta.64](https://github.com/authup/authup/compare/v1.0.0-beta.63...v1.0.0-beta.64) (2026-09-04)


### ⚠ BREAKING CHANGES

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

## [1.0.0-beta.63](https://github.com/authup/authup/compare/v1.0.0-beta.62...v1.0.0-beta.63) (2026-08-20)


### ⚠ BREAKING CHANGES

* **server-core:** align the token endpoint with RFC 7662/7009 ([#3488](https://github.com/authup/authup/issues/3488))
* **client-account-console:** a resource request carrying an expired, revoked or otherwise unverifiable bearer now answers 401 instead of 400. The error code is unchanged. The token endpoint keeps answering 400, but an unparsable refresh token now carries `invalid_grant` rather than `invalid_token`.
* **client-web-kit:** `store.user` and the `USER_UPDATED` dispatcher payload narrow from `User` to `Pick<User, 'id' | 'name' | 'displayName'>`; a consumer reading any other field gets a compile error. The `user` cookie is no longer written, and a same-named cookie on the origin is deleted once per browser. The never-populated `OAuth2TokenPayload.sub_name` is removed.

### Bug Fixes

* **client-account-console:** render a retryable error state on a failed page load ([#3484](https://github.com/authup/authup/issues/3484)) ([11326f2](https://github.com/authup/authup/commit/11326f25a0d433137481ee6a482271a734518244))
* **client-web-kit:** derive the session user from the token introspection ([#3481](https://github.com/authup/authup/issues/3481)) ([2a7bbb9](https://github.com/authup/authup/commit/2a7bbb97aac40a05a3e45afc009ea73f56f42735))
* **server-core:** align the token endpoint with RFC 7662/7009 ([#3488](https://github.com/authup/authup/issues/3488)) ([50cb0f4](https://github.com/authup/authup/commit/50cb0f46749a59bec2abeca23edda64ae8378f89))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/client-web-theme bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/core-http-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/core-kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/i18n bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/kit bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63
    * @authup/specs bumped from ^1.0.0-beta.62 to ^1.0.0-beta.63

## [1.0.0-beta.62](https://github.com/authup/authup/compare/v1.0.0-beta.61...v1.0.0-beta.62) (2026-08-18)


### Bug Fixes

* **deps:** bump @rapiq/* to ^2.2.0 ([46c660b](https://github.com/authup/authup/commit/46c660b05fa2ad34d7ea233ebbbdd6baa40122c9))
* **deps:** bump the minorandpatch group across 1 directory with 16 updates ([#3461](https://github.com/authup/authup/issues/3461)) ([bb1a33a](https://github.com/authup/authup/commit/bb1a33aa639016f2e0aee54121182cac88b471be))
* **deps:** bump the minorandpatch group across 1 directory with 9 updates ([#3470](https://github.com/authup/authup/issues/3470)) ([b1f9376](https://github.com/authup/authup/commit/b1f9376157ca2f0cb513f03f9c34b1bbe45ab2f2))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/client-web-theme bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/core-http-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/core-kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/i18n bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/kit bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62
    * @authup/specs bumped from ^1.0.0-beta.61 to ^1.0.0-beta.62

## [1.0.0-beta.61](https://github.com/authup/authup/compare/v1.0.0-beta.60...v1.0.0-beta.61) (2026-08-14)


### Features

* **server-core:** complete an identity-provider link on an authenticated request ([#3450](https://github.com/authup/authup/issues/3450)) ([78859b0](https://github.com/authup/authup/commit/78859b017d40ac167577973222fe5f9dc4ef98ee))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/client-web-theme bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/core-http-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/core-kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/i18n bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/specs bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61

## [1.0.0-beta.60](https://github.com/authup/authup/compare/v1.0.0-beta.59...v1.0.0-beta.60) (2026-08-13)


### ⚠ BREAKING CHANGES

* auth_sessions.client_id now names the client that first authorized on a session rather than the most recent one, so GET/DELETE /sessions?filter[clientId] selects on that basis. The two differ only where several applications share one session. Revocation that should reach every session an application served must filter auth_session_tokens.client_id instead.

### Features

* identity-provider account linking ([#3419](https://github.com/authup/authup/issues/3419)) ([f21d0e3](https://github.com/authup/authup/commit/f21d0e3ae96404ed2aca4215fe97c579f10ad18a))
* per-application session token attribution, inventory API and revocation ([#3404](https://github.com/authup/authup/issues/3404)) ([6027f84](https://github.com/authup/authup/commit/6027f849fda7ca1b115787e3ef7b08a750fd0778))
* schema index declarations backed by entity indexes (rapiq 2.0.0-beta.20) ([#3425](https://github.com/authup/authup/issues/3425)) ([d34afb7](https://github.com/authup/authup/commit/d34afb76143f08119e9c449201f975d8ba797788))
* session token visibility (admin user tab + account console) ([#3421](https://github.com/authup/authup/issues/3421)) ([776239d](https://github.com/authup/authup/commit/776239d468c7db2979c2670d728c9f5cbc619945))


### Bug Fixes

* **deps:** bump @rapiq/* to 2.0.0-beta.18 ([a01fabb](https://github.com/authup/authup/commit/a01fabbb6c7bf6671f3ccb757cd0c4c695510679))
* **deps:** bump @rapiq/* to 2.0.0-beta.19 ([21c92fb](https://github.com/authup/authup/commit/21c92fb67aead43a68c0152ef8d15507c2bf9130))
* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#3414](https://github.com/authup/authup/issues/3414)) ([f0706f2](https://github.com/authup/authup/commit/f0706f211884be8154766bd24ea45f3f696211ed))
* redo the v1.0.0-beta.60 release with consistent versions ([#3444](https://github.com/authup/authup/issues/3444)) ([5c04dc8](https://github.com/authup/authup/commit/5c04dc8daf28a01037949d8cb17e1de67ba10e6b))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/client-web-theme bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/core-http-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/core-kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/i18n bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/specs bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60

## [1.0.0-beta.59](https://github.com/authup/authup/compare/v1.0.0-beta.58...v1.0.0-beta.59) (2026-08-04)


### ⚠ BREAKING CHANGES

* `**` is no longer accepted inside the host of a redirect pattern or a TRUSTED_ORIGINS entry. It matches the rest of the value outright, so `https://**.example.com/**` read as "any subdomain" but accepted every origin. A single `*` is unchanged. Stored patterns are not rewritten; new writes are rejected and an offending TRUSTED_ORIGINS value fails the boot with a message naming it.
* the five settings pages are gone and their URLs now leave the application, redirecting to <apiUrl>/account instead.
* @authup/server-core no longer embeds the auth UI under dist/ui; it resolves the @authup/client-auth-console package instead. The account console runtime-config global window.__AUTHUP_ACCOUNT__ (never released) is renamed to window.__AUTHUP__.

### Features

* add the account console (/account self-service surface) ([#3373](https://github.com/authup/authup/issues/3373)) ([2e11e5f](https://github.com/authup/authup/commit/2e11e5f9895a84d0eca4cfd4ae1803dcfa90db5e))


### Bug Fixes

* **client-account-console:** mount the alert-dialog provider host ([b160113](https://github.com/authup/authup/commit/b1601132a6544feb5fe0d2a62f3622f922bdcf67))
* **deps:** bump @rapiq/* to 2.0.0-beta.15 ([66958e7](https://github.com/authup/authup/commit/66958e7f11a3462dce3cea6b74f0435c780524e7))
* redirect-pattern matching, plus fixes from the beta.58 release audit ([#3397](https://github.com/authup/authup/issues/3397)) ([e00c6ba](https://github.com/authup/authup/commit/e00c6ba635d206a16b5ad19467bd5540d021c37e))


### Code Refactoring

* consolidate self-service into the account console ([#3392](https://github.com/authup/authup/issues/3392)) ([f380f5f](https://github.com/authup/authup/commit/f380f5f90ee55c4a661e9e32cadc02c5f66ac2ef))
* extract the SSR auth UI into apps/client-auth-console ([#3375](https://github.com/authup/authup/issues/3375)) ([b131e2a](https://github.com/authup/authup/commit/b131e2ae81dfaf1aa46d44eaa0b32329d5227fbe))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/client-web-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/client-web-theme bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/core-http-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/core-kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/i18n bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/specs bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
