# Change Log

## [1.0.0-beta.19](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.19) (2024-06-29)


### Features

* add http api client for policy entity ([bee1f3a](https://github.com/authup/authup/commit/bee1f3a9d0acbf600f4f1b1f6b7dd89a3d9288fa))
* add policy (event context, domain type, subscriber, ...) ([42fbbb3](https://github.com/authup/authup/commit/42fbbb30211db0ad867a290d7571f2bcdd2118e6))
* reworked ability management and access ([#2102](https://github.com/authup/authup/issues/2102)) ([b3dc45c](https://github.com/authup/authup/commit/b3dc45c2a1d0cd403e8ab545bd87ce4e49738758))


### Bug Fixes

* **deps:** bump better-sqlite3 from 11.0.0 to 11.1.1 ([#2104](https://github.com/authup/authup/issues/2104)) ([6df6aee](https://github.com/authup/authup/commit/6df6aeef481a21d338d7e2e751e8864b08096229))
* remove console.log statement ([8ffda96](https://github.com/authup/authup/commit/8ffda96a625ec810fcea2190de2a06cfd00e1000))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-http-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/server-kit bumped from ^1.0.0-beta.18 to ^1.0.1-beta.18

## [1.0.0-beta.18](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.18) (2024-06-24)


### Features

* add client_id column to permission entity ([47d2d63](https://github.com/authup/authup/commit/47d2d636707e910cd62485e368decabda2d5467c))
* add realm_id property to policy-attribute entity ([09ff4de](https://github.com/authup/authup/commit/09ff4ded550540e2a22838c4b19711df0bc2539e))
* allow defining custom policies ([#2088](https://github.com/authup/authup/issues/2088)) ([45496cf](https://github.com/authup/authup/commit/45496cfac3a9300ac1cf7fa587105dcc808158fd))
* allow filtering permissions by built_in attribute ([2ad788a](https://github.com/authup/authup/commit/2ad788aaa53c7d9f9ab4f68351750f389cb38c8b))
* better naming for policy evaluator methods ([1801bb9](https://github.com/authup/authup/commit/1801bb940dd2893286fde3c5a1ac9b932e3fd4e5))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* initial policy implementation ([#2038](https://github.com/authup/authup/issues/2038)) ([deeaffc](https://github.com/authup/authup/commit/deeaffcf0b4a72d9e1d6cf99dbf70d582b98c257))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* refacotring of http controller request validation ([#2082](https://github.com/authup/authup/issues/2082)) ([6be6ff8](https://github.com/authup/authup/commit/6be6ff858db9527651f8abacabe99280ce9a2a08))
* refactored domain entities properties and controllers ([#2075](https://github.com/authup/authup/issues/2075)) ([9a237d8](https://github.com/authup/authup/commit/9a237d8fa8b8cd7eabeecb534906510d31cd28b8))
* refactored domain event publishing + fixed cache invalidation ([#1928](https://github.com/authup/authup/issues/1928)) ([53f2fba](https://github.com/authup/authup/commit/53f2fbaeeb4190a48bb920bc4595fef27a4cf2d5))
* refactored ea-repo implementation + use ea-repo for policy entity ([abd9cdb](https://github.com/authup/authup/commit/abd9cdb529e1d6ebab315abc1f2d2eae60dd7339))
* refactored service singleton usage ([#1933](https://github.com/authup/authup/issues/1933)) ([cbf2f58](https://github.com/authup/authup/commit/cbf2f5836d5f3bf4cd26ab0add44e78222d54602))
* renamed group-policy to composite-policy ([42e9702](https://github.com/authup/authup/commit/42e9702419824e459cb3311ae0766d0871a2d92a))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* restrictions for role,permission-assignemnts ([#2071](https://github.com/authup/authup/issues/2071)) ([c851f76](https://github.com/authup/authup/commit/c851f76777cf0018d55f62511536b5f73a080868))


### Bug Fixes

* **deps:** bump @types/jsonwebtoken from 9.0.4 to 9.0.5 ([#1507](https://github.com/authup/authup/issues/1507)) ([598b9af](https://github.com/authup/authup/commit/598b9af61e739e74ace804941dc05f1cc79e6e14))
* **deps:** bump @types/nodemailer from 6.4.13 to 6.4.14 ([#1543](https://github.com/authup/authup/issues/1543)) ([b67c556](https://github.com/authup/authup/commit/b67c556bd5ef799d97456b67de5cfcb57ddeca1d))
* **deps:** bump better-sqlite3 from 10.0.0 to 11.0.0 ([#2030](https://github.com/authup/authup/issues/2030)) ([0b65564](https://github.com/authup/authup/commit/0b65564c53357061e3f333ed906c13092e2a4d70))
* **deps:** bump better-sqlite3 from 9.5.0 to 9.6.0 ([#1935](https://github.com/authup/authup/issues/1935)) ([e835eff](https://github.com/authup/authup/commit/e835eff9e5de0a919cbb7117d7f5ce8cdc686916))
* **deps:** bump better-sqlite3 from 9.6.0 to 10.0.0 ([#2000](https://github.com/authup/authup/issues/2000)) ([776509c](https://github.com/authup/authup/commit/776509c702854326b9a75d43699503019530d247))
* **deps:** bump mysql2 from 3.9.5 to 3.9.6 ([#1905](https://github.com/authup/authup/issues/1905)) ([5d9cbd3](https://github.com/authup/authup/commit/5d9cbd3219a32cd09284be62265b73396a5325e8))
* **deps:** bump mysql2 from 3.9.7 to 3.10.0 ([#2026](https://github.com/authup/authup/issues/2026)) ([168b9a2](https://github.com/authup/authup/commit/168b9a2a5a32922738b872e700362f8c13800abf))
* **deps:** bump pg from 8.11.5 to 8.12.0 ([#2036](https://github.com/authup/authup/issues/2036)) ([db4f668](https://github.com/authup/authup/commit/db4f6686cc8893e75cf9bba150ffd9238fc6801d))
* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))
* **deps:** bump zod from 3.23.7 to 3.23.8 ([#1962](https://github.com/authup/authup/issues/1962)) ([25f63cb](https://github.com/authup/authup/commit/25f63cb29e9bcd1f3e5a8eb0cfdd27f95f4912fc))
* encforcing entity unique constraints on create/update operation ([a9680df](https://github.com/authup/authup/commit/a9680df90c7f24bc463051068f8afba3493c36b7))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* realm target in policy attribute entity ([03c5ec1](https://github.com/authup/authup/commit/03c5ec1a9b78d2ce918a0f4cac0619a26c544b0f))
* throwing error on token decoding issue ([1617abe](https://github.com/authup/authup/commit/1617abe754d0dec9ad93867ffa0271a33f7c05dd))
* throwing token error ([35663eb](https://github.com/authup/authup/commit/35663eb994ee18980298b173afb31c2983a9c91d))
* zod construct for attribute built-in policy ([2e964ec](https://github.com/authup/authup/commit/2e964ecaf859dfdf2565fc1be08c88739121b00b))

## [1.0.0-beta.18](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.0-beta.18) (2024-06-23)


### Features

* allow defining custom policies ([#2088](https://github.com/authup/authup/issues/2088)) ([45496cf](https://github.com/authup/authup/commit/45496cfac3a9300ac1cf7fa587105dcc808158fd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/core-kit bumped from ^1.0.0-beta.17 to ^1.0.0-beta.18
    * @authup/core-http-kit bumped from ^1.0.0-beta.17 to ^1.0.1-beta.17

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.0-beta.17) (2024-06-23)


### Features

* add client_id column to permission entity ([47d2d63](https://github.com/authup/authup/commit/47d2d636707e910cd62485e368decabda2d5467c))
* add realm_id property to policy-attribute entity ([09ff4de](https://github.com/authup/authup/commit/09ff4ded550540e2a22838c4b19711df0bc2539e))
* allow filtering permissions by built_in attribute ([2ad788a](https://github.com/authup/authup/commit/2ad788aaa53c7d9f9ab4f68351750f389cb38c8b))
* better naming for policy evaluator methods ([1801bb9](https://github.com/authup/authup/commit/1801bb940dd2893286fde3c5a1ac9b932e3fd4e5))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* initial policy implementation ([#2038](https://github.com/authup/authup/issues/2038)) ([deeaffc](https://github.com/authup/authup/commit/deeaffcf0b4a72d9e1d6cf99dbf70d582b98c257))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* refacotring of http controller request validation ([#2082](https://github.com/authup/authup/issues/2082)) ([6be6ff8](https://github.com/authup/authup/commit/6be6ff858db9527651f8abacabe99280ce9a2a08))
* refactored domain entities properties and controllers ([#2075](https://github.com/authup/authup/issues/2075)) ([9a237d8](https://github.com/authup/authup/commit/9a237d8fa8b8cd7eabeecb534906510d31cd28b8))
* refactored domain event publishing + fixed cache invalidation ([#1928](https://github.com/authup/authup/issues/1928)) ([53f2fba](https://github.com/authup/authup/commit/53f2fbaeeb4190a48bb920bc4595fef27a4cf2d5))
* refactored ea-repo implementation + use ea-repo for policy entity ([abd9cdb](https://github.com/authup/authup/commit/abd9cdb529e1d6ebab315abc1f2d2eae60dd7339))
* refactored service singleton usage ([#1933](https://github.com/authup/authup/issues/1933)) ([cbf2f58](https://github.com/authup/authup/commit/cbf2f5836d5f3bf4cd26ab0add44e78222d54602))
* renamed group-policy to composite-policy ([42e9702](https://github.com/authup/authup/commit/42e9702419824e459cb3311ae0766d0871a2d92a))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* restrictions for role,permission-assignemnts ([#2071](https://github.com/authup/authup/issues/2071)) ([c851f76](https://github.com/authup/authup/commit/c851f76777cf0018d55f62511536b5f73a080868))


### Bug Fixes

* **deps:** bump @types/jsonwebtoken from 9.0.4 to 9.0.5 ([#1507](https://github.com/authup/authup/issues/1507)) ([598b9af](https://github.com/authup/authup/commit/598b9af61e739e74ace804941dc05f1cc79e6e14))
* **deps:** bump @types/nodemailer from 6.4.13 to 6.4.14 ([#1543](https://github.com/authup/authup/issues/1543)) ([b67c556](https://github.com/authup/authup/commit/b67c556bd5ef799d97456b67de5cfcb57ddeca1d))
* **deps:** bump better-sqlite3 from 10.0.0 to 11.0.0 ([#2030](https://github.com/authup/authup/issues/2030)) ([0b65564](https://github.com/authup/authup/commit/0b65564c53357061e3f333ed906c13092e2a4d70))
* **deps:** bump better-sqlite3 from 9.5.0 to 9.6.0 ([#1935](https://github.com/authup/authup/issues/1935)) ([e835eff](https://github.com/authup/authup/commit/e835eff9e5de0a919cbb7117d7f5ce8cdc686916))
* **deps:** bump better-sqlite3 from 9.6.0 to 10.0.0 ([#2000](https://github.com/authup/authup/issues/2000)) ([776509c](https://github.com/authup/authup/commit/776509c702854326b9a75d43699503019530d247))
* **deps:** bump mysql2 from 3.9.5 to 3.9.6 ([#1905](https://github.com/authup/authup/issues/1905)) ([5d9cbd3](https://github.com/authup/authup/commit/5d9cbd3219a32cd09284be62265b73396a5325e8))
* **deps:** bump mysql2 from 3.9.7 to 3.10.0 ([#2026](https://github.com/authup/authup/issues/2026)) ([168b9a2](https://github.com/authup/authup/commit/168b9a2a5a32922738b872e700362f8c13800abf))
* **deps:** bump pg from 8.11.5 to 8.12.0 ([#2036](https://github.com/authup/authup/issues/2036)) ([db4f668](https://github.com/authup/authup/commit/db4f6686cc8893e75cf9bba150ffd9238fc6801d))
* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))
* **deps:** bump zod from 3.23.7 to 3.23.8 ([#1962](https://github.com/authup/authup/issues/1962)) ([25f63cb](https://github.com/authup/authup/commit/25f63cb29e9bcd1f3e5a8eb0cfdd27f95f4912fc))
* encforcing entity unique constraints on create/update operation ([a9680df](https://github.com/authup/authup/commit/a9680df90c7f24bc463051068f8afba3493c36b7))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* realm target in policy attribute entity ([03c5ec1](https://github.com/authup/authup/commit/03c5ec1a9b78d2ce918a0f4cac0619a26c544b0f))
* throwing error on token decoding issue ([1617abe](https://github.com/authup/authup/commit/1617abe754d0dec9ad93867ffa0271a33f7c05dd))
* throwing token error ([35663eb](https://github.com/authup/authup/commit/35663eb994ee18980298b173afb31c2983a9c91d))
* zod construct for attribute built-in policy ([2e964ec](https://github.com/authup/authup/commit/2e964ecaf859dfdf2565fc1be08c88739121b00b))

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.16...v1.0.0-beta.17) (2024-06-23)


### Features

* add client_id column to permission entity ([47d2d63](https://github.com/authup/authup/commit/47d2d636707e910cd62485e368decabda2d5467c))
* add realm_id property to policy-attribute entity ([09ff4de](https://github.com/authup/authup/commit/09ff4ded550540e2a22838c4b19711df0bc2539e))
* allow filtering permissions by built_in attribute ([2ad788a](https://github.com/authup/authup/commit/2ad788aaa53c7d9f9ab4f68351750f389cb38c8b))
* better naming for policy evaluator methods ([1801bb9](https://github.com/authup/authup/commit/1801bb940dd2893286fde3c5a1ac9b932e3fd4e5))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* initial policy implementation ([#2038](https://github.com/authup/authup/issues/2038)) ([deeaffc](https://github.com/authup/authup/commit/deeaffcf0b4a72d9e1d6cf99dbf70d582b98c257))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* refacotring of http controller request validation ([#2082](https://github.com/authup/authup/issues/2082)) ([6be6ff8](https://github.com/authup/authup/commit/6be6ff858db9527651f8abacabe99280ce9a2a08))
* refactored domain entities properties and controllers ([#2075](https://github.com/authup/authup/issues/2075)) ([9a237d8](https://github.com/authup/authup/commit/9a237d8fa8b8cd7eabeecb534906510d31cd28b8))
* refactored domain event publishing + fixed cache invalidation ([#1928](https://github.com/authup/authup/issues/1928)) ([53f2fba](https://github.com/authup/authup/commit/53f2fbaeeb4190a48bb920bc4595fef27a4cf2d5))
* refactored ea-repo implementation + use ea-repo for policy entity ([abd9cdb](https://github.com/authup/authup/commit/abd9cdb529e1d6ebab315abc1f2d2eae60dd7339))
* refactored service singleton usage ([#1933](https://github.com/authup/authup/issues/1933)) ([cbf2f58](https://github.com/authup/authup/commit/cbf2f5836d5f3bf4cd26ab0add44e78222d54602))
* renamed group-policy to composite-policy ([42e9702](https://github.com/authup/authup/commit/42e9702419824e459cb3311ae0766d0871a2d92a))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* restrictions for role,permission-assignemnts ([#2071](https://github.com/authup/authup/issues/2071)) ([c851f76](https://github.com/authup/authup/commit/c851f76777cf0018d55f62511536b5f73a080868))


### Bug Fixes

* **deps:** bump @types/jsonwebtoken from 9.0.4 to 9.0.5 ([#1507](https://github.com/authup/authup/issues/1507)) ([598b9af](https://github.com/authup/authup/commit/598b9af61e739e74ace804941dc05f1cc79e6e14))
* **deps:** bump @types/nodemailer from 6.4.13 to 6.4.14 ([#1543](https://github.com/authup/authup/issues/1543)) ([b67c556](https://github.com/authup/authup/commit/b67c556bd5ef799d97456b67de5cfcb57ddeca1d))
* **deps:** bump better-sqlite3 from 10.0.0 to 11.0.0 ([#2030](https://github.com/authup/authup/issues/2030)) ([0b65564](https://github.com/authup/authup/commit/0b65564c53357061e3f333ed906c13092e2a4d70))
* **deps:** bump better-sqlite3 from 9.5.0 to 9.6.0 ([#1935](https://github.com/authup/authup/issues/1935)) ([e835eff](https://github.com/authup/authup/commit/e835eff9e5de0a919cbb7117d7f5ce8cdc686916))
* **deps:** bump better-sqlite3 from 9.6.0 to 10.0.0 ([#2000](https://github.com/authup/authup/issues/2000)) ([776509c](https://github.com/authup/authup/commit/776509c702854326b9a75d43699503019530d247))
* **deps:** bump mysql2 from 3.9.5 to 3.9.6 ([#1905](https://github.com/authup/authup/issues/1905)) ([5d9cbd3](https://github.com/authup/authup/commit/5d9cbd3219a32cd09284be62265b73396a5325e8))
* **deps:** bump mysql2 from 3.9.7 to 3.10.0 ([#2026](https://github.com/authup/authup/issues/2026)) ([168b9a2](https://github.com/authup/authup/commit/168b9a2a5a32922738b872e700362f8c13800abf))
* **deps:** bump pg from 8.11.5 to 8.12.0 ([#2036](https://github.com/authup/authup/issues/2036)) ([db4f668](https://github.com/authup/authup/commit/db4f6686cc8893e75cf9bba150ffd9238fc6801d))
* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))
* **deps:** bump zod from 3.23.7 to 3.23.8 ([#1962](https://github.com/authup/authup/issues/1962)) ([25f63cb](https://github.com/authup/authup/commit/25f63cb29e9bcd1f3e5a8eb0cfdd27f95f4912fc))
* encforcing entity unique constraints on create/update operation ([a9680df](https://github.com/authup/authup/commit/a9680df90c7f24bc463051068f8afba3493c36b7))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* realm target in policy attribute entity ([03c5ec1](https://github.com/authup/authup/commit/03c5ec1a9b78d2ce918a0f4cac0619a26c544b0f))
* throwing error on token decoding issue ([1617abe](https://github.com/authup/authup/commit/1617abe754d0dec9ad93867ffa0271a33f7c05dd))
* throwing token error ([35663eb](https://github.com/authup/authup/commit/35663eb994ee18980298b173afb31c2983a9c91d))
* zod construct for attribute built-in policy ([2e964ec](https://github.com/authup/authup/commit/2e964ecaf859dfdf2565fc1be08c88739121b00b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-http-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/server-kit bumped from ^1.0.0-beta.16 to ^1.0.0-beta.17

## [1.0.0-beta.16](https://github.com/authup/authup/compare/v1.0.0-beta.13...v1.0.0-beta.16) (2024-06-07)


### Features

* allow filtering permissions by built_in attribute ([2ad788a](https://github.com/authup/authup/commit/2ad788aaa53c7d9f9ab4f68351750f389cb38c8b))


### Bug Fixes

* **deps:** bump better-sqlite3 from 10.0.0 to 11.0.0 ([#2030](https://github.com/authup/authup/issues/2030)) ([0b65564](https://github.com/authup/authup/commit/0b65564c53357061e3f333ed906c13092e2a4d70))
* **deps:** bump better-sqlite3 from 9.6.0 to 10.0.0 ([#2000](https://github.com/authup/authup/issues/2000)) ([776509c](https://github.com/authup/authup/commit/776509c702854326b9a75d43699503019530d247))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.16

## [1.0.0-beta.13](https://github.com/authup/authup/compare/v1.0.0-beta.12...v1.0.0-beta.13) (2024-05-13)


### Features

* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))


### Bug Fixes

* encforcing entity unique constraints on create/update operation ([a9680df](https://github.com/authup/authup/commit/a9680df90c7f24bc463051068f8afba3493c36b7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-http-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/server-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13

## [1.0.0-beta.12](https://github.com/authup/authup/compare/v1.0.0-beta.11...v1.0.0-beta.12) (2024-05-10)


### Features

* refactored domain event publishing + fixed cache invalidation ([#1928](https://github.com/authup/authup/issues/1928)) ([53f2fba](https://github.com/authup/authup/commit/53f2fbaeeb4190a48bb920bc4595fef27a4cf2d5))
* refactored service singleton usage ([#1933](https://github.com/authup/authup/issues/1933)) ([cbf2f58](https://github.com/authup/authup/commit/cbf2f5836d5f3bf4cd26ab0add44e78222d54602))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))


### Bug Fixes

* **deps:** bump @types/jsonwebtoken from 9.0.3 to 9.0.4 ([#1444](https://github.com/authup/authup/issues/1444)) ([185bee1](https://github.com/authup/authup/commit/185bee120615e5c51a9d643b9af03d73c35e56d0))
* **deps:** bump @types/jsonwebtoken from 9.0.4 to 9.0.5 ([#1507](https://github.com/authup/authup/issues/1507)) ([598b9af](https://github.com/authup/authup/commit/598b9af61e739e74ace804941dc05f1cc79e6e14))
* **deps:** bump @types/nodemailer from 6.4.13 to 6.4.14 ([#1543](https://github.com/authup/authup/issues/1543)) ([b67c556](https://github.com/authup/authup/commit/b67c556bd5ef799d97456b67de5cfcb57ddeca1d))
* **deps:** bump better-sqlite3 from 9.5.0 to 9.6.0 ([#1935](https://github.com/authup/authup/issues/1935)) ([e835eff](https://github.com/authup/authup/commit/e835eff9e5de0a919cbb7117d7f5ce8cdc686916))
* **deps:** bump mysql2 from 3.9.5 to 3.9.6 ([#1905](https://github.com/authup/authup/issues/1905)) ([5d9cbd3](https://github.com/authup/authup/commit/5d9cbd3219a32cd09284be62265b73396a5325e8))
* **deps:** bump nodemailer and @types/nodemailer ([#1448](https://github.com/authup/authup/issues/1448)) ([026830c](https://github.com/authup/authup/commit/026830c71255d400ba24584b390012cc79cd136a))
* **deps:** bump nodemailer from 6.9.5 to 6.9.6 ([#1418](https://github.com/authup/authup/issues/1418)) ([bf4eb3d](https://github.com/authup/authup/commit/bf4eb3de649e89b1585bdced3af5a81bdd3eb365))
* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* throwing error on token decoding issue ([1617abe](https://github.com/authup/authup/commit/1617abe754d0dec9ad93867ffa0271a33f7c05dd))
* throwing token error ([35663eb](https://github.com/authup/authup/commit/35663eb994ee18980298b173afb31c2983a9c91d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-http-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/server-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12

## [1.0.1-beta.10](https://github.com/authup/authup/compare/v1.0.0-beta.10...v1.0.1-beta.10) (2024-05-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-kit bumped from ^1.0.0-beta.10 to ^1.0.0-beta.11

## [1.0.0-beta.10](https://github.com/authup/authup/compare/v1.0.0-beta.9...v1.0.0-beta.10) (2024-05-08)


### Features

* refactored domain event publishing + fixed cache invalidation ([#1928](https://github.com/authup/authup/issues/1928)) ([53f2fba](https://github.com/authup/authup/commit/53f2fbaeeb4190a48bb920bc4595fef27a4cf2d5))
* refactored service singleton usage ([#1933](https://github.com/authup/authup/issues/1933)) ([cbf2f58](https://github.com/authup/authup/commit/cbf2f5836d5f3bf4cd26ab0add44e78222d54602))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))


### Bug Fixes

* **deps:** bump better-sqlite3 from 9.5.0 to 9.6.0 ([#1935](https://github.com/authup/authup/issues/1935)) ([e835eff](https://github.com/authup/authup/commit/e835eff9e5de0a919cbb7117d7f5ce8cdc686916))
* **deps:** bump mysql2 from 3.9.5 to 3.9.6 ([#1905](https://github.com/authup/authup/issues/1905)) ([5d9cbd3](https://github.com/authup/authup/commit/5d9cbd3219a32cd09284be62265b73396a5325e8))
* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* throwing error on token decoding issue ([1617abe](https://github.com/authup/authup/commit/1617abe754d0dec9ad93867ffa0271a33f7c05dd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.9 to ^1.0.1-beta.9
    * @authup/kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-http-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/server-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10

## [1.0.0-beta.9](https://github.com/authup/authup/compare/server-core-v1.0.0-beta.8...server-core-v1.0.0-beta.9) (2024-04-10)


### Features

* check composite unique constraints on resource creation for sqlite ([#1870](https://github.com/authup/authup/issues/1870)) ([d07fcb9](https://github.com/authup/authup/commit/d07fcb9e30cfe8429aad007adcb75bed14894eff))


### Bug Fixes

* column names for sqlite uniqueness enforcement should be based on property name ([5de8c5f](https://github.com/authup/authup/commit/5de8c5f27592e4b106dac7afda602a3c9fb43dd1))
* **deps:** bump @hapic/oauth2 from 2.4.1 to 2.4.2 ([#1835](https://github.com/authup/authup/issues/1835)) ([d870a11](https://github.com/authup/authup/commit/d870a117850b1c0ccb3fbc988e43478d1d1cb826))
* **deps:** bump @hapic/vault from 2.3.2 to 2.3.3 ([#1836](https://github.com/authup/authup/issues/1836)) ([a51ef81](https://github.com/authup/authup/commit/a51ef81ccc04175cef233f1ea3836d6a3bca1b4d))
* **deps:** bump @routup/basic from 1.3.1 to 1.3.2 ([#1865](https://github.com/authup/authup/issues/1865)) ([7c00221](https://github.com/authup/authup/commit/7c0022156a488e4f9f9bef6cf12aa6d4e042a451))
* **deps:** bump @routup/decorators from 3.3.1 to 3.3.2 ([#1873](https://github.com/authup/authup/issues/1873)) ([0fdff25](https://github.com/authup/authup/commit/0fdff25b8dcf32ea7472983ca3795425b8d64993))
* **deps:** bump @routup/swagger from 2.3.5 to 2.3.6 ([#1875](https://github.com/authup/authup/issues/1875)) ([cf13487](https://github.com/authup/authup/commit/cf134873f7c450e83b865620fdd65bc729089e78))
* **deps:** bump better-sqlite3 from 9.4.3 to 9.4.5 ([#1868](https://github.com/authup/authup/issues/1868)) ([941324f](https://github.com/authup/authup/commit/941324f9b3cc2bfde7f2af816b681b5412618cd7))
* **deps:** bump hapic from 2.5.0 to 2.5.1 ([#1834](https://github.com/authup/authup/issues/1834)) ([4f815b1](https://github.com/authup/authup/commit/4f815b1894e3fa793e6553cf04c710790ac730f1))
* **deps:** bump locter from 2.0.2 to 2.1.0 ([#1855](https://github.com/authup/authup/issues/1855)) ([3628d76](https://github.com/authup/authup/commit/3628d76c0f5e7722bb6809cd8cab7228b1509850))
* **deps:** bump mysql2 from 3.9.3 to 3.9.4 ([#1883](https://github.com/authup/authup/issues/1883)) ([c5118a7](https://github.com/authup/authup/commit/c5118a75a3ab154b3acc30fd4dca938f64091cdf))
* **deps:** bump pg from 8.11.3 to 8.11.5 ([#1856](https://github.com/authup/authup/issues/1856)) ([8cb11c7](https://github.com/authup/authup/commit/8cb11c77c6857e62dffebe30f643e97f60cfe783))
* **deps:** bump reflect-metadata from 0.2.1 to 0.2.2 ([#1841](https://github.com/authup/authup/issues/1841)) ([ee73bf7](https://github.com/authup/authup/commit/ee73bf792bd64e34474ac7c9e61df9047f96da2c))
* **deps:** bump routup from 3.2.0 to 3.3.0 ([#1847](https://github.com/authup/authup/issues/1847)) ([3f80b81](https://github.com/authup/authup/commit/3f80b8167906085a4d4ecf7002867c10215dc45f))
* **deps:** bump smob from 1.4.1 to 1.5.0 ([#1843](https://github.com/authup/authup/issues/1843)) ([4741a8a](https://github.com/authup/authup/commit/4741a8a93ea069fe4fcb7ab897d789414e372d69))
* **deps:** bump typeorm-extension from 3.5.0 to 3.5.1 ([#1884](https://github.com/authup/authup/issues/1884)) ([f349c80](https://github.com/authup/authup/commit/f349c80dbd6d3b143041407d3c51c174470ac3cb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9
    * @authup/core bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9
    * @authup/server-kit bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9

## [1.0.0-beta.8](https://github.com/authup/authup/compare/server-core-v1.0.0-beta.7...server-core-v1.0.0-beta.8) (2024-03-26)


### Features

* use mysql2 driver package to support mysql v8 ([#1831](https://github.com/authup/authup/issues/1831)) ([d8fd28b](https://github.com/authup/authup/commit/d8fd28b9302bbf77ece1fb2837e2ada9510721cf))


### Bug Fixes

* **deps:** bump winston from 3.12.0 to 3.13.0 ([#1833](https://github.com/authup/authup/issues/1833)) ([7c9766c](https://github.com/authup/authup/commit/7c9766cef39343dff6276774166fef512333b62f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8
    * @authup/core bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8
    * @authup/server-kit bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8

## [1.0.0-beta.7](https://github.com/authup/authup/compare/server-core-v1.0.0-beta.6...server-core-v1.0.0-beta.7) (2024-03-06)


### Features

* bind default role to robot instead of individual permissions ([#1781](https://github.com/authup/authup/issues/1781)) ([bcc51d2](https://github.com/authup/authup/commit/bcc51d241a38541a2dcd1c83f9f149b37fde44d9))
* use rust bindings to speed up bcrypt and jsonwebtokens ([#1784](https://github.com/authup/authup/issues/1784)) ([3a1fcf3](https://github.com/authup/authup/commit/3a1fcf3705acce2564e4d3692e3161c6f1c5021d))


### Bug Fixes

* **deps:** bump winston from 3.11.0 to 3.12.0 ([#1794](https://github.com/authup/authup/issues/1794)) ([ab2a496](https://github.com/authup/authup/commit/ab2a4966577a662a68aa7caff813bb16e8c46301))
* maxAge assignment of refresh- & access-token ([5f112a0](https://github.com/authup/authup/commit/5f112a001f484cc81b2af9ccc928791829777efd))
* minor cleanup for jwt sign/verify & remove unnecessary dependencies ([8ca8600](https://github.com/authup/authup/commit/8ca8600b9ebf635b6cacd30ce246a640ed507c25))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7
    * @authup/core bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7
    * @authup/server-kit bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7

## [1.0.0-beta.6](https://github.com/authup/authup/compare/server-core-v1.0.0-beta.5...server-core-v1.0.0-beta.6) (2024-02-28)


### Bug Fixes

* paring of server core options ([ac5709f](https://github.com/authup/authup/commit/ac5709ffa867db28b4fdea0ebd0aef5d8a55c9f9))
* robot integrity http handler ([ba5e08e](https://github.com/authup/authup/commit/ba5e08e5aa725760b37033f2fdac0bf97ddcef5a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6
    * @authup/core bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6
    * @authup/server-kit bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6

## [1.0.0-beta.5](https://github.com/authup/authup/compare/server-core-v1.0.0-beta.4...server-core-v1.0.0-beta.5) (2024-02-26)


### Features

* allow {client,robot,user}-authentication via id or name ([2c06e42](https://github.com/authup/authup/commit/2c06e42c0b835e135af3c285ad4ac5f8a34a6421))
* better & consistent naming for configuration options ([#1773](https://github.com/authup/authup/issues/1773)) ([a4f966e](https://github.com/authup/authup/commit/a4f966e223181966b6bf3f63edd34d864ff5d29d))
* configurable name of default robot account ([#1771](https://github.com/authup/authup/issues/1771)) ([4ec7cdc](https://github.com/authup/authup/commit/4ec7cdc23a5deb5f6019558f592909e60a1fd95d))
* guarantee hashed robot vault secret is equal to db secret ([#1767](https://github.com/authup/authup/issues/1767)) ([9928256](https://github.com/authup/authup/commit/99282569585632659161eb2e1053e068f19129cd))
* manage {user,robot,client}-basic-auth by configuration ([#1768](https://github.com/authup/authup/issues/1768)) ([2b66063](https://github.com/authup/authup/commit/2b66063ba24ef33dcfe6470801de1413c2f2aa04))
* remove permission name regex restriction ([#1754](https://github.com/authup/authup/issues/1754)) ([c81a249](https://github.com/authup/authup/commit/c81a2499fe48cdbe258cac89d6084cb777ac27fc))
* simplified and enhanced ability-manager ([#1758](https://github.com/authup/authup/issues/1758)) ([641be51](https://github.com/authup/authup/commit/641be51163afedb296301f16e2ee127121e46796))


### Bug Fixes

* client repository naming ([d213faa](https://github.com/authup/authup/commit/d213faaf6bee4b01ff36d149ad1b58f43c87e15d))
* **deps:** bump better-sqlite3 from 9.4.1 to 9.4.3 ([#1760](https://github.com/authup/authup/issues/1760)) ([fdfd877](https://github.com/authup/authup/commit/fdfd877364d7f86223f44504fb177b44769abc25))
* **deps:** bump dotenv from 16.4.4 to 16.4.5 ([#1750](https://github.com/authup/authup/issues/1750)) ([e19c93d](https://github.com/authup/authup/commit/e19c93da9757f9bdc9f3b93706545f5906c55271))
* keys in build config fn ([b8deb00](https://github.com/authup/authup/commit/b8deb0017b3b94c8bcf81402b60e077c5622c2ce))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5
    * @authup/core bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5
    * @authup/server-kit bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5

## [1.0.0-beta.4](https://github.com/authup/authup/compare/server-core-v1.0.0-beta.3...server-core-v1.0.0-beta.4) (2024-02-19)


### Features

* enable condition validation for permission-relation entities ([#1733](https://github.com/authup/authup/issues/1733)) ([bb96e9a](https://github.com/authup/authup/commit/bb96e9aa10d825191b79e5971701ba8135acba55))
* ldap identity provider ([#1721](https://github.com/authup/authup/issues/1721)) ([3cf6858](https://github.com/authup/authup/commit/3cf68587b8ed44c3dbbf745fcbec6166e615f85b))
* ldap identity-provider {user,role}-filter attribute ([#1743](https://github.com/authup/authup/issues/1743)) ([f36f70e](https://github.com/authup/authup/commit/f36f70e67fddbe7c37c8dff82075598757e39599))
* serialize/deserialize {user,role,identity-provider}-attribute values ([#1731](https://github.com/authup/authup/issues/1731)) ([2283cca](https://github.com/authup/authup/commit/2283cca200ced41305f430c6a73e954dfd89bbf5))
* store email of identity-provider flow & optimized account creation ([df97c1a](https://github.com/authup/authup/commit/df97c1ad4cb0502bfbf16cdad34edc833ca522c7))
* use envix for environment variable interaction ([8d5a8fc](https://github.com/authup/authup/commit/8d5a8fc261cd34caea2a9d42222118cc54cef55f))


### Bug Fixes

* **deps:** bump @routup/swagger from 2.3.4 to 2.3.5 ([#1745](https://github.com/authup/authup/issues/1745)) ([0c8b7ab](https://github.com/authup/authup/commit/0c8b7ab35fd94f922d846539477cce5a3732c0b2))
* **deps:** bump better-sqlite3 from 9.3.0 to 9.4.1 ([#1717](https://github.com/authup/authup/issues/1717)) ([6c587cc](https://github.com/authup/authup/commit/6c587cc31ad8c8476b3612891ed850d56202bbdc))
* **deps:** bump dotenv from 16.4.1 to 16.4.4 ([#1728](https://github.com/authup/authup/issues/1728)) ([0952c01](https://github.com/authup/authup/commit/0952c013e5b26efece6f59974a5e584f64f97032))
* **deps:** bump envix from 1.2.0 to 1.3.0 ([#1714](https://github.com/authup/authup/issues/1714)) ([c922704](https://github.com/authup/authup/commit/c9227042f021ac062fa7eeb36030d5aa9eda40ec))
* **deps:** bump envix from 1.3.0 to 1.5.0 ([#1718](https://github.com/authup/authup/issues/1718)) ([68158fe](https://github.com/authup/authup/commit/68158fe5d41cc710da780b7d558d6990e88e8936))
* **deps:** bump typeorm-extension from 3.4.0 to 3.5.0 ([#1724](https://github.com/authup/authup/issues/1724)) ([b95f0bc](https://github.com/authup/authup/commit/b95f0bcb1261f444429919f0108afced24551a51))
* ldap identity-provider login flow + added idp ldap test suite ([bc78964](https://github.com/authup/authup/commit/bc7896472d4840a9197ef716ead1c4344c2f1679))
* remove env.ts~ ([e2d68df](https://github.com/authup/authup/commit/e2d68dfee5238f6a9311ad6adab8d0796fd42960))
* stricter implementation of ldap resolveDn fn ([135e66b](https://github.com/authup/authup/commit/135e66b6fecbbd312f23b9e337c95e7d60c1b169))
* use read-int instead of read-number ([cb01c5e](https://github.com/authup/authup/commit/cb01c5e1fe59008fcd792f04ce581ec10254538d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4
    * @authup/core bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4
    * @authup/server-kit bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4

## [1.0.0-beta.3](https://github.com/authup/authup/compare/server-core-v1.0.0-beta.2...server-core-v1.0.0-beta.3) (2024-02-06)


### Bug Fixes

* bump locter to v2 & reset lock file ([d129f14](https://github.com/authup/authup/commit/d129f14fcfbd4e20b07d15dd87691452f0941842))
* **deps:** bump @routup/swagger from 2.3.3 to 2.3.4 ([#1675](https://github.com/authup/authup/issues/1675)) ([5fb5373](https://github.com/authup/authup/commit/5fb537330b8113622b50989cdc736cead9841644))
* **deps:** bump better-sqlite3 from 9.2.2 to 9.3.0 ([#1662](https://github.com/authup/authup/issues/1662)) ([a1e8763](https://github.com/authup/authup/commit/a1e876332081e36b0b16fe7859cec2ba3463c7ab))
* **deps:** bump dotenv from 16.3.1 to 16.4.1 ([#1678](https://github.com/authup/authup/issues/1678)) ([ba5421c](https://github.com/authup/authup/commit/ba5421c0226ead1660fbe70e7d1c1a642b5892bd))
* **deps:** bump typeorm from 0.3.19 to 0.3.20 ([#1677](https://github.com/authup/authup/issues/1677)) ([e929396](https://github.com/authup/authup/commit/e929396712c0618353aff39cae3043ab9f0e585b))
* **deps:** bump typeorm-extension from 3.3.0 to 3.4.0 ([#1674](https://github.com/authup/authup/issues/1674)) ([87ca11b](https://github.com/authup/authup/commit/87ca11b0dbd5fa474cda0a61efaff60f30aec047))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3
    * @authup/core bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3
    * @authup/server-kit bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3

## [1.0.0-beta.2](https://github.com/authup/authup/compare/server-core-v1.0.0-beta.1...server-core-v1.0.0-beta.2) (2024-01-14)


### Bug Fixes

* **deps:** bump @routup/basic from 1.3.0 to 1.3.1 ([#1636](https://github.com/authup/authup/issues/1636)) ([0e3acb1](https://github.com/authup/authup/commit/0e3acb146a984e795e63c32149862a0de14af2eb))
* **deps:** bump @routup/decorators from 3.3.0 to 3.3.1 ([#1637](https://github.com/authup/authup/issues/1637)) ([4ee0314](https://github.com/authup/authup/commit/4ee031486e156b1def4e8dd887ce502552505f94))
* **deps:** bump @routup/swagger from 2.3.1 to 2.3.2 ([#1635](https://github.com/authup/authup/issues/1635)) ([f889e38](https://github.com/authup/authup/commit/f889e3869b3cd8ddfa6c7329339de42a91d170d1))
* **deps:** bump @routup/swagger from 2.3.2 to 2.3.3 ([#1644](https://github.com/authup/authup/issues/1644)) ([c3dfa71](https://github.com/authup/authup/commit/c3dfa71509677b2dc368a721de311be7061ebe18))
* **deps:** bump locter from 1.2.3 to 1.3.0 ([#1632](https://github.com/authup/authup/issues/1632)) ([6c1ced2](https://github.com/authup/authup/commit/6c1ced2a309a3719970a837c07459511a9084e48))
* **deps:** bump typeorm-extension from 3.2.0 to 3.3.0 ([#1642](https://github.com/authup/authup/issues/1642)) ([55ee6a5](https://github.com/authup/authup/commit/55ee6a5cd62f890ffdb294ec38dfc75c36ec5a64))
* setting publicURL to swagger http middleware ([d5eabbd](https://github.com/authup/authup/commit/d5eabbd2c0fbf020ed0dd7c698e7be59f395feff))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2
    * @authup/core bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2
    * @authup/server-kit bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2

## [1.0.0-beta.1](https://github.com/authup/authup/compare/server-core-v1.0.0-beta.0...server-core-v1.0.0-beta.1) (2024-01-09)


### Bug Fixes

* **deps:** bump @hapic/oauth2 from 2.4.0 to 2.4.1 ([#1628](https://github.com/authup/authup/issues/1628)) ([e963096](https://github.com/authup/authup/commit/e963096552ff0fca2e9685d6d7712d0d6f5202a7))
* **deps:** bump @hapic/vault from 2.3.1 to 2.3.2 ([#1629](https://github.com/authup/authup/issues/1629)) ([d9d3c25](https://github.com/authup/authup/commit/d9d3c25e46df759a34dbd393f01e0a84e8dfc9b9))
* **deps:** bump hapic from 2.4.0 to 2.5.0 ([#1627](https://github.com/authup/authup/issues/1627)) ([4adea8e](https://github.com/authup/authup/commit/4adea8e84bb0188cac35be82bca77379f32db7cd))
* remove proxy sub-module ([d52cd63](https://github.com/authup/authup/commit/d52cd63864ab32a3035ba803487de413ccad3df7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1
    * @authup/core bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1
    * @authup/server-kit bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1

## [1.0.0-beta.0](https://github.com/authup/authup/compare/server-core-v0.45.10...server-core-v1.0.0-beta.0) (2024-01-05)


### Miscellaneous Chores

* **server-core:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^0.0.0 to ^1.0.0-beta.0
    * @authup/core bumped from ^0.45.10 to ^1.0.0-beta.0
    * @authup/server-kit bumped from ^0.45.10 to ^1.0.0-beta.0

## 0.45.10

### Patch Changes

- [`ecf8797f`](https://github.com/authup/authup/commit/ecf8797fcacff6a560564fb9d01561c04b56cc63) Thanks [@tada5hi](https://github.com/tada5hi)! - fix throwing error

- Updated dependencies [[`ecf8797f`](https://github.com/authup/authup/commit/ecf8797fcacff6a560564fb9d01561c04b56cc63)]:
  - @authup/core@0.45.10
  - @authup/server-core@0.45.10

## 0.45.9

### Patch Changes

- [`f0b015a0`](https://github.com/authup/authup/commit/f0b015a07c960610031412368f83fc07ba4dde40) Thanks [@tada5hi](https://github.com/tada5hi)! - patch ecosystem

- Updated dependencies [[`f0b015a0`](https://github.com/authup/authup/commit/f0b015a07c960610031412368f83fc07ba4dde40)]:
  - @authup/core@0.45.9
  - @authup/server-core@0.45.9

## 0.45.8

### Patch Changes

- [`63b4414e`](https://github.com/authup/authup/commit/63b4414eed4442a40dd25aab7c0dd69d0bd46f26) Thanks [@tada5hi](https://github.com/tada5hi)! - fix docker build

- Updated dependencies [[`63b4414e`](https://github.com/authup/authup/commit/63b4414eed4442a40dd25aab7c0dd69d0bd46f26)]:
  - @authup/core@0.45.8
  - @authup/server-core@0.45.8

## 0.45.7

### Patch Changes

- [`7faa3d10`](https://github.com/authup/authup/commit/7faa3d10dc0a048a84792d6d0d7a2dc717f13e1b) Thanks [@tada5hi](https://github.com/tada5hi)! - next patch release

- Updated dependencies [[`7faa3d10`](https://github.com/authup/authup/commit/7faa3d10dc0a048a84792d6d0d7a2dc717f13e1b)]:
  - @authup/core@0.45.7
  - @authup/server-core@0.45.7

## 0.45.6

### Patch Changes

- [`9b94d2be`](https://github.com/authup/authup/commit/9b94d2be82498faa4e28d63450d8e8c1beda5d37) Thanks [@tada5hi](https://github.com/tada5hi)! - force docker publish to docker.io

- Updated dependencies [[`9b94d2be`](https://github.com/authup/authup/commit/9b94d2be82498faa4e28d63450d8e8c1beda5d37)]:
  - @authup/core@0.45.6
  - @authup/server-core@0.45.6

## 0.45.5

### Patch Changes

- [`3f5d3d72`](https://github.com/authup/authup/commit/3f5d3d728576a51ec96fac740a2738451d2d2cd1) Thanks [@tada5hi](https://github.com/tada5hi)! - release docker

- Updated dependencies [[`3f5d3d72`](https://github.com/authup/authup/commit/3f5d3d728576a51ec96fac740a2738451d2d2cd1)]:
  - @authup/core@0.45.5
  - @authup/server-core@0.45.5

## 0.45.4

### Patch Changes

- [`622729b0`](https://github.com/authup/authup/commit/622729b086d0a833b4e18bcb0ce9c046ebe0d1d8) Thanks [@tada5hi](https://github.com/tada5hi)! - force docker release

- Updated dependencies [[`622729b0`](https://github.com/authup/authup/commit/622729b086d0a833b4e18bcb0ce9c046ebe0d1d8)]:
  - @authup/core@0.45.4
  - @authup/server-core@0.45.4

## 0.45.3

### Patch Changes

- [`05849783`](https://github.com/authup/authup/commit/058497834a176c5efa4412408fda5de144a3bc61) Thanks [@tada5hi](https://github.com/tada5hi)! - trigger release workflow

- Updated dependencies [[`05849783`](https://github.com/authup/authup/commit/058497834a176c5efa4412408fda5de144a3bc61)]:
  - @authup/core@0.45.3
  - @authup/server-core@0.45.3

## 0.45.2

### Patch Changes

- [`c4f56913`](https://github.com/authup/authup/commit/c4f56913ceb64100ec86f443d1eceddb4adc0d1c) Thanks [@tada5hi](https://github.com/tada5hi)! - bump to next patch version

- Updated dependencies [[`c4f56913`](https://github.com/authup/authup/commit/c4f56913ceb64100ec86f443d1eceddb4adc0d1c)]:
  - @authup/core@0.45.2
  - @authup/server-core@0.45.2

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.45.0](https://github.com/authup/authup/compare/v0.44.0...v0.45.0) (2023-10-23)

### Bug Fixes

- **deps:** bump better-sqlite3 from 8.7.0 to 9.0.0 ([#1422](https://github.com/authup/authup/issues/1422)) ([ad64135](https://github.com/authup/authup/commit/ad64135aadfb4c08166de5aac75dfd4f34a5fc6f))
- **deps:** bump typeorm-extension from 3.0.2 to 3.1.0 ([#1447](https://github.com/authup/authup/issues/1447)) ([1325522](https://github.com/authup/authup/commit/13255222e9859362977e31f7abc29ec25df7acc2))
- **deps:** bump winston from 3.10.0 to 3.11.0 ([#1420](https://github.com/authup/authup/issues/1420)) ([834e4f1](https://github.com/authup/authup/commit/834e4f19601ea5aa918378aeb8371c5f54e1f556))

### Features

- bump routup and plugins ([d44c33e](https://github.com/authup/authup/commit/d44c33e8cebd6bed0f5414774aa02e632a327e73))

# [0.44.0](https://github.com/authup/authup/compare/v0.42.0...v0.44.0) (2023-10-07)

### Bug Fixes

- error status code comparision range ([9013350](https://github.com/authup/authup/commit/9013350e8dd04d6bb9ce57c1a5ca96d42f317059))
- exposing client errors via API ([00098fb](https://github.com/authup/authup/commit/00098fb0971247f2748b928942d0aa169190e7b9))

# [0.43.0](https://github.com/authup/authup/compare/v0.42.0...v0.43.0) (2023-10-05)

**Note:** Version bump only for package @authup/server-api

# [0.42.0](https://github.com/authup/authup/compare/v0.41.0...v0.42.0) (2023-10-05)

### Bug Fixes

- **deps:** bump better-sqlite3 from 8.6.0 to 8.7.0 ([#1403](https://github.com/authup/authup/issues/1403)) ([477802e](https://github.com/authup/authup/commit/477802e7a1463ffee0b5183ccae390e30d446f3e))
- **deps:** bump routup to v2.0 ([aff4988](https://github.com/authup/authup/commit/aff49883ff3ee0c728a34f5ecf9fc6b7d1cbef64))
- **deps:** bump typeorm-extension from 3.0.1 to 3.0.2 ([#1367](https://github.com/authup/authup/issues/1367)) ([02f8743](https://github.com/authup/authup/commit/02f8743ebde1b6db07150fb7b2ca56c55540aaa4))
- **deps:** bump zod from 3.22.2 to 3.22.3 ([#1386](https://github.com/authup/authup/issues/1386)) ([1663dc8](https://github.com/authup/authup/commit/1663dc845aa8235db9f73aaa9c5dd1324da87f03))
- **deps:** bump zod from 3.22.3 to 3.22.4 ([#1404](https://github.com/authup/authup/issues/1404)) ([abcedb9](https://github.com/authup/authup/commit/abcedb929cff68c3c6105b023563fd30d7c4119d))

### Features

- bump routup to v3.0 ([f46f066](https://github.com/authup/authup/commit/f46f0661923a64b392fd62a845a5bab9a2f0891c))

# [0.41.0](https://github.com/authup/authup/compare/v0.40.3...v0.41.0) (2023-09-01)

### Bug Fixes

- allways set migrations folder for datasource options ([e49199c](https://github.com/authup/authup/commit/e49199c9f996bfb8e72a73809837d2e8eb23cf17))
- data-source options migration path ([582f8c6](https://github.com/authup/authup/commit/582f8c62e379b7ce0097ab4a857722c012746c85))
- **deps:** bump @ebec/http from 1.1.0 to 1.1.1 ([#1343](https://github.com/authup/authup/issues/1343)) ([2e92c03](https://github.com/authup/authup/commit/2e92c03836b087e3a4499951f5e6f1032f5bb113))
- **deps:** bump better-sqlite3 from 8.5.1 to 8.5.2 ([#1352](https://github.com/authup/authup/issues/1352)) ([1216567](https://github.com/authup/authup/commit/121656768c349141466e78066048bc55d10124cc))
- **deps:** bump hapic to v2.3.0 ([23d59bd](https://github.com/authup/authup/commit/23d59bd02f09ffbdfbae7534914b7004894b1b52))
- **deps:** bump zod from 3.22.1 to 3.22.2 ([#1346](https://github.com/authup/authup/issues/1346)) ([584e804](https://github.com/authup/authup/commit/584e804fb2f6ac4288297ccf2814abff82dce328))

## [0.40.2](https://github.com/authup/authup/compare/v0.40.1...v0.40.2) (2023-08-20)

### Bug Fixes

- **deps:** bump better-sqlite3 from 8.5.0 to 8.5.1 ([#1318](https://github.com/authup/authup/issues/1318)) ([f70d222](https://github.com/authup/authup/commit/f70d22243a405c6417cc0f6b0f6808b9e852a2c7))
- **deps:** bump pg from 8.11.2 to 8.11.3 ([#1321](https://github.com/authup/authup/issues/1321)) ([8907b24](https://github.com/authup/authup/commit/8907b24609478fa5bdc063f78bbc3bff5dd050ea))

## [0.40.1](https://github.com/authup/authup/compare/v0.40.0...v0.40.1) (2023-08-16)

### Bug Fixes

- **deps:** bump pg from 8.11.1 to 8.11.2 ([#1315](https://github.com/authup/authup/issues/1315)) ([7120c9c](https://github.com/authup/authup/commit/7120c9c3ed3157ce5466ab1e24aa4ecb101baa53))
- **deps:** bump typeorm-extension from 3.0.0 to 3.0.1 ([#1309](https://github.com/authup/authup/issues/1309)) ([f188501](https://github.com/authup/authup/commit/f188501116f6312e60dbb96167cb6f257461b54f))
- **deps:** bump zod from 3.21.4 to 3.22.1 ([#1312](https://github.com/authup/authup/issues/1312)) ([976bdf5](https://github.com/authup/authup/commit/976bdf54059da4d47d10eab2402ac5abced77f84))

# [0.40.0](https://github.com/authup/authup/compare/v0.39.1...v0.40.0) (2023-08-15)

### Bug Fixes

- **deps:** bump locter from 1.2.0 to 1.2.1 ([#1283](https://github.com/authup/authup/issues/1283)) ([c490e3e](https://github.com/authup/authup/commit/c490e3e7bc3292dfaf88a39508ef5a3dc21654ce))
- **deps:** bump typeorm-extension to v3 ([8bf3d9a](https://github.com/authup/authup/commit/8bf3d9a6ba9fc79c5e9cffca08b336603d82dc73))

### Features

- simplified entity assign actions ([c22ab45](https://github.com/authup/authup/commit/c22ab4528b1df0e81500bfdc59ab6bcf08517a08))

## [0.39.1](https://github.com/authup/authup/compare/v0.39.0...v0.39.1) (2023-07-22)

### Bug Fixes

- **deps:** bump better-sqlite3 from 8.4.0 to 8.5.0 ([#1275](https://github.com/authup/authup/issues/1275)) ([f7ea369](https://github.com/authup/authup/commit/f7ea36936dd4058a2761cffa024d182c07f4e7ce))
- **deps:** bump locter from 1.1.2 to 1.2.0 ([#1274](https://github.com/authup/authup/issues/1274)) ([e17da05](https://github.com/authup/authup/commit/e17da057d7c612654ddc7c333f0a8daec0a2d488))
- **deps:** bump routup from 1.0.1 to 1.0.2 ([#1270](https://github.com/authup/authup/issues/1270)) ([ddc541b](https://github.com/authup/authup/commit/ddc541b8196719cfb39fb3c60d99f185569d22e6))
- **deps:** bump typeorm-extension to v3.0.0-alpha.8 ([f77c239](https://github.com/authup/authup/commit/f77c239424ce41193c0099d9733aec32480273bb))
- migration location for non lazy execution ([4663b58](https://github.com/authup/authup/commit/4663b584c682daf38606b350a8970d86cabe8cb1))

# [0.39.0](https://github.com/authup/authup/compare/v0.38.0...v0.39.0) (2023-07-18)

### Bug Fixes

- **deps:** bump winston from 3.9.0 to 3.10.0 ([#1252](https://github.com/authup/authup/issues/1252)) ([865d44d](https://github.com/authup/authup/commit/865d44deaebb66f9357f4f5ca1b3dca247bba1dd))
- oauth2 github identity-provider workflow ([f6843e2](https://github.com/authup/authup/commit/f6843e2957224f87ff8cd2dc44a94623afc84016))
- only require identity-provider protocol or protocol-config ([5caacf4](https://github.com/authup/authup/commit/5caacf4abcefe701805bf22f5b36d5488fe5c9ce))
- rename identity-provider protocol_config column to preset ([bf4020e](https://github.com/authup/authup/commit/bf4020e7033de7584fb3f27a4b58452afd8a6eeb))
- rename realm column drop_able to built_in ([dd93239](https://github.com/authup/authup/commit/dd932393ba7391b9b0196dc3bbb63718a1f89ec0))

### Features

- implemented (social)login flow for identity provider authorization & redirect ([8db22c9](https://github.com/authup/authup/commit/8db22c9ef7adb29487c3bb6068ed34c53a7670b9))
- implemented entity-manager + created domain entity components ([391969d](https://github.com/authup/authup/commit/391969d4c4ba0abd325a2fbc032da4eef0eab66c))
- initial social login provider configuration ([5a17ebf](https://github.com/authup/authup/commit/5a17ebf24e6fb4339f8ba96f95924ab3a4e944ab))
- split identity-provider form fields + additional utitlity components ([a50a695](https://github.com/authup/authup/commit/a50a695614f8261083776e1d0d34418dba2ceeec))
- updated migration files for mysql,postgres & sqlite3 ([af6fa0f](https://github.com/authup/authup/commit/af6fa0f54e4e4c1271fd4b30bc522d349786dbbc))

# [0.38.0](https://github.com/authup/authup/compare/v0.37.1...v0.38.0) (2023-06-29)

### Bug Fixes

- **deps:** bump dotenv from 16.1.4 to 16.3.1 ([#1185](https://github.com/authup/authup/issues/1185)) ([9e79d23](https://github.com/authup/authup/commit/9e79d23c9205e9194d779fecf6b220de79d629af))
- **deps:** bump pg from 8.11.0 to 8.11.1 ([#1218](https://github.com/authup/authup/issues/1218)) ([eaec72b](https://github.com/authup/authup/commit/eaec72b4c859b17d62b4965c8aed484dd2272785))
- **deps:** bump typeorm from 0.3.16 to 0.3.17 ([#1188](https://github.com/authup/authup/issues/1188)) ([e645a97](https://github.com/authup/authup/commit/e645a97ec98466316ae20f873697653ab43a98ae))
- extended status endpoint information ([b889f68](https://github.com/authup/authup/commit/b889f688d8d9a92c950c8b167bc752ea7c807d37))

## [0.37.1](https://github.com/authup/authup/compare/v0.37.0...v0.37.1) (2023-06-14)

### Bug Fixes

- bump hapic to v2.x ([2dd66ed](https://github.com/authup/authup/commit/2dd66ed87e89338be682a93bec4fe12ca86be712))
- bump vue-layout dependencies + rename validation create fn ([ea0c679](https://github.com/authup/authup/commit/ea0c679207cd0d3cd6503d80779a825fdb6091d5))
- **deps:** bump dotenv from 16.1.1 to 16.1.3 ([#1151](https://github.com/authup/authup/issues/1151)) ([a96cb80](https://github.com/authup/authup/commit/a96cb80a81abd3caf3a67131afcdabc45419dd36))
- **deps:** bump dotenv from 16.1.3 to 16.1.4 ([#1157](https://github.com/authup/authup/issues/1157)) ([1a91140](https://github.com/authup/authup/commit/1a91140f1779555d53d74b2a412fef9e9ade9179))

# [0.37.0](https://github.com/authup/authup/compare/v0.36.0...v0.37.0) (2023-05-31)

### Bug Fixes

- **deps:** bump @ebec/http from 1.0.0 to 1.1.0 ([#1148](https://github.com/authup/authup/issues/1148)) ([9f3de59](https://github.com/authup/authup/commit/9f3de59114efc3cb8bb37d9de5de71f3b24843bd))
- **deps:** bump dotenv from 16.0.3 to 16.1.1 ([#1142](https://github.com/authup/authup/issues/1142)) ([d68c905](https://github.com/authup/authup/commit/d68c905d95570b08699c7c53446cd09af641b704))
- **deps:** bump locter from 1.1.0 to 1.1.2 ([#1149](https://github.com/authup/authup/issues/1149)) ([74628fe](https://github.com/authup/authup/commit/74628fe7566e9789f46ac9f2ff2959fa51ce1b55))
- **deps:** bump routup to v1.0.1 ([17bfa57](https://github.com/authup/authup/commit/17bfa57fb4a1004238a9b28ebfd7df98876da7b8))
- **deps:** bump smob to v1.4.0 ([8eefa83](https://github.com/authup/authup/commit/8eefa83a55271ad139dde2e0ccbacc8c937e6a4e))
- **deps:** bump typeorm-extension from 2.8.0 to 2.8.1 ([#1143](https://github.com/authup/authup/issues/1143)) ([27c9779](https://github.com/authup/authup/commit/27c97793ad21f0251aafd3ac9795cac8873a611d))

# [0.36.0](https://github.com/authup/authup/compare/v0.35.0...v0.36.0) (2023-05-27)

### Bug Fixes

- **deps:** bump winston from 3.8.2 to 3.9.0 ([#1132](https://github.com/authup/authup/issues/1132)) ([c08fa7e](https://github.com/authup/authup/commit/c08fa7ec8c9a2e0b5655e0a51b72ec2dcf667b17))
- dont't log requests to root api path ([164ae82](https://github.com/authup/authup/commit/164ae824cb393a0afd97ea70a6d131ced5e3729d))

### Features

- cleanup and relocate auth store + set token max age for oauth2 grant types ([13643fd](https://github.com/authup/authup/commit/13643fd76e8c471f8d90b555c386041a34bcb2ff))
- refactor and optimized client response error token hook ([fae52c8](https://github.com/authup/authup/commit/fae52c8cfcc0aa563d6edd0702f3438ab76e6e5a))

# [0.35.0](https://github.com/authup/authup/compare/v0.34.0...v0.35.0) (2023-05-25)

### Features

- add callback handler for token creator ([515bdee](https://github.com/authup/authup/commit/515bdee793de15a8bbe8ad97a1f1db483984383a))

# [0.34.0](https://github.com/authup/authup/compare/v0.33.0...v0.34.0) (2023-05-24)

### Bug Fixes

- better token error handling + token error verification ([e323e83](https://github.com/authup/authup/commit/e323e834b2f4f695fd9b0c8dc1629d6a4b265ebe))
- **deps:** bump better-sqlite3 from 8.3.0 to 8.4.0 ([#1116](https://github.com/authup/authup/issues/1116)) ([42d832f](https://github.com/authup/authup/commit/42d832f7424a2ae870ddaa0be7881a356cb0716b))
- **deps:** bump pg from 8.10.0 to 8.11.0 ([#1098](https://github.com/authup/authup/issues/1098)) ([f82a76c](https://github.com/authup/authup/commit/f82a76c8b47bacfc77845032fea1fa5dc237a992))
- **deps:** bump routup to v1.0.0 ([b3e1686](https://github.com/authup/authup/commit/b3e1686041d14ea852d8f7d5c3df6e44d25bd7d4))
- **deps:** bump routup to v1.0.0-alpha ([c6a3d11](https://github.com/authup/authup/commit/c6a3d11fae1c1af1c88b4214caa54a898772c51f))
- **deps:** bump smob from 1.0.0 to 1.1.1 ([#1122](https://github.com/authup/authup/issues/1122)) ([0dc6667](https://github.com/authup/authup/commit/0dc66679c7b65c37f2eec5793727d00b0c35c013))
- **deps:** bump typeorm from 0.3.15 to 0.3.16 ([#1088](https://github.com/authup/authup/issues/1088)) ([a7fc5a8](https://github.com/authup/authup/commit/a7fc5a86b615bd62fdea073ca1854695d9a568d9))
- **deps:** bump typeorm-extension from 2.7.0 to 2.8.0 ([#1069](https://github.com/authup/authup/issues/1069)) ([715cfa6](https://github.com/authup/authup/commit/715cfa6c1b55c7165167ee3c5642ba1e130191af))
- **deps:** bump yargs from 17.7.1 to 17.7.2 ([#1065](https://github.com/authup/authup/issues/1065)) ([78f22dd](https://github.com/authup/authup/commit/78f22dd3bfba919fd84343a169485db3e1f1fd42))

### Features

- better error messages for refresh_token grant type ([13f3239](https://github.com/authup/authup/commit/13f32392cf234c81b3d1c787f0c586036e2c4968))
- guarantee that refresh token max age is bigger than access token age ([2b72207](https://github.com/authup/authup/commit/2b72207e897787399009a49061621703cac563b1))
- switch to bootstrap table view for domain lists ([2faa379](https://github.com/authup/authup/commit/2faa37910732863bb730588b6e3334c27b353c16))

# [0.33.0](https://github.com/authup/authup/compare/v0.32.3...v0.33.0) (2023-04-24)

### Bug Fixes

- bump express-validator to v7 ([f88a039](https://github.com/authup/authup/commit/f88a0392625fe1aa64f5ce8454eee337c7d2dd7a))
- **deps:** bump better-sqlite3 from 8.2.0 to 8.3.0 ([#1015](https://github.com/authup/authup/issues/1015)) ([d80cb17](https://github.com/authup/authup/commit/d80cb17ea9624db06e56ad8affe59c1c306cc3f8))
- **deps:** bump continu from 1.2.0 to 1.3.1 ([#1010](https://github.com/authup/authup/issues/1010)) ([21730dd](https://github.com/authup/authup/commit/21730dd64284198c6111f14f5cf31a55774d89fb))
- **deps:** bump typeorm from 0.3.12 to 0.3.13 ([#1005](https://github.com/authup/authup/issues/1005)) ([1f636d3](https://github.com/authup/authup/commit/1f636d35ed53d89fe63dcc6bd6847f189f4bd1da))
- **deps:** bump typeorm from 0.3.13 to 0.3.14 ([#1016](https://github.com/authup/authup/issues/1016)) ([0330aec](https://github.com/authup/authup/commit/0330aec58ebf1c1001edeb94455c302e5db5ff4d))
- don't log metrics and root path ([4d4ca5c](https://github.com/authup/authup/commit/4d4ca5c351e88370360fc630f22c17220026e977))
- http client (error) hook implementation ([86ddd6c](https://github.com/authup/authup/commit/86ddd6c341a36ab37cf76844129552031618c926))

### Features

- bump hapic to v2.0.0-alpha.x (axios -> fetch) ([#1036](https://github.com/authup/authup/issues/1036)) ([e09c919](https://github.com/authup/authup/commit/e09c91930d65b41725e5b1c4e26c21f9a5c67342))
- implemented hapic v2.0 alpha ([f1da95b](https://github.com/authup/authup/commit/f1da95bb3be6d1fe0cfd195a44a63c5a8d60dc6c))

## [0.32.2](https://github.com/authup/authup/compare/v0.32.1...v0.32.2) (2023-04-05)

### Bug Fixes

- restructured ability-manger in module + force version bump ([b59f485](https://github.com/authup/authup/commit/b59f485eec2e6e7ddf6d771f7eaad0f1ef46b569))

## [0.32.1](https://github.com/authup/authup/compare/v0.32.0...v0.32.1) (2023-04-04)

### Bug Fixes

- remove metrics controller ([d6b82bc](https://github.com/authup/authup/commit/d6b82bc408cb89da1fed30426901b5ef21fa7de8))

# [0.32.0](https://github.com/authup/authup/compare/v0.31.3...v0.32.0) (2023-04-03)

**Note:** Version bump only for package @authup/server-api

## [0.31.3](https://github.com/authup/authup/compare/v0.31.2...v0.31.3) (2023-04-03)

### Bug Fixes

- config database option validator ([82afa32](https://github.com/authup/authup/commit/82afa3286fbd84cce8a9bdedc29fcbb84aa92962))

## [0.31.2](https://github.com/authup/authup/compare/v0.31.1...v0.31.2) (2023-04-03)

**Note:** Version bump only for package @authup/server-api

## [0.31.1](https://github.com/authup/authup/compare/v0.31.0...v0.31.1) (2023-04-03)

**Note:** Version bump only for package @authup/server-api

# [0.31.0](https://github.com/authup/authup/compare/v0.30.1...v0.31.0) (2023-04-03)

**Note:** Version bump only for package @authup/server-api

## [0.30.1](https://github.com/authup/authup/compare/v0.30.0...v0.30.1) (2023-04-03)

**Note:** Version bump only for package @authup/server-api

# [0.30.0](https://github.com/authup/authup/compare/v0.29.0...v0.30.0) (2023-04-03)

### Bug Fixes

- move vault configuration to server-api package from server-core package ([4783326](https://github.com/authup/authup/commit/4783326e2c0984bb10615d25d76e5cddff936e94))

### Features

- support interceptor mounting on client and client driver instance ([a26dafe](https://github.com/authup/authup/commit/a26dafe8174cf9c6de0bf85c294baf8e32d6261a))

# [0.29.0](https://github.com/authup/authup/compare/v0.28.0...v0.29.0) (2023-04-01)

### Bug Fixes

- adjusted README.md, package.json files + renamed http client ([fcf8423](https://github.com/authup/authup/commit/fcf8423228fa73aa2a61ba8de96c0af51dfb0c5f))
- enhance executorÂ ([31624c1](https://github.com/authup/authup/commit/31624c1a6a91c33a0fd29a9e33f451e9133d5cf1))

# [0.28.0](https://github.com/authup/authup/compare/v0.27.0...v0.28.0) (2023-04-01)

### Bug Fixes

- resolve http controller path for swagger generation ([4612cc5](https://github.com/authup/authup/commit/4612cc55e4531d9b4fe3d1e91302802304f13cc4))

### Features

- allow database configuration via config file ([077cd11](https://github.com/authup/authup/commit/077cd1124f37c116cedd1dbafb4d9d685c8a7e50))

# [0.27.0](https://github.com/authup/authup/compare/v0.26.0...v0.27.0) (2023-04-01)

### Bug Fixes

- **deps:** bump redis-extension from 1.2.3 to 1.3.0 ([#992](https://github.com/authup/authup/issues/992)) ([2ac9ede](https://github.com/authup/authup/commit/2ac9ede2692c9d3cd19a2c7fc201f993b5a35cce))
- swagger look-up path for controllers ([ea75c11](https://github.com/authup/authup/commit/ea75c11363785365a03f1fba5c1015322c53b927))
- use constants for env variable names ([3122698](https://github.com/authup/authup/commit/3122698db86acc38729e74bd0bc546c41201882f))

# [0.26.0](https://github.com/authup/authup/compare/v0.25.0...v0.26.0) (2023-03-30)

**Note:** Version bump only for package @authup/server-api

# [0.25.0](https://github.com/authup/authup/compare/v0.24.0...v0.25.0) (2023-03-30)

### Bug Fixes

- move domains from database sub-folder to root src folder ([5e0d9b6](https://github.com/authup/authup/commit/5e0d9b610994f8ce83568cfd5d3df461d22e422c))
- remove console.log for config logging ([e39eb34](https://github.com/authup/authup/commit/e39eb34e8e3e23f8e17bb8ebfeded5327612c709))

### Features

- add https proxy tunnel support for identity providers ([6a7b859](https://github.com/authup/authup/commit/6a7b859e31bad6f10dd2fde22cdc6dfab3da2285))

# [0.24.0](https://github.com/authup/authup/compare/v0.23.1...v0.24.0) (2023-03-30)

### Features

- dynamic config getter for public-url ([5e17b05](https://github.com/authup/authup/commit/5e17b055c4e29fe43938fda90e465eccc7157d8e))

## [0.23.1](https://github.com/authup/authup/compare/v0.23.0...v0.23.1) (2023-03-30)

### Bug Fixes

- config validation for redis-,smtp- & vault-config ([19dd368](https://github.com/authup/authup/commit/19dd368cc833a1592676df2e1387f0699cc72f0f))

# [0.23.0](https://github.com/authup/authup/compare/v0.22.0...v0.23.0) (2023-03-30)

### Bug Fixes

- adjusted docker entrypoint + typos + cli start script ([f63296c](https://github.com/authup/authup/commit/f63296ce48e3ce20d8926fd5473f140379b89a02))
- **deps:** bump continu from 1.0.5 to 1.1.0 ([#982](https://github.com/authup/authup/issues/982)) ([91d901d](https://github.com/authup/authup/commit/91d901d1200cacf140dbda407813db5ad1a1f2b3))

### Features

- add support for docker image to run multiple apps simultanously ([dfae6d5](https://github.com/authup/authup/commit/dfae6d54539a2d14620eed4d97aec56f6817b50f))
- merge server-{,http,database} packages ([488070d](https://github.com/authup/authup/commit/488070dd73f8ba972fc5e01433b935d48e77bccd))
- refactored config loading & building ([07de0e3](https://github.com/authup/authup/commit/07de0e38542f2760d00ba3df77c76d673f76b6a8))
- replaced manual proxy parsing with http client detection ([18c3751](https://github.com/authup/authup/commit/18c3751f3dd3defdd9dfa34ec41522ac14d3b476))

# [0.22.0](https://github.com/Tada5hi/authup/compare/v0.21.0...v0.22.0) (2023-03-26)

**Note:** Version bump only for package @authup/server-api

# [0.21.0](https://github.com/Tada5hi/authup/compare/v0.20.1...v0.21.0) (2023-03-26)

### Bug Fixes

- replaced migration generate utility fn ([73a6e4a](https://github.com/Tada5hi/authup/commit/73a6e4a83092009956540a9e165bdcfbfcd12d38))
- soft robot credentials save on startup ([0340dd5](https://github.com/Tada5hi/authup/commit/0340dd50f7144247dc8aed22b0f02b859db2c603))

## [0.20.1](https://github.com/Tada5hi/authup/compare/v0.20.0...v0.20.1) (2023-03-25)

### Bug Fixes

- vault config load/apply + error middleware + http user-attributes reading ([411df82](https://github.com/Tada5hi/authup/commit/411df829439a0a52982a78048858e80ae745ebe7))

# [0.20.0](https://github.com/Tada5hi/authup/compare/v0.19.0...v0.20.0) (2023-03-24)

**Note:** Version bump only for package @authup/server-api

# [0.19.0](https://github.com/Tada5hi/authup/compare/v0.18.0...v0.19.0) (2023-03-23)

**Note:** Version bump only for package @authup/server-api

# [0.18.0](https://github.com/Tada5hi/authup/compare/v0.17.2...v0.18.0) (2023-03-23)

### Bug Fixes

- **deps:** bump smob from 0.1.0 to 1.0.0 ([#952](https://github.com/Tada5hi/authup/issues/952)) ([363fc69](https://github.com/Tada5hi/authup/commit/363fc6902848a16982626f4fbe3cb7e5c1afd053))

### Features

- add vault client support for robot credentials syncing ([66b2300](https://github.com/Tada5hi/authup/commit/66b23007fdfa4221c48f2d66f5524fdb5b4f3ed3))

## [0.17.2](https://github.com/Tada5hi/authup/compare/v0.17.1...v0.17.2) (2023-03-20)

**Note:** Version bump only for package @authup/server-api

## [0.17.1](https://github.com/Tada5hi/authup/compare/v0.17.0...v0.17.1) (2023-03-14)

### Bug Fixes

- **deps:** bump better-sqlite3 from 8.1.0 to 8.2.0 ([#935](https://github.com/Tada5hi/authup/issues/935)) ([29908c1](https://github.com/Tada5hi/authup/commit/29908c1b774c951166232940add6933700103b90))
- **deps:** bump pg from 8.9.0 to 8.10.0 ([#934](https://github.com/Tada5hi/authup/issues/934)) ([3e5d857](https://github.com/Tada5hi/authup/commit/3e5d857888f071e6bf5593872b94ff107df7fd66))
- **deps:** bump typeorm-extension from 2.5.3 to 2.5.4 ([#929](https://github.com/Tada5hi/authup/issues/929)) ([7884f49](https://github.com/Tada5hi/authup/commit/7884f49b200ad90717ed165ab817e569dfaa6b25))
- **deps:** bump typeorm-extension to v2.5.3 ([abe31c1](https://github.com/Tada5hi/authup/commit/abe31c18fbd2ecf61a7681f0812fea7b23560f44))

# [0.17.0](https://github.com/Tada5hi/authup/compare/v0.16.0...v0.17.0) (2023-03-13)

### Bug Fixes

- **deps:** bump zod from 3.20.6 to 3.21.4 ([#919](https://github.com/Tada5hi/authup/issues/919)) ([e24a5ef](https://github.com/Tada5hi/authup/commit/e24a5efcc7201aba2b747d9352927a648d88e954))

# [0.16.0](https://github.com/Tada5hi/authup/compare/v0.15.4...v0.16.0) (2023-02-28)

**Note:** Version bump only for package @authup/server-api

## [0.15.4](https://github.com/Tada5hi/authup/compare/v0.15.3...v0.15.4) (2023-02-24)

**Note:** Version bump only for package @authup/server-api

## [0.15.3](https://github.com/Tada5hi/authup/compare/v0.15.2...v0.15.3) (2023-02-23)

### Bug Fixes

- bum routup dependencies + adjusted docs url in star command ([cdd7f5a](https://github.com/Tada5hi/authup/commit/cdd7f5acde04155d3fd4d694583265bd5724dcba))
- **deps:** bump typeorm-extension from 2.5.0 to 2.5.2 ([#884](https://github.com/Tada5hi/authup/issues/884)) ([7689aea](https://github.com/Tada5hi/authup/commit/7689aea07323e28fac7f97e692fb3c11e44d3f80))
- **deps:** bump yargs from 17.6.2 to 17.7.0 ([#874](https://github.com/Tada5hi/authup/issues/874)) ([e1aa371](https://github.com/Tada5hi/authup/commit/e1aa371bf833a255dfa07da33ce88fd7f1ee61ff))
- **deps:** bump yargs from 17.7.0 to 17.7.1 ([#890](https://github.com/Tada5hi/authup/issues/890)) ([2035fd8](https://github.com/Tada5hi/authup/commit/2035fd8fe70bbbdc4fbf51f646b9c5344790cf4b))
- **deps:** updated typeorm-extension ([fc74f4a](https://github.com/Tada5hi/authup/commit/fc74f4ad114904a74d0e46416aa564306ec32082))

## [0.15.2](https://github.com/Tada5hi/authup/compare/v0.15.1...v0.15.2) (2023-02-14)

### Bug Fixes

- **deps:** bump zod from 3.20.2 to 3.20.6 ([#843](https://github.com/Tada5hi/authup/issues/843)) ([b94e056](https://github.com/Tada5hi/authup/commit/b94e056c8d4fe100845bb446019da381a61322e5))

## [0.15.1](https://github.com/Tada5hi/authup/compare/v0.15.0...v0.15.1) (2023-02-08)

### Bug Fixes

- **deps:** bump better-sqlite3 from 8.0.1 to 8.1.0 ([#837](https://github.com/Tada5hi/authup/issues/837)) ([74879e9](https://github.com/Tada5hi/authup/commit/74879e9d69c49bc5dbc14ae69d5022d9ac955d0d))
- **deps:** bump typeorm from 0.3.11 to 0.3.12 ([#838](https://github.com/Tada5hi/authup/issues/838)) ([ead58dd](https://github.com/Tada5hi/authup/commit/ead58dd35f18659d7a2df6f244d40919ec78b167))

# [0.15.0](https://github.com/Tada5hi/authup/compare/v0.14.1...v0.15.0) (2023-02-07)

### Bug Fixes

- **deps:** bump redis-extension from 1.2.2 to 1.2.3 ([#824](https://github.com/Tada5hi/authup/issues/824)) ([914fe7e](https://github.com/Tada5hi/authup/commit/914fe7e6c72989eeaf4c5b0134e419340c5c964a))

### Features

- renamed process env handling ([4fbdef2](https://github.com/Tada5hi/authup/commit/4fbdef2a661948969a8bfad5bfced5a4289ed465))

## [0.14.1](https://github.com/Tada5hi/authup/compare/v0.14.0...v0.14.1) (2023-01-30)

### Bug Fixes

- **server:** bump locter dependency ([d0d0ad2](https://github.com/Tada5hi/authup/commit/d0d0ad2ea29c7d6ab0a64beb37835f4df40afde5))
- **server:** saving seeder result on setup command ([d75f9ba](https://github.com/Tada5hi/authup/commit/d75f9ba82a76d07f3d337d45ca8877f41c3c810d))

# [0.14.0](https://github.com/Tada5hi/authup/compare/v0.13.0...v0.14.0) (2023-01-29)

### Features

- minor code cleanup + fixed redis caching strategy ([a5286b7](https://github.com/Tada5hi/authup/commit/a5286b716e6432bd872cda2e06def8f0c3ab9111))

# [0.13.0](https://github.com/Tada5hi/authup/compare/v0.12.1...v0.13.0) (2023-01-28)

**Note:** Version bump only for package @authup/server-api

## [0.12.1](https://github.com/Tada5hi/authup/compare/v0.12.0...v0.12.1) (2023-01-28)

### Bug Fixes

- peer-dependency version + updated license information ([f693215](https://github.com/Tada5hi/authup/commit/f69321538afbd2923287209593cdebcedaa29637))

# [0.12.0](https://github.com/Tada5hi/authup/compare/v0.11.1...v0.12.0) (2023-01-28)

### Features

- use tsc for transpiling of decorator packages ([2c41385](https://github.com/Tada5hi/authup/commit/2c41385201f6555b0bacaf09af5ad9779ab2a6c5))

## [0.11.1](https://github.com/Tada5hi/authup/compare/v0.11.0...v0.11.1) (2023-01-27)

### Bug Fixes

- **deps:** bump pg from 8.8.0 to 8.9.0 ([#807](https://github.com/Tada5hi/authup/issues/807)) ([9b607d6](https://github.com/Tada5hi/authup/commit/9b607d6c170fb79e35300c8e074a5cbac4353ec8))
- **deps:** updated dependencies ([b3d221c](https://github.com/Tada5hi/authup/commit/b3d221c862c4f4dbd0ccf018566ef00796fcd591))

# [0.11.0](https://github.com/Tada5hi/authup/compare/v0.10.1...v0.11.0) (2023-01-27)

### Bug Fixes

- **deps:** bump rc9 from 2.0.0 to 2.0.1 ([#789](https://github.com/Tada5hi/authup/issues/789)) ([943df77](https://github.com/Tada5hi/authup/commit/943df77563c2d282ff1fc716179409fd41e30036))
- **deps:** bump redis-extension from 1.2.0 to 1.2.1 ([#795](https://github.com/Tada5hi/authup/issues/795)) ([17afd4e](https://github.com/Tada5hi/authup/commit/17afd4e3ffaaf4320d1f5847a91ef160a5acbafe))

## [0.10.1](https://github.com/Tada5hi/authup/compare/v0.10.0...v0.10.1) (2023-01-23)

**Note:** Version bump only for package @authup/server-api

# [0.10.0](https://github.com/Tada5hi/authup/compare/v0.9.0...v0.10.0) (2023-01-20)

**Note:** Version bump only for package @authup/server-api

# [0.9.0](https://github.com/Tada5hi/authup/compare/v0.8.0...v0.9.0) (2023-01-20)

### Bug Fixes

- **deps:** bump locter from 0.6.2 to 0.7.1 ([9e1d44b](https://github.com/Tada5hi/authup/commit/9e1d44b580826202f8e210c7e4f2e45531398b22))
- **deps:** updated typeorm-extension ([3b0aee9](https://github.com/Tada5hi/authup/commit/3b0aee95c23fbe619b611f67c11f77832c2a582e))

# [0.8.0](https://github.com/Tada5hi/authup/compare/v0.7.0...v0.8.0) (2023-01-16)

### Bug Fixes

- **deps:** bump smob from 0.0.6 to 0.0.7 ([535685c](https://github.com/Tada5hi/authup/commit/535685cfb55e58dfa88635d1f08c0e3909d417dd))

# [0.7.0](https://github.com/Tada5hi/authup/compare/v0.6.3...v0.7.0) (2023-01-11)

### Bug Fixes

- **deps:** bump locter from 0.6.1 to 0.6.2 ([b50a892](https://github.com/Tada5hi/authup/commit/b50a892101f677a91d8661c1d74627310c8d54c6))

### Features

- unified entity columns for sqlite, mysql & postgres ([f379caa](https://github.com/Tada5hi/authup/commit/f379caac7b7f95145629734b692a7d38a472c9b2))

## [0.6.3](https://github.com/Tada5hi/authup/compare/v0.6.2...v0.6.3) (2023-01-10)

**Note:** Version bump only for package @authup/server-api

## [0.6.2](https://github.com/Tada5hi/authup/compare/v0.6.1...v0.6.2) (2023-01-10)

**Note:** Version bump only for package @authup/server-api

## [0.6.1](https://github.com/Tada5hi/authup/compare/v0.6.0...v0.6.1) (2023-01-08)

**Note:** Version bump only for package @authup/server-api

# [0.6.0](https://github.com/Tada5hi/authup/compare/v0.5.0...v0.6.0) (2023-01-08)

**Note:** Version bump only for package @authup/server-api

# [0.5.0](https://github.com/Tada5hi/authup/compare/v0.4.0...v0.5.0) (2023-01-08)

### Bug Fixes

- **deps:** bump typeorm-extension from 2.4.0 to 2.4.1 ([406b70b](https://github.com/Tada5hi/authup/commit/406b70b95ee7be043ca09b5b2c2057422f1d33dc))
- **server:** reset migrations + run migration transaction individually ([82d70a5](https://github.com/Tada5hi/authup/commit/82d70a56250bb18a29d32832571db6e13c1652a5))

### Features

- add healthcheck cli command ([208c62f](https://github.com/Tada5hi/authup/commit/208c62fbde68da0c1ae63378e47692d9a889d3cc))

# [0.4.0](https://github.com/Tada5hi/authup/compare/v0.3.1...v0.4.0) (2022-12-21)

### Bug Fixes

- **deps:** bump locter from 0.6.0 to 0.6.1 ([236bf62](https://github.com/Tada5hi/authup/commit/236bf627fc338e670671615c2a6b036811aff086))
- **deps:** bump typeorm-extension from 2.3.1 to 2.4.0 ([17b1307](https://github.com/Tada5hi/authup/commit/17b1307b5d466cdf95523dec42688f6564fb8069))
- **deps:** bump zod from 3.19.1 to 3.20.1 ([8c7075e](https://github.com/Tada5hi/authup/commit/8c7075e27f7105f89dddf7bec2c341e146788771))
- **deps:** bump zod from 3.20.1 to 3.20.2 ([4477c61](https://github.com/Tada5hi/authup/commit/4477c6160da7a579db589e49f81c22aaca4e414c))

### Features

- add scope management (http-endpoint, db-entity, ...) ([2ab4236](https://github.com/Tada5hi/authup/commit/2ab42364e44f032cb93c9946c40a9fd71f287c44))
- further enhancement for client & scope management ([29d1f3e](https://github.com/Tada5hi/authup/commit/29d1f3ee5ecde14afa0b692dd9589887bc2df54e))
- use continu for config management ([88b057d](https://github.com/Tada5hi/authup/commit/88b057dd6f15fb77c6a25197b51e6e0765e4fbe5))

# [0.3.0](https://github.com/Tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)

### Bug Fixes

- **server-http:** minor issue with user validation ([1bc4a65](https://github.com/Tada5hi/authup/commit/1bc4a655e6f3ed6b9dca5679a13db32d1978da9b))

### Features

- refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/Tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))

## [0.2.2](https://github.com/Tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)

### Bug Fixes

- **deps:** bump typeorm-extension from 2.3.0 to 2.3.1 ([aaccef7](https://github.com/Tada5hi/authup/commit/aaccef744d37f10146c9905611d9b819bc080a30))

## [0.2.1](https://github.com/Tada5hi/authup/compare/v0.2.0...v0.2.1) (2022-12-09)

**Note:** Version bump only for package @authup/server-api

# [0.2.0](https://github.com/Tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)

### Features

- **server-database:** add migration generate fn ([7a5b364](https://github.com/Tada5hi/authup/commit/7a5b364eebf5f0e0da0c9bc3e51fed89b2a2e547))

## [0.1.1](https://github.com/Tada5hi/authup/compare/v0.1.0...v0.1.1) (2022-12-08)

**Note:** Version bump only for package @authup/server-api

# 0.1.0 (2022-12-08)

### Bug Fixes

- **deps:** bump better-sqlite3 from 7.6.2 to 8.0.0 ([0a0a3b4](https://github.com/Tada5hi/authup/commit/0a0a3b4075c60864d55ac3e7f163b0c18c092e5a))

### Features

- add global cli & enhanced config handling ([95a1549](https://github.com/Tada5hi/authup/commit/95a1549c70ed18e9bc58e2f4fb5734712ab20a35))
- better config handling ([b1582b7](https://github.com/Tada5hi/authup/commit/b1582b798174c2c44e06271f3250db637a159bfd))
- only allow robot/role permission assignment for owned permissions ([9dfd9d3](https://github.com/Tada5hi/authup/commit/9dfd9d39ed4420f5d42b4fa9e03e88f04f840189))
- prepare global cli ([ed4539c](https://github.com/Tada5hi/authup/commit/ed4539c0b736f8b522e7a1af716ff6e3ab2d8200))
