# Change Log

## [1.0.0-beta.29](https://github.com/authup/authup/compare/v1.0.0-beta.28...v1.0.0-beta.29) (2026-02-17)


### Features

* provisioning module  ([#2836](https://github.com/authup/authup/issues/2836)) ([08398cb](https://github.com/authup/authup/commit/08398cb587b6827108121d59f2c80ed3913b3aa4))
* refactor policy issue/error handling ([#2831](https://github.com/authup/authup/issues/2831)) ([5bf81f5](https://github.com/authup/authup/commit/5bf81f5de8feb1d5e349e9c570618b1321d6ff3b))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 19 updates ([#2815](https://github.com/authup/authup/issues/2815)) ([e301e20](https://github.com/authup/authup/commit/e301e205d283ee51196495faf6523763a5a632c5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/errors bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29
    * @authup/specs bumped from ^1.0.0-beta.28 to ^1.0.0-beta.29

## [1.0.0-beta.28](https://github.com/authup/authup/compare/v1.0.0-beta.27...v1.0.0-beta.28) (2026-01-13)


### ⚠ BREAKING CHANGES

* require esm import capabilities
* email non null column
* ESM only

### Features

* add active, secret_hashed & secret_encrypted property + assign client always to realm ([#2758](https://github.com/authup/authup/issues/2758)) ([2d0f112](https://github.com/authup/authup/commit/2d0f112d2ed5bb1ad7eec04bccf3ca7dae61fb4f))
* make email address mandatory ([#2782](https://github.com/authup/authup/issues/2782)) ([c8e5e08](https://github.com/authup/authup/commit/c8e5e08b6abdb1af8bdc9771bd4a7ae822e71360))
* move credentials fns of client, robot & user to dedicated services ([#2759](https://github.com/authup/authup/issues/2759)) ([0741696](https://github.com/authup/authup/commit/074169606ff994700e247e4654cfe5365b3fbd8a))
* session management ([#2785](https://github.com/authup/authup/issues/2785)) ([c035b11](https://github.com/authup/authup/commit/c035b118ccdfc76ee61249ebeb4ee149f6792acb))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 13 updates ([#2780](https://github.com/authup/authup/issues/2780)) ([41eba21](https://github.com/authup/authup/commit/41eba214494520ad418d4a3ac3ccee3cd96dc19e))
* **deps:** bump the minorandpatch group across 1 directory with 14 updates ([#2797](https://github.com/authup/authup/issues/2797)) ([56489db](https://github.com/authup/authup/commit/56489db9f7e35a9467ff5c91b6833d243ab9c738))
* **deps:** bump the minorandpatch group with 34 updates ([#2756](https://github.com/authup/authup/issues/2756)) ([9240ce1](https://github.com/authup/authup/commit/9240ce18515ea9501a6790a53efe375a4c2b28ac))
* **deps:** bump the minorandpatch group with 8 updates ([#2769](https://github.com/authup/authup/issues/2769)) ([d86fa30](https://github.com/authup/authup/commit/d86fa30bed013f4245cecc0d03758b1f8b219da1))
* migrate from jest to vitest ([#2754](https://github.com/authup/authup/issues/2754)) ([191fd23](https://github.com/authup/authup/commit/191fd23035ee31eeca444f6d2165256a4f79ae72))


### Miscellaneous Chores

* set min node engine version ([2d6e8a7](https://github.com/authup/authup/commit/2d6e8a794b731ccaa73f3da8c4e0e81fd1178a58))


### Code Refactoring

* migrated to esm only packages ([f988074](https://github.com/authup/authup/commit/f9880742e8fa6487afaf5878aedc520b37622a37))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/errors bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/specs bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28

## [1.0.0-beta.27](https://github.com/authup/authup/compare/v1.0.0-beta.26...v1.0.0-beta.27) (2025-07-17)


### Features

* refactored internal scope handling & authorize error formatting ([#2676](https://github.com/authup/authup/issues/2676)) ([9444ec2](https://github.com/authup/authup/commit/9444ec23a12e00c3397eda2bb28cbc08193f9a69))
* track authroization through idp redirect & callback ([#2669](https://github.com/authup/authup/issues/2669)) ([5cab0f4](https://github.com/authup/authup/commit/5cab0f405c2d9361f62d1aeb03f83fe8e23c7326))
* validate user in idp account creation ([#2671](https://github.com/authup/authup/issues/2671)) ([084ec15](https://github.com/authup/authup/commit/084ec151348591fea272c93b66fa5601780266d3))


### Bug Fixes

* **deps:** bump dependencies ([c5e66dd](https://github.com/authup/authup/commit/c5e66ddd50ea4f4b596e47ff99e3a3d6c8133e22))
* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#2672](https://github.com/authup/authup/issues/2672)) ([242bedd](https://github.com/authup/authup/commit/242bedd9c611b84293ba75cc9427892c7ac962c6))
* **deps:** bump the minorandpatch group across 1 directory with 22 updates ([#2687](https://github.com/authup/authup/issues/2687)) ([f10970b](https://github.com/authup/authup/commit/f10970b89ae166cb33de9841bb221b40eb28081c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/errors bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/specs bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27

## [1.0.0-beta.26](https://github.com/authup/authup/compare/v1.0.0-beta.25...v1.0.0-beta.26) (2025-04-14)


### Bug Fixes

* add e-mail to LICENSE file + set next version ([004ee6a](https://github.com/authup/authup/commit/004ee6a2a7fb93506535c8baeebff5981667036a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/errors bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/specs bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26

## [1.0.0-beta.25](https://github.com/authup/authup/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2025-04-08)


### Features

* client-{permission,role} relations ([#2570](https://github.com/authup/authup/issues/2570)) ([95e5e85](https://github.com/authup/authup/commit/95e5e855083b20fc17e7df9047a97948d66aac3d))
* correct client usage in security context ([#2579](https://github.com/authup/authup/issues/2579)) ([26f0118](https://github.com/authup/authup/commit/26f0118184c98bf04f499d19526b1cf0d034cad6))
* flatten admin pages to root path & remove id table column(s) ([#2576](https://github.com/authup/authup/issues/2576)) ([657b39c](https://github.com/authup/authup/commit/657b39cc4dd6b40a05572b4feb20a985917db13b))
* permit tree like policy submission ([#2560](https://github.com/authup/authup/issues/2560)) ([b43afdb](https://github.com/authup/authup/commit/b43afdbacf63c3e809b34a50a576e12c9133367c))
* remove identity provider slug field ([#2575](https://github.com/authup/authup/issues/2575)) ([19e111b](https://github.com/authup/authup/commit/19e111b96321c915014417ad5148307724dc93ee))
* remove isRealmResource{Readable,Writable} helper ([ac06e71](https://github.com/authup/authup/commit/ac06e71f32c47fa250e381197dc6069ccc2cb9fa))
* rename channel & namespace builder heplpers ([e86e18c](https://github.com/authup/authup/commit/e86e18c2821b6a0b9afa7c27efabbc6d0d9b5c7c))
* stricter restrictions for resource name attribute ([57965ea](https://github.com/authup/authup/commit/57965eae29523b59c46e86b6f12e7b44752ae301))


### Bug Fixes

* policy ancestor assignment ([#2568](https://github.com/authup/authup/issues/2568)) ([ca4cad7](https://github.com/authup/authup/commit/ca4cad73d3051ea4da53b56a7d7848a0e2e15f95))
* rename domain-type to resource-type ([c01ec66](https://github.com/authup/authup/commit/c01ec66ff0cb8c06c6e360878b4f40a7eed30fb7))
* rename domain-type-map to resource-type-map ([131b296](https://github.com/authup/authup/commit/131b29665df32c82456e9543b50710278e90c479))
* renamed types & interfaces ([45c2fb7](https://github.com/authup/authup/commit/45c2fb78e8948fcc2d41e3615dad35d906e94b2f))
* update year range in LICENSE file ([8dd6da9](https://github.com/authup/authup/commit/8dd6da98cbfd8f910397de7391402af1e7517cc9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/errors bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/specs bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25

## [1.0.0-beta.24](https://github.com/authup/authup/compare/v1.0.0-beta.23...v1.0.0-beta.24) (2025-01-18)


### Features

* implemented oauth2 PKCE specification ([#2487](https://github.com/authup/authup/issues/2487)) ([d6f6e65](https://github.com/authup/authup/commit/d6f6e659ac0eb319183778ddeaa8dd03d2269bbd))
* merge packages rules & schema to security ([#2506](https://github.com/authup/authup/issues/2506)) ([2ea6407](https://github.com/authup/authup/commit/2ea6407390cad4900416994e1af78dca1b36a170))
* refactor & split security package ([#2551](https://github.com/authup/authup/issues/2551)) ([1b38eed](https://github.com/authup/authup/commit/1b38eed204658cdde11b92f93027b843f47f43bf))
* split kit package in errors, rules & schema package ([#2500](https://github.com/authup/authup/issues/2500)) ([ff5a6e7](https://github.com/authup/authup/commit/ff5a6e731f4ea71faaefd1cd6fe02fbc0dc398e6))


### Bug Fixes

* **deps:** bump @hapic/oauth2 to v3.x ([c83f480](https://github.com/authup/authup/commit/c83f480cee897402d11ae701012ac7f239a5e566))
* **deps:** bump the minorandpatch group across 1 directory with 18 updates ([#2494](https://github.com/authup/authup/issues/2494)) ([cc6562e](https://github.com/authup/authup/commit/cc6562eed230f76c984e1ee26942ce705dd03fdf))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/errors bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/specs bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24

## [1.0.0-beta.23](https://github.com/authup/authup/compare/v1.0.0-beta.22...v1.0.0-beta.23) (2024-11-10)


### Features

* refactored client resource management ([#2450](https://github.com/authup/authup/issues/2450)) ([17f81fa](https://github.com/authup/authup/commit/17f81fabe90e19422774899aeeefa1fe9b46d7fc))
* simplify domain type to shape mapping ([6b267d6](https://github.com/authup/authup/commit/6b267d6ddb42c05c0fb9969aa1f6f34c84a28337))


### Bug Fixes

* cleanup obsolete typings ([693d48b](https://github.com/authup/authup/commit/693d48b7b617d3a119626819f2563a0683bdadbb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23

## [1.0.0-beta.22](https://github.com/authup/authup/compare/v1.0.0-beta.21...v1.0.0-beta.22) (2024-10-23)


### Features

* moved and seperated domains directory ([#2424](https://github.com/authup/authup/issues/2424)) ([fde5757](https://github.com/authup/authup/commit/fde5757243868cc1a5af0d2c9f75ab82dd2af8a2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22

## [1.0.0-beta.21](https://github.com/authup/authup/compare/v1.0.0-beta.20...v1.0.0-beta.21) (2024-10-13)


### Bug Fixes

* remove unused parse connection helper ([b37d2bb](https://github.com/authup/authup/commit/b37d2bb409fe00e198547daef0f0499516020ed9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21

## [1.0.0-beta.20](https://github.com/authup/authup/compare/v1.0.0-beta.19...v1.0.0-beta.20) (2024-09-28)


### Features

* add built_in & display_name attribute to few entities ([#2193](https://github.com/authup/authup/issues/2193)) ([42d062f](https://github.com/authup/authup/commit/42d062f3e600aed43f69164b2f6297851d402070))
* initial realm-match policy & remove explicit resource realm restriction ([#2210](https://github.com/authup/authup/issues/2210)) ([1f51863](https://github.com/authup/authup/commit/1f51863b6a46d6a116877b0734876502de7eb669))
* introduce identity_provider_role- & client_scope permissions ([ada3183](https://github.com/authup/authup/commit/ada31831c0ce72358cf87ba25b5c9162a3f9e3a1))
* move permission & policy logic to new package ([#2128](https://github.com/authup/authup/issues/2128)) ([53f9b33](https://github.com/authup/authup/commit/53f9b33b15e08d6a2def0f7d4659129a03a51252))
* permit non owned permissions to be checked ([#2294](https://github.com/authup/authup/issues/2294)) ([2c44a8d](https://github.com/authup/authup/commit/2c44a8daa9e50903dee146cb548500972287f209))
* simplify permission manager & merge permissions of same realm ([#2133](https://github.com/authup/authup/issues/2133)) ([08c5cf7](https://github.com/authup/authup/commit/08c5cf7697f140663b6ffc396ec8028a3057c2e2))
* write handlers for controllers ([#2185](https://github.com/authup/authup/issues/2185)) ([ae8997a](https://github.com/authup/authup/commit/ae8997aae542ccb75dff03f7656c74d20f128e33))


### Bug Fixes

* remove permission-item aggregate fn helper ([66a1d92](https://github.com/authup/authup/commit/66a1d92fea12805e7fbb3dc386bf069e90fbeb94))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20

## [1.0.0-beta.19](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.19) (2024-06-30)


### Features

* add policy (event context, domain type, subscriber, ...) ([42fbbb3](https://github.com/authup/authup/commit/42fbbb30211db0ad867a290d7571f2bcdd2118e6))
* reworked ability management and access ([#2102](https://github.com/authup/authup/issues/2102)) ([b3dc45c](https://github.com/authup/authup/commit/b3dc45c2a1d0cd403e8ab545bd87ce4e49738758))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19

## [1.0.0-beta.18](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.18) (2024-06-24)


### Features

* add client_id column to permission entity ([47d2d63](https://github.com/authup/authup/commit/47d2d636707e910cd62485e368decabda2d5467c))
* add realm_id property to policy-attribute entity ([09ff4de](https://github.com/authup/authup/commit/09ff4ded550540e2a22838c4b19711df0bc2539e))
* allow defining custom policies ([#2088](https://github.com/authup/authup/issues/2088)) ([45496cf](https://github.com/authup/authup/commit/45496cfac3a9300ac1cf7fa587105dcc808158fd))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* improve errror handling ([#1951](https://github.com/authup/authup/issues/1951)) ([607585e](https://github.com/authup/authup/commit/607585ee733b42b3a2cccf8d2812dafd7299cda3))
* initial policy implementation ([#2038](https://github.com/authup/authup/issues/2038)) ([deeaffc](https://github.com/authup/authup/commit/deeaffcf0b4a72d9e1d6cf99dbf70d582b98c257))
* refactored domain entities properties and controllers ([#2075](https://github.com/authup/authup/issues/2075)) ([9a237d8](https://github.com/authup/authup/commit/9a237d8fa8b8cd7eabeecb534906510d31cd28b8))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* renamed group-policy to composite-policy ([42e9702](https://github.com/authup/authup/commit/42e9702419824e459cb3311ae0766d0871a2d92a))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* restrictions for role,permission-assignemnts ([#2071](https://github.com/authup/authup/issues/2071)) ([c851f76](https://github.com/authup/authup/commit/c851f76777cf0018d55f62511536b5f73a080868))

## [1.0.0-beta.18](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.0-beta.18) (2024-06-23)


### Features

* allow defining custom policies ([#2088](https://github.com/authup/authup/issues/2088)) ([45496cf](https://github.com/authup/authup/commit/45496cfac3a9300ac1cf7fa587105dcc808158fd))

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.0-beta.17) (2024-06-23)


### Features

* add client_id column to permission entity ([47d2d63](https://github.com/authup/authup/commit/47d2d636707e910cd62485e368decabda2d5467c))
* add realm_id property to policy-attribute entity ([09ff4de](https://github.com/authup/authup/commit/09ff4ded550540e2a22838c4b19711df0bc2539e))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* improve errror handling ([#1951](https://github.com/authup/authup/issues/1951)) ([607585e](https://github.com/authup/authup/commit/607585ee733b42b3a2cccf8d2812dafd7299cda3))
* initial policy implementation ([#2038](https://github.com/authup/authup/issues/2038)) ([deeaffc](https://github.com/authup/authup/commit/deeaffcf0b4a72d9e1d6cf99dbf70d582b98c257))
* refactored domain entities properties and controllers ([#2075](https://github.com/authup/authup/issues/2075)) ([9a237d8](https://github.com/authup/authup/commit/9a237d8fa8b8cd7eabeecb534906510d31cd28b8))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* renamed group-policy to composite-policy ([42e9702](https://github.com/authup/authup/commit/42e9702419824e459cb3311ae0766d0871a2d92a))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* restrictions for role,permission-assignemnts ([#2071](https://github.com/authup/authup/issues/2071)) ([c851f76](https://github.com/authup/authup/commit/c851f76777cf0018d55f62511536b5f73a080868))

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.13...v1.0.0-beta.17) (2024-06-23)


### Features

* add client_id column to permission entity ([47d2d63](https://github.com/authup/authup/commit/47d2d636707e910cd62485e368decabda2d5467c))
* add realm_id property to policy-attribute entity ([09ff4de](https://github.com/authup/authup/commit/09ff4ded550540e2a22838c4b19711df0bc2539e))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* initial policy implementation ([#2038](https://github.com/authup/authup/issues/2038)) ([deeaffc](https://github.com/authup/authup/commit/deeaffcf0b4a72d9e1d6cf99dbf70d582b98c257))
* refactored domain entities properties and controllers ([#2075](https://github.com/authup/authup/issues/2075)) ([9a237d8](https://github.com/authup/authup/commit/9a237d8fa8b8cd7eabeecb534906510d31cd28b8))
* renamed group-policy to composite-policy ([42e9702](https://github.com/authup/authup/commit/42e9702419824e459cb3311ae0766d0871a2d92a))
* restrictions for role,permission-assignemnts ([#2071](https://github.com/authup/authup/issues/2071)) ([c851f76](https://github.com/authup/authup/commit/c851f76777cf0018d55f62511536b5f73a080868))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17

## [1.0.0-beta.13](https://github.com/authup/authup/compare/v1.0.0-beta.12...v1.0.0-beta.13) (2024-05-13)


### Features

* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13

## [1.0.0-beta.12](https://github.com/authup/authup/compare/v1.0.0-beta.11...v1.0.0-beta.12) (2024-05-10)


### Features

* improve errror handling ([#1951](https://github.com/authup/authup/issues/1951)) ([607585e](https://github.com/authup/authup/commit/607585ee733b42b3a2cccf8d2812dafd7299cda3))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12

## [1.0.0-beta.10](https://github.com/authup/authup/compare/v1.0.0-beta.9...v1.0.0-beta.10) (2024-05-08)


### Features

* improve errror handling ([#1951](https://github.com/authup/authup/issues/1951)) ([607585e](https://github.com/authup/authup/commit/607585ee733b42b3a2cccf8d2812dafd7299cda3))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10

## [1.0.0-beta.9](https://github.com/authup/authup/compare/global-core-v1.0.0-beta.8...global-core-v1.0.0-beta.9) (2024-04-10)


### Bug Fixes

* **deps:** bump @hapic/oauth2 from 2.4.1 to 2.4.2 ([#1835](https://github.com/authup/authup/issues/1835)) ([d870a11](https://github.com/authup/authup/commit/d870a117850b1c0ccb3fbc988e43478d1d1cb826))
* **deps:** bump @hapic/vault from 2.3.2 to 2.3.3 ([#1836](https://github.com/authup/authup/issues/1836)) ([a51ef81](https://github.com/authup/authup/commit/a51ef81ccc04175cef233f1ea3836d6a3bca1b4d))
* **deps:** bump hapic from 2.5.0 to 2.5.1 ([#1834](https://github.com/authup/authup/issues/1834)) ([4f815b1](https://github.com/authup/authup/commit/4f815b1894e3fa793e6553cf04c710790ac730f1))

## [1.0.0-beta.8](https://github.com/authup/authup/compare/global-core-v1.0.0-beta.7...global-core-v1.0.0-beta.8) (2024-03-26)


### Miscellaneous Chores

* **global-core:** Synchronize main versions

## [1.0.0-beta.7](https://github.com/authup/authup/compare/global-core-v1.0.0-beta.6...global-core-v1.0.0-beta.7) (2024-03-06)


### Features

* use rust bindings to speed up bcrypt and jsonwebtokens ([#1784](https://github.com/authup/authup/issues/1784)) ([3a1fcf3](https://github.com/authup/authup/commit/3a1fcf3705acce2564e4d3692e3161c6f1c5021d))


### Bug Fixes

* minor cleanup for jwt sign/verify & remove unnecessary dependencies ([8ca8600](https://github.com/authup/authup/commit/8ca8600b9ebf635b6cacd30ce246a640ed507c25))

## [1.0.0-beta.6](https://github.com/authup/authup/compare/global-core-v1.0.0-beta.5...global-core-v1.0.0-beta.6) (2024-02-28)


### Features

* parse/check connection string fns ([4e497b0](https://github.com/authup/authup/commit/4e497b03b4940ce6d93129cb11c69599c1ccad22))


### Bug Fixes

* **deps:** bump @types/jsonwebtoken from 9.0.5 to 9.0.6 ([#1777](https://github.com/authup/authup/issues/1777)) ([bec999f](https://github.com/authup/authup/commit/bec999fd1a17c1dea3578b0961e0937b51e4deca))

## [1.0.0-beta.5](https://github.com/authup/authup/compare/global-core-v1.0.0-beta.4...global-core-v1.0.0-beta.5) (2024-02-26)


### Features

* configurable name of default robot account ([#1771](https://github.com/authup/authup/issues/1771)) ([4ec7cdc](https://github.com/authup/authup/commit/4ec7cdc23a5deb5f6019558f592909e60a1fd95d))
* remove permission name regex restriction ([#1754](https://github.com/authup/authup/issues/1754)) ([c81a249](https://github.com/authup/authup/commit/c81a2499fe48cdbe258cac89d6084cb777ac27fc))
* simplified and enhanced ability-manager ([#1758](https://github.com/authup/authup/issues/1758)) ([641be51](https://github.com/authup/authup/commit/641be51163afedb296301f16e2ee127121e46796))


### Bug Fixes

* **deps:** bump destr from 2.0.2 to 2.0.3 ([#1753](https://github.com/authup/authup/issues/1753)) ([b99ae15](https://github.com/authup/authup/commit/b99ae159d6eaae12985eb90d9fe74dfacf3d2d61))

## [1.0.0-beta.4](https://github.com/authup/authup/compare/global-core-v1.0.0-beta.3...global-core-v1.0.0-beta.4) (2024-02-19)


### Features

* enable condition validation for permission-relation entities ([#1733](https://github.com/authup/authup/issues/1733)) ([bb96e9a](https://github.com/authup/authup/commit/bb96e9aa10d825191b79e5971701ba8135acba55))
* ldap identity provider ([#1721](https://github.com/authup/authup/issues/1721)) ([3cf6858](https://github.com/authup/authup/commit/3cf68587b8ed44c3dbbf745fcbec6166e615f85b))
* ldap identity-provider {user,role}-filter attribute ([#1743](https://github.com/authup/authup/issues/1743)) ([f36f70e](https://github.com/authup/authup/commit/f36f70e67fddbe7c37c8dff82075598757e39599))
* serialize/deserialize {user,role,identity-provider}-attribute values ([#1731](https://github.com/authup/authup/issues/1731)) ([2283cca](https://github.com/authup/authup/commit/2283cca200ced41305f430c6a73e954dfd89bbf5))
* store email of identity-provider flow & optimized account creation ([df97c1a](https://github.com/authup/authup/commit/df97c1ad4cb0502bfbf16cdad34edc833ca522c7))
* use envix for environment variable interaction ([8d5a8fc](https://github.com/authup/authup/commit/8d5a8fc261cd34caea2a9d42222118cc54cef55f))

## [1.0.0-beta.3](https://github.com/authup/authup/compare/global-core-v1.0.0-beta.2...global-core-v1.0.0-beta.3) (2024-02-06)


### Miscellaneous Chores

* **global-core:** Synchronize main versions

## [1.0.0-beta.2](https://github.com/authup/authup/compare/global-core-v1.0.0-beta.1...global-core-v1.0.0-beta.2) (2024-01-14)


### Miscellaneous Chores

* **global-core:** Synchronize main versions

## [1.0.0-beta.1](https://github.com/authup/authup/compare/global-core-v1.0.0-beta.0...global-core-v1.0.0-beta.1) (2024-01-09)


### Bug Fixes

* **deps:** bump @hapic/oauth2 from 2.4.0 to 2.4.1 ([#1628](https://github.com/authup/authup/issues/1628)) ([e963096](https://github.com/authup/authup/commit/e963096552ff0fca2e9685d6d7712d0d6f5202a7))
* **deps:** bump @hapic/vault from 2.3.1 to 2.3.2 ([#1629](https://github.com/authup/authup/issues/1629)) ([d9d3c25](https://github.com/authup/authup/commit/d9d3c25e46df759a34dbd393f01e0a84e8dfc9b9))
* **deps:** bump hapic from 2.4.0 to 2.5.0 ([#1627](https://github.com/authup/authup/issues/1627)) ([4adea8e](https://github.com/authup/authup/commit/4adea8e84bb0188cac35be82bca77379f32db7cd))

## [1.0.0-beta.0](https://github.com/authup/authup/compare/global-core-v0.45.10...global-core-v1.0.0-beta.0) (2024-01-05)


### Features

* apply stricter linting rules ([#1611](https://github.com/authup/authup/issues/1611)) ([af0774d](https://github.com/authup/authup/commit/af0774d72a91d52f92b4d51c8391feca0f76f540))
* refactor & simplify global cli ([#1603](https://github.com/authup/authup/issues/1603)) ([890456b](https://github.com/authup/authup/commit/890456bf7ffb85b80ed20f1a8bfa2e480b18a9e4))
* refactored configuration management ([#1598](https://github.com/authup/authup/issues/1598)) ([9ff87a4](https://github.com/authup/authup/commit/9ff87a4256b5b3af6b3f5e00de2942d68683ecaf))

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

# [0.45.0](https://github.com/authup/authup/compare/v0.44.0...v0.45.0) (2023-10-23)

### Bug Fixes

- **deps:** bump @types/jsonwebtoken from 9.0.3 to 9.0.4 ([#1444](https://github.com/authup/authup/issues/1444)) ([185bee1](https://github.com/authup/authup/commit/185bee120615e5c51a9d643b9af03d73c35e56d0))

# [0.44.0](https://github.com/authup/authup/compare/v0.42.0...v0.44.0) (2023-10-07)

### Bug Fixes

- exposing client errors via API ([00098fb](https://github.com/authup/authup/commit/00098fb0971247f2748b928942d0aa169190e7b9))

### Features

- enhance removing duplicte slashes ([9dd17b2](https://github.com/authup/authup/commit/9dd17b26ebf0ab9e7a776dedc6736069e4221fd7))

# [0.43.0](https://github.com/authup/authup/compare/v0.42.0...v0.43.0) (2023-10-05)

### Features

- enhance removing duplicte slashes ([ee3302b](https://github.com/authup/authup/commit/ee3302b019c4c87e21fc9fb377e08d0ef8020a55))

# [0.42.0](https://github.com/authup/authup/compare/v0.41.0...v0.42.0) (2023-10-05)

### Bug Fixes

- **deps:** bump @types/jsonwebtoken from 9.0.2 to 9.0.3 ([#1387](https://github.com/authup/authup/issues/1387)) ([67869f4](https://github.com/authup/authup/commit/67869f4fa471bc4a983ba12803a086fb09c60555))

### Features

- bump routup to v3.0 ([f46f066](https://github.com/authup/authup/commit/f46f0661923a64b392fd62a845a5bab9a2f0891c))

# [0.41.0](https://github.com/authup/authup/compare/v0.40.3...v0.41.0) (2023-09-01)

### Bug Fixes

- **deps:** bump @ebec/http from 1.1.0 to 1.1.1 ([#1343](https://github.com/authup/authup/issues/1343)) ([2e92c03](https://github.com/authup/authup/commit/2e92c03836b087e3a4499951f5e6f1032f5bb113))
- **deps:** bump hapic to v2.3.0 ([23d59bd](https://github.com/authup/authup/commit/23d59bd02f09ffbdfbae7534914b7004894b1b52))

# [0.40.0](https://github.com/authup/authup/compare/v0.39.1...v0.40.0) (2023-08-15)

### Features

- implemmented socket manager + refactored entiy-{list,manager} ([b6ddb51](https://github.com/authup/authup/commit/b6ddb513a89d495e7a86dc9e5a41eabc23db44a8))
- simplified entity assign actions ([c22ab45](https://github.com/authup/authup/commit/c22ab4528b1df0e81500bfdc59ab6bcf08517a08))

# [0.39.0](https://github.com/authup/authup/compare/v0.38.0...v0.39.0) (2023-07-18)

### Bug Fixes

- oauth2 github identity-provider workflow ([f6843e2](https://github.com/authup/authup/commit/f6843e2957224f87ff8cd2dc44a94623afc84016))
- rename identity-provider protocol_config column to preset ([bf4020e](https://github.com/authup/authup/commit/bf4020e7033de7584fb3f27a4b58452afd8a6eeb))
- rename realm column drop_able to built_in ([dd93239](https://github.com/authup/authup/commit/dd932393ba7391b9b0196dc3bbb63718a1f89ec0))

### Features

- better typing and structure for entity-{list,manager} ([abbfe43](https://github.com/authup/authup/commit/abbfe43587a02e8b0a6c4b3fd5ad10379a24acc4))
- extended identity-provider form to manage protocols and protocol-configs ([0d01e7f](https://github.com/authup/authup/commit/0d01e7f49510722ec3fdd32050c22d64f931e478))
- implemented (social)login flow for identity provider authorization & redirect ([8db22c9](https://github.com/authup/authup/commit/8db22c9ef7adb29487c3bb6068ed34c53a7670b9))
- implemented entity-manager + created domain entity components ([391969d](https://github.com/authup/authup/commit/391969d4c4ba0abd325a2fbc032da4eef0eab66c))
- split identity-provider form fields + additional utitlity components ([a50a695](https://github.com/authup/authup/commit/a50a695614f8261083776e1d0d34418dba2ceeec))

# [0.38.0](https://github.com/authup/authup/compare/v0.37.1...v0.38.0) (2023-06-29)

**Note:** Version bump only for package @authup/core

## [0.37.1](https://github.com/authup/authup/compare/v0.37.0...v0.37.1) (2023-06-14)

### Bug Fixes

- bump hapic to v2.x ([2dd66ed](https://github.com/authup/authup/commit/2dd66ed87e89338be682a93bec4fe12ca86be712))
- bump minimatch to v9.x ([0c63d48](https://github.com/authup/authup/commit/0c63d481d20dbae273130595bde4453b476eca37))
- rename token-hook-options to client-response-error-token-hook-options ([103f707](https://github.com/authup/authup/commit/103f707002b38f39c05fcbcef80167cd2945da37))

# [0.37.0](https://github.com/authup/authup/compare/v0.36.0...v0.37.0) (2023-05-31)

### Bug Fixes

- add mising type export ([b4d5944](https://github.com/authup/authup/commit/b4d594451ab17725690c5a526391ec64e785513a))
- **deps:** bump @ebec/http from 1.0.0 to 1.1.0 ([#1148](https://github.com/authup/authup/issues/1148)) ([9f3de59](https://github.com/authup/authup/commit/9f3de59114efc3cb8bb37d9de5de71f3b24843bd))
- **deps:** bump smob to v1.4.0 ([8eefa83](https://github.com/authup/authup/commit/8eefa83a55271ad139dde2e0ccbacc8c937e6a4e))

# [0.36.0](https://github.com/authup/authup/compare/v0.35.0...v0.36.0) (2023-05-27)

### Bug Fixes

- add missing call for token created hook after token refresh ([ff31fe8](https://github.com/authup/authup/commit/ff31fe88804206b9ea84e6e24b9b55d5deb6af42))
- rename register-timer to set-timer ([77793bc](https://github.com/authup/authup/commit/77793bc961e4695520dd08187182238647aee2ba))

### Features

- cleanup and relocate auth store + set token max age for oauth2 grant types ([13643fd](https://github.com/authup/authup/commit/13643fd76e8c471f8d90b555c386041a34bcb2ff))
- refactor and optimized client response error token hook ([fae52c8](https://github.com/authup/authup/commit/fae52c8cfcc0aa563d6edd0702f3438ab76e6e5a))

# [0.35.0](https://github.com/authup/authup/compare/v0.34.0...v0.35.0) (2023-05-25)

### Features

- add callback handler for token creator ([515bdee](https://github.com/authup/authup/commit/515bdee793de15a8bbe8ad97a1f1db483984383a))
- allow disabling token refresh timer + add token creation hook option ([d042e62](https://github.com/authup/authup/commit/d042e62829241df930ef43141aa8dc6dae46408d))

# [0.34.0](https://github.com/authup/authup/compare/v0.33.0...v0.34.0) (2023-05-24)

### Bug Fixes

- better token error handling + token error verification ([e323e83](https://github.com/authup/authup/commit/e323e834b2f4f695fd9b0c8dc1629d6a4b265ebe))
- **deps:** bump @types/jsonwebtoken from 9.0.1 to 9.0.2 ([#1061](https://github.com/authup/authup/issues/1061)) ([d00c6e3](https://github.com/authup/authup/commit/d00c6e3b62aa15a52fa59924e57d388aa0d72fdf))
- **deps:** bump smob from 1.0.0 to 1.1.1 ([#1122](https://github.com/authup/authup/issues/1122)) ([0dc6667](https://github.com/authup/authup/commit/0dc66679c7b65c37f2eec5793727d00b0c35c013))

### Features

- better error messages for refresh_token grant type ([13f3239](https://github.com/authup/authup/commit/13f32392cf234c81b3d1c787f0c586036e2c4968))

# [0.33.0](https://github.com/authup/authup/compare/v0.32.3...v0.33.0) (2023-04-24)

### Bug Fixes

- http client (error) hook implementation ([86ddd6c](https://github.com/authup/authup/commit/86ddd6c341a36ab37cf76844129552031618c926))
- rename retry state tracker ([a233a61](https://github.com/authup/authup/commit/a233a6155f9f0fa5d29490a9b79bea7e0c88f221))
- typings for auth error check ([8a69037](https://github.com/authup/authup/commit/8a6903746e5c16d804df3c5d90de1360f82fcc89))

### Features

- bump hapic to v2.0.0-alpha.x (axios -> fetch) ([#1036](https://github.com/authup/authup/issues/1036)) ([e09c919](https://github.com/authup/authup/commit/e09c91930d65b41725e5b1c4e26c21f9a5c67342))
- implemented hapic v2.0 alpha ([f1da95b](https://github.com/authup/authup/commit/f1da95bb3be6d1fe0cfd195a44a63c5a8d60dc6c))

## [0.32.2](https://github.com/authup/authup/compare/v0.32.1...v0.32.2) (2023-04-05)

### Bug Fixes

- restructured ability-manger in module + force version bump ([b59f485](https://github.com/authup/authup/commit/b59f485eec2e6e7ddf6d771f7eaad0f1ef46b569))

## [0.32.1](https://github.com/authup/authup/compare/v0.32.0...v0.32.1) (2023-04-04)

### Bug Fixes

- adjusted http interceptors ([57bedf7](https://github.com/authup/authup/commit/57bedf7bb4d8d98bec8445420624dbff580f26b1))
- non async response interceptor should throw error ([e7f22d6](https://github.com/authup/authup/commit/e7f22d6c6dab07f7f9a916393c297c14c8ffc010))

# [0.32.0](https://github.com/authup/authup/compare/v0.31.3...v0.32.0) (2023-04-03)

### Features

- move token-creator & http interceptor to global core package ([3824f86](https://github.com/authup/authup/commit/3824f86799003de2f4fc3602522fcbfbafa4d13c))
- use core token-interceptor for ui token session management ([33ec6e0](https://github.com/authup/authup/commit/33ec6e0ad835c7203d3d848f074a2210507e0ad3))

## [0.31.3](https://github.com/authup/authup/compare/v0.31.2...v0.31.3) (2023-04-03)

### Bug Fixes

- config database option validator ([82afa32](https://github.com/authup/authup/commit/82afa3286fbd84cce8a9bdedc29fcbb84aa92962))

## [0.31.2](https://github.com/authup/authup/compare/v0.31.1...v0.31.2) (2023-04-03)

### Bug Fixes

- mounting of http interceptor + better struct for verification data ([0ee1e40](https://github.com/authup/authup/commit/0ee1e403752e5576ae2d22a1b840ce05ae452c10))

## [0.31.1](https://github.com/authup/authup/compare/v0.31.0...v0.31.1) (2023-04-03)

### Bug Fixes

- define userinfo endpoint for userinfo api ([106a3f7](https://github.com/authup/authup/commit/106a3f703c6b49523418a89e816f8501e00be3db))

# [0.31.0](https://github.com/authup/authup/compare/v0.30.1...v0.31.0) (2023-04-03)

### Features

- add user-info domain api + renamed useHTTPClientAPI ([22d1cdc](https://github.com/authup/authup/commit/22d1cdce326bb7a0549d28b04b0157840b3f7623))

# [0.30.0](https://github.com/authup/authup/compare/v0.29.0...v0.30.0) (2023-04-03)

### Features

- complete refactor of adapter + new sub-modules craetor, interceptor & verifier ([9940741](https://github.com/authup/authup/commit/99407417372c0b73ab6bbdfe84d9af177c8785e2))
- support interceptor mounting on client and client driver instance ([a26dafe](https://github.com/authup/authup/commit/a26dafe8174cf9c6de0bf85c294baf8e32d6261a))

# [0.29.0](https://github.com/authup/authup/compare/v0.28.0...v0.29.0) (2023-04-01)

### Bug Fixes

- adjusted README.md, package.json files + renamed http client ([fcf8423](https://github.com/authup/authup/commit/fcf8423228fa73aa2a61ba8de96c0af51dfb0c5f))

# [0.28.0](https://github.com/authup/authup/compare/v0.27.0...v0.28.0) (2023-04-01)

**Note:** Version bump only for package @authup/core

# [0.27.0](https://github.com/authup/authup/compare/v0.26.0...v0.27.0) (2023-04-01)

**Note:** Version bump only for package @authup/core

# [0.26.0](https://github.com/authup/authup/compare/v0.25.0...v0.26.0) (2023-03-30)

### Features

- explicit exclude sub folder files for docker build ([79cffe1](https://github.com/authup/authup/commit/79cffe151d27449420c9c6122206b0540c536acb))

# [0.25.0](https://github.com/authup/authup/compare/v0.24.0...v0.25.0) (2023-03-30)

### Features

- add https proxy tunnel support for identity providers ([6a7b859](https://github.com/authup/authup/commit/6a7b859e31bad6f10dd2fde22cdc6dfab3da2285))

# [0.24.0](https://github.com/authup/authup/compare/v0.23.1...v0.24.0) (2023-03-30)

**Note:** Version bump only for package @authup/core

# [0.23.0](https://github.com/authup/authup/compare/v0.22.0...v0.23.0) (2023-03-30)

### Features

- replaced manual proxy parsing with http client detection ([18c3751](https://github.com/authup/authup/commit/18c3751f3dd3defdd9dfa34ec41522ac14d3b476))

# [0.22.0](https://github.com/Tada5hi/authup/compare/v0.21.0...v0.22.0) (2023-03-26)

### Features

- add oauth2 client as http-client property ([ab5c260](https://github.com/Tada5hi/authup/commit/ab5c2609fe7e88b63bc75b4077846f1875ba0571))

# [0.21.0](https://github.com/Tada5hi/authup/compare/v0.20.1...v0.21.0) (2023-03-26)

### Bug Fixes

- allow robot integrity check by name ([d6b2a6e](https://github.com/Tada5hi/authup/commit/d6b2a6e82de12c4c4980f0bd5db498398c86e9e7))

### Features

- explicit endpoint to check/reset robot account ([4fe0e14](https://github.com/Tada5hi/authup/commit/4fe0e14e5b824506fa0231ab6dc7fb308bcbe2ae))

# [0.20.0](https://github.com/Tada5hi/authup/compare/v0.19.0...v0.20.0) (2023-03-24)

### Features

- add integrity check for robot credentials in vault ([5700c80](https://github.com/Tada5hi/authup/commit/5700c8077329ca7a01b0f4dee919c7749b304e60))

# [0.19.0](https://github.com/Tada5hi/authup/compare/v0.18.0...v0.19.0) (2023-03-23)

**Note:** Version bump only for package @authup/core

# [0.18.0](https://github.com/Tada5hi/authup/compare/v0.17.2...v0.18.0) (2023-03-23)

### Bug Fixes

- **deps:** bump @ebec/http from 0.2.2 to 1.0.0 ([#953](https://github.com/Tada5hi/authup/issues/953)) ([4786cd2](https://github.com/Tada5hi/authup/commit/4786cd2e7a8d849b6ec6a164c4bfc1c48e469851))
- **deps:** bump smob from 0.1.0 to 1.0.0 ([#952](https://github.com/Tada5hi/authup/issues/952)) ([363fc69](https://github.com/Tada5hi/authup/commit/363fc6902848a16982626f4fbe3cb7e5c1afd053))

### Features

- add realm- & scope-subscriber + minor cleanup + enum referencing ([dc4f1ba](https://github.com/Tada5hi/authup/commit/dc4f1ba167259f6c7c8f381a8569fe255646e85d))
- add vault client support for robot credentials syncing ([66b2300](https://github.com/Tada5hi/authup/commit/66b23007fdfa4221c48f2d66f5524fdb5b4f3ed3))
- adjusted lerna config ([215b3a5](https://github.com/Tada5hi/authup/commit/215b3a55916d8c923f404434985a68826650c136))
- broadcast redis events for changed domain entities ([4b2fd5e](https://github.com/Tada5hi/authup/commit/4b2fd5e44aa94a2d43d6c8b872bb0f298e0b4da2))
- support direct & socket domain events ([b9225c2](https://github.com/Tada5hi/authup/commit/b9225c21b5437ced4c6d0a02b75de3f35f1f64a3))

## [0.17.2](https://github.com/Tada5hi/authup/compare/v0.17.1...v0.17.2) (2023-03-20)

### Bug Fixes

- **deps:** bump hapci/\*\* to v1.3.0 ([2e7068a](https://github.com/Tada5hi/authup/commit/2e7068ae21e5a4d0dae0b9cde90a308efbc247de))

# [0.17.0](https://github.com/Tada5hi/authup/compare/v0.16.0...v0.17.0) (2023-03-13)

**Note:** Version bump only for package @authup/core

# [0.16.0](https://github.com/Tada5hi/authup/compare/v0.15.4...v0.16.0) (2023-02-28)

**Note:** Version bump only for package @authup/core

## [0.15.4](https://github.com/Tada5hi/authup/compare/v0.15.3...v0.15.4) (2023-02-24)

### Bug Fixes

- allow dot character in user name ([e430b4c](https://github.com/Tada5hi/authup/commit/e430b4c6b54dee72303bceeb33dcc8692abde73a))

## [0.15.3](https://github.com/Tada5hi/authup/compare/v0.15.2...v0.15.3) (2023-02-23)

### Bug Fixes

- **deps:** bump @ucast/mongo2js from 1.3.3 to 1.3.4 ([#863](https://github.com/Tada5hi/authup/issues/863)) ([baee990](https://github.com/Tada5hi/authup/commit/baee990378cc7fe613042ebae66b80f0139fe713))

# [0.15.0](https://github.com/Tada5hi/authup/compare/v0.14.1...v0.15.0) (2023-02-07)

### Features

- **server-http:** restructured & optimized oauth2 sub module ([8d8802d](https://github.com/Tada5hi/authup/commit/8d8802d002616880e289b9eacc3ad60df5d3e2b6))

# [0.14.0](https://github.com/Tada5hi/authup/compare/v0.13.0...v0.14.0) (2023-01-29)

### Features

- minor code cleanup + fixed redis caching strategy ([a5286b7](https://github.com/Tada5hi/authup/commit/a5286b716e6432bd872cda2e06def8f0c3ab9111))

# [0.13.0](https://github.com/Tada5hi/authup/compare/v0.12.1...v0.13.0) (2023-01-28)

**Note:** Version bump only for package @authup/core

## [0.12.1](https://github.com/Tada5hi/authup/compare/v0.12.0...v0.12.1) (2023-01-28)

### Bug Fixes

- peer-dependency version + updated license information ([f693215](https://github.com/Tada5hi/authup/commit/f69321538afbd2923287209593cdebcedaa29637))

# [0.12.0](https://github.com/Tada5hi/authup/compare/v0.11.1...v0.12.0) (2023-01-28)

**Note:** Version bump only for package @authup/core

## [0.11.1](https://github.com/Tada5hi/authup/compare/v0.11.0...v0.11.1) (2023-01-27)

### Bug Fixes

- **deps:** updated dependencies ([b3d221c](https://github.com/Tada5hi/authup/commit/b3d221c862c4f4dbd0ccf018566ef00796fcd591))

# [0.11.0](https://github.com/Tada5hi/authup/compare/v0.10.1...v0.11.0) (2023-01-27)

**Note:** Version bump only for package @authup/core

## [0.10.1](https://github.com/Tada5hi/authup/compare/v0.10.0...v0.10.1) (2023-01-23)

### Bug Fixes

- **deps:** reverted minimatch version to v5 ([7385d0d](https://github.com/Tada5hi/authup/commit/7385d0d25b729087000f81d2d04c2033f7464958))

# [0.10.0](https://github.com/Tada5hi/authup/compare/v0.9.0...v0.10.0) (2023-01-20)

### Features

- bump (peer-) dependency version ([f2faacb](https://github.com/Tada5hi/authup/commit/f2faacb0f19b81251bb063dd49a2d91539e4e39d))

# [0.9.0](https://github.com/Tada5hi/authup/compare/v0.8.0...v0.9.0) (2023-01-20)

### Bug Fixes

- **deps:** bump minimatch from 5.1.2 to 6.1.5 ([#763](https://github.com/Tada5hi/authup/issues/763)) ([179226c](https://github.com/Tada5hi/authup/commit/179226cc1c312cc7c95c2fe1711164df15b1dfe1))

### Features

- lazy password grant + minor entity management ui guards ([127ec1c](https://github.com/Tada5hi/authup/commit/127ec1c13f108f2a032aba67dd3b662d35251dc7))

# [0.8.0](https://github.com/Tada5hi/authup/compare/v0.7.0...v0.8.0) (2023-01-16)

### Bug Fixes

- **deps:** bump @types/jsonwebtoken from 9.0.0 to 9.0.1 ([f2ef31c](https://github.com/Tada5hi/authup/commit/f2ef31c46eae74a9d8b8d219a3bcb418d2d48bb0))
- **deps:** bump smob from 0.0.6 to 0.0.7 ([535685c](https://github.com/Tada5hi/authup/commit/535685cfb55e58dfa88635d1f08c0e3909d417dd))

### Features

- replaced ts-jest & partially rollup with swc ([bf2b1aa](https://github.com/Tada5hi/authup/commit/bf2b1aa7ed4f0ee9e63fabf0d1d38754bbfa3310))

# [0.7.0](https://github.com/Tada5hi/authup/compare/v0.6.3...v0.7.0) (2023-01-11)

### Features

- unified entity columns for sqlite, mysql & postgres ([f379caa](https://github.com/Tada5hi/authup/commit/f379caac7b7f95145629734b692a7d38a472c9b2))

## [0.6.3](https://github.com/Tada5hi/authup/compare/v0.6.2...v0.6.3) (2023-01-10)

### Bug Fixes

- **common:** peer-dependency version ([76902ca](https://github.com/Tada5hi/authup/commit/76902ca1aadbcf9f96de147f428c2e322bfee916))

## [0.6.2](https://github.com/Tada5hi/authup/compare/v0.6.1...v0.6.2) (2023-01-10)

**Note:** Version bump only for package @authup/core

# [0.6.0](https://github.com/Tada5hi/authup/compare/v0.5.0...v0.6.0) (2023-01-08)

### Bug Fixes

- oauth2 authorization code grant flow ([6422a9b](https://github.com/Tada5hi/authup/commit/6422a9b207474596363b3d48ce12e0c8e184ae8d))

# [0.5.0](https://github.com/Tada5hi/authup/compare/v0.4.0...v0.5.0) (2023-01-08)

### Bug Fixes

- **deps:** bump @types/jsonwebtoken from 8.5.9 to 9.0.0 ([17bc27b](https://github.com/Tada5hi/authup/commit/17bc27b85466a34a61b0d4c89e516760d549d42e))

### Features

- add robot/user renaming constraints + non owned permission assign ([ea12e73](https://github.com/Tada5hi/authup/commit/ea12e7309c6d539ec005cc5460ef50a2ebe8c931))
- **server-database:** updated indexes + realmified resources ([cb5e19e](https://github.com/Tada5hi/authup/commit/cb5e19ef1e49cdde6c0e63c6e59167638a9f79d6))
- **server-http:** allow name/slug identifier for fetching resource ([c05a69f](https://github.com/Tada5hi/authup/commit/c05a69f46da14e08966acd636644e65addc83370))

# [0.4.0](https://github.com/Tada5hi/authup/compare/v0.3.1...v0.4.0) (2022-12-21)

### Bug Fixes

- **deps:** bump minimatch from 5.1.1 to 5.1.2 ([c656530](https://github.com/Tada5hi/authup/commit/c656530601d987367e957a917b11e28bf09868c4))

### Features

- add scope management (http-endpoint, db-entity, ...) ([2ab4236](https://github.com/Tada5hi/authup/commit/2ab42364e44f032cb93c9946c40a9fd71f287c44))
- further enhancement for client & scope management ([29d1f3e](https://github.com/Tada5hi/authup/commit/29d1f3ee5ecde14afa0b692dd9589887bc2df54e))
- **ui:** add oauth2 authorization modal ([858e972](https://github.com/Tada5hi/authup/commit/858e9723dc3bd319b5b05f4a29f5c1a6d1e690fd))

# [0.3.0](https://github.com/Tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)

### Bug Fixes

- **server-http:** enhance {user,role,robot} endpoint validation ([842afcc](https://github.com/Tada5hi/authup/commit/842afccee90a0c3f7510ba61edf1cfe9f7840033))
- **ui:** minor fixes (list-builder,{client,permission}-form,...) ([666b41f](https://github.com/Tada5hi/authup/commit/666b41f2fccc370815046087a621882f0159f1cc))

### Features

- add client/application management ([5327e9b](https://github.com/Tada5hi/authup/commit/5327e9bf411dfeeadef60d8f28ea81e0bc638f38))
- allow non realm assigned clients ([3be4011](https://github.com/Tada5hi/authup/commit/3be401106c5b03f1151c182e63eae0a0d543fa36))
- enhanced & extended permission management ([3c33bd0](https://github.com/Tada5hi/authup/commit/3c33bd0e0dcf1035d546fce375a76bb1c1312a05))
- refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/Tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))

## [0.2.2](https://github.com/Tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)

**Note:** Version bump only for package @authup/core

# [0.2.0](https://github.com/Tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)

**Note:** Version bump only for package @authup/core

# 0.1.0 (2022-12-08)

### Bug Fixes

- bump typeorm-extension, rapiq & routup version ([e37b993](https://github.com/Tada5hi/authup/commit/e37b993bfbf3d11b24c696d59f1382cc4379a72c))
- **deps:** bump @ebec/http from 0.0.4 to 0.1.0 ([016baa2](https://github.com/Tada5hi/authup/commit/016baa22fd25390b0320e90d77a0fb870716c294))

### Features

- better config handling ([b1582b7](https://github.com/Tada5hi/authup/commit/b1582b798174c2c44e06271f3250db637a159bfd))
- enhance check for readable & writable realm resources ([a048358](https://github.com/Tada5hi/authup/commit/a048358f3e6bc1ddfbffe2ec76148b1ebee276ed))
- **server-core:** replaced http framework ([6273ae6](https://github.com/Tada5hi/authup/commit/6273ae680f82a4e27ba527b9eb260bb81ee75d20))
