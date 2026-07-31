# Changelog

## [1.0.0-beta.58](https://github.com/authup/authup/compare/v1.0.0-beta.57...v1.0.0-beta.58) (2026-07-31)


### Bug Fixes

* **deps:** bump ilingo, validup and trapi to their latest versions ([6d69f90](https://github.com/authup/authup/commit/6d69f90665f23022de5bf3ef8c6916a50c449494))

## [1.0.0-beta.57](https://github.com/authup/authup/compare/v1.0.0-beta.56...v1.0.0-beta.57) (2026-07-29)


### Bug Fixes

* **errors:** keep guard inheritance match for JSON-rehydrated errors ([#3331](https://github.com/authup/authup/issues/3331)) ([352fccc](https://github.com/authup/authup/commit/352fccc591be502f20b4928767f7457bea278e1c))

## [1.0.0-beta.56](https://github.com/authup/authup/compare/v1.0.0-beta.55...v1.0.0-beta.56) (2026-07-24)


### Bug Fixes

* ensure consistent version for release ([5dd90cd](https://github.com/authup/authup/commit/5dd90cdadacc0c1068ad46fb2dc3df4eb897e356))

## [1.0.0-beta.55](https://github.com/authup/authup/compare/v1.0.0-beta.54...v1.0.0-beta.55) (2026-07-24)


### Bug Fixes

* ensure consistent version for release ([a6670d2](https://github.com/authup/authup/commit/a6670d29697ae12dc697dd99112609cb40881927))

## [1.0.0-beta.54](https://github.com/authup/authup/compare/v1.0.0-beta.53...v1.0.0-beta.54) (2026-07-22)


### Bug Fixes

* ensure consistent version for release ([d0f3dd2](https://github.com/authup/authup/commit/d0f3dd2ef93054ac7b677cf0fb26bbe8e64771bd))

## [1.0.0-beta.53](https://github.com/authup/authup/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2026-07-17)


### Features

* authorize access policy + persisted per-scope consent ([#3246](https://github.com/authup/authup/issues/3246)) ([b4b96c7](https://github.com/authup/authup/commit/b4b96c74e0bec4d332c39f5477744aa8cca1d44f))
* mfa authenticator devices - totp + recovery codes ([#3232](https://github.com/authup/authup/issues/3232)) ([6d0422a](https://github.com/authup/authup/commit/6d0422a44a1205267dfb7fdb7e395147277c58dd))
* security event log with entity tracking, login throttle, metrics & admin ui ([#3229](https://github.com/authup/authup/issues/3229)) ([5a30950](https://github.com/authup/authup/commit/5a30950a4c819206a1cbafd221a0c3be692f53e6))


### Bug Fixes

* **server-core:** harden mTLS/key-store/oauth2 review findings + core error taxonomy ([#3267](https://github.com/authup/authup/issues/3267)) ([350fb78](https://github.com/authup/authup/commit/350fb78fa46392ea270d369cc2c27a5c30405401))

## [1.0.0-beta.52](https://github.com/authup/authup/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-07-11)


### ⚠ BREAKING CHANGES

* master-realm admins can no longer authorize into another realm's app via the built-in web client (login_required at /authorize, invalid_grant at /token). Previously-issued cross-realm artifacts were malformed, so intentional reliance is implausible; use realm-local accounts.

### Features

* accept oidc prompt params and add auth_time/sid id_token claims ([#3195](https://github.com/authup/authup/issues/3195)) ([10da494](https://github.com/authup/authup/commit/10da494077471ee5b0e54aab24f3ab03610159ae))
* realm-bind the authorize and token flow ([#3194](https://github.com/authup/authup/issues/3194)) ([b7fc25c](https://github.com/authup/authup/commit/b7fc25c162f20db2b7d28448719c08b5a5e27211))
* security hardening quick wins ([#3227](https://github.com/authup/authup/issues/3227)) ([fce2e60](https://github.com/authup/authup/commit/fce2e600fc0bc0cafe4a5f1602dc887167bca630))

## [1.0.0-beta.51](https://github.com/authup/authup/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-07-02)


### Bug Fixes

* **deps:** normalize peer/dependency/dev classification across packages ([#3172](https://github.com/authup/authup/issues/3172)) ([c09f383](https://github.com/authup/authup/commit/c09f38315e5c569990b6540baf87cef0f3d8b663))

## [1.0.0-beta.50](https://github.com/authup/authup/compare/v1.0.0-beta.49...v1.0.0-beta.50) (2026-06-24)


### ⚠ BREAKING CHANGES

* **deps:** node >= 22.13 is now required; node 20 is no longer supported.

### Bug Fixes

* ensure consistent version for release ([5554980](https://github.com/authup/authup/commit/55549808f266eaab8599018107c0fc1afb9f8e48))


### Miscellaneous Chores

* **deps:** upgrade hapic to v3, @hapic/oauth2 to v4, require node &gt;= 22 ([#3134](https://github.com/authup/authup/issues/3134)) ([07503bc](https://github.com/authup/authup/commit/07503bc87b43227cf1b5e03573242d22722a0b08))

## [1.0.0-beta.49](https://github.com/authup/authup/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2026-06-13)


### Bug Fixes

* ensure consistent version for release ([eb1cfcf](https://github.com/authup/authup/commit/eb1cfcfd676322fd6abb48f0a2f5ebfca5e146ad))

## [1.0.0-beta.48](https://github.com/authup/authup/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([4f983df](https://github.com/authup/authup/commit/4f983dff265156d412fad8b1f3e88d2f632c3e6d))

## [1.0.0-beta.47](https://github.com/authup/authup/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([15b08e3](https://github.com/authup/authup/commit/15b08e33c6475c68f3c950da537b14eab7ddaae4))

## [1.0.0-beta.46](https://github.com/authup/authup/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([99f858b](https://github.com/authup/authup/commit/99f858b94e75e3c21c8293333aba53e8adbfbcdc))

## [1.0.0-beta.45](https://github.com/authup/authup/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([86e35f4](https://github.com/authup/authup/commit/86e35f476e4c213b434909098399f73fd59f2b77))

## [1.0.0-beta.44](https://github.com/authup/authup/compare/v1.0.0-beta.42...v1.0.0-beta.44) (2026-06-07)


### ⚠ BREAKING CHANGES

* migrate forms to validup-vue and nav to @vuecs/navigation ([#3086](https://github.com/authup/authup/issues/3086))

### Features

* migrate forms to validup-vue and nav to @vuecs/navigation ([#3086](https://github.com/authup/authup/issues/3086)) ([ce88592](https://github.com/authup/authup/commit/ce885927b01fa0550a059b3c99f1809318671fa6))


### Bug Fixes

* ensure consistent version for release ([5159a23](https://github.com/authup/authup/commit/5159a233a5978bc910119b68f27130e0c2d570a7))

## [1.0.0-beta.42](https://github.com/authup/authup/compare/v1.0.0-beta.41...v1.0.0-beta.42) (2026-05-15)


### ⚠ BREAKING CHANGES

* **server-core:** The /permissions/:id/check and /policies/:id/check endpoints no longer return 404 for unknown ids/names. They now return 202 with { status: 'error', data: { name, message, ... } } in the body. The endpoints are predicates that always answer; the unknown-entity case is just one possible reason for status: 'error'.
* **errors:** decouple AuthupError from @ebec/http, add inheritance-aware duck guards ([#3041](https://github.com/authup/authup/issues/3041))

### Bug Fixes

* ensure consistent version for release ([183b5dd](https://github.com/authup/authup/commit/183b5dd882b1ed5a27212a0051648850e7693917))


### Code Refactoring

* **errors:** decouple AuthupError from @ebec/http, add inheritance-aware duck guards ([#3041](https://github.com/authup/authup/issues/3041)) ([058c503](https://github.com/authup/authup/commit/058c503b615dc1eeb9728908ab4817b53fd24f23))
* **server-core:** extract permission/policy checker services ([#3048](https://github.com/authup/authup/issues/3048)) ([c639a05](https://github.com/authup/authup/commit/c639a0505cbf022d813a6808ccf826e3be6f631e))

## [1.0.0-beta.41](https://github.com/authup/authup/compare/v1.0.0-beta.40...v1.0.0-beta.41) (2026-05-08)


### ⚠ BREAKING CHANGES

* **server-adapter:** rename http→node, add web with verify primitives ([#3038](https://github.com/authup/authup/issues/3038))

### Features

* **server-core:** migrate to routup v5 + swagger split ([#3030](https://github.com/authup/authup/issues/3030)) ([d14ae3a](https://github.com/authup/authup/commit/d14ae3a1b333ece7093a4275d6028a024d98307b))


### Code Refactoring

* **server-adapter:** rename http→node, add web with verify primitives ([#3038](https://github.com/authup/authup/issues/3038)) ([f66347a](https://github.com/authup/authup/commit/f66347a4d0d8c87f484796831b1ae02d92eecabe))

## [1.0.0-beta.40](https://github.com/authup/authup/compare/v1.0.0-beta.39...v1.0.0-beta.40) (2026-04-30)


### Bug Fixes

* ensure consistent version for release ([c8da21d](https://github.com/authup/authup/commit/c8da21d2db725ab437dc3f5a976f8ea453014cbc))

## [1.0.0-beta.39](https://github.com/authup/authup/compare/v1.0.0-beta.38...v1.0.0-beta.39) (2026-04-29)


### Bug Fixes

* enforce OAuth2 client authentication and PKCE per RFC 6749/7636 ([#3020](https://github.com/authup/authup/issues/3020)) ([bac38b1](https://github.com/authup/authup/commit/bac38b1f0c9368b6190fc872f146c4c4dae1b3fe))

## [1.0.0-beta.38](https://github.com/authup/authup/compare/v1.0.0-beta.37...v1.0.0-beta.38) (2026-04-28)


### Features

* declarative self-manage permissions via ATTRIBUTE_NAMES policies ([#3019](https://github.com/authup/authup/issues/3019)) ([240eb45](https://github.com/authup/authup/commit/240eb45c0be5eb02adefbfe8306e3a134e91b0d4))

## [1.0.0-beta.37](https://github.com/authup/authup/compare/v1.0.0-beta.36...v1.0.0-beta.37) (2026-04-23)


### Bug Fixes

* ensure consistent version for release ([642b0e2](https://github.com/authup/authup/commit/642b0e23a21d707cc9b389cd0eb824af487bd4ce))

## [1.0.0-beta.36](https://github.com/authup/authup/compare/v1.0.0-beta.35...v1.0.0-beta.36) (2026-04-22)


### Bug Fixes

* touched files for release ([596b32f](https://github.com/authup/authup/commit/596b32ffc540b49e7deed6260714438397f65dbd))

## [1.0.0-beta.35](https://github.com/authup/authup/compare/v1.0.0-beta.34...v1.0.0-beta.35) (2026-04-16)


### Bug Fixes

* ensure consistent version for release ([e11b6c9](https://github.com/authup/authup/commit/e11b6c9050127d1651ecf5f5ea3ac10b05208111))

## [1.0.0-beta.34](https://github.com/authup/authup/compare/v1.0.0-beta.33...v1.0.0-beta.34) (2026-04-15)


### Bug Fixes

* ensure consistent version for release ([b2327b0](https://github.com/authup/authup/commit/b2327b033bd988b95a901d47e16e598cd7270999))

## [1.0.0-beta.33](https://github.com/authup/authup/compare/v1.0.0-beta.32...v1.0.0-beta.33) (2026-04-15)


### Bug Fixes

* minor changes to bump version ([9207dda](https://github.com/authup/authup/commit/9207dda00f805bc76c6c104b3cbb3a4485ea83eb))

## [1.0.0-beta.32](https://github.com/authup/authup/compare/v1.0.0-beta.31...v1.0.0-beta.32) (2026-03-30)


### Bug Fixes

* enhance keywoards in package.json ([c45d1fc](https://github.com/authup/authup/commit/c45d1fcd8705192a4d8365ba70772e47f0f23497))

## [1.0.0-beta.31](https://github.com/authup/authup/compare/v1.0.0-beta.30...v1.0.0-beta.31) (2026-03-29)


### Bug Fixes

* touch files for version bump ([049737e](https://github.com/authup/authup/commit/049737ed3a6af5f3f7b4b7038e2790fdc5fad2b2))

## [1.0.0-beta.30](https://github.com/authup/authup/compare/v1.0.0-beta.29...v1.0.0-beta.30) (2026-02-26)


### Bug Fixes

* minor adjustments to bump version ([db455fd](https://github.com/authup/authup/commit/db455fd9087197aa29a19b8772cd422c82760cf6))

## [1.0.0-beta.29](https://github.com/authup/authup/compare/v1.0.0-beta.28...v1.0.0-beta.29) (2026-02-17)


### Features

* refactor policy issue/error handling ([#2831](https://github.com/authup/authup/issues/2831)) ([5bf81f5](https://github.com/authup/authup/commit/5bf81f5de8feb1d5e349e9c570618b1321d6ff3b))

## [1.0.0-beta.28](https://github.com/authup/authup/compare/v1.0.0-beta.27...v1.0.0-beta.28) (2026-01-13)


### ⚠ BREAKING CHANGES

* require esm import capabilities
* ESM only

### Miscellaneous Chores

* set min node engine version ([2d6e8a7](https://github.com/authup/authup/commit/2d6e8a794b731ccaa73f3da8c4e0e81fd1178a58))


### Code Refactoring

* migrated to esm only packages ([f988074](https://github.com/authup/authup/commit/f9880742e8fa6487afaf5878aedc520b37622a37))

## [1.0.0-beta.27](https://github.com/authup/authup/compare/v1.0.0-beta.26...v1.0.0-beta.27) (2025-07-17)


### Bug Fixes

* minor changes to keywords in package.json(s) ([d672947](https://github.com/authup/authup/commit/d672947c4036d9849c031fa43a1718d1a621d581))

## [1.0.0-beta.26](https://github.com/authup/authup/compare/v1.0.0-beta.25...v1.0.0-beta.26) (2025-04-14)


### Bug Fixes

* add e-mail to LICENSE file + set next version ([004ee6a](https://github.com/authup/authup/commit/004ee6a2a7fb93506535c8baeebff5981667036a))

## [1.0.0-beta.25](https://github.com/authup/authup/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2025-04-08)


### Bug Fixes

* update year range in LICENSE file ([8dd6da9](https://github.com/authup/authup/commit/8dd6da98cbfd8f910397de7391402af1e7517cc9))

## [1.0.0-beta.24](https://github.com/authup/authup/compare/v1.0.0-beta.23...v1.0.0-beta.24) (2025-01-18)


### Features

* merge packages rules & schema to security ([#2506](https://github.com/authup/authup/issues/2506)) ([2ea6407](https://github.com/authup/authup/commit/2ea6407390cad4900416994e1af78dca1b36a170))
* refactor & split security package ([#2551](https://github.com/authup/authup/issues/2551)) ([1b38eed](https://github.com/authup/authup/commit/1b38eed204658cdde11b92f93027b843f47f43bf))
* split kit package in errors, rules & schema package ([#2500](https://github.com/authup/authup/issues/2500)) ([ff5a6e7](https://github.com/authup/authup/commit/ff5a6e731f4ea71faaefd1cd6fe02fbc0dc398e6))
