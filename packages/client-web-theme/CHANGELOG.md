# Changelog

## [1.0.0-beta.53](https://github.com/authup/authup/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2026-07-17)


### Bug Fixes

* **deps:** bump @vuecs/forms to v5.3.3 and @vuecs/theme-tailwind to v6.3.1 ([d3bb7fd](https://github.com/authup/authup/commit/d3bb7fdf565c16999c017c6fda75a58ef0d74538))
* ensure consistent version for release ([280b376](https://github.com/authup/authup/commit/280b3761e423c554193401499e2ee155f18c55bc))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53

## [1.0.0-beta.52](https://github.com/authup/authup/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-07-11)


### Bug Fixes

* ensure consistent version for release ([130cc2e](https://github.com/authup/authup/commit/130cc2ec394ac940dcba771d25ef41b7dbc85964))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52

## [1.0.0-beta.51](https://github.com/authup/authup/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-07-02)


### Features

* **client-web-kit:** confirm entity deletion via AlertDialog + upgrade @vuecs/* to latest ([#3173](https://github.com/authup/authup/issues/3173)) ([f48cdbf](https://github.com/authup/authup/commit/f48cdbf26ba34c4615d973c059a8a739f81cc069))


### Bug Fixes

* **deps:** normalize peer/dependency/dev classification across packages ([#3172](https://github.com/authup/authup/issues/3172)) ([c09f383](https://github.com/authup/authup/commit/c09f38315e5c569990b6540baf87cef0f3d8b663))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51

## [1.0.0-beta.50](https://github.com/authup/authup/compare/v1.0.0-beta.49...v1.0.0-beta.50) (2026-06-24)


### ⚠ BREAKING CHANGES

* **deps:** node >= 22.13 is now required; node 20 is no longer supported.

### Bug Fixes

* ensure consistent version for release ([5554980](https://github.com/authup/authup/commit/55549808f266eaab8599018107c0fc1afb9f8e48))


### Miscellaneous Chores

* **deps:** upgrade hapic to v3, @hapic/oauth2 to v4, require node &gt;= 22 ([#3134](https://github.com/authup/authup/issues/3134)) ([07503bc](https://github.com/authup/authup/commit/07503bc87b43227cf1b5e03573242d22722a0b08))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50

## [1.0.0-beta.49](https://github.com/authup/authup/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2026-06-13)


### Bug Fixes

* ensure consistent version for release ([eb1cfcf](https://github.com/authup/authup/commit/eb1cfcfd676322fd6abb48f0a2f5ebfca5e146ad))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49

## [1.0.0-beta.48](https://github.com/authup/authup/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([4f983df](https://github.com/authup/authup/commit/4f983dff265156d412fad8b1f3e88d2f632c3e6d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48

## [1.0.0-beta.47](https://github.com/authup/authup/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2026-06-12)


### ⚠ BREAKING CHANGES

* @authup/client-web-kit no longer exports ./dist/style.css. Its component styles are now delivered through @authup/client-web-kit-theme (via the @authup/client-web-theme @import chain). Consumers importing '@authup/client-web-kit/dist/style.css' must remove that import.

### Features

* **client-web-theme:** mode-aware chrome for header, sidebar & footer ([#3108](https://github.com/authup/authup/issues/3108)) ([a34530a](https://github.com/authup/authup/commit/a34530ade29d796a0240657d79192c084b7bb8ad))


### Code Refactoring

* move client-web-kit component styles into client-web-kit-theme ([#3103](https://github.com/authup/authup/issues/3103)) ([f186a59](https://github.com/authup/authup/commit/f186a592a88d6a9dd460109be62818095593d8eb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47

## [1.0.0-beta.46](https://github.com/authup/authup/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2026-06-09)


### ⚠ BREAKING CHANGES

* `@authup/client-web-kit` no longer re-exports `@authup/i18n`, `@authup/access` no longer re-exports `DecisionStrategy`, and `@authup/client-web-theme` no longer re-exports `clientWebKitTheme` / `merge`. Import these from their source packages directly.

### Bug Fixes

* stop re-exporting external packages through internal barrels (fixes @authup/i18n runtime crash) ([#3101](https://github.com/authup/authup/issues/3101)) ([5dd751a](https://github.com/authup/authup/commit/5dd751ad980ac730d0805f7fd7057450ea079418))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46

## [1.0.0-beta.45](https://github.com/authup/authup/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2026-06-09)


### Features

* **client-web:** brand theme overhaul — logo, surface tokens, dark-mode fixes ([#3096](https://github.com/authup/authup/issues/3096)) ([fed755b](https://github.com/authup/authup/commit/fed755b46bc3c0dc8b6cc0e73e4ccc798b2f8ca3))
* **kit:** add generateName helper and regenerate buttons for entity name forms ([#3092](https://github.com/authup/authup/issues/3092)) ([833a4a1](https://github.com/authup/authup/commit/833a4a12f0859da9e4be51d63433d8161f65935e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45

## [1.0.0-beta.44](https://github.com/authup/authup/compare/v1.0.0-beta.42...v1.0.0-beta.44) (2026-06-07)


### ⚠ BREAKING CHANGES

* migrate forms to validup-vue and nav to @vuecs/navigation ([#3086](https://github.com/authup/authup/issues/3086))
* **icons:** drop @fortawesome/fontawesome-free, route all icons thr… ([#3082](https://github.com/authup/authup/issues/3082))
* migrate from Bootstrap to Tailwind v4 (+ vuecs theme-tailwind) ([#3075](https://github.com/authup/authup/issues/3075))

### Features

* **icons:** drop @fortawesome/fontawesome-free, route all icons thr… ([#3082](https://github.com/authup/authup/issues/3082)) ([b50c117](https://github.com/authup/authup/commit/b50c11701f6310cec310f25d14778a15a14b2e50))
* migrate forms to validup-vue and nav to @vuecs/navigation ([#3086](https://github.com/authup/authup/issues/3086)) ([ce88592](https://github.com/authup/authup/commit/ce885927b01fa0550a059b3c99f1809318671fa6))
* migrate from Bootstrap to Tailwind v4 (+ vuecs theme-tailwind) ([#3075](https://github.com/authup/authup/issues/3075)) ([a49d1da](https://github.com/authup/authup/commit/a49d1da9ed4509f9bb4d24e6578286367a635cc4))
* **theme,app:** light/dark color-mode toggle + chrome refactor + post-Tailwind-v4 polish ([#3077](https://github.com/authup/authup/issues/3077)) ([fd4002d](https://github.com/authup/authup/commit/fd4002d6607d01064782864d99d1991c89f0d2fb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/client-web-kit-theme bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
