# Changelog

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
