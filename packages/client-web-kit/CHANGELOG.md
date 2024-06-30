# Change Log

## [1.0.1-beta.19](https://github.com/authup/authup/compare/v1.0.0-beta.19...v1.0.1-beta.19) (2024-06-30)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.19 to ^1.0.1-beta.19
    * @authup/core-kit bumped from ^1.0.0-beta.19 to ^1.0.1-beta.19
    * @authup/core-http-kit bumped from ^1.0.0-beta.19 to ^1.0.1-beta.19
    * @authup/core-realtime-kit bumped from ^1.0.1-beta.18 to ^1.0.0-beta.19
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.18 to ^1.0.1-beta.19
    * @authup/core-kit bumped from ^1.0.0-beta.18 to ^1.0.1-beta.19
    * @authup/core-http-kit bumped from ^1.0.0-beta.18 to ^1.0.1-beta.19
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19

## [1.0.0-beta.19](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.19) (2024-06-30)


### Bug Fixes

* cookie access in vue plugin & allow read on common attributes (realm/identity-provider) ([1cbb1a7](https://github.com/authup/authup/commit/1cbb1a7a08c1dce5aa7f7c60f776117e45dfdddc))
* **deps:** bump nuxt to v3.12.2 ([86e9be4](https://github.com/authup/authup/commit/86e9be4d77128680cca58cb25be94f49ba0b9a7a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-http-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.18 to ^1.0.1-beta.18
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-http-kit bumped from ^1.0.0-beta.18 to ^1.0.0-beta.19
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.18 to ^1.0.1-beta.18

## [1.0.0-beta.18](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.18) (2024-06-24)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reenable defining pinia option for web-kit installation ([ca62249](https://github.com/authup/authup/commit/ca622491a2e03330d0377f6ae236f62564d04737))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified client socket manager interaction ([d31ccf5](https://github.com/authup/authup/commit/d31ccf5e3ca87c68f0edc52b7335ddf5ef73f39a))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* accessing domain api in entity delete component ([67b830e](https://github.com/authup/authup/commit/67b830ec228224445d5f6054cd6469557f765432))
* define key for action of relational resource assignments ([a7c3872](https://github.com/authup/authup/commit/a7c3872f8e1ed44a0d02a8a0f4162d201942b514))
* **deps:** bump @vueuse/integrations from 10.10.0 to 10.11.0 ([#2061](https://github.com/authup/authup/issues/2061)) ([95fa23b](https://github.com/authup/authup/commit/95fa23b02d08539f7e1e83d9387c815c6d8e7c61))
* **deps:** bump @vueuse/integrations from 10.9.0 to 10.10.0 ([#2017](https://github.com/authup/authup/issues/2017)) ([0c618b3](https://github.com/authup/authup/commit/0c618b3139a8becb14e8a9fe3e4ae274818ec5b2))
* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))
* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* remove unnecessary pinia option parameter ([e2b9124](https://github.com/authup/authup/commit/e2b9124768c1077a816c47a93a3cb2b5843ff991))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))

## [1.0.1-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.1-beta.17) (2024-06-23)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core-kit bumped from ^1.0.0-beta.17 to ^1.0.0-beta.18
    * @authup/core-http-kit bumped from ^1.0.0-beta.17 to ^1.0.1-beta.17
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.17 to ^1.0.1-beta.17
  * peerDependencies
    * @authup/core-kit bumped from ^1.0.0-beta.17 to ^1.0.0-beta.18
    * @authup/core-http-kit bumped from ^1.0.0-beta.17 to ^1.0.1-beta.17
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.17 to ^1.0.1-beta.17

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.17...v1.0.0-beta.17) (2024-06-23)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reenable defining pinia option for web-kit installation ([ca62249](https://github.com/authup/authup/commit/ca622491a2e03330d0377f6ae236f62564d04737))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified client socket manager interaction ([d31ccf5](https://github.com/authup/authup/commit/d31ccf5e3ca87c68f0edc52b7335ddf5ef73f39a))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* accessing domain api in entity delete component ([67b830e](https://github.com/authup/authup/commit/67b830ec228224445d5f6054cd6469557f765432))
* define key for action of relational resource assignments ([a7c3872](https://github.com/authup/authup/commit/a7c3872f8e1ed44a0d02a8a0f4162d201942b514))
* **deps:** bump @vueuse/integrations from 10.10.0 to 10.11.0 ([#2061](https://github.com/authup/authup/issues/2061)) ([95fa23b](https://github.com/authup/authup/commit/95fa23b02d08539f7e1e83d9387c815c6d8e7c61))
* **deps:** bump @vueuse/integrations from 10.9.0 to 10.10.0 ([#2017](https://github.com/authup/authup/issues/2017)) ([0c618b3](https://github.com/authup/authup/commit/0c618b3139a8becb14e8a9fe3e4ae274818ec5b2))
* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))
* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* remove unnecessary pinia option parameter ([e2b9124](https://github.com/authup/authup/commit/e2b9124768c1077a816c47a93a3cb2b5843ff991))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core-realtime-kit bumped from ^1.0.1-beta.13 to ^1.0.0-beta.17
  * peerDependencies
    * @authup/core-realtime-kit bumped from ^1.0.1-beta.13 to ^1.0.0-beta.17

## [1.0.0-beta.17](https://github.com/authup/authup/compare/v1.0.0-beta.16...v1.0.0-beta.17) (2024-06-23)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* identity-provider-{attribute,role,permission}-mapping ([#2058](https://github.com/authup/authup/issues/2058)) ([b5c5f15](https://github.com/authup/authup/commit/b5c5f15a22242152a3a573e7cbf8a01b9a719773))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reenable defining pinia option for web-kit installation ([ca62249](https://github.com/authup/authup/commit/ca622491a2e03330d0377f6ae236f62564d04737))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified client socket manager interaction ([d31ccf5](https://github.com/authup/authup/commit/d31ccf5e3ca87c68f0edc52b7335ddf5ef73f39a))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* accessing domain api in entity delete component ([67b830e](https://github.com/authup/authup/commit/67b830ec228224445d5f6054cd6469557f765432))
* define key for action of relational resource assignments ([a7c3872](https://github.com/authup/authup/commit/a7c3872f8e1ed44a0d02a8a0f4162d201942b514))
* **deps:** bump @vueuse/integrations from 10.10.0 to 10.11.0 ([#2061](https://github.com/authup/authup/issues/2061)) ([95fa23b](https://github.com/authup/authup/commit/95fa23b02d08539f7e1e83d9387c815c6d8e7c61))
* **deps:** bump @vueuse/integrations from 10.9.0 to 10.10.0 ([#2017](https://github.com/authup/authup/issues/2017)) ([0c618b3](https://github.com/authup/authup/commit/0c618b3139a8becb14e8a9fe3e4ae274818ec5b2))
* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))
* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* remove unnecessary pinia option parameter ([e2b9124](https://github.com/authup/authup/commit/e2b9124768c1077a816c47a93a3cb2b5843ff991))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-http-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.13 to ^1.0.1-beta.13
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-http-kit bumped from ^1.0.0-beta.13 to ^1.0.0-beta.17
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.13 to ^1.0.1-beta.13

## [1.0.0-beta.16](https://github.com/authup/authup/compare/v1.0.0-beta.15...v1.0.0-beta.16) (2024-06-07)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* simplified client socket manager interaction ([d31ccf5](https://github.com/authup/authup/commit/d31ccf5e3ca87c68f0edc52b7335ddf5ef73f39a))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* define key for action of relational resource assignments ([a7c3872](https://github.com/authup/authup/commit/a7c3872f8e1ed44a0d02a8a0f4162d201942b514))
* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))
* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* remove unnecessary pinia option parameter ([e2b9124](https://github.com/authup/authup/commit/e2b9124768c1077a816c47a93a3cb2b5843ff991))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))

## [1.0.0-beta.15](https://github.com/authup/authup/compare/v1.0.0-beta.14...v1.0.0-beta.15) (2024-05-13)


### Bug Fixes

* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))

## [1.0.0-beta.14](https://github.com/authup/authup/compare/v1.0.0-beta.13...v1.0.0-beta.14) (2024-05-13)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))

## [1.0.0-beta.13](https://github.com/authup/authup/compare/v1.0.0-beta.12...v1.0.0-beta.13) (2024-05-13)


### Features

* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-http-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-http-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.12 to ^1.0.0-beta.13

## [1.0.0-beta.12](https://github.com/authup/authup/compare/v1.0.0-beta.11...v1.0.0-beta.12) (2024-05-10)


### Features

* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-http-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-http-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.11 to ^1.0.0-beta.12

## [1.0.0-beta.10](https://github.com/authup/authup/compare/v1.0.0-beta.9...v1.0.0-beta.10) (2024-05-08)


### Features

* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-http-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
  * peerDependencies
    * @authup/kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-http-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10
    * @authup/core-realtime-kit bumped from ^1.0.0-beta.9 to ^1.0.0-beta.10

## [1.0.0-beta.9](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.8...client-vue-v1.0.0-beta.9) (2024-04-10)


### Bug Fixes

* **deps:** bump smob from 1.4.1 to 1.5.0 ([#1843](https://github.com/authup/authup/issues/1843)) ([4741a8a](https://github.com/authup/authup/commit/4741a8a93ea069fe4fcb7ab897d789414e372d69))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.8 to ^1.0.0-beta.9

## [1.0.0-beta.8](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.7...client-vue-v1.0.0-beta.8) (2024-03-26)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.7 to ^1.0.0-beta.8

## [1.0.0-beta.7](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.6...client-vue-v1.0.0-beta.7) (2024-03-06)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.6 to ^1.0.0-beta.7

## [1.0.0-beta.6](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.5...client-vue-v1.0.0-beta.6) (2024-02-28)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.5 to ^1.0.0-beta.6

## [1.0.0-beta.5](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.4...client-vue-v1.0.0-beta.5) (2024-02-26)


### Features

* remove permission name regex restriction ([#1754](https://github.com/authup/authup/issues/1754)) ([c81a249](https://github.com/authup/authup/commit/c81a2499fe48cdbe258cac89d6084cb777ac27fc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.4 to ^1.0.0-beta.5

## [1.0.0-beta.4](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.3...client-vue-v1.0.0-beta.4) (2024-02-19)


### Features

* ldap identity provider ([#1721](https://github.com/authup/authup/issues/1721)) ([3cf6858](https://github.com/authup/authup/commit/3cf68587b8ed44c3dbbf745fcbec6166e615f85b))
* ldap identity-provider {user,role}-filter attribute ([#1743](https://github.com/authup/authup/issues/1743)) ([f36f70e](https://github.com/authup/authup/commit/f36f70e67fddbe7c37c8dff82075598757e39599))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.3 to ^1.0.0-beta.4

## [1.0.0-beta.3](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.2...client-vue-v1.0.0-beta.3) (2024-02-06)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.2 to ^1.0.0-beta.3

## [1.0.0-beta.2](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.1...client-vue-v1.0.0-beta.2) (2024-01-14)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.1 to ^1.0.0-beta.2

## [1.0.0-beta.1](https://github.com/authup/authup/compare/client-vue-v1.0.0-beta.0...client-vue-v1.0.0-beta.1) (2024-01-09)


### Miscellaneous Chores

* **client-vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1
  * peerDependencies
    * @authup/core bumped from ^1.0.0-beta.0 to ^1.0.0-beta.1

## [1.0.0-beta.0](https://github.com/authup/authup/compare/client-vue-v0.45.10...client-vue-v1.0.0-beta.0) (2024-01-05)


### Features

* apply stricter linting rules ([#1611](https://github.com/authup/authup/issues/1611)) ([af0774d](https://github.com/authup/authup/commit/af0774d72a91d52f92b4d51c8391feca0f76f540))
* migrated from vue-layout to vuecs ([387e1e9](https://github.com/authup/authup/commit/387e1e940c3db69e84ef507df987d1fb84ffe96c))
* prefix & reogranize components ([#1610](https://github.com/authup/authup/issues/1610)) ([0e4c6ee](https://github.com/authup/authup/commit/0e4c6eeacad42f5a3ca96e3172546e442480047b))


### Bug Fixes

* relational resource componentns slot rendering ([b28de46](https://github.com/authup/authup/commit/b28de468f87a73b5402ee113f5a3caa11283bf5e))
* version range in peer dependency section for internal packages ([ef95901](https://github.com/authup/authup/commit/ef9590163463f1cc8c230f12d315ecc44b9c3454))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @authup/core bumped from ^0.45.10 to ^1.0.0-beta.0
  * peerDependencies
    * @authup/core bumped from ^0.45.10 to ^1.0.0-beta.0

## 0.45.10

### Patch Changes

- [`ecf8797f`](https://github.com/authup/authup/commit/ecf8797fcacff6a560564fb9d01561c04b56cc63) Thanks [@tada5hi](https://github.com/tada5hi)! - fix throwing error

- Updated dependencies [[`ecf8797f`](https://github.com/authup/authup/commit/ecf8797fcacff6a560564fb9d01561c04b56cc63)]:
  - @authup/core@0.45.10

## 0.45.9

### Patch Changes

- [`f0b015a0`](https://github.com/authup/authup/commit/f0b015a07c960610031412368f83fc07ba4dde40) Thanks [@tada5hi](https://github.com/tada5hi)! - patch ecosystem

- Updated dependencies [[`f0b015a0`](https://github.com/authup/authup/commit/f0b015a07c960610031412368f83fc07ba4dde40)]:
  - @authup/core@0.45.9

## 0.45.8

### Patch Changes

- [`63b4414e`](https://github.com/authup/authup/commit/63b4414eed4442a40dd25aab7c0dd69d0bd46f26) Thanks [@tada5hi](https://github.com/tada5hi)! - fix docker build

- Updated dependencies [[`63b4414e`](https://github.com/authup/authup/commit/63b4414eed4442a40dd25aab7c0dd69d0bd46f26)]:
  - @authup/core@0.45.8

## 0.45.7

### Patch Changes

- [`7faa3d10`](https://github.com/authup/authup/commit/7faa3d10dc0a048a84792d6d0d7a2dc717f13e1b) Thanks [@tada5hi](https://github.com/tada5hi)! - next patch release

- Updated dependencies [[`7faa3d10`](https://github.com/authup/authup/commit/7faa3d10dc0a048a84792d6d0d7a2dc717f13e1b)]:
  - @authup/core@0.45.7

## 0.45.6

### Patch Changes

- [`9b94d2be`](https://github.com/authup/authup/commit/9b94d2be82498faa4e28d63450d8e8c1beda5d37) Thanks [@tada5hi](https://github.com/tada5hi)! - force docker publish to docker.io

- Updated dependencies [[`9b94d2be`](https://github.com/authup/authup/commit/9b94d2be82498faa4e28d63450d8e8c1beda5d37)]:
  - @authup/core@0.45.6

## 0.45.5

### Patch Changes

- [`3f5d3d72`](https://github.com/authup/authup/commit/3f5d3d728576a51ec96fac740a2738451d2d2cd1) Thanks [@tada5hi](https://github.com/tada5hi)! - release docker

- Updated dependencies [[`3f5d3d72`](https://github.com/authup/authup/commit/3f5d3d728576a51ec96fac740a2738451d2d2cd1)]:
  - @authup/core@0.45.5

## 0.45.4

### Patch Changes

- [`622729b0`](https://github.com/authup/authup/commit/622729b086d0a833b4e18bcb0ce9c046ebe0d1d8) Thanks [@tada5hi](https://github.com/tada5hi)! - force docker release

- Updated dependencies [[`622729b0`](https://github.com/authup/authup/commit/622729b086d0a833b4e18bcb0ce9c046ebe0d1d8)]:
  - @authup/core@0.45.4

## 0.45.3

### Patch Changes

- [`05849783`](https://github.com/authup/authup/commit/058497834a176c5efa4412408fda5de144a3bc61) Thanks [@tada5hi](https://github.com/tada5hi)! - trigger release workflow

- Updated dependencies [[`05849783`](https://github.com/authup/authup/commit/058497834a176c5efa4412408fda5de144a3bc61)]:
  - @authup/core@0.45.3

## 0.45.2

### Patch Changes

- [`c4f56913`](https://github.com/authup/authup/commit/c4f56913ceb64100ec86f443d1eceddb4adc0d1c) Thanks [@tada5hi](https://github.com/tada5hi)! - bump to next patch version

- Updated dependencies [[`c4f56913`](https://github.com/authup/authup/commit/c4f56913ceb64100ec86f443d1eceddb4adc0d1c)]:
  - @authup/core@0.45.2

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.45.0](https://github.com/authup/authup/compare/v0.44.0...v0.45.0) (2023-10-23)

**Note:** Version bump only for package @authup/client-vue

# [0.44.0](https://github.com/authup/authup/compare/v0.42.0...v0.44.0) (2023-10-07)

**Note:** Version bump only for package @authup/client-vue

# [0.43.0](https://github.com/authup/authup/compare/v0.42.0...v0.43.0) (2023-10-05)

**Note:** Version bump only for package @authup/client-vue

# [0.42.0](https://github.com/authup/authup/compare/v0.41.0...v0.42.0) (2023-10-05)

**Note:** Version bump only for package @authup/client-vue

# [0.41.0](https://github.com/authup/authup/compare/v0.40.3...v0.41.0) (2023-09-01)

### Bug Fixes

- keep original argument order of provide pattern ([13b6f05](https://github.com/authup/authup/commit/13b6f05e18bb87d2ef15424e640321002c308a99))
- move translator sub module ([93f0b37](https://github.com/authup/authup/commit/93f0b37519b7a9508334a0abe7805e4b61081865))

### Features

- ensure singleton instance is not injected yet ([31d0e31](https://github.com/authup/authup/commit/31d0e3115d0feedc3a0cc4f097835cd52b2f44a8))

## [0.40.3](https://github.com/authup/authup/compare/v0.40.2...v0.40.3) (2023-08-21)

### Bug Fixes

- renamed socket-manager utility functions ([cce9584](https://github.com/authup/authup/commit/cce95848120cfa7b35d7829c9cda69c1157d48d5))
- set busy as list-meta property ([69af5f1](https://github.com/authup/authup/commit/69af5f14bc5a8a931f7c7fab9c5a8e235d0e9602))

## [0.40.2](https://github.com/authup/authup/compare/v0.40.1...v0.40.2) (2023-08-20)

### Bug Fixes

- cleanup list sub-module ([132bcbf](https://github.com/authup/authup/commit/132bcbff2387b6eefe7afd729be4cc90358067db))
- list total entries incr/decr ([fbf0a17](https://github.com/authup/authup/commit/fbf0a17a5c2eb931e501eb58d7d38a317a0c8706))
- module exports + simplified applying pagination meta ([7f233e5](https://github.com/authup/authup/commit/7f233e50029ca74be5c4dd804ac5b99067ed4f76))
- remove unnecessary watcher ([2f6beef](https://github.com/authup/authup/commit/2f6beef89d4dc4ab40a6afd47cfc0d241cf36b07))
- renamed list-query to list-meta + restructured meta type ([6abb3fd](https://github.com/authup/authup/commit/6abb3fd9122244de0e84afb9094d04e1f35bf0fd))

## [0.40.1](https://github.com/authup/authup/compare/v0.40.0...v0.40.1) (2023-08-16)

### Bug Fixes

- remove explicit dependency to pinia ([0e26dd7](https://github.com/authup/authup/commit/0e26dd7fa6a97caee1428ebd9b82ecc363030641))
- vue type imports ([93d8ada](https://github.com/authup/authup/commit/93d8ada1b85659bc9de3ec621fb69fb7c60ebb24))

# [0.40.0](https://github.com/authup/authup/compare/v0.39.1...v0.40.0) (2023-08-15)

### Bug Fixes

- api-client/store usage with provide & inject ([779a0ff](https://github.com/authup/authup/commit/779a0ff6a0ef143b11e6e4b155d2a0928724d01f))
- minor cleanup + enhance vue install fn ([5c6eb53](https://github.com/authup/authup/commit/5c6eb537ecdd65c17c460217263edaa450ef9cfc))
- remove explicit component naming + proper renderError usage for entity-manager ([71d3e0b](https://github.com/authup/authup/commit/71d3e0bf3f87fa9698d3f80cea8cbaa51617e5a0))

### Features

- simplified entity assign actions ([c22ab45](https://github.com/authup/authup/commit/c22ab4528b1df0e81500bfdc59ab6bcf08517a08))

## [0.39.1](https://github.com/authup/authup/compare/v0.39.0...v0.39.1) (2023-07-22)

**Note:** Version bump only for package @authup/client-vue

# [0.39.0](https://github.com/authup/authup/compare/v0.38.0...v0.39.0) (2023-07-18)

### Bug Fixes

- identity-provider fields components ([8682424](https://github.com/authup/authup/commit/8682424187a473198041f9188b75e5284ae68258))
- rename identity-provider protocol_config column to preset ([bf4020e](https://github.com/authup/authup/commit/bf4020e7033de7584fb3f27a4b58452afd8a6eeb))
- simplify imports + better defaults for list-controls ([870cd0b](https://github.com/authup/authup/commit/870cd0b5a5a6925a059d29748d844b4e544ca20b))

### Features

- better typing and structure for entity-{list,manager} ([abbfe43](https://github.com/authup/authup/commit/abbfe43587a02e8b0a6c4b3fd5ad10379a24acc4))
- extended identity-provider form to manage protocols and protocol-configs ([0d01e7f](https://github.com/authup/authup/commit/0d01e7f49510722ec3fdd32050c22d64f931e478))
- implemented entity-manager + created domain entity components ([391969d](https://github.com/authup/authup/commit/391969d4c4ba0abd325a2fbc032da4eef0eab66c))
- renamed and restructured domain-list to entity-list ([fa75fd8](https://github.com/authup/authup/commit/fa75fd881894af1abccb2d27fc7594b89bb8e228))
- split identity-provider form fields + additional utitlity components ([a50a695](https://github.com/authup/authup/commit/a50a695614f8261083776e1d0d34418dba2ceeec))

# [0.38.0](https://github.com/authup/authup/compare/v0.37.1...v0.38.0) (2023-06-29)

### Features

- enhanced and unified slot- & prop-typing and capabilities ([6d4caa6](https://github.com/authup/authup/commit/6d4caa6202349e7ea0f431da56a7e6881b49f41c))

## [0.37.1](https://github.com/authup/authup/compare/v0.37.0...v0.37.1) (2023-06-14)

### Bug Fixes

- bump hapic to v2.x ([2dd66ed](https://github.com/authup/authup/commit/2dd66ed87e89338be682a93bec4fe12ca86be712))
- bump vue-layout dependencies + rename validation create fn ([ea0c679](https://github.com/authup/authup/commit/ea0c679207cd0d3cd6503d80779a825fdb6091d5))

# [0.37.0](https://github.com/authup/authup/compare/v0.36.0...v0.37.0) (2023-05-31)

### Bug Fixes

- **deps:** bump smob to v1.4.0 ([8eefa83](https://github.com/authup/authup/commit/8eefa83a55271ad139dde2e0ccbacc8c937e6a4e))

### Features

- implemented ilingo v3 ([5b0e632](https://github.com/authup/authup/commit/5b0e6321cd8b7569e1e92262014a8ffc00098d63))

# [0.36.0](https://github.com/authup/authup/compare/v0.35.0...v0.36.0) (2023-05-27)

### Features

- cleanup and relocate auth store + set token max age for oauth2 grant types ([13643fd](https://github.com/authup/authup/commit/13643fd76e8c471f8d90b555c386041a34bcb2ff))

# [0.35.0](https://github.com/authup/authup/compare/v0.34.0...v0.35.0) (2023-05-25)

**Note:** Version bump only for package @authup/client-vue

# [0.34.0](https://github.com/authup/authup/compare/v0.33.0...v0.34.0) (2023-05-24)

### Bug Fixes

- **deps:** bump @vue-layout/\* packages ([f7d6e4c](https://github.com/authup/authup/commit/f7d6e4c8089c693e9d6a86ed8e19725bf8c78a42))
- **deps:** bump smob from 1.0.0 to 1.1.1 ([#1122](https://github.com/authup/authup/issues/1122)) ([0dc6667](https://github.com/authup/authup/commit/0dc66679c7b65c37f2eec5793727d00b0c35c013))
- minor fix for css styling of robot-form ([0d379f4](https://github.com/authup/authup/commit/0d379f41e2828f22072d32f65cfb7e63d7280edb))

### Features

- switch to bootstrap table view for domain lists ([2faa379](https://github.com/authup/authup/commit/2faa37910732863bb730588b6e3334c27b353c16))

# [0.33.0](https://github.com/authup/authup/compare/v0.32.3...v0.33.0) (2023-04-24)

**Note:** Version bump only for package @authup/client-vue

## [0.32.2](https://github.com/authup/authup/compare/v0.32.1...v0.32.2) (2023-04-05)

### Bug Fixes

- restructured ability-manger in module + force version bump ([b59f485](https://github.com/authup/authup/commit/b59f485eec2e6e7ddf6d771f7eaad0f1ef46b569))

## [0.32.1](https://github.com/authup/authup/compare/v0.32.0...v0.32.1) (2023-04-04)

### Bug Fixes

- **deps:** bump vue-layout to v1.1.0 ([ff7f4d1](https://github.com/authup/authup/commit/ff7f4d15d101cb9b3c33e1b67f7764a4e09df110))

# [0.32.0](https://github.com/authup/authup/compare/v0.31.3...v0.32.0) (2023-04-03)

### Features

- use core token-interceptor for ui token session management ([33ec6e0](https://github.com/authup/authup/commit/33ec6e0ad835c7203d3d848f074a2210507e0ad3))

## [0.31.3](https://github.com/authup/authup/compare/v0.31.2...v0.31.3) (2023-04-03)

**Note:** Version bump only for package @authup/client-vue

## [0.31.2](https://github.com/authup/authup/compare/v0.31.1...v0.31.2) (2023-04-03)

### Bug Fixes

- mounting of http interceptor + better struct for verification data ([0ee1e40](https://github.com/authup/authup/commit/0ee1e403752e5576ae2d22a1b840ce05ae452c10))

## [0.31.1](https://github.com/authup/authup/compare/v0.31.0...v0.31.1) (2023-04-03)

**Note:** Version bump only for package @authup/client-vue

# [0.31.0](https://github.com/authup/authup/compare/v0.30.1...v0.31.0) (2023-04-03)

### Features

- add user-info domain api + renamed useHTTPClientAPI ([22d1cdc](https://github.com/authup/authup/commit/22d1cdce326bb7a0549d28b04b0157840b3f7623))

## [0.30.1](https://github.com/authup/authup/compare/v0.30.0...v0.30.1) (2023-04-03)

### Bug Fixes

- cleanup exports and bump min peer version ([a639294](https://github.com/authup/authup/commit/a639294b906b2c3e9358ab08223929acb7950fcf))

# [0.30.0](https://github.com/authup/authup/compare/v0.29.0...v0.30.0) (2023-04-03)

**Note:** Version bump only for package @authup/client-vue

# [0.29.0](https://github.com/authup/authup/compare/v0.28.0...v0.29.0) (2023-04-01)

### Bug Fixes

- adjusted README.md, package.json files + renamed http client ([fcf8423](https://github.com/authup/authup/commit/fcf8423228fa73aa2a61ba8de96c0af51dfb0c5f))

### Features

- add realm & identity-provider selection to login form ([5678540](https://github.com/authup/authup/commit/5678540256e7fb59443548e5fe4eb4705d9346f1))

# [0.28.0](https://github.com/authup/authup/compare/v0.27.0...v0.28.0) (2023-04-01)

**Note:** Version bump only for package @authup/client-vue

# [0.27.0](https://github.com/authup/authup/compare/v0.26.0...v0.27.0) (2023-04-01)

**Note:** Version bump only for package @authup/client-vue

# [0.26.0](https://github.com/authup/authup/compare/v0.25.0...v0.26.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-vue

# [0.25.0](https://github.com/authup/authup/compare/v0.24.0...v0.25.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-vue

# [0.24.0](https://github.com/authup/authup/compare/v0.23.1...v0.24.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-vue

# [0.23.0](https://github.com/authup/authup/compare/v0.22.0...v0.23.0) (2023-03-30)

**Note:** Version bump only for package @authup/client-vue

# [0.22.0](https://github.com/Tada5hi/authup/compare/v0.21.0...v0.22.0) (2023-03-26)

**Note:** Version bump only for package @authup/client-vue

# [0.21.0](https://github.com/Tada5hi/authup/compare/v0.20.1...v0.21.0) (2023-03-26)

**Note:** Version bump only for package @authup/client-vue

# [0.20.0](https://github.com/Tada5hi/authup/compare/v0.19.0...v0.20.0) (2023-03-24)

**Note:** Version bump only for package @authup/client-vue

# [0.19.0](https://github.com/Tada5hi/authup/compare/v0.18.0...v0.19.0) (2023-03-23)

**Note:** Version bump only for package @authup/client-vue

# [0.18.0](https://github.com/Tada5hi/authup/compare/v0.17.2...v0.18.0) (2023-03-23)

### Bug Fixes

- **deps:** bump smob from 0.1.0 to 1.0.0 ([#952](https://github.com/Tada5hi/authup/issues/952)) ([363fc69](https://github.com/Tada5hi/authup/commit/363fc6902848a16982626f4fbe3cb7e5c1afd053))

### Features

- add realm- & scope-subscriber + minor cleanup + enum referencing ([dc4f1ba](https://github.com/Tada5hi/authup/commit/dc4f1ba167259f6c7c8f381a8569fe255646e85d))

## [0.17.2](https://github.com/Tada5hi/authup/compare/v0.17.1...v0.17.2) (2023-03-20)

**Note:** Version bump only for package @authup/client-vue

## [0.17.1](https://github.com/Tada5hi/authup/compare/v0.17.0...v0.17.1) (2023-03-14)

**Note:** Version bump only for package @authup/client-vue

# [0.17.0](https://github.com/Tada5hi/authup/compare/v0.16.0...v0.17.0) (2023-03-13)

**Note:** Version bump only for package @authup/client-vue

# [0.16.0](https://github.com/Tada5hi/authup/compare/v0.15.4...v0.16.0) (2023-02-28)

### Features

- add support to lock/unlock user name manipulation ([2fcb2c5](https://github.com/Tada5hi/authup/commit/2fcb2c5e50c62aa727b0109dd1dff0647b699231))

## [0.15.4](https://github.com/Tada5hi/authup/compare/v0.15.3...v0.15.4) (2023-02-24)

**Note:** Version bump only for package @authup/client-vue

## [0.15.3](https://github.com/Tada5hi/authup/compare/v0.15.2...v0.15.3) (2023-02-23)

**Note:** Version bump only for package @authup/client-vue

## [0.15.1](https://github.com/Tada5hi/authup/compare/v0.15.0...v0.15.1) (2023-02-08)

**Note:** Version bump only for package @authup/client-vue

# [0.15.0](https://github.com/Tada5hi/authup/compare/v0.14.1...v0.15.0) (2023-02-07)

### Bug Fixes

- **deps:** bump vue from 3.2.45 to 3.2.47 ([#825](https://github.com/Tada5hi/authup/issues/825)) ([69d44a6](https://github.com/Tada5hi/authup/commit/69d44a62684e980225cb5c416d4ccb4d5e5f902d))

# [0.14.0](https://github.com/Tada5hi/authup/compare/v0.13.0...v0.14.0) (2023-01-29)

**Note:** Version bump only for package @authup/client-vue

# [0.13.0](https://github.com/Tada5hi/authup/compare/v0.12.1...v0.13.0) (2023-01-28)

**Note:** Version bump only for package @authup/client-vue

## [0.12.1](https://github.com/Tada5hi/authup/compare/v0.12.0...v0.12.1) (2023-01-28)

### Bug Fixes

- peer-dependency version + updated license information ([f693215](https://github.com/Tada5hi/authup/commit/f69321538afbd2923287209593cdebcedaa29637))

# [0.12.0](https://github.com/Tada5hi/authup/compare/v0.11.1...v0.12.0) (2023-01-28)

**Note:** Version bump only for package @authup/client-vue

## [0.11.1](https://github.com/Tada5hi/authup/compare/v0.11.0...v0.11.1) (2023-01-27)

### Bug Fixes

- **deps:** bump ilingo to v2.2.1 ([eebc902](https://github.com/Tada5hi/authup/commit/eebc902495debf127679f8c2619deef00249b041))
- **deps:** updated dependencies ([b3d221c](https://github.com/Tada5hi/authup/commit/b3d221c862c4f4dbd0ccf018566ef00796fcd591))

# [0.11.0](https://github.com/Tada5hi/authup/compare/v0.10.1...v0.11.0) (2023-01-27)

### Bug Fixes

- prefix node module imports with node: ([e866876](https://github.com/Tada5hi/authup/commit/e866876f6a64f50946ca7fd9945fce0958ebd6d9))
- **vue:** replaced esbuild with swc core ([a59a667](https://github.com/Tada5hi/authup/commit/a59a667fb5ca580464703311b776159f91bbc91a))

## [0.10.1](https://github.com/Tada5hi/authup/compare/v0.10.0...v0.10.1) (2023-01-23)

**Note:** Version bump only for package @authup/client-vue

# [0.10.0](https://github.com/Tada5hi/authup/compare/v0.9.0...v0.10.0) (2023-01-20)

**Note:** Version bump only for package @authup/client-vue

# [0.9.0](https://github.com/Tada5hi/authup/compare/v0.8.0...v0.9.0) (2023-01-20)

### Features

- lazy password grant + minor entity management ui guards ([127ec1c](https://github.com/Tada5hi/authup/commit/127ec1c13f108f2a032aba67dd3b662d35251dc7))
- **ui:** implemented realm switching in admin area ([d902af7](https://github.com/Tada5hi/authup/commit/d902af78d85c270f75425eef01e191a1cc7504ac))

# [0.8.0](https://github.com/Tada5hi/authup/compare/v0.7.0...v0.8.0) (2023-01-16)

### Features

- replaced ts-jest & partially rollup with swc ([bf2b1aa](https://github.com/Tada5hi/authup/commit/bf2b1aa7ed4f0ee9e63fabf0d1d38754bbfa3310))

# [0.7.0](https://github.com/Tada5hi/authup/compare/v0.6.3...v0.7.0) (2023-01-11)

**Note:** Version bump only for package @authup/client-vue

## [0.6.3](https://github.com/Tada5hi/authup/compare/v0.6.2...v0.6.3) (2023-01-10)

**Note:** Version bump only for package @authup/client-vue

## [0.6.2](https://github.com/Tada5hi/authup/compare/v0.6.1...v0.6.2) (2023-01-10)

**Note:** Version bump only for package @authup/client-vue

# [0.6.0](https://github.com/Tada5hi/authup/compare/v0.5.0...v0.6.0) (2023-01-08)

**Note:** Version bump only for package @authup/client-vue

# [0.5.0](https://github.com/Tada5hi/authup/compare/v0.4.0...v0.5.0) (2023-01-08)

### Features

- add robot/user renaming constraints + non owned permission assign ([ea12e73](https://github.com/Tada5hi/authup/commit/ea12e7309c6d539ec005cc5460ef50a2ebe8c931))

# [0.4.0](https://github.com/Tada5hi/authup/compare/v0.3.1...v0.4.0) (2022-12-21)

### Features

- add scope management (http-endpoint, db-entity, ...) ([2ab4236](https://github.com/Tada5hi/authup/commit/2ab42364e44f032cb93c9946c40a9fd71f287c44))
- further enhancement for client & scope management ([29d1f3e](https://github.com/Tada5hi/authup/commit/29d1f3ee5ecde14afa0b692dd9589887bc2df54e))

# [0.3.0](https://github.com/Tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)

### Bug Fixes

- **ui:** minor fixes (list-builder,{client,permission}-form,...) ([666b41f](https://github.com/Tada5hi/authup/commit/666b41f2fccc370815046087a621882f0159f1cc))

### Features

- add client/application management ([5327e9b](https://github.com/Tada5hi/authup/commit/5327e9bf411dfeeadef60d8f28ea81e0bc638f38))
- enhanced & extended permission management ([3c33bd0](https://github.com/Tada5hi/authup/commit/3c33bd0e0dcf1035d546fce375a76bb1c1312a05))
- refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/Tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))

## [0.2.2](https://github.com/Tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)

**Note:** Version bump only for package @authup/client-vue

# [0.2.0](https://github.com/Tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)

**Note:** Version bump only for package @authup/client-vue

# 0.1.0 (2022-12-08)

### Bug Fixes

- bump typeorm-extension, rapiq & routup version ([e37b993](https://github.com/Tada5hi/authup/commit/e37b993bfbf3d11b24c696d59f1382cc4379a72c))

### Features

- **server-core:** replaced http framework ([6273ae6](https://github.com/Tada5hi/authup/commit/6273ae680f82a4e27ba527b9eb260bb81ee75d20))
