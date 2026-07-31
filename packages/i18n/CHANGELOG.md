# Changelog

## [1.0.0-beta.58](https://github.com/authup/authup/compare/v1.0.0-beta.57...v1.0.0-beta.58) (2026-07-31)


### Bug Fixes

* **deps:** bump ilingo, validup and trapi to their latest versions ([6d69f90](https://github.com/authup/authup/commit/6d69f90665f23022de5bf3ef8c6916a50c449494))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58

## [1.0.0-beta.57](https://github.com/authup/authup/compare/v1.0.0-beta.56...v1.0.0-beta.57) (2026-07-29)


### Features

* add a grant-types form control to the client form ([#3348](https://github.com/authup/authup/issues/3348)) ([0f4b675](https://github.com/authup/authup/commit/0f4b67513cf1bee06fc769668f636831f9de9c93))
* add a post-logout redirect-uri list to the client form ([#3350](https://github.com/authup/authup/issues/3350)) ([bdf23d1](https://github.com/authup/authup/commit/bdf23d12322171322e554fdafd0bdb190ad72e4f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57

## [1.0.0-beta.56](https://github.com/authup/authup/compare/v1.0.0-beta.55...v1.0.0-beta.56) (2026-07-24)


### Bug Fixes

* ensure consistent version for release ([5dd90cd](https://github.com/authup/authup/commit/5dd90cdadacc0c1068ad46fb2dc3df4eb897e356))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56

## [1.0.0-beta.55](https://github.com/authup/authup/compare/v1.0.0-beta.54...v1.0.0-beta.55) (2026-07-24)


### Bug Fixes

* ensure consistent version for release ([a6670d2](https://github.com/authup/authup/commit/a6670d29697ae12dc697dd99112609cb40881927))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55

## [1.0.0-beta.54](https://github.com/authup/authup/compare/v1.0.0-beta.53...v1.0.0-beta.54) (2026-07-22)


### ⚠ BREAKING CHANGES

* robot accounts and the robot_credentials grant are removed; recreate machine identities as OAuth2 clients (client_credentials grant). Existing robot rows and their role/permission bindings are dropped without data migration.

### Bug Fixes

* ensure consistent version for release ([d0f3dd2](https://github.com/authup/authup/commit/d0f3dd2ef93054ac7b677cf0fb26bbe8e64771bd))


### Code Refactoring

* remove robot entity in favor of clients ([#3275](https://github.com/authup/authup/issues/3275)) ([800684d](https://github.com/authup/authup/commit/800684dc9a620652b210baf16c50fb34e54bb224))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54

## [1.0.0-beta.53](https://github.com/authup/authup/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2026-07-17)


### ⚠ BREAKING CHANGES

* replace Client.is_confidential with auth_method and token_binding_method.

### Features

* add OAuth mutual TLS authentication ([#3261](https://github.com/authup/authup/issues/3261)) ([d3d88c6](https://github.com/authup/authup/commit/d3d88c6942059bf1a460d41f0a19c31932893b1c))
* add realm trust anchor management ([#3260](https://github.com/authup/authup/issues/3260)) ([3a822d8](https://github.com/authup/authup/commit/3a822d836a852dc8af3547ea288f10a45c2a583d))
* authorize access policy + persisted per-scope consent ([#3246](https://github.com/authup/authup/issues/3246)) ([b4b96c7](https://github.com/authup/authup/commit/b4b96c74e0bec4d332c39f5477744aa8cca1d44f))
* **client-web-kit:** mfa challenge step, enrollment ui, settings + admin tabs ([#3234](https://github.com/authup/authup/issues/3234)) ([aca3fd7](https://github.com/authup/authup/commit/aca3fd7d307b67bdb9bf996a8fb3022c37aa5cad))
* email otp as a second-factor kind ([#3235](https://github.com/authup/authup/issues/3235)) ([23fe82f](https://github.com/authup/authup/commit/23fe82f1b579d2722e092f94a309603f46a8bfda))
* key management api + lifecycle states ([#3256](https://github.com/authup/authup/issues/3256)) ([c69e9a2](https://github.com/authup/authup/commit/c69e9a2fc070a2c6bea71ec9e89bee2341e0cd88))
* mfa authenticator devices - totp + recovery codes ([#3232](https://github.com/authup/authup/issues/3232)) ([6d0422a](https://github.com/authup/authup/commit/6d0422a44a1205267dfb7fdb7e395147277c58dd))
* nudge recovery-code enrollment after email/webauthn factors ([#3247](https://github.com/authup/authup/issues/3247)) ([1642ca0](https://github.com/authup/authup/commit/1642ca076e202cc50953e3b90b12285f041de088))
* publish imported key certificates in JWKS ([#3257](https://github.com/authup/authup/issues/3257)) ([e59a075](https://github.com/authup/authup/commit/e59a0753bc2d7264ed4ad9dfa2a797d787d5a359))
* security event log with entity tracking, login throttle, metrics & admin ui ([#3229](https://github.com/authup/authup/issues/3229)) ([5a30950](https://github.com/authup/authup/commit/5a30950a4c819206a1cbafd221a0c3be692f53e6))
* webauthn / passkeys as a second factor ([#3236](https://github.com/authup/authup/issues/3236)) ([0e30e59](https://github.com/authup/authup/commit/0e30e59739fdad2b2f70c4d302c50e841741dabb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53

## [1.0.0-beta.52](https://github.com/authup/authup/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-07-11)


### ⚠ BREAKING CHANGES

* master-realm admins can no longer authorize into another realm's app via the built-in web client (login_required at /authorize, invalid_grant at /token). Previously-issued cross-realm artifacts were malformed, so intentional reliance is implausible; use realm-local accounts.
* all in-flight refresh tokens are invalidated on upgrade (the new table is empty), so active users sign in again once. The default access-token lifetime drops from 3600s to 900s.

### Features

* accept oidc prompt params and add auth_time/sid id_token claims ([#3195](https://github.com/authup/authup/issues/3195)) ([10da494](https://github.com/authup/authup/commit/10da494077471ee5b0e54aab24f3ab03610159ae))
* add "log out other devices" action and gate admin sessions tab on session_read ([#3192](https://github.com/authup/authup/issues/3192)) ([f8ac851](https://github.com/authup/authup/commit/f8ac851f1d1fbc6e3234a45d7e49d006dcba8603))
* add rp-initiated logout (end_session_endpoint) ([#3196](https://github.com/authup/authup/issues/3196)) ([865520c](https://github.com/authup/authup/commit/865520c245504d731b4f65e5d5688d6a447c72ad))
* admin bulk session revocation and current-session marking ([#3193](https://github.com/authup/authup/issues/3193)) ([2fb862b](https://github.com/authup/authup/commit/2fb862bd00b63ce4f6785100900c3f7d0729f7f4))
* configurable scope for oauth2/oidc identity providers ([#3226](https://github.com/authup/authup/issues/3226)) ([9449339](https://github.com/authup/authup/commit/94493396bc95070c300fe5da4e09bdd27073c31f))
* realm-bind the authorize and token flow ([#3194](https://github.com/authup/authup/issues/3194)) ([b7fc25c](https://github.com/authup/authup/commit/b7fc25c162f20db2b7d28448719c08b5a5e27211))
* security hardening quick wins ([#3227](https://github.com/authup/authup/issues/3227)) ([fce2e60](https://github.com/authup/authup/commit/fce2e600fc0bc0cafe4a5f1602dc887167bca630))
* session-management UI ([#3189](https://github.com/authup/authup/issues/3189)) ([7b617c8](https://github.com/authup/authup/commit/7b617c84213990d13fcf3d7961353274bfed02ff))
* silent prompt=none and prompt=login re-auth in the hosted authorize UI ([#3203](https://github.com/authup/authup/issues/3203)) ([e757c7c](https://github.com/authup/authup/commit/e757c7cbd078500f2bbe104ce7085db759f8669b))


### Bug Fixes

* add accessible names to icon-only action buttons on entity index pages ([#3182](https://github.com/authup/authup/issues/3182)) ([86e7eba](https://github.com/authup/authup/commit/86e7eba1ef9141d5b9160f8e14498687adafd520)), closes [#3153](https://github.com/authup/authup/issues/3153)
* post-review hardening for OAuth2 authorize + RP-initiated logout ([#3216](https://github.com/authup/authup/issues/3216)) ([423849d](https://github.com/authup/authup/commit/423849d186bb5577b129c3138fb3ef72365a3578))
* rp-initiated logout & authorize hardening (plan 041 audit follow-ups) ([#3197](https://github.com/authup/authup/issues/3197)) ([781c097](https://github.com/authup/authup/commit/781c097ef3a6fb911bc666eb76b580552afafa5e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52

## [1.0.0-beta.51](https://github.com/authup/authup/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-07-02)


### ⚠ BREAKING CHANGES

* **access,server-core:** actor-relative realm_scope with uniform entity + junction gating ([#3151](https://github.com/authup/authup/issues/3151))

### Features

* **client-web-kit:** confirm entity deletion via AlertDialog + upgrade @vuecs/* to latest ([#3173](https://github.com/authup/authup/issues/3173)) ([f48cdbf](https://github.com/authup/authup/commit/f48cdbf26ba34c4615d973c059a8a739f81cc069))
* **client-web-kit:** realm_scope UI follow-up — labels + assignment-time scope (plan 034) ([#3168](https://github.com/authup/authup/issues/3168)) ([aab1fb0](https://github.com/authup/authup/commit/aab1fb0a3e7e88f2edb9dc0ce23748b0cf8aae7a))


### Bug Fixes

* **access,server-core:** actor-relative realm_scope with uniform entity + junction gating ([#3151](https://github.com/authup/authup/issues/3151)) ([0617e44](https://github.com/authup/authup/commit/0617e4430585bb33ab1937b917d7b630f43c8b70))
* **deps:** normalize peer/dependency/dev classification across packages ([#3172](https://github.com/authup/authup/issues/3172)) ([c09f383](https://github.com/authup/authup/commit/c09f38315e5c569990b6540baf87cef0f3d8b663))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51

## [1.0.0-beta.50](https://github.com/authup/authup/compare/v1.0.0-beta.49...v1.0.0-beta.50) (2026-06-24)


### ⚠ BREAKING CHANGES

* **deps:** node >= 22.13 is now required; node 20 is no longer supported.

### Features

* localized error toasts, conformant OpenID discovery, UI cleanups ([#3137](https://github.com/authup/authup/issues/3137)) ([77bc9e5](https://github.com/authup/authup/commit/77bc9e580d961e6af63f79f8bcbad5b09155d23a))


### Miscellaneous Chores

* **deps:** upgrade hapic to v3, @hapic/oauth2 to v4, require node &gt;= 22 ([#3134](https://github.com/authup/authup/issues/3134)) ([07503bc](https://github.com/authup/authup/commit/07503bc87b43227cf1b5e03573242d22722a0b08))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50

## [1.0.0-beta.49](https://github.com/authup/authup/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2026-06-13)


### Features

* complete i18n UI coverage sweep (plan 021) ([#3121](https://github.com/authup/authup/issues/3121)) ([2a50bbe](https://github.com/authup/authup/commit/2a50bbe15feaa03320bb986b555f65036682dc05))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49

## [1.0.0-beta.48](https://github.com/authup/authup/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([4f983df](https://github.com/authup/authup/commit/4f983dff265156d412fad8b1f3e88d2f632c3e6d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48

## [1.0.0-beta.47](https://github.com/authup/authup/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2026-06-12)


### Features

* localized block-based mail templating via ilingo & @authup/i18n ([#3109](https://github.com/authup/authup/issues/3109)) ([69c776e](https://github.com/authup/authup/commit/69c776ef12b6a9746af1492f031392a4ba4644ed))
* per-realm web client login, realm chooser & backend-served auth workflow UI ([#3104](https://github.com/authup/authup/issues/3104)) ([80a1cce](https://github.com/authup/authup/commit/80a1cce4f137c4e94e70fd0c27404e6b5637a200))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47

## [1.0.0-beta.46](https://github.com/authup/authup/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([99f858b](https://github.com/authup/authup/commit/99f858b94e75e3c21c8293333aba53e8adbfbcdc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46

## [1.0.0-beta.45](https://github.com/authup/authup/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2026-06-09)


### Features

* **client-web:** brand theme overhaul — logo, surface tokens, dark-mode fixes ([#3096](https://github.com/authup/authup/issues/3096)) ([fed755b](https://github.com/authup/authup/commit/fed755b46bc3c0dc8b6cc0e73e4ccc798b2f8ca3))
* **i18n:** apply translations across client-web & client-web-kit UI ([#3095](https://github.com/authup/authup/issues/3095)) ([33dbe72](https://github.com/authup/authup/commit/33dbe72cf71ebd674d297dc378b5509b441b7de1))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
