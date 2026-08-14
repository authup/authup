# Changelog

## [1.0.0-beta.61](https://github.com/authup/authup/compare/v1.0.0-beta.60...v1.0.0-beta.61) (2026-08-14)


### Bug Fixes

* ensure consistent version for release ([0369d9f](https://github.com/authup/authup/commit/0369d9f2d8fbb0ee7bf1d742af5b31e7a16f55e6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61
    * @authup/kit bumped from ^1.0.0-beta.60 to ^1.0.0-beta.61

## [1.0.0-beta.60](https://github.com/authup/authup/compare/v1.0.0-beta.59...v1.0.0-beta.60) (2026-08-13)


### Features

* schema index declarations backed by entity indexes (rapiq 2.0.0-beta.20) ([#3425](https://github.com/authup/authup/issues/3425)) ([d34afb7](https://github.com/authup/authup/commit/d34afb76143f08119e9c449201f975d8ba797788))


### Bug Fixes

* **deps:** bump @rapiq/* to 2.0.0-beta.18 ([a01fabb](https://github.com/authup/authup/commit/a01fabbb6c7bf6671f3ccb757cd0c4c695510679))
* **deps:** bump @rapiq/* to 2.0.0-beta.19 ([21c92fb](https://github.com/authup/authup/commit/21c92fb67aead43a68c0152ef8d15507c2bf9130))
* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#3414](https://github.com/authup/authup/issues/3414)) ([f0706f2](https://github.com/authup/authup/commit/f0706f211884be8154766bd24ea45f3f696211ed))
* redo the v1.0.0-beta.60 release with consistent versions ([#3444](https://github.com/authup/authup/issues/3444)) ([5c04dc8](https://github.com/authup/authup/commit/5c04dc8daf28a01037949d8cb17e1de67ba10e6b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60
    * @authup/kit bumped from ^1.0.0-beta.59 to ^1.0.0-beta.60

## [1.0.0-beta.59](https://github.com/authup/authup/compare/v1.0.0-beta.58...v1.0.0-beta.59) (2026-08-04)


### Bug Fixes

* **deps:** bump @rapiq/* to 2.0.0-beta.15 ([66958e7](https://github.com/authup/authup/commit/66958e7f11a3462dce3cea6b74f0435c780524e7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59
    * @authup/kit bumped from ^1.0.0-beta.58 to ^1.0.0-beta.59

## [1.0.0-beta.58](https://github.com/authup/authup/compare/v1.0.0-beta.57...v1.0.0-beta.58) (2026-07-31)


### Bug Fixes

* **deps:** bump ilingo, validup and trapi to their latest versions ([6d69f90](https://github.com/authup/authup/commit/6d69f90665f23022de5bf3ef8c6916a50c449494))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58
    * @authup/kit bumped from ^1.0.0-beta.57 to ^1.0.0-beta.58

## [1.0.0-beta.57](https://github.com/authup/authup/compare/v1.0.0-beta.56...v1.0.0-beta.57) (2026-07-29)


### Features

* let attributeNames policy evaluate a list of attribute names ([#3326](https://github.com/authup/authup/issues/3326)) ([989ecc4](https://github.com/authup/authup/commit/989ecc47f957f0eecfd4945416976ec2066d9f9e)), closes [#3321](https://github.com/authup/authup/issues/3321)


### Bug Fixes

* complete schema field projections and re-target role client FK ([#3324](https://github.com/authup/authup/issues/3324)) ([9eec343](https://github.com/authup/authup/commit/9eec343965bf98990560b0092d26bd0c82a2561f))
* **deps:** bump @rapiq/* to 2.0.0-beta.11 ([#3333](https://github.com/authup/authup/issues/3333)) ([728dbb1](https://github.com/authup/authup/commit/728dbb1f16deb14c5901f0406a34ae50c791dbd6))
* **deps:** replace @rapiq/{typeorm,sql,memory} with @rapiq/adapter-* ([9219e75](https://github.com/authup/authup/commit/9219e75c10bf1ba9164804f8676b049b44dc549c)), closes [#3341](https://github.com/authup/authup/issues/3341)
* **errors:** keep guard inheritance match for JSON-rehydrated errors ([#3331](https://github.com/authup/authup/issues/3331)) ([352fccc](https://github.com/authup/authup/commit/352fccc591be502f20b4928767f7457bea278e1c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57
    * @authup/kit bumped from ^1.0.0-beta.56 to ^1.0.0-beta.57

## [1.0.0-beta.56](https://github.com/authup/authup/compare/v1.0.0-beta.55...v1.0.0-beta.56) (2026-07-24)


### Bug Fixes

* **deps:** bump @rapiq/* to 2.0.0-beta.9 ([6475f2b](https://github.com/authup/authup/commit/6475f2b0ec1ad69b4412540a3385d03eca5c3746))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56
    * @authup/kit bumped from ^1.0.0-beta.55 to ^1.0.0-beta.56

## [1.0.0-beta.55](https://github.com/authup/authup/compare/v1.0.0-beta.54...v1.0.0-beta.55) (2026-07-24)


### Bug Fixes

* repair build pipeline and bump rapiq to 2.0.0-beta.8 ([7a8f8f7](https://github.com/authup/authup/commit/7a8f8f7d4a3e84a9782823622e010242c34c0982))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55
    * @authup/kit bumped from ^1.0.0-beta.54 to ^1.0.0-beta.55

## [1.0.0-beta.54](https://github.com/authup/authup/compare/v1.0.0-beta.53...v1.0.0-beta.54) (2026-07-22)


### ⚠ BREAKING CHANGES

* consumers now build queries with rapiq v2 canonical parameter keys (filters/relations) and typed operator objects.
* robot accounts and the robot_credentials grant are removed; recreate machine identities as OAuth2 clients (client_credentials grant). Existing robot rows and their role/permission bindings are dropped without data migration.
* camelCase entity properties, domain types & management API ([#3273](https://github.com/authup/authup/issues/3273))

### Features

* **access:** derive preEvaluate from data availability (tri-state policy engine) ([#3290](https://github.com/authup/authup/issues/3290)) ([fe9dd53](https://github.com/authup/authup/commit/fe9dd538ffe9d4fffe7e584f7ed00d9d0bef64af))
* **access:** lower pending policies to rapiq conditions (toCondition / WHERE pushdown) ([#3291](https://github.com/authup/authup/issues/3291)) ([92b0827](https://github.com/authup/authup/commit/92b08270208fbb18a2b84f1ae86e808314330abf))
* compile permissions to row conditions for getMany authorization ([#3292](https://github.com/authup/authup/issues/3292)) ([dfcf6b8](https://github.com/authup/authup/commit/dfcf6b81bcf1f157ee9278fc5b663b7f562a8f94))
* **server-core:** validate entity schemas against typeorm metadata at boot ([#3285](https://github.com/authup/authup/issues/3285)) ([25577f9](https://github.com/authup/authup/commit/25577f95a6dfe0818ed2b6cb735adb1b12e43830))


### Bug Fixes

* **access:** fail-closed data-availability gate + pre-camelCase policy upgrade note ([#3299](https://github.com/authup/authup/issues/3299)) ([7d7b326](https://github.com/authup/authup/commit/7d7b326ff20d9adca871bc555af2777b3a7add06))
* **deps:** bump [@rapiq](https://github.com/rapiq) packages to v2.0.0-beta.2 ([#3281](https://github.com/authup/authup/issues/3281)) ([cc48cbb](https://github.com/authup/authup/commit/cc48cbb162b74fb36bb3265bea6b7a985f9d6918))
* reject childless composite policy instead of a silent un-satisfiable deny ([#3305](https://github.com/authup/authup/issues/3305)) ([be701f7](https://github.com/authup/authup/commit/be701f7a49480a1e3685b869df484a7b24478e95)), closes [#3304](https://github.com/authup/authup/issues/3304)
* **server-core:** authorize relation paths reached via filter/sort/field keys ([#3310](https://github.com/authup/authup/issues/3310)) ([b98e6c1](https://github.com/authup/authup/commit/b98e6c1ca8542b6961cb89e65873ccb9abd92e5f))


### Code Refactoring

* camelCase entity properties, domain types & management API ([#3273](https://github.com/authup/authup/issues/3273)) ([c31b20e](https://github.com/authup/authup/commit/c31b20ee9fd037e96bbcaee2eae1d6386174f52b))
* migrate to rapiq v2, typeorm 1.1.0 and typeorm-extension v4 ([#3276](https://github.com/authup/authup/issues/3276)) ([ee8c9f7](https://github.com/authup/authup/commit/ee8c9f708a195cc5dd385965d16189b6640e38dc))
* remove robot entity in favor of clients ([#3275](https://github.com/authup/authup/issues/3275)) ([800684d](https://github.com/authup/authup/commit/800684dc9a620652b210baf16c50fb34e54bb224))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54
    * @authup/kit bumped from ^1.0.0-beta.53 to ^1.0.0-beta.54

## [1.0.0-beta.53](https://github.com/authup/authup/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2026-07-17)


### Bug Fixes

* ensure consistent version for release ([280b376](https://github.com/authup/authup/commit/280b3761e423c554193401499e2ee155f18c55bc))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53
    * @authup/kit bumped from ^1.0.0-beta.52 to ^1.0.0-beta.53

## [1.0.0-beta.52](https://github.com/authup/authup/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2026-07-11)


### Bug Fixes

* ensure consistent version for release ([130cc2e](https://github.com/authup/authup/commit/130cc2ec394ac940dcba771d25ef41b7dbc85964))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/errors bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52
    * @authup/kit bumped from ^1.0.0-beta.51 to ^1.0.0-beta.52

## [1.0.0-beta.51](https://github.com/authup/authup/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2026-07-02)


### ⚠ BREAKING CHANGES

* **access,server-core:** compare policy content in isSuperset/grantDominates ([#3159](https://github.com/authup/authup/issues/3159)) (#3162)
* **access,server-core:** per-grant realm-reach disjunction via aggregatePermissionPolicyBindings ([#3158](https://github.com/authup/authup/issues/3158))
* **access,server-core:** PermissionEvaluationContext.input is renamed to data. Callers of permissionEvaluator.evaluate/preEvaluate/*OneOf must pass { data } instead of { input }.
* **access,server-core:** actor-relative realm_scope with uniform entity + junction gating ([#3151](https://github.com/authup/authup/issues/3151))

### Bug Fixes

* **access,server-core:** actor-relative realm_scope with uniform entity + junction gating ([#3151](https://github.com/authup/authup/issues/3151)) ([0617e44](https://github.com/authup/authup/commit/0617e4430585bb33ab1937b917d7b630f43c8b70))
* **access,server-core:** compare policy content in isSuperset/grantDominates ([#3159](https://github.com/authup/authup/issues/3159)) ([#3162](https://github.com/authup/authup/issues/3162)) ([f3d11f2](https://github.com/authup/authup/commit/f3d11f28931a0d862c79e0a70ffb87549aae525f))
* **access,server-core:** per-grant realm-reach disjunction via aggregatePermissionPolicyBindings ([#3158](https://github.com/authup/authup/issues/3158)) ([1a1b1ce](https://github.com/authup/authup/commit/1a1b1ceef91042af3d8301f8cf445842788eccfa))
* **deps:** normalize peer/dependency/dev classification across packages ([#3172](https://github.com/authup/authup/issues/3172)) ([c09f383](https://github.com/authup/authup/commit/c09f38315e5c569990b6540baf87cef0f3d8b663))


### Code Refactoring

* **access,server-core:** resource realm via the realmMatch policy key + typed PolicyData construction ([#3157](https://github.com/authup/authup/issues/3157)) ([07a0c92](https://github.com/authup/authup/commit/07a0c923cd8c9c07a6342b311bbd995d5fc6bbeb))


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

* ensure consistent version for release ([4f983df](https://github.com/authup/authup/commit/4f983dff265156d412fad8b1f3e88d2f632c3e6d))


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


### ⚠ BREAKING CHANGES

* `@authup/client-web-kit` no longer re-exports `@authup/i18n`, `@authup/access` no longer re-exports `DecisionStrategy`, and `@authup/client-web-theme` no longer re-exports `clientWebKitTheme` / `merge`. Import these from their source packages directly.

### Bug Fixes

* stop re-exporting external packages through internal barrels (fixes @authup/i18n runtime crash) ([#3101](https://github.com/authup/authup/issues/3101)) ([5dd751a](https://github.com/authup/authup/commit/5dd751ad980ac730d0805f7fd7057450ea079418))


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


### ⚠ BREAKING CHANGES

* migrate forms to validup-vue and nav to @vuecs/navigation ([#3086](https://github.com/authup/authup/issues/3086))

### Features

* migrate forms to validup-vue and nav to @vuecs/navigation ([#3086](https://github.com/authup/authup/issues/3086)) ([ce88592](https://github.com/authup/authup/commit/ce885927b01fa0550a059b3c99f1809318671fa6))


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

* **errors:** decouple AuthupError from @ebec/http, add inheritance-aware duck guards ([#3041](https://github.com/authup/authup/issues/3041))

### Bug Fixes

* **deps:** bump @ucast/mongo2js ([#3035](https://github.com/authup/authup/issues/3035)) ([28aefbd](https://github.com/authup/authup/commit/28aefbd2f1f9a08bf03c02816acc67d3fbdaf15e))


### Code Refactoring

* **errors:** decouple AuthupError from @ebec/http, add inheritance-aware duck guards ([#3041](https://github.com/authup/authup/issues/3041)) ([058c503](https://github.com/authup/authup/commit/058c503b615dc1eeb9728908ab4817b53fd24f23))


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

* **server-core:** migrate to routup v5 + swagger split ([#3030](https://github.com/authup/authup/issues/3030)) ([d14ae3a](https://github.com/authup/authup/commit/d14ae3a1b333ece7093a4275d6028a024d98307b))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 15 updates ([#3028](https://github.com/authup/authup/issues/3028)) ([45a5732](https://github.com/authup/authup/commit/45a57324183ef849ab5fddea60dc11d3723b926c))


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

* ensure consistent version for release ([2cad5ac](https://github.com/authup/authup/commit/2cad5acd83d3c1ed9973be7c5a90dfa59a8c782a))


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

* declarative self-manage permissions via ATTRIBUTE_NAMES policies ([#3019](https://github.com/authup/authup/issues/3019)) ([240eb45](https://github.com/authup/authup/commit/240eb45c0be5eb02adefbfe8306e3a134e91b0d4))


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

* touched missing file & updated version-bump skill ([9acbca9](https://github.com/authup/authup/commit/9acbca9fd01b042451615f7ba5b76154334aae8a))


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
    * @authup/core-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/errors bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
  * peerDependencies
    * @authup/core-kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/errors bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33
    * @authup/kit bumped from ^1.0.0-beta.32 to ^1.0.0-beta.33

## [1.0.0-beta.32](https://github.com/authup/authup/compare/v1.0.0-beta.31...v1.0.0-beta.32) (2026-03-30)


### Bug Fixes

* enhance keywoards in package.json ([c45d1fc](https://github.com/authup/authup/commit/c45d1fcd8705192a4d8365ba70772e47f0f23497))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/errors bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
  * peerDependencies
    * @authup/core-kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/errors bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32
    * @authup/kit bumped from ^1.0.0-beta.31 to ^1.0.0-beta.32

## [1.0.0-beta.31](https://github.com/authup/authup/compare/v1.0.0-beta.30...v1.0.0-beta.31) (2026-03-29)


### Features

* add system policy provisioning and config-gated permission backfill ([#2904](https://github.com/authup/authup/issues/2904)) ([50037cb](https://github.com/authup/authup/commit/50037cbe613e3b615747cf1272929c8fcb27f97d))
* policy-based realm scoping and global entity support ([#2928](https://github.com/authup/authup/issues/2928)) ([1ae7d10](https://github.com/authup/authup/commit/1ae7d101bae1b43b32e7df2eb3c5a18e6328ac87))


### Bug Fixes

* support realm-scoped permissions in junction permission assignment ([b41b9c7](https://github.com/authup/authup/commit/b41b9c7614a2ca926688b1ccdbbab25e549e420a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/errors bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
  * peerDependencies
    * @authup/core-kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/errors bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31
    * @authup/kit bumped from ^1.0.0-beta.30 to ^1.0.0-beta.31

## [1.0.0-beta.30](https://github.com/authup/authup/compare/v1.0.0-beta.29...v1.0.0-beta.30) (2026-02-26)


### Bug Fixes

* minor adjustments to bump version ([db455fd](https://github.com/authup/authup/commit/db455fd9087197aa29a19b8772cd422c82760cf6))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/errors bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
  * peerDependencies
    * @authup/errors bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30
    * @authup/kit bumped from ^1.0.0-beta.29 to ^1.0.0-beta.30

## [1.0.0-beta.29](https://github.com/authup/authup/compare/v1.0.0-beta.28...v1.0.0-beta.29) (2026-02-17)


### Features

* **access:** abstractions for permission checker ([c26a1ce](https://github.com/authup/authup/commit/c26a1ce187296f60dee446bddd0adb70535e9882))
* refactor policy issue/error handling ([#2831](https://github.com/authup/authup/issues/2831)) ([5bf81f5](https://github.com/authup/authup/commit/5bf81f5de8feb1d5e349e9c570618b1321d6ff3b))


### Bug Fixes

* **deps:** bump the majorprod group across 1 directory with 2 updates ([#2827](https://github.com/authup/authup/issues/2827)) ([2683f17](https://github.com/authup/authup/commit/2683f17f567333a46fe64616e40053a71b6e10b1))
* **deps:** bump the minorandpatch group across 1 directory with 13 updates ([#2833](https://github.com/authup/authup/issues/2833)) ([ab22d62](https://github.com/authup/authup/commit/ab22d62ff8f98bd04e8e960c37be25479a6c77b8))
* **deps:** bump the minorandpatch group across 1 directory with 19 updates ([#2815](https://github.com/authup/authup/issues/2815)) ([e301e20](https://github.com/authup/authup/commit/e301e205d283ee51196495faf6523763a5a632c5))


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

### Bug Fixes

* dayOfYear validator in time policy ([5c8bb9f](https://github.com/authup/authup/commit/5c8bb9fb93b9e78d3da514ad1f0433c1b93e9f9c))
* **deps:** bump the minorandpatch group across 1 directory with 13 updates ([#2780](https://github.com/authup/authup/issues/2780)) ([41eba21](https://github.com/authup/authup/commit/41eba214494520ad418d4a3ac3ccee3cd96dc19e))
* **deps:** bump the minorandpatch group across 1 directory with 14 updates ([#2797](https://github.com/authup/authup/issues/2797)) ([56489db](https://github.com/authup/authup/commit/56489db9f7e35a9467ff5c91b6833d243ab9c738))
* **deps:** bump the minorandpatch group with 34 updates ([#2756](https://github.com/authup/authup/issues/2756)) ([9240ce1](https://github.com/authup/authup/commit/9240ce18515ea9501a6790a53efe375a4c2b28ac))
* **deps:** bump the minorandpatch group with 8 updates ([#2769](https://github.com/authup/authup/issues/2769)) ([d86fa30](https://github.com/authup/authup/commit/d86fa30bed013f4245cecc0d03758b1f8b219da1))
* fn to fix query in attributes policy ([565bd2b](https://github.com/authup/authup/commit/565bd2b11bd631af39673c9cd885c902c7d29602))
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


### Bug Fixes

* cleanup policy evaluator function signature ([4cd41db](https://github.com/authup/authup/commit/4cd41db762d00b60303165630f93c8da3f8074da))
* **deps:** bump dependencies ([c5e66dd](https://github.com/authup/authup/commit/c5e66ddd50ea4f4b596e47ff99e3a3d6c8133e22))
* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#2672](https://github.com/authup/authup/issues/2672)) ([242bedd](https://github.com/authup/authup/commit/242bedd9c611b84293ba75cc9427892c7ac962c6))
* **deps:** bump the minorandpatch group across 1 directory with 21 updates ([#2653](https://github.com/authup/authup/issues/2653)) ([eb5cdcd](https://github.com/authup/authup/commit/eb5cdcd775466506ec4d86166e6de55e9868f46b))
* **deps:** bump the minorandpatch group across 1 directory with 22 updates ([#2687](https://github.com/authup/authup/issues/2687)) ([f10970b](https://github.com/authup/authup/commit/f10970b89ae166cb33de9841bb221b40eb28081c))


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
* initial policy components ([#2562](https://github.com/authup/authup/issues/2562)) ([f73cd74](https://github.com/authup/authup/commit/f73cd7476970f563a07307ee12e1742de9eeaf32))
* permit tree like policy submission ([#2560](https://github.com/authup/authup/issues/2560)) ([b43afdb](https://github.com/authup/authup/commit/b43afdbacf63c3e809b34a50a576e12c9133367c))


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
