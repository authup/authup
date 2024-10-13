# Changelog

## [1.0.0-beta.21](https://github.com/authup/authup/compare/v1.0.0-beta.20...v1.0.0-beta.21) (2024-10-13)


### Features

* some optimizations for web kit store ([e81882c](https://github.com/authup/authup/commit/e81882c90b951028dc28fc0bf3a414b7c52441de))


### Bug Fixes

* creating user (+ roles & permissions) by idp identity ([#2391](https://github.com/authup/authup/issues/2391)) ([7362886](https://github.com/authup/authup/commit/7362886c5aede960c7005df2655f859dd9d48e1d))

## [1.0.0-beta.20](https://github.com/authup/authup/compare/v1.0.0-beta.19...v1.0.0-beta.20) (2024-09-28)


### Features

* add built-in identity-policy ([e858d05](https://github.com/authup/authup/commit/e858d058c32a14233a9a5d87c35a0535a770c334))
* fix policy parserFn names + strict mode ([120bdea](https://github.com/authup/authup/commit/120bdea866fcadb45c8096c9f0b855d73b7603c9))
* introduce attributeNameStrict option of realm-match policy ([b416d51](https://github.com/authup/authup/commit/b416d514d968d32e25671944c740cc17e3a4da88))
* make permission/ability fns async ([#2116](https://github.com/authup/authup/issues/2116)) ([c0491c1](https://github.com/authup/authup/commit/c0491c1ea3fdec651c7ad83d60b929c42cca715a))
* move permission & policy logic to new package ([#2128](https://github.com/authup/authup/issues/2128)) ([53f9b33](https://github.com/authup/authup/commit/53f9b33b15e08d6a2def0f7d4659129a03a51252))
* moved built-in policy parser, attributes query fixer, ... ([0599b54](https://github.com/authup/authup/commit/0599b5423d203583845782c74cd1755ef06bd7c6))
* permisison-binding policy & policy-engine + permission-checker override ([#2298](https://github.com/authup/authup/issues/2298)) ([5871d72](https://github.com/authup/authup/commit/5871d72e0404e71c372b3d70875c4b84c56f02e4))
* permission check api endpoint ([#2319](https://github.com/authup/authup/issues/2319)) ([9e57f84](https://github.com/authup/authup/commit/9e57f8479f98bf96d99632a0d1a52b9df6f740aa))
* permit non owned permissions to be checked ([#2294](https://github.com/authup/authup/issues/2294)) ([2c44a8d](https://github.com/authup/authup/commit/2c44a8daa9e50903dee146cb548500972287f209))
* policy check api endpoint ([#2330](https://github.com/authup/authup/issues/2330)) ([37e5389](https://github.com/authup/authup/commit/37e53891641b388d93d7eb23e9f55924ec245cce))
* relocate subject & subject-kind helper fns ([e7a6ee0](https://github.com/authup/authup/commit/e7a6ee070728a37de6393b78e8d60acfec972072))
* set default policy-/decision-strategy to unanimous ([d6448ab](https://github.com/authup/authup/commit/d6448ab606294e255431ca283fc08bcefb9cafa4))


### Bug Fixes

* add missing @ucast/mongojs dependency ([3a462fa](https://github.com/authup/authup/commit/3a462fae7b7f541e1edfaaa446b50ca604633f9d))
* **deps:** bump @validup/adapter-zod from 0.1.5 to 0.1.6 ([#2273](https://github.com/authup/authup/issues/2273)) ([eac473c](https://github.com/authup/authup/commit/eac473c49cb81b52cc5ae609ccd36957ed228c20))
* **deps:** bump validup from 0.1.5 to 0.1.6 ([#2275](https://github.com/authup/authup/issues/2275)) ([8aac82f](https://github.com/authup/authup/commit/8aac82f8edcc955046ea42f410c937686390911d))
* remove permission-item aggregate fn helper ([66a1d92](https://github.com/authup/authup/commit/66a1d92fea12805e7fbb3dc386bf069e90fbeb94))
* renamed helper buildPolicyDataForRequest ([6810bc3](https://github.com/authup/authup/commit/6810bc3a65947e614be23ca0d68fd8daaabf1243))

## [1.0.0-beta.19](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.19) (2024-06-30)


### Features

* reworked ability management and access ([#2102](https://github.com/authup/authup/issues/2102)) ([b3dc45c](https://github.com/authup/authup/commit/b3dc45c2a1d0cd403e8ab545bd87ce4e49738758))

## [1.0.0-beta.18](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.18) (2024-06-24)


### Features

* better naming for policy evaluator methods ([1801bb9](https://github.com/authup/authup/commit/1801bb940dd2893286fde3c5a1ac9b932e3fd4e5))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* improve errror handling ([#1951](https://github.com/authup/authup/issues/1951)) ([607585e](https://github.com/authup/authup/commit/607585ee733b42b3a2cccf8d2812dafd7299cda3))
* initial policy implementation ([#2038](https://github.com/authup/authup/issues/2038)) ([deeaffc](https://github.com/authup/authup/commit/deeaffcf0b4a72d9e1d6cf99dbf70d582b98c257))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* refacotring of http controller request validation ([#2082](https://github.com/authup/authup/issues/2082)) ([6be6ff8](https://github.com/authup/authup/commit/6be6ff858db9527651f8abacabe99280ce9a2a08))
* renamed group-policy to composite-policy ([42e9702](https://github.com/authup/authup/commit/42e9702419824e459cb3311ae0766d0871a2d92a))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* restrictions for role,permission-assignemnts ([#2071](https://github.com/authup/authup/issues/2071)) ([c851f76](https://github.com/authup/authup/commit/c851f76777cf0018d55f62511536b5f73a080868))

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.0-beta.17) (2024-06-23)


### Features

* better naming for policy evaluator methods ([1801bb9](https://github.com/authup/authup/commit/1801bb940dd2893286fde3c5a1ac9b932e3fd4e5))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* improve errror handling ([#1951](https://github.com/authup/authup/issues/1951)) ([607585e](https://github.com/authup/authup/commit/607585ee733b42b3a2cccf8d2812dafd7299cda3))
* initial policy implementation ([#2038](https://github.com/authup/authup/issues/2038)) ([deeaffc](https://github.com/authup/authup/commit/deeaffcf0b4a72d9e1d6cf99dbf70d582b98c257))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* refacotring of http controller request validation ([#2082](https://github.com/authup/authup/issues/2082)) ([6be6ff8](https://github.com/authup/authup/commit/6be6ff858db9527651f8abacabe99280ce9a2a08))
* renamed group-policy to composite-policy ([42e9702](https://github.com/authup/authup/commit/42e9702419824e459cb3311ae0766d0871a2d92a))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* restrictions for role,permission-assignemnts ([#2071](https://github.com/authup/authup/issues/2071)) ([c851f76](https://github.com/authup/authup/commit/c851f76777cf0018d55f62511536b5f73a080868))

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.13...v1.0.0-beta.17) (2024-06-23)


### Features

* better naming for policy evaluator methods ([1801bb9](https://github.com/authup/authup/commit/1801bb940dd2893286fde3c5a1ac9b932e3fd4e5))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* initial policy implementation ([#2038](https://github.com/authup/authup/issues/2038)) ([deeaffc](https://github.com/authup/authup/commit/deeaffcf0b4a72d9e1d6cf99dbf70d582b98c257))
* refacotring of http controller request validation ([#2082](https://github.com/authup/authup/issues/2082)) ([6be6ff8](https://github.com/authup/authup/commit/6be6ff858db9527651f8abacabe99280ce9a2a08))
* renamed group-policy to composite-policy ([42e9702](https://github.com/authup/authup/commit/42e9702419824e459cb3311ae0766d0871a2d92a))
* restrictions for role,permission-assignemnts ([#2071](https://github.com/authup/authup/issues/2071)) ([c851f76](https://github.com/authup/authup/commit/c851f76777cf0018d55f62511536b5f73a080868))

## [1.0.0-beta.13](https://github.com/authup/authup/compare/v1.0.0-beta.12...v1.0.0-beta.13) (2024-05-13)


### Features

* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))

## [1.0.0-beta.12](https://github.com/authup/authup/compare/v1.0.0-beta.11...v1.0.0-beta.12) (2024-05-10)


### Features

* improve errror handling ([#1951](https://github.com/authup/authup/issues/1951)) ([607585e](https://github.com/authup/authup/commit/607585ee733b42b3a2cccf8d2812dafd7299cda3))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))

## [1.0.0-beta.10](https://github.com/authup/authup/compare/v1.0.0-beta.9...v1.0.0-beta.10) (2024-05-08)


### Features

* improve errror handling ([#1951](https://github.com/authup/authup/issues/1951)) ([607585e](https://github.com/authup/authup/commit/607585ee733b42b3a2cccf8d2812dafd7299cda3))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
