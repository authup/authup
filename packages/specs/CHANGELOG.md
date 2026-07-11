# Changelog

## [1.0.0-beta.52](https://github.com/authup/authup/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-07-11)


### ⚠ BREAKING CHANGES

* master-realm admins can no longer authorize into another realm's app via the built-in web client (login_required at /authorize, invalid_grant at /token). Previously-issued cross-realm artifacts were malformed, so intentional reliance is implausible; use realm-local accounts.
* all in-flight refresh tokens are invalidated on upgrade (the new table is empty), so active users sign in again once. The default access-token lifetime drops from 3600s to 900s.

### Features

* accept oidc prompt params and add auth_time/sid id_token claims ([#3195](https://github.com/authup/authup/issues/3195)) ([10da494](https://github.com/authup/authup/commit/10da494077471ee5b0e54aab24f3ab03610159ae))
* add rp-initiated logout (end_session_endpoint) ([#3196](https://github.com/authup/authup/issues/3196)) ([865520c](https://github.com/authup/authup/commit/865520c245504d731b4f65e5d5688d6a447c72ad))
* configurable scope for oauth2/oidc identity providers ([#3226](https://github.com/authup/authup/issues/3226)) ([9449339](https://github.com/authup/authup/commit/94493396bc95070c300fe5da4e09bdd27073c31f))
* realm-bind the authorize and token flow ([#3194](https://github.com/authup/authup/issues/3194)) ([b7fc25c](https://github.com/authup/authup/commit/b7fc25c162f20db2b7d28448719c08b5a5e27211))
* rotate refresh tokens with replay detection and family revocation ([#3186](https://github.com/authup/authup/issues/3186)) ([8595c35](https://github.com/authup/authup/commit/8595c355a48da1ab9d80fdc94be7f4ecf48c307c))
* security hardening quick wins ([#3227](https://github.com/authup/authup/issues/3227)) ([fce2e60](https://github.com/authup/authup/commit/fce2e600fc0bc0cafe4a5f1602dc887167bca630))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52

## [1.0.0-beta.51](https://github.com/authup/authup/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-07-02)


### Bug Fixes

* **deps:** normalize peer/dependency/dev classification across packages ([#3172](https://github.com/authup/authup/issues/3172)) ([c09f383](https://github.com/authup/authup/commit/c09f38315e5c569990b6540baf87cef0f3d8b663))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51

## [1.0.0-beta.50](https://github.com/authup/authup/compare/v1.0.0-beta.49...v1.0.0-beta.50) (2026-06-24)


### ⚠ BREAKING CHANGES

* **deps:** node >= 22.13 is now required; node 20 is no longer supported.

### Bug Fixes

* ensure consistent version for release ([5554980](https://github.com/authup/authup/commit/55549808f266eaab8599018107c0fc1afb9f8e48))


### Miscellaneous Chores

* **deps:** upgrade hapic to v3, @hapic/oauth2 to v4, require node &gt;= 22 ([#3134](https://github.com/authup/authup/issues/3134)) ([07503bc](https://github.com/authup/authup/commit/07503bc87b43227cf1b5e03573242d22722a0b08))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50

## [1.0.0-beta.49](https://github.com/authup/authup/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2026-06-13)


### Bug Fixes

* ensure consistent version for release ([eb1cfcf](https://github.com/authup/authup/commit/eb1cfcfd676322fd6abb48f0a2f5ebfca5e146ad))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49

## [1.0.0-beta.48](https://github.com/authup/authup/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([fc8dae6](https://github.com/authup/authup/commit/fc8dae6050e84e190f977999abdc5d54070daa3c))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48

## [1.0.0-beta.47](https://github.com/authup/authup/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([15b08e3](https://github.com/authup/authup/commit/15b08e33c6475c68f3c950da537b14eab7ddaae4))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47

## [1.0.0-beta.46](https://github.com/authup/authup/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([99f858b](https://github.com/authup/authup/commit/99f858b94e75e3c21c8293333aba53e8adbfbcdc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46

## [1.0.0-beta.45](https://github.com/authup/authup/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([86e35f4](https://github.com/authup/authup/commit/86e35f476e4c213b434909098399f73fd59f2b77))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45

## [1.0.0-beta.44](https://github.com/authup/authup/compare/v1.0.0-beta.42...v1.0.0-beta.44) (2026-06-07)


### Bug Fixes

* ensure consistent version for release ([5159a23](https://github.com/authup/authup/commit/5159a233a5978bc910119b68f27130e0c2d570a7))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44

## [1.0.0-beta.42](https://github.com/authup/authup/compare/v1.0.0-beta.41...v1.0.0-beta.42) (2026-05-15)


### ⚠ BREAKING CHANGES

* **oauth2:** split OAuth2Error into spec-aligned subclasses ([#3054](https://github.com/authup/authup/issues/3054))
* **errors:** decouple AuthupError from @ebec/http, add inheritance-aware duck guards ([#3041](https://github.com/authup/authup/issues/3041))

### Bug Fixes

* ensure consistent version for release ([183b5dd](https://github.com/authup/authup/commit/183b5dd882b1ed5a27212a0051648850e7693917))


### Code Refactoring

* **errors:** decouple AuthupError from @ebec/http, add inheritance-aware duck guards ([#3041](https://github.com/authup/authup/issues/3041)) ([058c503](https://github.com/authup/authup/commit/058c503b615dc1eeb9728908ab4817b53fd24f23))
* **oauth2:** split OAuth2Error into spec-aligned subclasses ([#3054](https://github.com/authup/authup/issues/3054)) ([c40a37b](https://github.com/authup/authup/commit/c40a37bf5bbc065dfab95cba40bbff94f2b720f4))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42

## [1.0.0-beta.41](https://github.com/authup/authup/compare/v1.0.0-beta.40...v1.0.0-beta.41) (2026-05-08)


### Features

* **core-http-kit, server-core:** typed request/response signatures f… ([#3036](https://github.com/authup/authup/issues/3036)) ([b111d66](https://github.com/authup/authup/commit/b111d66212be41f97116b2eb83f9cbf1e3808dd3))
* **server-core:** migrate to routup v5 + swagger split ([#3030](https://github.com/authup/authup/issues/3030)) ([d14ae3a](https://github.com/authup/authup/commit/d14ae3a1b333ece7093a4275d6028a024d98307b))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41

## [1.0.0-beta.40](https://github.com/authup/authup/compare/v1.0.0-beta.39...v1.0.0-beta.40) (2026-04-30)


### Bug Fixes

* ensure consistent version for release ([c8da21d](https://github.com/authup/authup/commit/c8da21d2db725ab437dc3f5a976f8ea453014cbc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40

## [1.0.0-beta.39](https://github.com/authup/authup/compare/v1.0.0-beta.38...v1.0.0-beta.39) (2026-04-29)


### Bug Fixes

* enforce OAuth2 client authentication and PKCE per RFC 6749/7636 ([#3020](https://github.com/authup/authup/issues/3020)) ([bac38b1](https://github.com/authup/authup/commit/bac38b1f0c9368b6190fc872f146c4c4dae1b3fe))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39

## [1.0.0-beta.38](https://github.com/authup/authup/compare/v1.0.0-beta.37...v1.0.0-beta.38) (2026-04-28)


### Features

* include realm_access and global_access role claims in access to… ([#3013](https://github.com/authup/authup/issues/3013)) ([5a1d322](https://github.com/authup/authup/commit/5a1d322092a6d2cbffc9091b1a06295cee0ec772))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38

## [1.0.0-beta.37](https://github.com/authup/authup/compare/v1.0.0-beta.36...v1.0.0-beta.37) (2026-04-23)


### Bug Fixes

* ensure consistent version for release ([642b0e2](https://github.com/authup/authup/commit/642b0e23a21d707cc9b389cd0eb824af487bd4ce))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37

## [1.0.0-beta.36](https://github.com/authup/authup/compare/v1.0.0-beta.35...v1.0.0-beta.36) (2026-04-22)


### Bug Fixes

* touched files for release ([596b32f](https://github.com/authup/authup/commit/596b32ffc540b49e7deed6260714438397f65dbd))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36

## [1.0.0-beta.35](https://github.com/authup/authup/compare/v1.0.0-beta.34...v1.0.0-beta.35) (2026-04-16)


### Bug Fixes

* ensure consistent version for release ([e11b6c9](https://github.com/authup/authup/commit/e11b6c9050127d1651ecf5f5ea3ac10b05208111))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35

## [1.0.0-beta.34](https://github.com/authup/authup/compare/v1.0.0-beta.33...v1.0.0-beta.34) (2026-04-15)


### Bug Fixes

* ensure consistent version for release ([b2327b0](https://github.com/authup/authup/commit/b2327b033bd988b95a901d47e16e598cd7270999))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34

## [1.0.0-beta.33](https://github.com/authup/authup/compare/v1.0.0-beta.32...v1.0.0-beta.33) (2026-04-15)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 7 updates ([#2961](https://github.com/authup/authup/issues/2961)) ([3422973](https://github.com/authup/authup/commit/342297313ec1d76d2d367551e1e0bc484a66d158))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33

## [1.0.0-beta.32](https://github.com/authup/authup/compare/v1.0.0-beta.31...v1.0.0-beta.32) (2026-03-30)


### Bug Fixes

* enhance keywoards in package.json ([c45d1fc](https://github.com/authup/authup/commit/c45d1fcd8705192a4d8365ba70772e47f0f23497))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32

## [1.0.0-beta.31](https://github.com/authup/authup/compare/v1.0.0-beta.30...v1.0.0-beta.31) (2026-03-29)


### Bug Fixes

* touch files for version bump ([049737e](https://github.com/authup/authup/commit/049737ed3a6af5f3f7b4b7038e2790fdc5fad2b2))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31

## [1.0.0-beta.30](https://github.com/authup/authup/compare/v1.0.0-beta.29...v1.0.0-beta.30) (2026-02-26)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 23 updates ([#2856](https://github.com/authup/authup/issues/2856)) ([b037a7a](https://github.com/authup/authup/commit/b037a7ac40b69067fb87db1f5d10562f59bda273))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30

## [1.0.0-beta.29](https://github.com/authup/authup/compare/v1.0.0-beta.28...v1.0.0-beta.29) (2026-02-17)


### Bug Fixes

* **deps:** bump the majorprod group across 1 directory with 2 updates ([#2827](https://github.com/authup/authup/issues/2827)) ([2683f17](https://github.com/authup/authup/commit/2683f17f567333a46fe64616e40053a71b6e10b1))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29

## [1.0.0-beta.28](https://github.com/authup/authup/compare/v1.0.0-beta.27...v1.0.0-beta.28) (2026-01-13)


### ⚠ BREAKING CHANGES

* require esm import capabilities
* ESM only

### Features

* generate and hash client secret if required ([#2800](https://github.com/authup/authup/issues/2800)) ([36debf9](https://github.com/authup/authup/commit/36debf9167a37a21086675f21c378d76b2582eed))
* session management ([#2785](https://github.com/authup/authup/issues/2785)) ([c035b11](https://github.com/authup/authup/commit/c035b118ccdfc76ee61249ebeb4ee149f6792acb))


### Bug Fixes

* migrate from jest to vitest ([#2754](https://github.com/authup/authup/issues/2754)) ([191fd23](https://github.com/authup/authup/commit/191fd23035ee31eeca444f6d2165256a4f79ae72))
* normalize scope names to lower-case + renamed client-scope to scope repo ([cb5e23b](https://github.com/authup/authup/commit/cb5e23b39e8313f7068fdae10be3c83322f47cdd))
* use strict mode in server-kit package ([10bda02](https://github.com/authup/authup/commit/10bda02615ddbad44dc8e9db6c76790aae87a4f5))


### Miscellaneous Chores

* set min node engine version ([2d6e8a7](https://github.com/authup/authup/commit/2d6e8a794b731ccaa73f3da8c4e0e81fd1178a58))


### Code Refactoring

* migrated to esm only packages ([f988074](https://github.com/authup/authup/commit/f9880742e8fa6487afaf5878aedc520b37622a37))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28

## [1.0.0-beta.27](https://github.com/authup/authup/compare/v1.0.0-beta.26...v1.0.0-beta.27) (2025-07-17)


### Features

* refactored internal scope handling & authorize error formatting ([#2676](https://github.com/authup/authup/issues/2676)) ([9444ec2](https://github.com/authup/authup/commit/9444ec23a12e00c3397eda2bb28cbc08193f9a69))
* track authroization through idp redirect & callback ([#2669](https://github.com/authup/authup/issues/2669)) ([5cab0f4](https://github.com/authup/authup/commit/5cab0f405c2d9361f62d1aeb03f83fe8e23c7326))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27

## [1.0.0-beta.26](https://github.com/authup/authup/compare/v1.0.0-beta.25...v1.0.0-beta.26) (2025-04-14)


### Bug Fixes

* add e-mail to LICENSE file + set next version ([004ee6a](https://github.com/authup/authup/commit/004ee6a2a7fb93506535c8baeebff5981667036a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26

## [1.0.0-beta.25](https://github.com/authup/authup/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2025-04-08)


### Features

* correct client usage in security context ([#2579](https://github.com/authup/authup/issues/2579)) ([26f0118](https://github.com/authup/authup/commit/26f0118184c98bf04f499d19526b1cf0d034cad6))


### Bug Fixes

* update year range in LICENSE file ([8dd6da9](https://github.com/authup/authup/commit/8dd6da98cbfd8f910397de7391402af1e7517cc9))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25

## [1.0.0-beta.24](https://github.com/authup/authup/compare/v1.0.0-beta.23...v1.0.0-beta.24) (2025-01-18)


### Features

* refactor & split security package ([#2551](https://github.com/authup/authup/issues/2551)) ([1b38eed](https://github.com/authup/authup/commit/1b38eed204658cdde11b92f93027b843f47f43bf))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
