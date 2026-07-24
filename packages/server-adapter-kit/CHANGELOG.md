# Changelog

## [1.0.0-beta.55](https://github.com/authup/authup/compare/v1.0.0-beta.54...v1.0.0-beta.55) (2026-07-24)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 24 updates ([#3317](https://github.com/authup/authup/issues/3317)) ([e7a2b6b](https://github.com/authup/authup/commit/e7a2b6be6d1be3043a8e5b8578e80b1cef08d52e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/core-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/errors bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/server-kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/specs bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55

## [1.0.0-beta.54](https://github.com/authup/authup/compare/v1.0.0-beta.53...v1.0.0-beta.54) (2026-07-22)


### Bug Fixes

* ensure consistent version for release ([d0f3dd2](https://github.com/authup/authup/commit/d0f3dd2ef93054ac7b677cf0fb26bbe8e64771bd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/core-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/errors bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/server-kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/specs bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54

## [1.0.0-beta.53](https://github.com/authup/authup/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2026-07-17)


### ⚠ BREAKING CHANGES

* **server-adapter:** TokenVerifier.verify(token) without a thumbprint now fails closed (JWTError) on a certificate-bound token instead of returning it. Direct callers must pass the presented certificate's SHA-256 DER thumbprint via verify(token, { certificateThumbprint }).
* replace Client.is_confidential with auth_method and token_binding_method.

### Features

* add OAuth mutual TLS authentication ([#3261](https://github.com/authup/authup/issues/3261)) ([d3d88c6](https://github.com/authup/authup/commit/d3d88c6942059bf1a460d41f0a19c31932893b1c))


### Bug Fixes

* complete fresh email/webauthn-only mfa logins via a pending ticket ([#3244](https://github.com/authup/authup/issues/3244)) ([fe28588](https://github.com/authup/authup/commit/fe2858810e47af248b677db47816daa7a50294ff))
* **server-adapter:** enforce certificate binding inside TokenVerifier.verify() ([#3270](https://github.com/authup/authup/issues/3270)) ([0741dbc](https://github.com/authup/authup/commit/0741dbc0cd84fd0ee077d4ad5428556fde40efa7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/core-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/errors bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/server-kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/specs bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53

## [1.0.0-beta.52](https://github.com/authup/authup/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-07-11)


### Bug Fixes

* ensure consistent version for release ([130cc2e](https://github.com/authup/authup/commit/130cc2ec394ac940dcba771d25ef41b7dbc85964))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/core-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/errors bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/server-kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/specs bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52

## [1.0.0-beta.51](https://github.com/authup/authup/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-07-02)


### Bug Fixes

* **deps:** normalize peer/dependency/dev classification across packages ([#3172](https://github.com/authup/authup/issues/3172)) ([c09f383](https://github.com/authup/authup/commit/c09f38315e5c569990b6540baf87cef0f3d8b663))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-http-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/core-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/errors bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/server-kit bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51
    * @authup/specs bumped from ^1.0.0-beta.50 to ^1.0.0-beta.51

## [1.0.0-beta.50](https://github.com/authup/authup/compare/v1.0.0-beta.49...v1.0.0-beta.50) (2026-06-24)


### ⚠ BREAKING CHANGES

* **deps:** node >= 22.13 is now required; node 20 is no longer supported.

### Features

* localized error toasts, conformant OpenID discovery, UI cleanups ([#3137](https://github.com/authup/authup/issues/3137)) ([77bc9e5](https://github.com/authup/authup/commit/77bc9e580d961e6af63f79f8bcbad5b09155d23a))


### Miscellaneous Chores

* **deps:** upgrade hapic to v3, @hapic/oauth2 to v4, require node &gt;= 22 ([#3134](https://github.com/authup/authup/issues/3134)) ([07503bc](https://github.com/authup/authup/commit/07503bc87b43227cf1b5e03573242d22722a0b08))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/errors bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/specs bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/core-http-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50
    * @authup/server-kit bumped from ^1.0.0-beta.49 to ^1.0.0-beta.50

## [1.0.0-beta.49](https://github.com/authup/authup/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2026-06-13)


### Bug Fixes

* ensure consistent version for release ([eb1cfcf](https://github.com/authup/authup/commit/eb1cfcfd676322fd6abb48f0a2f5ebfca5e146ad))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/errors bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/specs bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/core-http-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49
    * @authup/server-kit bumped from ^1.0.0-beta.48 to ^1.0.0-beta.49

## [1.0.0-beta.48](https://github.com/authup/authup/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([4f983df](https://github.com/authup/authup/commit/4f983dff265156d412fad8b1f3e88d2f632c3e6d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/errors bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/specs bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/core-http-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48
    * @authup/server-kit bumped from ^1.0.0-beta.47 to ^1.0.0-beta.48

## [1.0.0-beta.47](https://github.com/authup/authup/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2026-06-12)


### Bug Fixes

* ensure consistent version for release ([15b08e3](https://github.com/authup/authup/commit/15b08e33c6475c68f3c950da537b14eab7ddaae4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/errors bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/specs bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/core-http-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47
    * @authup/server-kit bumped from ^1.0.0-beta.46 to ^1.0.0-beta.47

## [1.0.0-beta.46](https://github.com/authup/authup/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([99f858b](https://github.com/authup/authup/commit/99f858b94e75e3c21c8293333aba53e8adbfbcdc))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/errors bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/specs bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/core-http-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46
    * @authup/server-kit bumped from ^1.0.0-beta.45 to ^1.0.0-beta.46

## [1.0.0-beta.45](https://github.com/authup/authup/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2026-06-09)


### Bug Fixes

* ensure consistent version for release ([86e35f4](https://github.com/authup/authup/commit/86e35f476e4c213b434909098399f73fd59f2b77))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/errors bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/specs bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/core-http-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45
    * @authup/server-kit bumped from ^1.0.0-beta.44 to ^1.0.0-beta.45

## [1.0.0-beta.44](https://github.com/authup/authup/compare/v1.0.0-beta.42...v1.0.0-beta.44) (2026-06-07)


### Bug Fixes

* ensure consistent version for release ([5159a23](https://github.com/authup/authup/commit/5159a233a5978bc910119b68f27130e0c2d570a7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/errors bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/specs bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/core-http-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44
    * @authup/server-kit bumped from ^1.0.0-beta.42 to ^1.0.0-beta.44

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
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/errors bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/specs bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/core-http-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42
    * @authup/server-kit bumped from ^1.0.0-beta.41 to ^1.0.0-beta.42

## [1.0.0-beta.41](https://github.com/authup/authup/compare/v1.0.0-beta.40...v1.0.0-beta.41) (2026-05-08)


### ⚠ BREAKING CHANGES

* **server-adapter:** rename http→node, add web with verify primitives ([#3038](https://github.com/authup/authup/issues/3038))

### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 15 updates ([#3028](https://github.com/authup/authup/issues/3028)) ([45a5732](https://github.com/authup/authup/commit/45a57324183ef849ab5fddea60dc11d3723b926c))


### Code Refactoring

* **server-adapter:** rename http→node, add web with verify primitives ([#3038](https://github.com/authup/authup/issues/3038)) ([f66347a](https://github.com/authup/authup/commit/f66347a4d0d8c87f484796831b1ae02d92eecabe))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/errors bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/specs bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/core-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/core-http-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41
    * @authup/server-kit bumped from ^1.0.0-beta.40 to ^1.0.0-beta.41

## [1.0.0-beta.40](https://github.com/authup/authup/compare/v1.0.0-beta.39...v1.0.0-beta.40) (2026-04-30)


### Bug Fixes

* ensure consistent version for release ([c8da21d](https://github.com/authup/authup/commit/c8da21d2db725ab437dc3f5a976f8ea453014cbc))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/errors bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/specs bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/core-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/core-http-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40
    * @authup/server-kit bumped from ^1.0.0-beta.39 to ^1.0.0-beta.40

## [1.0.0-beta.39](https://github.com/authup/authup/compare/v1.0.0-beta.38...v1.0.0-beta.39) (2026-04-29)


### Bug Fixes

* ensure consistent version for release ([2cad5ac](https://github.com/authup/authup/commit/2cad5acd83d3c1ed9973be7c5a90dfa59a8c782a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/errors bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/specs bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/core-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/core-http-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39
    * @authup/server-kit bumped from ^1.0.0-beta.38 to ^1.0.0-beta.39

## [1.0.0-beta.38](https://github.com/authup/authup/compare/v1.0.0-beta.37...v1.0.0-beta.38) (2026-04-28)


### Features

* declarative self-manage permissions via ATTRIBUTE_NAMES policies ([#3019](https://github.com/authup/authup/issues/3019)) ([240eb45](https://github.com/authup/authup/commit/240eb45c0be5eb02adefbfe8306e3a134e91b0d4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/errors bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/specs bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/core-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/core-http-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38
    * @authup/server-kit bumped from ^1.0.0-beta.37 to ^1.0.0-beta.38

## [1.0.0-beta.37](https://github.com/authup/authup/compare/v1.0.0-beta.36...v1.0.0-beta.37) (2026-04-23)


### Bug Fixes

* ensure consistent version for release ([642b0e2](https://github.com/authup/authup/commit/642b0e23a21d707cc9b389cd0eb824af487bd4ce))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/errors bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/specs bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/core-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/core-http-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37
    * @authup/server-kit bumped from ^1.0.0-beta.36 to ^1.0.0-beta.37

## [1.0.0-beta.36](https://github.com/authup/authup/compare/v1.0.0-beta.35...v1.0.0-beta.36) (2026-04-22)


### Bug Fixes

* touched files for release ([596b32f](https://github.com/authup/authup/commit/596b32ffc540b49e7deed6260714438397f65dbd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/errors bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/specs bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/core-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/core-http-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36
    * @authup/server-kit bumped from ^1.0.0-beta.35 to ^1.0.0-beta.36

## [1.0.0-beta.35](https://github.com/authup/authup/compare/v1.0.0-beta.34...v1.0.0-beta.35) (2026-04-16)


### Bug Fixes

* ensure consistent version for release ([e11b6c9](https://github.com/authup/authup/commit/e11b6c9050127d1651ecf5f5ea3ac10b05208111))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/errors bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/specs bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/core-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/core-http-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35
    * @authup/server-kit bumped from ^1.0.0-beta.34 to ^1.0.0-beta.35

## [1.0.0-beta.34](https://github.com/authup/authup/compare/v1.0.0-beta.33...v1.0.0-beta.34) (2026-04-15)


### Bug Fixes

* ensure consistent version for release ([b2327b0](https://github.com/authup/authup/commit/b2327b033bd988b95a901d47e16e598cd7270999))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/errors bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/specs bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/core-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/core-http-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34
    * @authup/server-kit bumped from ^1.0.0-beta.33 to ^1.0.0-beta.34

## [1.0.0-beta.33](https://github.com/authup/authup/compare/v1.0.0-beta.32...v1.0.0-beta.33) (2026-04-15)


### Bug Fixes

* minor changes to bump version ([9207dda](https://github.com/authup/authup/commit/9207dda00f805bc76c6c104b3cbb3a4485ea83eb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/errors bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/specs bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/core-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/core-http-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/server-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33

## [1.0.0-beta.32](https://github.com/authup/authup/compare/v1.0.0-beta.31...v1.0.0-beta.32) (2026-03-30)


### Bug Fixes

* enhance keywoards in package.json ([c45d1fc](https://github.com/authup/authup/commit/c45d1fcd8705192a4d8365ba70772e47f0f23497))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/errors bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/specs bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/core-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/core-http-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/server-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32

## [1.0.0-beta.31](https://github.com/authup/authup/compare/v1.0.0-beta.30...v1.0.0-beta.31) (2026-03-29)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 7 updates ([#2918](https://github.com/authup/authup/issues/2918)) ([3115cdd](https://github.com/authup/authup/commit/3115cdd016569cca2164844e2b0c0235cf17c233))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/errors bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/specs bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/core-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/core-http-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/server-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31

## [1.0.0-beta.30](https://github.com/authup/adapters/compare/v1.0.0-beta.28...v1.0.0-beta.30) (2026-02-27)


### Bug Fixes

* **deps:** bump @authup/* to v1.0.0-beta.30 ([b89bfd9](https://github.com/authup/adapters/commit/b89bfd9cc658ddef8debc87bb9decb30404006ab))
* **deps:** bump dependencies ([79b9d1a](https://github.com/authup/adapters/commit/79b9d1a7ed595d7f372dbfbeb01801112a95892b))

## [1.0.0-beta.28](https://github.com/authup/adapters/compare/v1.0.0-beta.27...v1.0.0-beta.28) (2026-01-13)


### ⚠ BREAKING CHANGES

* esm only

### Features

* explicit cache + tokenVerifier instance ([2a69258](https://github.com/authup/adapters/commit/2a69258addaf36f06ec7cc128bf993f20a2f0202))


### Bug Fixes

* bump dependencies ([220d987](https://github.com/authup/adapters/commit/220d987512723231f3a03b878692f2a4f5975be8))
* **deps:** bump the majorprod group across 1 directory with 2 updates ([#170](https://github.com/authup/adapters/issues/170)) ([d4a9f69](https://github.com/authup/adapters/commit/d4a9f691cbe63ea5b0eddf53b721f4d224db572b))

## [1.0.0-beta.27](https://github.com/authup/adapters/compare/v1.0.0-beta.26...v1.0.0-beta.27) (2025-07-17)


### Bug Fixes

* **deps:** bump authup to v1.0.0-beta.27 ([dfc919b](https://github.com/authup/adapters/commit/dfc919bf5b333300c91a06f85dff85e5b30202ab))

## [1.0.0-beta.26](https://github.com/authup/adapters/compare/v1.0.0-beta.25...v1.0.0-beta.26) (2025-04-14)


### Bug Fixes

* integrated new authup version v1.0.0-beta.26 ([87ec006](https://github.com/authup/adapters/commit/87ec006782ea240382c2a80960661b9e2c008713))

## [1.0.0-beta.25](https://github.com/authup/adapters/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2025-04-10)


### Bug Fixes

* bump authup to v1.0.0-beta.25 ([dc9cc9c](https://github.com/authup/adapters/commit/dc9cc9c81886ba94a78193df377fc295aaa3b0ca))
* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#137](https://github.com/authup/adapters/issues/137)) ([f22ec8f](https://github.com/authup/adapters/commit/f22ec8fdab7b3dee0c3de00417ca9e8115fa56c0))

## [1.0.0-beta.24](https://github.com/authup/adapters/compare/v1.0.0-beta.20...v1.0.0-beta.24) (2025-01-21)


### Bug Fixes

* **deps:** bump @hapic/oauth2 from 2.4.2 to 3.1.0 in the majorprod group ([#107](https://github.com/authup/adapters/issues/107)) ([31e8df0](https://github.com/authup/adapters/commit/31e8df0f686da0c0ad95e24e9908314d7c8df3c1))
* **deps:** bump the minorandpatch group with 11 updates ([#109](https://github.com/authup/adapters/issues/109)) ([705204c](https://github.com/authup/adapters/commit/705204cc313f451432a76ea699116658c7757d5a))
* updated authup deps to v1.0.0-beta.24 ([9966e8e](https://github.com/authup/adapters/commit/9966e8ea1ddaa2ed79a79d9bbf3e83649e24e51a))

## 1.0.0-beta.20 (2024-09-29)


### Features

* init project from source ([9bb2008](https://github.com/authup/adapters/commit/9bb20089d4cfce0511789858b49fa5c51eb4b6f2))
* use ttl-cache library for memory cache ([7877a87](https://github.com/authup/adapters/commit/7877a875e0076c320b617643875f6322b69cb6e4))


### Bug Fixes

* **deps:** bump jose from 5.9.2 to 5.9.3 ([#5](https://github.com/authup/adapters/issues/5)) ([fbb58e5](https://github.com/authup/adapters/commit/fbb58e5fe85a8ea518bc34403f8501ce7fea015c))
* minor restructuring of token verifier ([65ab008](https://github.com/authup/adapters/commit/65ab00896e30d478007c071813cb11891fdd1108))
