# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.0.0-beta.15](https://github.com/authup/authup/compare/v1.0.0-beta.15...v1.0.0-beta.15) (2024-05-13)


### Features

* allow {client,robot,user}-authentication via id or name ([2c06e42](https://github.com/authup/authup/commit/2c06e42c0b835e135af3c285ad4ac5f8a34a6421))
* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))
* apply stricter linting rules ([#1611](https://github.com/authup/authup/issues/1611)) ([af0774d](https://github.com/authup/authup/commit/af0774d72a91d52f92b4d51c8391feca0f76f540))
* better & consistent naming for configuration options ([#1773](https://github.com/authup/authup/issues/1773)) ([a4f966e](https://github.com/authup/authup/commit/a4f966e223181966b6bf3f63edd34d864ff5d29d))
* better control of token verifier cache ([3a7210f](https://github.com/authup/authup/commit/3a7210fb3179b5fd48e792f7874fab6c981224d0))
* bind default role to robot instead of individual permissions ([#1781](https://github.com/authup/authup/issues/1781)) ([bcc51d2](https://github.com/authup/authup/commit/bcc51d241a38541a2dcd1c83f9f149b37fde44d9))
* bump routup and plugins ([d44c33e](https://github.com/authup/authup/commit/d44c33e8cebd6bed0f5414774aa02e632a327e73))
* check composite unique constraints on resource creation for sqlite ([#1870](https://github.com/authup/authup/issues/1870)) ([d07fcb9](https://github.com/authup/authup/commit/d07fcb9e30cfe8429aad007adcb75bed14894eff))
* configurable name of default robot account ([#1771](https://github.com/authup/authup/issues/1771)) ([4ec7cdc](https://github.com/authup/authup/commit/4ec7cdc23a5deb5f6019558f592909e60a1fd95d))
* enable condition validation for permission-relation entities ([#1733](https://github.com/authup/authup/issues/1733)) ([bb96e9a](https://github.com/authup/authup/commit/bb96e9aa10d825191b79e5971701ba8135acba55))
* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* enhance logger formatting ([85011d5](https://github.com/authup/authup/commit/85011d53d8f27f733d4f6ef46b99112473efa3ee))
* enhance use toast composable ([07fb700](https://github.com/authup/authup/commit/07fb700b6c774eaa0f626a6ebe9241591037e9fd))
* guarantee hashed robot vault secret is equal to db secret ([#1767](https://github.com/authup/authup/issues/1767)) ([9928256](https://github.com/authup/authup/commit/99282569585632659161eb2e1053e068f19129cd))
* implement interaction between timeago and ilingo library ([5b44aaf](https://github.com/authup/authup/commit/5b44aaf7bb3133d8ace60cb84a4affd4ff1c85bf))
* implemented ilingo v4 with reactive form rules translations ([#1913](https://github.com/authup/authup/issues/1913)) ([75aaa16](https://github.com/authup/authup/commit/75aaa169a0ea1db0ea7543a8baca434ad4154634))
* improve errror handling ([#1951](https://github.com/authup/authup/issues/1951)) ([607585e](https://github.com/authup/authup/commit/607585ee733b42b3a2cccf8d2812dafd7299cda3))
* initial core-socket-kit implementation ([#1907](https://github.com/authup/authup/issues/1907)) ([a7e02b2](https://github.com/authup/authup/commit/a7e02b2394dc886df8ff17e9671ac1043f59f287))
* ldap identity provider ([#1721](https://github.com/authup/authup/issues/1721)) ([3cf6858](https://github.com/authup/authup/commit/3cf68587b8ed44c3dbbf745fcbec6166e615f85b))
* ldap identity-provider {user,role}-filter attribute ([#1743](https://github.com/authup/authup/issues/1743)) ([f36f70e](https://github.com/authup/authup/commit/f36f70e67fddbe7c37c8dff82075598757e39599))
* manage {user,robot,client}-basic-auth by configuration ([#1768](https://github.com/authup/authup/issues/1768)) ([2b66063](https://github.com/authup/authup/commit/2b66063ba24ef33dcfe6470801de1413c2f2aa04))
* migrated from vue-layout to vuecs ([387e1e9](https://github.com/authup/authup/commit/387e1e940c3db69e84ef507df987d1fb84ffe96c))
* migrated to bootstrap-vue-next v0.17 ([7d32617](https://github.com/authup/authup/commit/7d32617db8d78665e952eb0601996b740e9dd195))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* parse/check connection string fns ([4e497b0](https://github.com/authup/authup/commit/4e497b03b4940ce6d93129cb11c69599c1ccad22))
* prefix & reogranize components ([#1610](https://github.com/authup/authup/issues/1610)) ([0e4c6ee](https://github.com/authup/authup/commit/0e4c6eeacad42f5a3ca96e3172546e442480047b))
* refactor & simplify global cli ([#1603](https://github.com/authup/authup/issues/1603)) ([890456b](https://github.com/authup/authup/commit/890456bf7ffb85b80ed20f1a8bfa2e480b18a9e4))
* refactored configuration management ([#1598](https://github.com/authup/authup/issues/1598)) ([9ff87a4](https://github.com/authup/authup/commit/9ff87a4256b5b3af6b3f5e00de2942d68683ecaf))
* refactored domain event publishing + fixed cache invalidation ([#1928](https://github.com/authup/authup/issues/1928)) ([53f2fba](https://github.com/authup/authup/commit/53f2fbaeeb4190a48bb920bc4595fef27a4cf2d5))
* refactored service singleton usage ([#1933](https://github.com/authup/authup/issues/1933)) ([cbf2f58](https://github.com/authup/authup/commit/cbf2f5836d5f3bf4cd26ab0add44e78222d54602))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* remove permission name regex restriction ([#1754](https://github.com/authup/authup/issues/1754)) ([c81a249](https://github.com/authup/authup/commit/c81a2499fe48cdbe258cac89d6084cb777ac27fc))
* remove socket-client implementation ([#1915](https://github.com/authup/authup/issues/1915)) ([28f1cce](https://github.com/authup/authup/commit/28f1cce4190de8c429cee1f785300aa2868abfcd))
* reorganized code ([#1945](https://github.com/authup/authup/issues/1945)) ([f5622d3](https://github.com/authup/authup/commit/f5622d3d75c83bdbb5e89ef82ae5ce2aa56416e6))
* serialize/deserialize {user,role,identity-provider}-attribute values ([#1731](https://github.com/authup/authup/issues/1731)) ([2283cca](https://github.com/authup/authup/commit/2283cca200ced41305f430c6a73e954dfd89bbf5))
* simplified and enhanced ability-manager ([#1758](https://github.com/authup/authup/issues/1758)) ([641be51](https://github.com/authup/authup/commit/641be51163afedb296301f16e2ee127121e46796))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))
* simplified validation handling in login.vue component ([320e049](https://github.com/authup/authup/commit/320e0497572f5b30219e41cbd67523260b23b8fa))
* split log in access and error & adjust log levels for console transport ([4d291cb](https://github.com/authup/authup/commit/4d291cb80f04fae313a7151b3257e7b54af7e0a4))
* store email of identity-provider flow & optimized account creation ([df97c1a](https://github.com/authup/authup/commit/df97c1ad4cb0502bfbf16cdad34edc833ca522c7))
* translations for components ([#1914](https://github.com/authup/authup/issues/1914)) ([e713752](https://github.com/authup/authup/commit/e71375241c01b66626dced01021bc974d9166fa4))
* updated bootstrap-vue & refactored toast usage ([1b3ca45](https://github.com/authup/authup/commit/1b3ca45f0bc839c4dd29868c7b5ab1bfc186fcdb))
* use envix for environment variable interaction ([8d5a8fc](https://github.com/authup/authup/commit/8d5a8fc261cd34caea2a9d42222118cc54cef55f))
* use mysql2 driver package to support mysql v8 ([#1831](https://github.com/authup/authup/issues/1831)) ([d8fd28b](https://github.com/authup/authup/commit/d8fd28b9302bbf77ece1fb2837e2ada9510721cf))
* use rust bindings to speed up bcrypt and jsonwebtokens ([#1784](https://github.com/authup/authup/issues/1784)) ([3a1fcf3](https://github.com/authup/authup/commit/3a1fcf3705acce2564e4d3692e3161c6f1c5021d))
* validaiton severity implementation ([0e4d0a0](https://github.com/authup/authup/commit/0e4d0a0fd75847754a9b769121ef0f6703913cfa))


### Bug Fixes

* add explicit vnode typings for form components ([0248e40](https://github.com/authup/authup/commit/0248e407e1e36e90b073be560c8f5ec4fb134bd9))
* add prepublish build hook for ui package ([212dff0](https://github.com/authup/authup/commit/212dff031bb19ab908ebd9f26d17ea0e2e050103))
* allow authentication but not authorization with basic auth in production ([f8c9ac1](https://github.com/authup/authup/commit/f8c9ac1b7359ef7f7c632dfa59728bd64c2be8ff))
* bump locter to v2 & reset lock file ([d129f14](https://github.com/authup/authup/commit/d129f14fcfbd4e20b07d15dd87691452f0941842))
* client repository naming ([d213faa](https://github.com/authup/authup/commit/d213faaf6bee4b01ff36d149ad1b58f43c87e15d))
* client web scope list view ([b76cffb](https://github.com/authup/authup/commit/b76cffbe7f600cea2ca426e89112cf2247e210d0))
* column names for sqlite uniqueness enforcement should be based on property name ([5de8c5f](https://github.com/authup/authup/commit/5de8c5f27592e4b106dac7afda602a3c9fb43dd1))
* **deps:** bump @hapic/oauth2 from 2.4.0 to 2.4.1 ([#1628](https://github.com/authup/authup/issues/1628)) ([e963096](https://github.com/authup/authup/commit/e963096552ff0fca2e9685d6d7712d0d6f5202a7))
* **deps:** bump @hapic/oauth2 from 2.4.1 to 2.4.2 ([#1835](https://github.com/authup/authup/issues/1835)) ([d870a11](https://github.com/authup/authup/commit/d870a117850b1c0ccb3fbc988e43478d1d1cb826))
* **deps:** bump @hapic/vault from 2.3.1 to 2.3.2 ([#1629](https://github.com/authup/authup/issues/1629)) ([d9d3c25](https://github.com/authup/authup/commit/d9d3c25e46df759a34dbd393f01e0a84e8dfc9b9))
* **deps:** bump @hapic/vault from 2.3.2 to 2.3.3 ([#1836](https://github.com/authup/authup/issues/1836)) ([a51ef81](https://github.com/authup/authup/commit/a51ef81ccc04175cef233f1ea3836d6a3bca1b4d))
* **deps:** bump @node-rs/bcrypt from 1.10.0 to 1.10.1 ([#1810](https://github.com/authup/authup/issues/1810)) ([234deb1](https://github.com/authup/authup/commit/234deb191e60310c320018a33a0ed6cc43de98d7))
* **deps:** bump @node-rs/bcrypt from 1.10.2 to 1.10.4 ([#1925](https://github.com/authup/authup/issues/1925)) ([600c8fc](https://github.com/authup/authup/commit/600c8fce8c71a87ba88fed9c17ea1c4e3abfaa8c))
* **deps:** bump @node-rs/jsonwebtoken from 0.5.0 to 0.5.1 ([#1790](https://github.com/authup/authup/issues/1790)) ([fd1ceef](https://github.com/authup/authup/commit/fd1ceef63e8311becd8a4ed84950c652294d5d60))
* **deps:** bump @node-rs/jsonwebtoken from 0.5.1 to 0.5.2 ([#1809](https://github.com/authup/authup/issues/1809)) ([139c925](https://github.com/authup/authup/commit/139c925a6f9f5b44a9990c9118ced4323baab68a))
* **deps:** bump @node-rs/jsonwebtoken from 0.5.4 to 0.5.6 ([#1927](https://github.com/authup/authup/issues/1927)) ([afe82f6](https://github.com/authup/authup/commit/afe82f6babe4e9854b91534bf34d38c7a8ee21cc))
* **deps:** bump @routup/** dependencies ([63869b5](https://github.com/authup/authup/commit/63869b530c2859d9a19bbd77b80acdd1351c1a91))
* **deps:** bump @routup/basic from 1.3.0 to 1.3.1 ([#1636](https://github.com/authup/authup/issues/1636)) ([0e3acb1](https://github.com/authup/authup/commit/0e3acb146a984e795e63c32149862a0de14af2eb))
* **deps:** bump @routup/basic from 1.3.1 to 1.3.2 ([#1865](https://github.com/authup/authup/issues/1865)) ([7c00221](https://github.com/authup/authup/commit/7c0022156a488e4f9f9bef6cf12aa6d4e042a451))
* **deps:** bump @routup/decorators from 3.3.0 to 3.3.1 ([#1637](https://github.com/authup/authup/issues/1637)) ([4ee0314](https://github.com/authup/authup/commit/4ee031486e156b1def4e8dd887ce502552505f94))
* **deps:** bump @routup/decorators from 3.3.1 to 3.3.2 ([#1873](https://github.com/authup/authup/issues/1873)) ([0fdff25](https://github.com/authup/authup/commit/0fdff25b8dcf32ea7472983ca3795425b8d64993))
* **deps:** bump @routup/swagger from 2.3.0 to 2.3.1 ([#1581](https://github.com/authup/authup/issues/1581)) ([67416c6](https://github.com/authup/authup/commit/67416c69fe0c8839a855dbed3965c6e9aed6d200))
* **deps:** bump @routup/swagger from 2.3.1 to 2.3.2 ([#1635](https://github.com/authup/authup/issues/1635)) ([f889e38](https://github.com/authup/authup/commit/f889e3869b3cd8ddfa6c7329339de42a91d170d1))
* **deps:** bump @routup/swagger from 2.3.2 to 2.3.3 ([#1644](https://github.com/authup/authup/issues/1644)) ([c3dfa71](https://github.com/authup/authup/commit/c3dfa71509677b2dc368a721de311be7061ebe18))
* **deps:** bump @routup/swagger from 2.3.3 to 2.3.4 ([#1675](https://github.com/authup/authup/issues/1675)) ([5fb5373](https://github.com/authup/authup/commit/5fb537330b8113622b50989cdc736cead9841644))
* **deps:** bump @routup/swagger from 2.3.4 to 2.3.5 ([#1745](https://github.com/authup/authup/issues/1745)) ([0c8b7ab](https://github.com/authup/authup/commit/0c8b7ab35fd94f922d846539477cce5a3732c0b2))
* **deps:** bump @routup/swagger from 2.3.5 to 2.3.6 ([#1875](https://github.com/authup/authup/issues/1875)) ([cf13487](https://github.com/authup/authup/commit/cf134873f7c450e83b865620fdd65bc729089e78))
* **deps:** bump @types/jsonwebtoken from 9.0.3 to 9.0.4 ([#1444](https://github.com/authup/authup/issues/1444)) ([185bee1](https://github.com/authup/authup/commit/185bee120615e5c51a9d643b9af03d73c35e56d0))
* **deps:** bump @types/jsonwebtoken from 9.0.4 to 9.0.5 ([#1507](https://github.com/authup/authup/issues/1507)) ([598b9af](https://github.com/authup/authup/commit/598b9af61e739e74ace804941dc05f1cc79e6e14))
* **deps:** bump @types/jsonwebtoken from 9.0.5 to 9.0.6 ([#1777](https://github.com/authup/authup/issues/1777)) ([bec999f](https://github.com/authup/authup/commit/bec999fd1a17c1dea3578b0961e0937b51e4deca))
* **deps:** bump @types/nodemailer from 6.4.13 to 6.4.14 ([#1543](https://github.com/authup/authup/issues/1543)) ([b67c556](https://github.com/authup/authup/commit/b67c556bd5ef799d97456b67de5cfcb57ddeca1d))
* **deps:** bump @types/nodemailer from 6.4.14 to 6.4.15 ([#1946](https://github.com/authup/authup/issues/1946)) ([e3c9f7c](https://github.com/authup/authup/commit/e3c9f7ce5893c16ebe5e8aa3071cd09b93110a4b))
* **deps:** bump better-sqlite3 from 9.0.0 to 9.1.1 ([#1547](https://github.com/authup/authup/issues/1547)) ([48e4c2a](https://github.com/authup/authup/commit/48e4c2aeb820928547eaed089e1497795b4e40a3))
* **deps:** bump better-sqlite3 from 9.2.2 to 9.3.0 ([#1662](https://github.com/authup/authup/issues/1662)) ([a1e8763](https://github.com/authup/authup/commit/a1e876332081e36b0b16fe7859cec2ba3463c7ab))
* **deps:** bump better-sqlite3 from 9.3.0 to 9.4.1 ([#1717](https://github.com/authup/authup/issues/1717)) ([6c587cc](https://github.com/authup/authup/commit/6c587cc31ad8c8476b3612891ed850d56202bbdc))
* **deps:** bump better-sqlite3 from 9.4.1 to 9.4.3 ([#1760](https://github.com/authup/authup/issues/1760)) ([fdfd877](https://github.com/authup/authup/commit/fdfd877364d7f86223f44504fb177b44769abc25))
* **deps:** bump better-sqlite3 from 9.4.3 to 9.4.5 ([#1868](https://github.com/authup/authup/issues/1868)) ([941324f](https://github.com/authup/authup/commit/941324f9b3cc2bfde7f2af816b681b5412618cd7))
* **deps:** bump better-sqlite3 from 9.5.0 to 9.6.0 ([#1935](https://github.com/authup/authup/issues/1935)) ([e835eff](https://github.com/authup/authup/commit/e835eff9e5de0a919cbb7117d7f5ce8cdc686916))
* **deps:** bump destr from 2.0.2 to 2.0.3 ([#1753](https://github.com/authup/authup/issues/1753)) ([b99ae15](https://github.com/authup/authup/commit/b99ae159d6eaae12985eb90d9fe74dfacf3d2d61))
* **deps:** bump dotenv from 16.3.1 to 16.4.1 ([#1678](https://github.com/authup/authup/issues/1678)) ([ba5421c](https://github.com/authup/authup/commit/ba5421c0226ead1660fbe70e7d1c1a642b5892bd))
* **deps:** bump dotenv from 16.4.1 to 16.4.4 ([#1728](https://github.com/authup/authup/issues/1728)) ([0952c01](https://github.com/authup/authup/commit/0952c013e5b26efece6f59974a5e584f64f97032))
* **deps:** bump dotenv from 16.4.4 to 16.4.5 ([#1750](https://github.com/authup/authup/issues/1750)) ([e19c93d](https://github.com/authup/authup/commit/e19c93da9757f9bdc9f3b93706545f5906c55271))
* **deps:** bump envix from 1.2.0 to 1.3.0 ([#1714](https://github.com/authup/authup/issues/1714)) ([c922704](https://github.com/authup/authup/commit/c9227042f021ac062fa7eeb36030d5aa9eda40ec))
* **deps:** bump envix from 1.3.0 to 1.5.0 ([#1718](https://github.com/authup/authup/issues/1718)) ([68158fe](https://github.com/authup/authup/commit/68158fe5d41cc710da780b7d558d6990e88e8936))
* **deps:** bump hapic from 2.4.0 to 2.5.0 ([#1627](https://github.com/authup/authup/issues/1627)) ([4adea8e](https://github.com/authup/authup/commit/4adea8e84bb0188cac35be82bca77379f32db7cd))
* **deps:** bump hapic from 2.5.0 to 2.5.1 ([#1834](https://github.com/authup/authup/issues/1834)) ([4f815b1](https://github.com/authup/authup/commit/4f815b1894e3fa793e6553cf04c710790ac730f1))
* **deps:** bump jose from 4.15.2 to 4.15.4 ([#1431](https://github.com/authup/authup/issues/1431)) ([26d5835](https://github.com/authup/authup/commit/26d58351c10e0c795f1aaca700ea193cdcbc1e72))
* **deps:** bump jose from 4.15.4 to 5.0.1 ([#1476](https://github.com/authup/authup/issues/1476)) ([980f794](https://github.com/authup/authup/commit/980f794bfc6fb438bd23c66ff64731ce4ae158ac))
* **deps:** bump jose from 5.0.1 to 5.1.0 ([#1490](https://github.com/authup/authup/issues/1490)) ([7017e1c](https://github.com/authup/authup/commit/7017e1c8dd56264835ed3d36ce9347201045f9d4))
* **deps:** bump jose from 5.1.0 to 5.1.1 ([#1524](https://github.com/authup/authup/issues/1524)) ([d4d2221](https://github.com/authup/authup/commit/d4d2221bd1f08e5a4c3d7401117b686e80ba08b4))
* **deps:** bump jose from 5.1.3 to 5.2.0 ([#1593](https://github.com/authup/authup/issues/1593)) ([b29f72d](https://github.com/authup/authup/commit/b29f72d1d89c87befb8efd5bd611d2dd78e165cf))
* **deps:** bump jose from 5.2.0 to 5.2.2 ([#1720](https://github.com/authup/authup/issues/1720)) ([30a5d75](https://github.com/authup/authup/commit/30a5d75316bb314e228449216084e9732773b53f))
* **deps:** bump jose from 5.2.2 to 5.2.3 ([#1802](https://github.com/authup/authup/issues/1802)) ([a7cf915](https://github.com/authup/authup/commit/a7cf915cfe7d7a8256f6641680068839df3c081a))
* **deps:** bump jose from 5.2.3 to 5.2.4 ([#1879](https://github.com/authup/authup/issues/1879)) ([0348eed](https://github.com/authup/authup/commit/0348eed14090255b4a4b5526fbd830c20cf7c71d))
* **deps:** bump jose from 5.2.4 to 5.3.0 ([#1979](https://github.com/authup/authup/issues/1979)) ([231f1b6](https://github.com/authup/authup/commit/231f1b6dde1e9567b2586ff77ab05867c51d416e))
* **deps:** bump locter from 1.2.3 to 1.3.0 ([#1632](https://github.com/authup/authup/issues/1632)) ([6c1ced2](https://github.com/authup/authup/commit/6c1ced2a309a3719970a837c07459511a9084e48))
* **deps:** bump locter from 2.0.2 to 2.1.0 ([#1855](https://github.com/authup/authup/issues/1855)) ([3628d76](https://github.com/authup/authup/commit/3628d76c0f5e7722bb6809cd8cab7228b1509850))
* **deps:** bump mysql2 from 3.9.3 to 3.9.4 ([#1883](https://github.com/authup/authup/issues/1883)) ([c5118a7](https://github.com/authup/authup/commit/c5118a75a3ab154b3acc30fd4dca938f64091cdf))
* **deps:** bump mysql2 from 3.9.5 to 3.9.6 ([#1905](https://github.com/authup/authup/issues/1905)) ([5d9cbd3](https://github.com/authup/authup/commit/5d9cbd3219a32cd09284be62265b73396a5325e8))
* **deps:** bump node-cron and @types/node-cron ([#1505](https://github.com/authup/authup/issues/1505)) ([9ab22c6](https://github.com/authup/authup/commit/9ab22c6a3c9d895b6115b6075d5fcbc1594020a9))
* **deps:** bump nodemailer and @types/nodemailer ([#1448](https://github.com/authup/authup/issues/1448)) ([026830c](https://github.com/authup/authup/commit/026830c71255d400ba24584b390012cc79cd136a))
* **deps:** bump nodemailer from 6.9.11 to 6.9.12 ([#1806](https://github.com/authup/authup/issues/1806)) ([fe74227](https://github.com/authup/authup/commit/fe74227be3ae7327a9fb56e947d5c0ff16c6a831))
* **deps:** bump nodemailer from 6.9.12 to 6.9.13 ([#1830](https://github.com/authup/authup/issues/1830)) ([665d29c](https://github.com/authup/authup/commit/665d29c35312bcb956698316fcee1b63500301cf))
* **deps:** bump nodemailer from 6.9.5 to 6.9.6 ([#1418](https://github.com/authup/authup/issues/1418)) ([bf4eb3d](https://github.com/authup/authup/commit/bf4eb3de649e89b1585bdced3af5a81bdd3eb365))
* **deps:** bump nodemailer from 6.9.7 to 6.9.8 ([#1607](https://github.com/authup/authup/issues/1607)) ([e44fcfa](https://github.com/authup/authup/commit/e44fcfa4ce2658d54cf32b781b1290c8fdc4731a))
* **deps:** bump nodemailer from 6.9.8 to 6.9.9 ([#1694](https://github.com/authup/authup/issues/1694)) ([544553d](https://github.com/authup/authup/commit/544553d72eb7e369f05b0a471e3c55733923b129))
* **deps:** bump nodemailer from 6.9.9 to 6.9.10 ([#1759](https://github.com/authup/authup/issues/1759)) ([da57ff5](https://github.com/authup/authup/commit/da57ff5ffe82c98eef4669a697376d0600e3d38b))
* **deps:** bump pathe from 1.1.1 to 1.1.2 ([#1639](https://github.com/authup/authup/issues/1639)) ([50f631b](https://github.com/authup/authup/commit/50f631b600a7d774f212b9a67883d5a5b139555c))
* **deps:** bump pg from 8.11.3 to 8.11.5 ([#1856](https://github.com/authup/authup/issues/1856)) ([8cb11c7](https://github.com/authup/authup/commit/8cb11c77c6857e62dffebe30f643e97f60cfe783))
* **deps:** bump reflect-metadata from 0.1.14 to 0.2.1 ([#1575](https://github.com/authup/authup/issues/1575)) ([96e97de](https://github.com/authup/authup/commit/96e97de2382323658b231ce4e5051e14762ed796))
* **deps:** bump reflect-metadata from 0.2.1 to 0.2.2 ([#1841](https://github.com/authup/authup/issues/1841)) ([ee73bf7](https://github.com/authup/authup/commit/ee73bf792bd64e34474ac7c9e61df9047f96da2c))
* **deps:** bump routup from 3.1.0 to 3.2.0 ([#1498](https://github.com/authup/authup/issues/1498)) ([698bd3e](https://github.com/authup/authup/commit/698bd3e317fa768b1dbe6ac8607f2632168c5ca2))
* **deps:** bump routup from 3.2.0 to 3.3.0 ([#1847](https://github.com/authup/authup/issues/1847)) ([3f80b81](https://github.com/authup/authup/commit/3f80b8167906085a4d4ecf7002867c10215dc45f))
* **deps:** bump smob from 1.4.1 to 1.5.0 ([#1843](https://github.com/authup/authup/issues/1843)) ([4741a8a](https://github.com/authup/authup/commit/4741a8a93ea069fe4fcb7ab897d789414e372d69))
* **deps:** bump typeorm from 0.3.17 to 0.3.19 ([#1613](https://github.com/authup/authup/issues/1613)) ([34aaa01](https://github.com/authup/authup/commit/34aaa01ba9c5e6a9849c827875130cc3692888d6))
* **deps:** bump typeorm from 0.3.19 to 0.3.20 ([#1677](https://github.com/authup/authup/issues/1677)) ([e929396](https://github.com/authup/authup/commit/e929396712c0618353aff39cae3043ab9f0e585b))
* **deps:** bump typeorm-extension from 3.0.2 to 3.1.0 ([#1447](https://github.com/authup/authup/issues/1447)) ([1325522](https://github.com/authup/authup/commit/13255222e9859362977e31f7abc29ec25df7acc2))
* **deps:** bump typeorm-extension from 3.1.0 to 3.1.1 ([#1458](https://github.com/authup/authup/issues/1458)) ([4b18e48](https://github.com/authup/authup/commit/4b18e481c604fa4517db7aa61d618ae91ce95e9a))
* **deps:** bump typeorm-extension from 3.2.0 to 3.3.0 ([#1642](https://github.com/authup/authup/issues/1642)) ([55ee6a5](https://github.com/authup/authup/commit/55ee6a5cd62f890ffdb294ec38dfc75c36ec5a64))
* **deps:** bump typeorm-extension from 3.3.0 to 3.4.0 ([#1674](https://github.com/authup/authup/issues/1674)) ([87ca11b](https://github.com/authup/authup/commit/87ca11b0dbd5fa474cda0a61efaff60f30aec047))
* **deps:** bump typeorm-extension from 3.4.0 to 3.5.0 ([#1724](https://github.com/authup/authup/issues/1724)) ([b95f0bc](https://github.com/authup/authup/commit/b95f0bcb1261f444429919f0108afced24551a51))
* **deps:** bump typeorm-extension from 3.5.0 to 3.5.1 ([#1884](https://github.com/authup/authup/issues/1884)) ([f349c80](https://github.com/authup/authup/commit/f349c80dbd6d3b143041407d3c51c174470ac3cb))
* **deps:** bump winston from 3.11.0 to 3.12.0 ([#1794](https://github.com/authup/authup/issues/1794)) ([ab2a496](https://github.com/authup/authup/commit/ab2a4966577a662a68aa7caff813bb16e8c46301))
* **deps:** bump winston from 3.12.0 to 3.13.0 ([#1833](https://github.com/authup/authup/issues/1833)) ([7c9766c](https://github.com/authup/authup/commit/7c9766cef39343dff6276774166fef512333b62f))
* **deps:** bump zod from 3.22.4 to 3.22.5 ([#1912](https://github.com/authup/authup/issues/1912)) ([366b48e](https://github.com/authup/authup/commit/366b48e952f10b98ffe4f4885bf0b03bba185884))
* **deps:** bump zod from 3.23.0 to 3.23.7 ([#1958](https://github.com/authup/authup/issues/1958)) ([0cf64ca](https://github.com/authup/authup/commit/0cf64ca8f9a63e253e32c011c050e5c45b260f88))
* **deps:** bump zod from 3.23.7 to 3.23.8 ([#1962](https://github.com/authup/authup/issues/1962)) ([25f63cb](https://github.com/authup/authup/commit/25f63cb29e9bcd1f3e5a8eb0cfdd27f95f4912fc))
* docker entrypoint ([12b15e4](https://github.com/authup/authup/commit/12b15e4d89c42fc86f13e3804765c1d674f15e7f))
* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))
* encforcing entity unique constraints on create/update operation ([a9680df](https://github.com/authup/authup/commit/a9680df90c7f24bc463051068f8afba3493c36b7))
* import utils form kit package ([15465b3](https://github.com/authup/authup/commit/15465b3a766cf66a9a5614aac181a307f1794025))
* include .nuxt directory for publishing ([adc8101](https://github.com/authup/authup/commit/adc8101f91da1a12aceb22a8964df7241fda086b))
* keys in build config fn ([b8deb00](https://github.com/authup/authup/commit/b8deb0017b3b94c8bcf81402b60e077c5622c2ce))
* ldap identity-provider login flow + added idp ldap test suite ([bc78964](https://github.com/authup/authup/commit/bc7896472d4840a9197ef716ead1c4344c2f1679))
* log any server error with cause ([ba40d14](https://github.com/authup/authup/commit/ba40d141340a3a4bcab2e48002f4be1aa147cfc2))
* maxAge assignment of refresh- & access-token ([5f112a0](https://github.com/authup/authup/commit/5f112a001f484cc81b2af9ccc928791829777efd))
* minor changes to include package as release-candidate ([7b2da27](https://github.com/authup/authup/commit/7b2da274054c9ee2f722771739654ccc54c2001d))
* minor cleanup for jwt sign/verify & remove unnecessary dependencies ([8ca8600](https://github.com/authup/authup/commit/8ca8600b9ebf635b6cacd30ce246a640ed507c25))
* minor enhancement for vue installer ([166b912](https://github.com/authup/authup/commit/166b9121041c3cb2968475c92a0057c0a04022ad))
* minor optimization for client-manager ([e5dbf87](https://github.com/authup/authup/commit/e5dbf87cff294bc7562306a2fc4fe430391fbbf2))
* minor type enhancement for layout navigation class ([fd3b168](https://github.com/authup/authup/commit/fd3b1686acc38f42873070b80a3d9c0048207604))
* only log non 400/500 status code in dev and test env ([cff84e0](https://github.com/authup/authup/commit/cff84e0cc1900d827d3df5a80002851aa2a6a7f6))
* package name of plugin packages ([2c8a5ca](https://github.com/authup/authup/commit/2c8a5cab37b9483af57f94151e9a43b9d4decb10))
* paring of server core options ([ac5709f](https://github.com/authup/authup/commit/ac5709ffa867db28b4fdea0ebd0aef5d8a55c9f9))
* permission restriction in identity-provider routes ([18077d3](https://github.com/authup/authup/commit/18077d3c7684ec600da2d1b43fac0d1785d9def2))
* relational resource componentns slot rendering ([b28de46](https://github.com/authup/authup/commit/b28de468f87a73b5402ee113f5a3caa11283bf5e))
* remove env.ts~ ([e2d68df](https://github.com/authup/authup/commit/e2d68dfee5238f6a9311ad6adab8d0796fd42960))
* remove nuxt module for loading configuration file ([3ad5f8c](https://github.com/authup/authup/commit/3ad5f8ca00ecbefb79ba41ea0784e6a36e38492a))
* remove osbolete translatorLocale component property ([4ef5be9](https://github.com/authup/authup/commit/4ef5be998f7799c6daff4e1426352591d39ca521))
* remove proxy sub-module ([d52cd63](https://github.com/authup/authup/commit/d52cd63864ab32a3035ba803487de413ccad3df7))
* robot integrity http handler ([ba5e08e](https://github.com/authup/authup/commit/ba5e08e5aa725760b37033f2fdac0bf97ddcef5a))
* setting publicURL to swagger http middleware ([d5eabbd](https://github.com/authup/authup/commit/d5eabbd2c0fbf020ed0dd7c698e7be59f395feff))
* stricter implementation of ldap resolveDn fn ([135e66b](https://github.com/authup/authup/commit/135e66b6fecbbd312f23b9e337c95e7d60c1b169))
* throwing error on token decoding issue ([1617abe](https://github.com/authup/authup/commit/1617abe754d0dec9ad93867ffa0271a33f7c05dd))
* throwing token error ([35663eb](https://github.com/authup/authup/commit/35663eb994ee18980298b173afb31c2983a9c91d))
* typings in translator + updated vuelidate ([0e1a8e8](https://github.com/authup/authup/commit/0e1a8e8e0418324db43dc0e437c8b69af253f8bb))
* unset cookie for domain in production ([112031b](https://github.com/authup/authup/commit/112031bbb6acade41e1cb1d64f1a67a5f14f67ec))
* use consts for custom vuelidate rules ([4f1bb7c](https://github.com/authup/authup/commit/4f1bb7c3181827cd5c564cac8c5021e6f252e838))
* use read-int instead of read-number ([cb01c5e](https://github.com/authup/authup/commit/cb01c5e1fe59008fcd792f04ce581ec10254538d))
* version range in peer dependency section for internal packages ([ef95901](https://github.com/authup/authup/commit/ef9590163463f1cc8c230f12d315ecc44b9c3454))


### Reverts

* "chore: remove node-workspace plugin" ([a890d63](https://github.com/authup/authup/commit/a890d6310b60d9c5777a93d6f2e5b3b7c5146986))

## [1.0.0-beta.15](https://github.com/authup/authup/compare/v1.0.0-beta.14...v1.0.0-beta.15) (2024-05-13)


### Bug Fixes

* don't bundle pinia in client-web-kit dist ([ba12cef](https://github.com/authup/authup/commit/ba12cef41dbe89c50572573a8422e13c6ad061fe))

## [1.0.0-beta.14](https://github.com/authup/authup/compare/v1.0.0-beta.13...v1.0.0-beta.14) (2024-05-13)


### Features

* allow passing pinia instance to client-web-kit package ([e664b37](https://github.com/authup/authup/commit/e664b373eb1aca54cb5b4104d2a8c106e98e22ca))


### Bug Fixes

* import utils form kit package ([15465b3](https://github.com/authup/authup/commit/15465b3a766cf66a9a5614aac181a307f1794025))

## [1.0.0-beta.13](https://github.com/authup/authup/compare/v1.0.0-beta.12...v1.0.0-beta.13) (2024-05-13)


### Features

* enable local/global permissions & unqiueness by name + realm_id ([#1985](https://github.com/authup/authup/issues/1985)) ([56b366a](https://github.com/authup/authup/commit/56b366af26b63e41c75080800e8c8cf638f2813b))
* enhance logger formatting ([85011d5](https://github.com/authup/authup/commit/85011d53d8f27f733d4f6ef46b99112473efa3ee))
* optimized pinia based store + renamed ability manager ([f309e99](https://github.com/authup/authup/commit/f309e99c93c73e5b5a217e207e706768106f9442))
* reimplemented store,http-client,... installation & usage ([#1986](https://github.com/authup/authup/issues/1986)) ([ca5fc93](https://github.com/authup/authup/commit/ca5fc9395628a2a2bf1ea9b81265346ae6c603a2))
* simplified role-,permission-,scope-form ([7b5cb4a](https://github.com/authup/authup/commit/7b5cb4af8420f50a2cb4b84f83fd5acd1d64f59d))


### Bug Fixes

* **deps:** bump jose from 5.2.4 to 5.3.0 ([#1979](https://github.com/authup/authup/issues/1979)) ([231f1b6](https://github.com/authup/authup/commit/231f1b6dde1e9567b2586ff77ab05867c51d416e))
* encforcing entity unique constraints on create/update operation ([a9680df](https://github.com/authup/authup/commit/a9680df90c7f24bc463051068f8afba3493c36b7))
* minor changes to include package as release-candidate ([7b2da27](https://github.com/authup/authup/commit/7b2da274054c9ee2f722771739654ccc54c2001d))


### Reverts

* "chore: remove node-workspace plugin" ([a890d63](https://github.com/authup/authup/commit/a890d6310b60d9c5777a93d6f2e5b3b7c5146986))

## [0.45.1](https://github.com/authup/authup/compare/v0.45.0...v0.45.1) (2023-10-23)


### Bug Fixes

* include .nuxt directory for publishing ([adc8101](https://github.com/authup/authup/commit/adc8101f91da1a12aceb22a8964df7241fda086b))





# [0.45.0](https://github.com/authup/authup/compare/v0.44.0...v0.45.0) (2023-10-23)


### Bug Fixes

* **deps:** bump @types/jsonwebtoken from 9.0.3 to 9.0.4 ([#1444](https://github.com/authup/authup/issues/1444)) ([185bee1](https://github.com/authup/authup/commit/185bee120615e5c51a9d643b9af03d73c35e56d0))
* **deps:** bump better-sqlite3 from 8.7.0 to 9.0.0 ([#1422](https://github.com/authup/authup/issues/1422)) ([ad64135](https://github.com/authup/authup/commit/ad64135aadfb4c08166de5aac75dfd4f34a5fc6f))
* **deps:** bump jose from 4.15.2 to 4.15.4 ([#1431](https://github.com/authup/authup/issues/1431)) ([26d5835](https://github.com/authup/authup/commit/26d58351c10e0c795f1aaca700ea193cdcbc1e72))
* **deps:** bump nodemailer and @types/nodemailer ([#1448](https://github.com/authup/authup/issues/1448)) ([026830c](https://github.com/authup/authup/commit/026830c71255d400ba24584b390012cc79cd136a))
* **deps:** bump nodemailer from 6.9.5 to 6.9.6 ([#1418](https://github.com/authup/authup/issues/1418)) ([bf4eb3d](https://github.com/authup/authup/commit/bf4eb3de649e89b1585bdced3af5a81bdd3eb365))
* **deps:** bump typeorm-extension from 3.0.2 to 3.1.0 ([#1447](https://github.com/authup/authup/issues/1447)) ([1325522](https://github.com/authup/authup/commit/13255222e9859362977e31f7abc29ec25df7acc2))
* **deps:** bump winston from 3.10.0 to 3.11.0 ([#1420](https://github.com/authup/authup/issues/1420)) ([834e4f1](https://github.com/authup/authup/commit/834e4f19601ea5aa918378aeb8371c5f54e1f556))


### Features

* bump routup and plugins ([d44c33e](https://github.com/authup/authup/commit/d44c33e8cebd6bed0f5414774aa02e632a327e73))





# [0.44.0](https://github.com/authup/authup/compare/v0.42.0...v0.44.0) (2023-10-07)


### Bug Fixes

* add missing build step in release job ([25f93e6](https://github.com/authup/authup/commit/25f93e640d111b79cad966938df4783cca63ac08))
* error status code comparision range ([9013350](https://github.com/authup/authup/commit/9013350e8dd04d6bb9ce57c1a5ca96d42f317059))
* exposing client errors via API ([00098fb](https://github.com/authup/authup/commit/00098fb0971247f2748b928942d0aa169190e7b9))


### Features

* enhance removing duplicte slashes ([9dd17b2](https://github.com/authup/authup/commit/9dd17b26ebf0ab9e7a776dedc6736069e4221fd7))





# [0.43.0](https://github.com/authup/authup/compare/v0.42.0...v0.43.0) (2023-10-05)


### Bug Fixes

* add missing build step in release job ([25f93e6](https://github.com/authup/authup/commit/25f93e640d111b79cad966938df4783cca63ac08))


### Features

* enhance removing duplicte slashes ([ee3302b](https://github.com/authup/authup/commit/ee3302b019c4c87e21fc9fb377e08d0ef8020a55))





# [0.42.0](https://github.com/authup/authup/compare/v0.41.0...v0.42.0) (2023-10-05)


### Bug Fixes

* **deps:** bump @types/jsonwebtoken from 9.0.2 to 9.0.3 ([#1387](https://github.com/authup/authup/issues/1387)) ([67869f4](https://github.com/authup/authup/commit/67869f4fa471bc4a983ba12803a086fb09c60555))
* **deps:** bump @types/nodemailer from 6.4.10 to 6.4.11 ([#1395](https://github.com/authup/authup/issues/1395)) ([21151e6](https://github.com/authup/authup/commit/21151e6d22365032c8e7f73eaa500f290f3e35af))
* **deps:** bump better-sqlite3 from 8.6.0 to 8.7.0 ([#1403](https://github.com/authup/authup/issues/1403)) ([477802e](https://github.com/authup/authup/commit/477802e7a1463ffee0b5183ccae390e30d446f3e))
* **deps:** bump jose from 4.14.6 to 4.15.2 ([#1399](https://github.com/authup/authup/issues/1399)) ([1c34f29](https://github.com/authup/authup/commit/1c34f29d2ce942a57b1902483ffed976a029d436))
* **deps:** bump routup to v2.0 ([aff4988](https://github.com/authup/authup/commit/aff49883ff3ee0c728a34f5ecf9fc6b7d1cbef64))
* **deps:** bump typeorm-extension from 3.0.1 to 3.0.2 ([#1367](https://github.com/authup/authup/issues/1367)) ([02f8743](https://github.com/authup/authup/commit/02f8743ebde1b6db07150fb7b2ca56c55540aaa4))
* **deps:** bump zod from 3.22.2 to 3.22.3 ([#1386](https://github.com/authup/authup/issues/1386)) ([1663dc8](https://github.com/authup/authup/commit/1663dc845aa8235db9f73aaa9c5dd1324da87f03))
* **deps:** bump zod from 3.22.3 to 3.22.4 ([#1404](https://github.com/authup/authup/issues/1404)) ([abcedb9](https://github.com/authup/authup/commit/abcedb929cff68c3c6105b023563fd30d7c4119d))


### Features

* bump routup to v3.0 ([f46f066](https://github.com/authup/authup/commit/f46f0661923a64b392fd62a845a5bab9a2f0891c))





# [0.41.0](https://github.com/authup/authup/compare/v0.40.3...v0.41.0) (2023-09-01)


### Bug Fixes

* allways set migrations folder for datasource options ([e49199c](https://github.com/authup/authup/commit/e49199c9f996bfb8e72a73809837d2e8eb23cf17))
* data-source options migration path ([582f8c6](https://github.com/authup/authup/commit/582f8c62e379b7ce0097ab4a857722c012746c85))
* **deps:** bump @ebec/http from 1.1.0 to 1.1.1 ([#1343](https://github.com/authup/authup/issues/1343)) ([2e92c03](https://github.com/authup/authup/commit/2e92c03836b087e3a4499951f5e6f1032f5bb113))
* **deps:** bump better-sqlite3 from 8.5.1 to 8.5.2 ([#1352](https://github.com/authup/authup/issues/1352)) ([1216567](https://github.com/authup/authup/commit/121656768c349141466e78066048bc55d10124cc))
* **deps:** bump hapic to v2.3.0 ([23d59bd](https://github.com/authup/authup/commit/23d59bd02f09ffbdfbae7534914b7004894b1b52))
* **deps:** bump jsonwebtoken from 9.0.1 to 9.0.2 ([#1349](https://github.com/authup/authup/issues/1349)) ([deb63e5](https://github.com/authup/authup/commit/deb63e58a11c3be190fad399039e04136b752131))
* **deps:** bump zod from 3.22.1 to 3.22.2 ([#1346](https://github.com/authup/authup/issues/1346)) ([584e804](https://github.com/authup/authup/commit/584e804fb2f6ac4288297ccf2814abff82dce328))
* keep original argument order of provide pattern ([13b6f05](https://github.com/authup/authup/commit/13b6f05e18bb87d2ef15424e640321002c308a99))
* move translator sub module ([93f0b37](https://github.com/authup/authup/commit/93f0b37519b7a9508334a0abe7805e4b61081865))


### Features

* ensure singleton instance is not injected yet ([31d0e31](https://github.com/authup/authup/commit/31d0e3115d0feedc3a0cc4f097835cd52b2f44a8))





## [0.40.3](https://github.com/authup/authup/compare/v0.40.2...v0.40.3) (2023-08-21)


### Bug Fixes

* renamed socket-manager utility functions ([cce9584](https://github.com/authup/authup/commit/cce95848120cfa7b35d7829c9cda69c1157d48d5))
* set busy as list-meta property ([69af5f1](https://github.com/authup/authup/commit/69af5f14bc5a8a931f7c7fab9c5a8e235d0e9602))





## [0.40.2](https://github.com/authup/authup/compare/v0.40.1...v0.40.2) (2023-08-20)


### Bug Fixes

* cleanup list sub-module ([132bcbf](https://github.com/authup/authup/commit/132bcbff2387b6eefe7afd729be4cc90358067db))
* **deps:** bump better-sqlite3 from 8.5.0 to 8.5.1 ([#1318](https://github.com/authup/authup/issues/1318)) ([f70d222](https://github.com/authup/authup/commit/f70d22243a405c6417cc0f6b0f6808b9e852a2c7))
* **deps:** bump pg from 8.11.2 to 8.11.3 ([#1321](https://github.com/authup/authup/issues/1321)) ([8907b24](https://github.com/authup/authup/commit/8907b24609478fa5bdc063f78bbc3bff5dd050ea))
* list total entries incr/decr ([fbf0a17](https://github.com/authup/authup/commit/fbf0a17a5c2eb931e501eb58d7d38a317a0c8706))
* module exports + simplified applying pagination meta ([7f233e5](https://github.com/authup/authup/commit/7f233e50029ca74be5c4dd804ac5b99067ed4f76))
* remove unnecessary watcher ([2f6beef](https://github.com/authup/authup/commit/2f6beef89d4dc4ab40a6afd47cfc0d241cf36b07))
* renamed list-query to list-meta + restructured meta type ([6abb3fd](https://github.com/authup/authup/commit/6abb3fd9122244de0e84afb9094d04e1f35bf0fd))





## [0.40.1](https://github.com/authup/authup/compare/v0.40.0...v0.40.1) (2023-08-16)


### Bug Fixes

* **deps:** bump bcrypt from 5.1.0 to 5.1.1 ([#1314](https://github.com/authup/authup/issues/1314)) ([d0f6068](https://github.com/authup/authup/commit/d0f6068f7599d788e5ec1ede924ffe0d9089bbb0))
* **deps:** bump pg from 8.11.1 to 8.11.2 ([#1315](https://github.com/authup/authup/issues/1315)) ([7120c9c](https://github.com/authup/authup/commit/7120c9c3ed3157ce5466ab1e24aa4ecb101baa53))
* **deps:** bump typeorm-extension from 3.0.0 to 3.0.1 ([#1309](https://github.com/authup/authup/issues/1309)) ([f188501](https://github.com/authup/authup/commit/f188501116f6312e60dbb96167cb6f257461b54f))
* **deps:** bump zod from 3.21.4 to 3.22.1 ([#1312](https://github.com/authup/authup/issues/1312)) ([976bdf5](https://github.com/authup/authup/commit/976bdf54059da4d47d10eab2402ac5abced77f84))
* remove explicit dependency to pinia ([0e26dd7](https://github.com/authup/authup/commit/0e26dd7fa6a97caee1428ebd9b82ecc363030641))
* vue type imports ([93d8ada](https://github.com/authup/authup/commit/93d8ada1b85659bc9de3ec621fb69fb7c60ebb24))





# [0.40.0](https://github.com/authup/authup/compare/v0.39.1...v0.40.0) (2023-08-15)


### Bug Fixes

* api-client/store usage with provide & inject ([779a0ff](https://github.com/authup/authup/commit/779a0ff6a0ef143b11e6e4b155d2a0928724d01f))
* **deps:** bump @types/nodemailer from 6.4.8 to 6.4.9 ([#1284](https://github.com/authup/authup/issues/1284)) ([29c2a2d](https://github.com/authup/authup/commit/29c2a2dfc209ddcf9718572b77caed7f69c3c747))
* **deps:** bump locter from 1.2.0 to 1.2.1 ([#1283](https://github.com/authup/authup/issues/1283)) ([c490e3e](https://github.com/authup/authup/commit/c490e3e7bc3292dfaf88a39508ef5a3dc21654ce))
* **deps:** bump typeorm-extension to v3 ([8bf3d9a](https://github.com/authup/authup/commit/8bf3d9a6ba9fc79c5e9cffca08b336603d82dc73))
* minor cleanup + enhance vue install fn ([5c6eb53](https://github.com/authup/authup/commit/5c6eb537ecdd65c17c460217263edaa450ef9cfc))
* remove explicit component naming + proper renderError usage for entity-manager ([71d3e0b](https://github.com/authup/authup/commit/71d3e0bf3f87fa9698d3f80cea8cbaa51617e5a0))


### Features

* implemmented socket manager + refactored entiy-{list,manager} ([b6ddb51](https://github.com/authup/authup/commit/b6ddb513a89d495e7a86dc9e5a41eabc23db44a8))
* simplified entity assign actions ([c22ab45](https://github.com/authup/authup/commit/c22ab4528b1df0e81500bfdc59ab6bcf08517a08))





## [0.39.1](https://github.com/authup/authup/compare/v0.39.0...v0.39.1) (2023-07-22)


### Bug Fixes

* **deps:** bump better-sqlite3 from 8.4.0 to 8.5.0 ([#1275](https://github.com/authup/authup/issues/1275)) ([f7ea369](https://github.com/authup/authup/commit/f7ea36936dd4058a2761cffa024d182c07f4e7ce))
* **deps:** bump locter from 1.1.2 to 1.2.0 ([#1274](https://github.com/authup/authup/issues/1274)) ([e17da05](https://github.com/authup/authup/commit/e17da057d7c612654ddc7c333f0a8daec0a2d488))
* **deps:** bump nodemailer from 6.9.3 to 6.9.4 ([#1276](https://github.com/authup/authup/issues/1276)) ([3d9c686](https://github.com/authup/authup/commit/3d9c6864c88ccb5c01801fb7a2d9680c6103d218))
* **deps:** bump routup from 1.0.1 to 1.0.2 ([#1270](https://github.com/authup/authup/issues/1270)) ([ddc541b](https://github.com/authup/authup/commit/ddc541b8196719cfb39fb3c60d99f185569d22e6))
* **deps:** bump typeorm-extension to v3.0.0-alpha.8 ([f77c239](https://github.com/authup/authup/commit/f77c239424ce41193c0099d9733aec32480273bb))
* migration location for non lazy execution ([4663b58](https://github.com/authup/authup/commit/4663b584c682daf38606b350a8970d86cabe8cb1))





# [0.39.0](https://github.com/authup/authup/compare/v0.38.0...v0.39.0) (2023-07-18)


### Bug Fixes

* **deps:** bump consola from 3.2.2 to 3.2.3 ([#1242](https://github.com/authup/authup/issues/1242)) ([ca7dc53](https://github.com/authup/authup/commit/ca7dc53d41416e25db9aaee671653b026a011951))
* **deps:** bump jsonwebtoken from 9.0.0 to 9.0.1 ([#1251](https://github.com/authup/authup/issues/1251)) ([5774121](https://github.com/authup/authup/commit/5774121066c4b41b1362f2fdbdea87c2161192e2))
* **deps:** bump semver and @commitlint/is-ignored ([#1268](https://github.com/authup/authup/issues/1268)) ([0f193a1](https://github.com/authup/authup/commit/0f193a1d3c3446f1c7cbe93c9f4ff659f79b9ec3))
* **deps:** bump semver from 5.7.1 to 5.7.2 ([#1254](https://github.com/authup/authup/issues/1254)) ([f0eec90](https://github.com/authup/authup/commit/f0eec9089e790effd8f89f069f016f7aadfbbd00))
* **deps:** bump winston from 3.9.0 to 3.10.0 ([#1252](https://github.com/authup/authup/issues/1252)) ([865d44d](https://github.com/authup/authup/commit/865d44deaebb66f9357f4f5ca1b3dca247bba1dd))
* env parse and apply for client-ui via cli service ([135f85c](https://github.com/authup/authup/commit/135f85c7abbad39d67ee0eb600503bb90d32becf))
* identity-provider fields components ([8682424](https://github.com/authup/authup/commit/8682424187a473198041f9188b75e5284ae68258))
* oauth2 github identity-provider workflow ([f6843e2](https://github.com/authup/authup/commit/f6843e2957224f87ff8cd2dc44a94623afc84016))
* only require identity-provider protocol or protocol-config ([5caacf4](https://github.com/authup/authup/commit/5caacf4abcefe701805bf22f5b36d5488fe5c9ce))
* rename identity-provider protocol_config column to preset ([bf4020e](https://github.com/authup/authup/commit/bf4020e7033de7584fb3f27a4b58452afd8a6eeb))
* rename realm column drop_able to built_in ([dd93239](https://github.com/authup/authup/commit/dd932393ba7391b9b0196dc3bbb63718a1f89ec0))
* simplify imports + better defaults for list-controls ([870cd0b](https://github.com/authup/authup/commit/870cd0b5a5a6925a059d29748d844b4e544ca20b))


### Features

* better typing and structure for entity-{list,manager} ([abbfe43](https://github.com/authup/authup/commit/abbfe43587a02e8b0a6c4b3fd5ad10379a24acc4))
* extended identity-provider form to manage protocols and protocol-configs ([0d01e7f](https://github.com/authup/authup/commit/0d01e7f49510722ec3fdd32050c22d64f931e478))
* implemented (social)login flow for identity provider authorization & redirect ([8db22c9](https://github.com/authup/authup/commit/8db22c9ef7adb29487c3bb6068ed34c53a7670b9))
* implemented entity-manager + created domain entity components ([391969d](https://github.com/authup/authup/commit/391969d4c4ba0abd325a2fbc032da4eef0eab66c))
* initial social login provider configuration ([5a17ebf](https://github.com/authup/authup/commit/5a17ebf24e6fb4339f8ba96f95924ab3a4e944ab))
* renamed and restructured domain-list to entity-list ([fa75fd8](https://github.com/authup/authup/commit/fa75fd881894af1abccb2d27fc7594b89bb8e228))
* split identity-provider form fields + additional utitlity components ([a50a695](https://github.com/authup/authup/commit/a50a695614f8261083776e1d0d34418dba2ceeec))
* updated migration files for mysql,postgres & sqlite3 ([af6fa0f](https://github.com/authup/authup/commit/af6fa0f54e4e4c1271fd4b30bc522d349786dbbc))
* use timeago component for {updated,created}-at columns ([af92236](https://github.com/authup/authup/commit/af92236231d064d25969ce07996ef5586ab671f8))





# [0.38.0](https://github.com/authup/authup/compare/v0.37.1...v0.38.0) (2023-06-29)


### Bug Fixes

* **deps:** bump consola from 3.1.0 to 3.2.2 ([#1214](https://github.com/authup/authup/issues/1214)) ([0ff89ef](https://github.com/authup/authup/commit/0ff89ef4bcf44973131880b8b987be710845686f))
* **deps:** bump dotenv from 16.1.4 to 16.3.1 ([#1185](https://github.com/authup/authup/issues/1185)) ([9e79d23](https://github.com/authup/authup/commit/9e79d23c9205e9194d779fecf6b220de79d629af))
* **deps:** bump pg from 8.11.0 to 8.11.1 ([#1218](https://github.com/authup/authup/issues/1218)) ([eaec72b](https://github.com/authup/authup/commit/eaec72b4c859b17d62b4965c8aed484dd2272785))
* **deps:** bump typeorm from 0.3.16 to 0.3.17 ([#1188](https://github.com/authup/authup/issues/1188)) ([e645a97](https://github.com/authup/authup/commit/e645a97ec98466316ae20f873697653ab43a98ae))
* extended status endpoint information ([b889f68](https://github.com/authup/authup/commit/b889f688d8d9a92c950c8b167bc752ea7c807d37))


### Features

* enhanced and unified slot- & prop-typing and capabilities ([6d4caa6](https://github.com/authup/authup/commit/6d4caa6202349e7ea0f431da56a7e6881b49f41c))





## [0.37.1](https://github.com/authup/authup/compare/v0.37.0...v0.37.1) (2023-06-14)


### Bug Fixes

* bump hapic to v2.x ([2dd66ed](https://github.com/authup/authup/commit/2dd66ed87e89338be682a93bec4fe12ca86be712))
* bump minimatch to v9.x ([0c63d48](https://github.com/authup/authup/commit/0c63d481d20dbae273130595bde4453b476eca37))
* bump vue-layout dependencies + rename validation create fn ([ea0c679](https://github.com/authup/authup/commit/ea0c679207cd0d3cd6503d80779a825fdb6091d5))
* **deps:** bump @hapic/oauth2 from 2.0.0-alpha.10 to 2.0.0-alpha.11 ([#1162](https://github.com/authup/authup/issues/1162)) ([f54db63](https://github.com/authup/authup/commit/f54db63b1a4bf31ea7c7931ed96158ec62e5d2f8))
* **deps:** bump @hapic/vault from 2.0.0-alpha.10 to 2.0.0-alpha.11 ([#1166](https://github.com/authup/authup/issues/1166)) ([d17254d](https://github.com/authup/authup/commit/d17254deacdce5523993df25296e2dcfcc0ede03))
* **deps:** bump dotenv from 16.1.1 to 16.1.3 ([#1151](https://github.com/authup/authup/issues/1151)) ([a96cb80](https://github.com/authup/authup/commit/a96cb80a81abd3caf3a67131afcdabc45419dd36))
* **deps:** bump dotenv from 16.1.3 to 16.1.4 ([#1157](https://github.com/authup/authup/issues/1157)) ([1a91140](https://github.com/authup/authup/commit/1a91140f1779555d53d74b2a412fef9e9ade9179))
* **deps:** bump hapic from 2.0.0-alpha.10 to 2.0.0-alpha.11 ([#1164](https://github.com/authup/authup/issues/1164)) ([5d5dbe6](https://github.com/authup/authup/commit/5d5dbe6627141563d9a8c674f88313ce0e81dce4))
* rename token-hook-options to client-response-error-token-hook-options ([103f707](https://github.com/authup/authup/commit/103f707002b38f39c05fcbcef80167cd2945da37))





# [0.37.0](https://github.com/authup/authup/compare/v0.36.0...v0.37.0) (2023-05-31)


### Bug Fixes

* add mising type export ([b4d5944](https://github.com/authup/authup/commit/b4d594451ab17725690c5a526391ec64e785513a))
* **deps:** bump @ebec/http from 1.0.0 to 1.1.0 ([#1148](https://github.com/authup/authup/issues/1148)) ([9f3de59](https://github.com/authup/authup/commit/9f3de59114efc3cb8bb37d9de5de71f3b24843bd))
* **deps:** bump dotenv from 16.0.3 to 16.1.1 ([#1142](https://github.com/authup/authup/issues/1142)) ([d68c905](https://github.com/authup/authup/commit/d68c905d95570b08699c7c53446cd09af641b704))
* **deps:** bump locter from 1.1.0 to 1.1.2 ([#1149](https://github.com/authup/authup/issues/1149)) ([74628fe](https://github.com/authup/authup/commit/74628fe7566e9789f46ac9f2ff2959fa51ce1b55))
* **deps:** bump nodemailer from 6.9.2 to 6.9.3 ([#1146](https://github.com/authup/authup/issues/1146)) ([b5f3e14](https://github.com/authup/authup/commit/b5f3e144b92073b6c9af6e82a2869b831d410b8d))
* **deps:** bump routup to v1.0.1 ([17bfa57](https://github.com/authup/authup/commit/17bfa57fb4a1004238a9b28ebfd7df98876da7b8))
* **deps:** bump smob to v1.4.0 ([8eefa83](https://github.com/authup/authup/commit/8eefa83a55271ad139dde2e0ccbacc8c937e6a4e))
* **deps:** bump typeorm-extension from 2.8.0 to 2.8.1 ([#1143](https://github.com/authup/authup/issues/1143)) ([27c9779](https://github.com/authup/authup/commit/27c97793ad21f0251aafd3ac9795cac8873a611d))


### Features

* implemented ilingo v3 ([5b0e632](https://github.com/authup/authup/commit/5b0e6321cd8b7569e1e92262014a8ffc00098d63))





# [0.36.0](https://github.com/authup/authup/compare/v0.35.0...v0.36.0) (2023-05-27)


### Bug Fixes

* add missing call for token created hook after token refresh ([ff31fe8](https://github.com/authup/authup/commit/ff31fe88804206b9ea84e6e24b9b55d5deb6af42))
* **deps:** bump winston from 3.8.2 to 3.9.0 ([#1132](https://github.com/authup/authup/issues/1132)) ([c08fa7e](https://github.com/authup/authup/commit/c08fa7ec8c9a2e0b5655e0a51b72ec2dcf667b17))
* dont't log requests to root api path ([164ae82](https://github.com/authup/authup/commit/164ae824cb393a0afd97ea70a6d131ced5e3729d))
* rename register-timer to set-timer ([77793bc](https://github.com/authup/authup/commit/77793bc961e4695520dd08187182238647aee2ba))


### Features

* cleanup and relocate auth store + set token max age for oauth2 grant types ([13643fd](https://github.com/authup/authup/commit/13643fd76e8c471f8d90b555c386041a34bcb2ff))
* refactor and optimized client response error token hook ([fae52c8](https://github.com/authup/authup/commit/fae52c8cfcc0aa563d6edd0702f3438ab76e6e5a))





# [0.35.0](https://github.com/authup/authup/compare/v0.34.0...v0.35.0) (2023-05-25)


### Bug Fixes

* update auth store after token creation ([697b3d5](https://github.com/authup/authup/commit/697b3d5806c84dbe31e65470378545044d956b20))


### Features

* add callback handler for token creator ([515bdee](https://github.com/authup/authup/commit/515bdee793de15a8bbe8ad97a1f1db483984383a))
* allow disabling token refresh timer + add token creation hook option ([d042e62](https://github.com/authup/authup/commit/d042e62829241df930ef43141aa8dc6dae46408d))





# [0.34.0](https://github.com/authup/authup/compare/v0.33.0...v0.34.0) (2023-05-24)


### Bug Fixes

* better token error handling + token error verification ([e323e83](https://github.com/authup/authup/commit/e323e834b2f4f695fd9b0c8dc1629d6a4b265ebe))
* **deps:** bump @types/jsonwebtoken from 9.0.1 to 9.0.2 ([#1061](https://github.com/authup/authup/issues/1061)) ([d00c6e3](https://github.com/authup/authup/commit/d00c6e3b62aa15a52fa59924e57d388aa0d72fdf))
* **deps:** bump @types/nodemailer from 6.4.7 to 6.4.8 ([#1121](https://github.com/authup/authup/issues/1121)) ([cde3a49](https://github.com/authup/authup/commit/cde3a492386b32d2c63b61cae5a3605e0616a58d))
* **deps:** bump @vue-layout/* packages ([f7d6e4c](https://github.com/authup/authup/commit/f7d6e4c8089c693e9d6a86ed8e19725bf8c78a42))
* **deps:** bump better-sqlite3 from 8.3.0 to 8.4.0 ([#1116](https://github.com/authup/authup/issues/1116)) ([42d832f](https://github.com/authup/authup/commit/42d832f7424a2ae870ddaa0be7881a356cb0716b))
* **deps:** bump jose from 4.14.0 to 4.14.1 ([#1054](https://github.com/authup/authup/issues/1054)) ([d4dbf38](https://github.com/authup/authup/commit/d4dbf3800d71fc7200a4be482a1049779bb9bd80))
* **deps:** bump jose from 4.14.1 to 4.14.3 ([#1064](https://github.com/authup/authup/issues/1064)) ([7df18eb](https://github.com/authup/authup/commit/7df18ebd81e01d570802ac748858b5c3be6d61c0))
* **deps:** bump jose from 4.14.3 to 4.14.4 ([#1071](https://github.com/authup/authup/issues/1071)) ([3d0a73d](https://github.com/authup/authup/commit/3d0a73d701f9dd9a91130041c780fe17a818f96e))
* **deps:** bump pg from 8.10.0 to 8.11.0 ([#1098](https://github.com/authup/authup/issues/1098)) ([f82a76c](https://github.com/authup/authup/commit/f82a76c8b47bacfc77845032fea1fa5dc237a992))
* **deps:** bump routup to v1.0.0 ([b3e1686](https://github.com/authup/authup/commit/b3e1686041d14ea852d8f7d5c3df6e44d25bd7d4))
* **deps:** bump routup to v1.0.0-alpha ([c6a3d11](https://github.com/authup/authup/commit/c6a3d11fae1c1af1c88b4214caa54a898772c51f))
* **deps:** bump smob from 1.0.0 to 1.1.1 ([#1122](https://github.com/authup/authup/issues/1122)) ([0dc6667](https://github.com/authup/authup/commit/0dc66679c7b65c37f2eec5793727d00b0c35c013))
* **deps:** bump socket.io-parser from 4.2.2 to 4.2.3 ([#1129](https://github.com/authup/authup/issues/1129)) ([3757a7a](https://github.com/authup/authup/commit/3757a7a913cc4b6822dde4c4115a0667713ed07e))
* **deps:** bump typeorm from 0.3.15 to 0.3.16 ([#1088](https://github.com/authup/authup/issues/1088)) ([a7fc5a8](https://github.com/authup/authup/commit/a7fc5a86b615bd62fdea073ca1854695d9a568d9))
* **deps:** bump typeorm-extension from 2.7.0 to 2.8.0 ([#1069](https://github.com/authup/authup/issues/1069)) ([715cfa6](https://github.com/authup/authup/commit/715cfa6c1b55c7165167ee3c5642ba1e130191af))
* **deps:** bump yaml from 2.2.1 to 2.2.2 ([#1056](https://github.com/authup/authup/issues/1056)) ([61427c2](https://github.com/authup/authup/commit/61427c22a66f7023910d8d378fcfccad944a9538))
* **deps:** bump yargs from 17.7.1 to 17.7.2 ([#1065](https://github.com/authup/authup/issues/1065)) ([78f22dd](https://github.com/authup/authup/commit/78f22dd3bfba919fd84343a169485db3e1f1fd42))
* minor fix for css styling of robot-form ([0d379f4](https://github.com/authup/authup/commit/0d379f41e2828f22072d32f65cfb7e63d7280edb))
* **server-adapter:** cookie middleware extraction for http middleware ([d990176](https://github.com/authup/authup/commit/d990176ff9f39ae6c288acc142a23864098250cb))
* update current user on settings page ([91aa2df](https://github.com/authup/authup/commit/91aa2dfba1569f9d5a96c4cd14540de2542c6138))


### Features

* better error messages for refresh_token grant type ([13f3239](https://github.com/authup/authup/commit/13f32392cf234c81b3d1c787f0c586036e2c4968))
* guarantee that refresh token max age is bigger than access token age ([2b72207](https://github.com/authup/authup/commit/2b72207e897787399009a49061621703cac563b1))
* switch to bootstrap table view for domain lists ([2faa379](https://github.com/authup/authup/commit/2faa37910732863bb730588b6e3334c27b353c16))
* use bootstrap toasts instead of vue-toastification ([50ee4ef](https://github.com/authup/authup/commit/50ee4efe93efa29903185ba864ce654647aed422))





# [0.33.0](https://github.com/authup/authup/compare/v0.32.3...v0.33.0) (2023-04-24)


### Bug Fixes

* bump express-validator to v7 ([f88a039](https://github.com/authup/authup/commit/f88a0392625fe1aa64f5ce8454eee337c7d2dd7a))
* **deps:** bump better-sqlite3 from 8.2.0 to 8.3.0 ([#1015](https://github.com/authup/authup/issues/1015)) ([d80cb17](https://github.com/authup/authup/commit/d80cb17ea9624db06e56ad8affe59c1c306cc3f8))
* **deps:** bump consola from 2.15.3 to 3.0.1 ([#1023](https://github.com/authup/authup/issues/1023)) ([0d6274d](https://github.com/authup/authup/commit/0d6274d3d4bdffa57c1774ff43268db3765e7fc3))
* **deps:** bump consola from 3.0.1 to 3.0.2 ([#1025](https://github.com/authup/authup/issues/1025)) ([f1361ae](https://github.com/authup/authup/commit/f1361aeb2a785d2c501a3dd9b0546486d9b3dd07))
* **deps:** bump consola from 3.0.2 to 3.1.0 ([#1037](https://github.com/authup/authup/issues/1037)) ([c44c12e](https://github.com/authup/authup/commit/c44c12ee122dd17ddb3c0148712d6c4bda1521b1))
* **deps:** bump continu from 1.2.0 to 1.3.1 ([#1010](https://github.com/authup/authup/issues/1010)) ([21730dd](https://github.com/authup/authup/commit/21730dd64284198c6111f14f5cf31a55774d89fb))
* **deps:** bump jose from 4.13.1 to 4.13.2 ([#1020](https://github.com/authup/authup/issues/1020)) ([be852a3](https://github.com/authup/authup/commit/be852a3a5ae5aa3b88d16222c913569d2c01a09d))
* **deps:** bump jose from 4.13.2 to 4.14.0 ([#1027](https://github.com/authup/authup/issues/1027)) ([5098af6](https://github.com/authup/authup/commit/5098af623f18779aaf4d078f2b59a0acb8645f0e))
* **deps:** bump typeorm from 0.3.12 to 0.3.13 ([#1005](https://github.com/authup/authup/issues/1005)) ([1f636d3](https://github.com/authup/authup/commit/1f636d35ed53d89fe63dcc6bd6847f189f4bd1da))
* **deps:** bump typeorm from 0.3.13 to 0.3.14 ([#1016](https://github.com/authup/authup/issues/1016)) ([0330aec](https://github.com/authup/authup/commit/0330aec58ebf1c1001edeb94455c302e5db5ff4d))
* don't log metrics and root path ([4d4ca5c](https://github.com/authup/authup/commit/4d4ca5c351e88370360fc630f22c17220026e977))
* http client (error) hook implementation ([86ddd6c](https://github.com/authup/authup/commit/86ddd6c341a36ab37cf76844129552031618c926))
* page component typings ([b815cb6](https://github.com/authup/authup/commit/b815cb6359472c4247d1246a8c4fb7667d4e4bce))
* rename retry state tracker ([a233a61](https://github.com/authup/authup/commit/a233a6155f9f0fa5d29490a9b79bea7e0c88f221))
* typings for auth error check ([8a69037](https://github.com/authup/authup/commit/8a6903746e5c16d804df3c5d90de1360f82fcc89))


### Features

* bump hapic to v2.0.0-alpha.x (axios -> fetch) ([#1036](https://github.com/authup/authup/issues/1036)) ([e09c919](https://github.com/authup/authup/commit/e09c91930d65b41725e5b1c4e26c21f9a5c67342))
* implemented hapic v2.0 alpha ([f1da95b](https://github.com/authup/authup/commit/f1da95bb3be6d1fe0cfd195a44a63c5a8d60dc6c))





## [0.32.3](https://github.com/authup/authup/compare/v0.32.2...v0.32.3) (2023-04-05)


### Bug Fixes

* set interceptor mounted flag on existing creator ([47f8838](https://github.com/authup/authup/commit/47f8838efda4d4a8ef1f499a7dfbc0deda4bd81d))





## [0.32.2](https://github.com/authup/authup/compare/v0.32.1...v0.32.2) (2023-04-05)


### Bug Fixes

* restructured ability-manger in module + force version bump ([b59f485](https://github.com/authup/authup/commit/b59f485eec2e6e7ddf6d771f7eaad0f1ef46b569))





## [0.32.1](https://github.com/authup/authup/compare/v0.32.0...v0.32.1) (2023-04-04)


### Bug Fixes

* adjusted http interceptors ([57bedf7](https://github.com/authup/authup/commit/57bedf7bb4d8d98bec8445420624dbff580f26b1))
* **deps:** bump vue-layout to v1.1.0 ([ff7f4d1](https://github.com/authup/authup/commit/ff7f4d15d101cb9b3c33e1b67f7764a4e09df110))
* don't keep proxy agent alive by default ([e4d57b3](https://github.com/authup/authup/commit/e4d57b33a77daf86529b794a468ac6cbe44cc191))
* non async response interceptor should throw error ([e7f22d6](https://github.com/authup/authup/commit/e7f22d6c6dab07f7f9a916393c297c14c8ffc010))
* remove metrics controller ([d6b82bc](https://github.com/authup/authup/commit/d6b82bc408cb89da1fed30426901b5ef21fa7de8))





# [0.32.0](https://github.com/authup/authup/compare/v0.31.3...v0.32.0) (2023-04-03)


### Bug Fixes

* token verfifier redis cache ([ad396dc](https://github.com/authup/authup/commit/ad396dc084d4657a9a4a22d8c8ee9714de38f363))


### Features

* move token-creator & http interceptor to global core package ([3824f86](https://github.com/authup/authup/commit/3824f86799003de2f4fc3602522fcbfbafa4d13c))
* use core token-interceptor for ui token session management ([33ec6e0](https://github.com/authup/authup/commit/33ec6e0ad835c7203d3d848f074a2210507e0ad3))





## [0.31.3](https://github.com/authup/authup/compare/v0.31.2...v0.31.3) (2023-04-03)


### Bug Fixes

* config database option validator ([82afa32](https://github.com/authup/authup/commit/82afa3286fbd84cce8a9bdedc29fcbb84aa92962))





## [0.31.2](https://github.com/authup/authup/compare/v0.31.1...v0.31.2) (2023-04-03)


### Bug Fixes

* mounting of http interceptor + better struct for verification data ([0ee1e40](https://github.com/authup/authup/commit/0ee1e403752e5576ae2d22a1b840ce05ae452c10))





## [0.31.1](https://github.com/authup/authup/compare/v0.31.0...v0.31.1) (2023-04-03)


### Bug Fixes

* define userinfo endpoint for userinfo api ([106a3f7](https://github.com/authup/authup/commit/106a3f703c6b49523418a89e816f8501e00be3db))





# [0.31.0](https://github.com/authup/authup/compare/v0.30.1...v0.31.0) (2023-04-03)


### Features

* add user-info domain api + renamed useHTTPClientAPI ([22d1cdc](https://github.com/authup/authup/commit/22d1cdce326bb7a0549d28b04b0157840b3f7623))





## [0.30.1](https://github.com/authup/authup/compare/v0.30.0...v0.30.1) (2023-04-03)


### Bug Fixes

* cleanup exports and bump min peer version ([a639294](https://github.com/authup/authup/commit/a639294b906b2c3e9358ab08223929acb7950fcf))





# [0.30.0](https://github.com/authup/authup/compare/v0.29.0...v0.30.0) (2023-04-03)


### Bug Fixes

* move vault configuration to server-api package from server-core package ([4783326](https://github.com/authup/authup/commit/4783326e2c0984bb10615d25d76e5cddff936e94))


### Features

* add socket/req object as argument to token verifier handler ([9ebd664](https://github.com/authup/authup/commit/9ebd664f3803ee93dfdc07087b922e8236c39167))
* allow passing token-verfiier instance beside option variant ([831e16a](https://github.com/authup/authup/commit/831e16a9f3a67fa6f13500e885e7c72565f67614))
* complete refactor of adapter + new sub-modules craetor, interceptor & verifier ([9940741](https://github.com/authup/authup/commit/99407417372c0b73ab6bbdfe84d9af177c8785e2))
* decouple http middleware from routup ([759529e](https://github.com/authup/authup/commit/759529ea9ddd5a20fdabf77eab5c84dbc02ef8b7))
* support interceptor mounting on client and client driver instance ([a26dafe](https://github.com/authup/authup/commit/a26dafe8174cf9c6de0bf85c294baf8e32d6261a))





# [0.29.0](https://github.com/authup/authup/compare/v0.28.0...v0.29.0) (2023-04-01)


### Bug Fixes

* adjusted README.md, package.json files + renamed http client ([fcf8423](https://github.com/authup/authup/commit/fcf8423228fa73aa2a61ba8de96c0af51dfb0c5f))
* better naming for checking database options ([b2ff0a2](https://github.com/authup/authup/commit/b2ff0a28173fd79d87cbd2e303fa2438e08ff2fb))
* enhance executorÂ ([31624c1](https://github.com/authup/authup/commit/31624c1a6a91c33a0fd29a9e33f451e9133d5cf1))
* vue-layout preset usage for production build ([368a6c7](https://github.com/authup/authup/commit/368a6c774ccade2fcf7c51bc912b1262174c51ae))


### Features

* add realm & identity-provider selection to login form ([5678540](https://github.com/authup/authup/commit/5678540256e7fb59443548e5fe4eb4705d9346f1))
* renamed database-option to db-option ([ce9c2a1](https://github.com/authup/authup/commit/ce9c2a1e793637a392725996ebedacd96d2507ad))
* restructured & renamed packages ([dd587a8](https://github.com/authup/authup/commit/dd587a8102f375b56c6c64cd09b13c92b624a6e1))





# [0.28.0](https://github.com/authup/authup/compare/v0.27.0...v0.28.0) (2023-04-01)


### Bug Fixes

* resolve http controller path for swagger generation ([4612cc5](https://github.com/authup/authup/commit/4612cc55e4531d9b4fe3d1e91302802304f13cc4))


### Features

* allow database configuration via config file ([077cd11](https://github.com/authup/authup/commit/077cd1124f37c116cedd1dbafb4d9d685c8a7e50))





# [0.27.0](https://github.com/authup/authup/compare/v0.26.0...v0.27.0) (2023-04-01)


### Bug Fixes

* cleanup cli commands ([8a37cde](https://github.com/authup/authup/commit/8a37cdeb3b4eba59dc006e4336ad0f1a55133ffc))
* **deps:** bump redis-extension from 1.2.3 to 1.3.0 ([#992](https://github.com/authup/authup/issues/992)) ([2ac9ede](https://github.com/authup/authup/commit/2ac9ede2692c9d3cd19a2c7fc201f993b5a35cce))
* swagger look-up path for controllers ([ea75c11](https://github.com/authup/authup/commit/ea75c11363785365a03f1fba5c1015322c53b927))
* use constants for env variable names ([3122698](https://github.com/authup/authup/commit/3122698db86acc38729e74bd0bc546c41201882f))


### Features

* extended README.md file ([aefa1ee](https://github.com/authup/authup/commit/aefa1eed4267cf1667198ac08c3a1e4036e0d2ce))
* load config file for frontend ui if present ([7776430](https://github.com/authup/authup/commit/7776430963d6bc469887fa1261ccc8b65c49fd0a))
* load config file from cwd and writable directory ([54f324d](https://github.com/authup/authup/commit/54f324dbf51716461c7b164a15a4f06b2a36a8d5))





# [0.26.0](https://github.com/authup/authup/compare/v0.25.0...v0.26.0) (2023-03-30)


### Features

* explicit exclude sub folder files for docker build ([79cffe1](https://github.com/authup/authup/commit/79cffe151d27449420c9c6122206b0540c536acb))





# [0.25.0](https://github.com/authup/authup/compare/v0.24.0...v0.25.0) (2023-03-30)


### Bug Fixes

* move domains from database sub-folder to root src folder ([5e0d9b6](https://github.com/authup/authup/commit/5e0d9b610994f8ce83568cfd5d3df461d22e422c))
* remove console.log for config logging ([e39eb34](https://github.com/authup/authup/commit/e39eb34e8e3e23f8e17bb8ebfeded5327612c709))
* remove vault client check ([d336145](https://github.com/authup/authup/commit/d336145e69613de98852957ef3c366a535557ca5))


### Features

* add https proxy tunnel support for identity providers ([6a7b859](https://github.com/authup/authup/commit/6a7b859e31bad6f10dd2fde22cdc6dfab3da2285))





# [0.24.0](https://github.com/authup/authup/compare/v0.23.1...v0.24.0) (2023-03-30)


### Bug Fixes

* only start api application by default in docker container ([3e41a4e](https://github.com/authup/authup/commit/3e41a4ebd8ee1b6231d6944bbc716f452a2009e9))


### Features

* dynamic config getter for public-url ([5e17b05](https://github.com/authup/authup/commit/5e17b055c4e29fe43938fda90e465eccc7157d8e))





## [0.23.1](https://github.com/authup/authup/compare/v0.23.0...v0.23.1) (2023-03-30)


### Bug Fixes

* config validation for redis-,smtp- & vault-config ([19dd368](https://github.com/authup/authup/commit/19dd368cc833a1592676df2e1387f0699cc72f0f))





# [0.23.0](https://github.com/authup/authup/compare/v0.22.0...v0.23.0) (2023-03-30)


### Bug Fixes

* adjusted docker entrypoint + typos + cli start script ([f63296c](https://github.com/authup/authup/commit/f63296ce48e3ce20d8926fd5473f140379b89a02))
* **deps:** bump continu from 1.0.5 to 1.1.0 ([#982](https://github.com/authup/authup/issues/982)) ([91d901d](https://github.com/authup/authup/commit/91d901d1200cacf140dbda407813db5ad1a1f2b3))
* **deps:** bump locter from 1.0.10 to 1.1.0 ([#971](https://github.com/authup/authup/issues/971)) ([f778cd2](https://github.com/authup/authup/commit/f778cd2c240484ac4cef357db93afd3a7b02514e))
* set ability-manager also for unauthorized reuests/sockets ([99b0662](https://github.com/authup/authup/commit/99b0662190f0d0991f44a5551e7f5617fa267700))


### Features

* add support for docker image to run multiple apps simultanously ([dfae6d5](https://github.com/authup/authup/commit/dfae6d54539a2d14620eed4d97aec56f6817b50f))
* cleanup cli package & prefix node built-in module imports ([1ee269f](https://github.com/authup/authup/commit/1ee269f085e221f078adfa51cf87ddabde05715f))
* merge server-{,http,database} packages ([488070d](https://github.com/authup/authup/commit/488070dd73f8ba972fc5e01433b935d48e77bccd))
* refactored config loading & building ([07de0e3](https://github.com/authup/authup/commit/07de0e38542f2760d00ba3df77c76d673f76b6a8))
* replaced manual proxy parsing with http client detection ([18c3751](https://github.com/authup/authup/commit/18c3751f3dd3defdd9dfa34ec41522ac14d3b476))





# [0.22.0](https://github.com/Tada5hi/authup/compare/v0.21.0...v0.22.0) (2023-03-26)


### Bug Fixes

* removed redundancy for applying token introspection response ([4ca4e18](https://github.com/Tada5hi/authup/commit/4ca4e18f3944e866e549e7bde78a9ffb55e0889d))


### Features

* add oauth2 client as http-client property ([ab5c260](https://github.com/Tada5hi/authup/commit/ab5c2609fe7e88b63bc75b4077846f1875ba0571))





# [0.21.0](https://github.com/Tada5hi/authup/compare/v0.20.1...v0.21.0) (2023-03-26)


### Bug Fixes

* allow robot integrity check by name ([d6b2a6e](https://github.com/Tada5hi/authup/commit/d6b2a6e82de12c4c4980f0bd5db498398c86e9e7))
* remove logging for successfull token access ([a71dc3f](https://github.com/Tada5hi/authup/commit/a71dc3f78fd7c797ebdca17a17a259b9dbe34168))
* replaced migration generate utility fn ([73a6e4a](https://github.com/Tada5hi/authup/commit/73a6e4a83092009956540a9e165bdcfbfcd12d38))
* soft robot credentials save on startup ([0340dd5](https://github.com/Tada5hi/authup/commit/0340dd50f7144247dc8aed22b0f02b859db2c603))


### Features

* explicit endpoint to check/reset robot account ([4fe0e14](https://github.com/Tada5hi/authup/commit/4fe0e14e5b824506fa0231ab6dc7fb308bcbe2ae))





## [0.20.1](https://github.com/Tada5hi/authup/compare/v0.20.0...v0.20.1) (2023-03-25)


### Bug Fixes

* **deps:** bump vitepress from 1.0.0-alpha.60 to 1.0.0-alpha.61 ([#951](https://github.com/Tada5hi/authup/issues/951)) ([aa54c6c](https://github.com/Tada5hi/authup/commit/aa54c6ccbab057665cd29ba6df0dfcd600cb9045))
* vault config load/apply + error middleware + http user-attributes reading ([411df82](https://github.com/Tada5hi/authup/commit/411df829439a0a52982a78048858e80ae745ebe7))





# [0.20.0](https://github.com/Tada5hi/authup/compare/v0.19.0...v0.20.0) (2023-03-24)


### Features

* add integrity check for robot credentials in vault ([5700c80](https://github.com/Tada5hi/authup/commit/5700c8077329ca7a01b0f4dee919c7749b304e60))





# [0.19.0](https://github.com/Tada5hi/authup/compare/v0.18.0...v0.19.0) (2023-03-23)


### Features

* extend socket-/http-request env context ([56819ea](https://github.com/Tada5hi/authup/commit/56819ea4bd0fe79806fc0f620b384af1b497d851))





# [0.18.0](https://github.com/Tada5hi/authup/compare/v0.17.2...v0.18.0) (2023-03-23)


### Bug Fixes

* **deps:** bump @ebec/http from 0.2.2 to 1.0.0 ([#953](https://github.com/Tada5hi/authup/issues/953)) ([4786cd2](https://github.com/Tada5hi/authup/commit/4786cd2e7a8d849b6ec6a164c4bfc1c48e469851))
* **deps:** bump smob from 0.1.0 to 1.0.0 ([#952](https://github.com/Tada5hi/authup/issues/952)) ([363fc69](https://github.com/Tada5hi/authup/commit/363fc6902848a16982626f4fbe3cb7e5c1afd053))


### Features

* add realm- & scope-subscriber + minor cleanup + enum referencing ([dc4f1ba](https://github.com/Tada5hi/authup/commit/dc4f1ba167259f6c7c8f381a8569fe255646e85d))
* add vault client support for robot credentials syncing ([66b2300](https://github.com/Tada5hi/authup/commit/66b23007fdfa4221c48f2d66f5524fdb5b4f3ed3))
* adjusted lerna config ([215b3a5](https://github.com/Tada5hi/authup/commit/215b3a55916d8c923f404434985a68826650c136))
* broadcast redis events for changed domain entities ([4b2fd5e](https://github.com/Tada5hi/authup/commit/4b2fd5e44aa94a2d43d6c8b872bb0f298e0b4da2))
* support direct & socket domain events ([b9225c2](https://github.com/Tada5hi/authup/commit/b9225c21b5437ced4c6d0a02b75de3f35f1f64a3))





## [0.17.2](https://github.com/Tada5hi/authup/compare/v0.17.1...v0.17.2) (2023-03-20)


### Bug Fixes

* authorization for provider - role mapping ([00d518c](https://github.com/Tada5hi/authup/commit/00d518c510734095222bc53e507cb193ec1ffc28))
* **deps:** bump hapci/** to v1.3.0 ([2e7068a](https://github.com/Tada5hi/authup/commit/2e7068ae21e5a4d0dae0b9cde90a308efbc247de))
* **deps:** bump locter from 1.0.9 to 1.0.10 ([#948](https://github.com/Tada5hi/authup/issues/948)) ([72db115](https://github.com/Tada5hi/authup/commit/72db11574cf1ee630f476bdc5a952dcc2cbaec41))
* **deps:** bump vitepress from 1.0.0-alpha.56 to 1.0.0-alpha.58 ([#938](https://github.com/Tada5hi/authup/issues/938)) ([3444bcb](https://github.com/Tada5hi/authup/commit/3444bcb982156713dfd5604b0a53c9d8eb6a7e1e))
* **deps:** bump vitepress from 1.0.0-alpha.58 to 1.0.0-alpha.60 ([#940](https://github.com/Tada5hi/authup/issues/940)) ([860557b](https://github.com/Tada5hi/authup/commit/860557b2c05f543cff34436e7ce8f447c954ba81))
* revert oauth2 protocol validation changes ([7d8fd5d](https://github.com/Tada5hi/authup/commit/7d8fd5d5ed42db07fefc656be7a38bbc843b59d2))





## [0.17.1](https://github.com/Tada5hi/authup/compare/v0.17.0...v0.17.1) (2023-03-14)


### Bug Fixes

* **deps:** bump better-sqlite3 from 8.1.0 to 8.2.0 ([#935](https://github.com/Tada5hi/authup/issues/935)) ([29908c1](https://github.com/Tada5hi/authup/commit/29908c1b774c951166232940add6933700103b90))
* **deps:** bump pg from 8.9.0 to 8.10.0 ([#934](https://github.com/Tada5hi/authup/issues/934)) ([3e5d857](https://github.com/Tada5hi/authup/commit/3e5d857888f071e6bf5593872b94ff107df7fd66))
* **deps:** bump typeorm-extension from 2.5.2 to 2.5.3 ([#927](https://github.com/Tada5hi/authup/issues/927)) ([376e352](https://github.com/Tada5hi/authup/commit/376e352a62c711416776bd301b39e10390f9184e))
* **deps:** bump typeorm-extension from 2.5.3 to 2.5.4 ([#929](https://github.com/Tada5hi/authup/issues/929)) ([7884f49](https://github.com/Tada5hi/authup/commit/7884f49b200ad90717ed165ab817e569dfaa6b25))
* **deps:** bump typeorm-extension to v2.5.3 ([abe31c1](https://github.com/Tada5hi/authup/commit/abe31c18fbd2ecf61a7681f0812fea7b23560f44))
* **deps:** bump vitepress from 1.0.0-alpha.48 to 1.0.0-alpha.56 ([#933](https://github.com/Tada5hi/authup/issues/933)) ([3726cc4](https://github.com/Tada5hi/authup/commit/3726cc49875292646dacff52634c96772e3145d5))





# [0.17.0](https://github.com/Tada5hi/authup/compare/v0.16.0...v0.17.0) (2023-03-13)


### Bug Fixes

* **deps:** bump @routup/* dependencies ([c1e8cfe](https://github.com/Tada5hi/authup/commit/c1e8cfed9ac8a16d11682640446b6ad6654abbdc))
* **deps:** bump zod from 3.20.6 to 3.21.4 ([#919](https://github.com/Tada5hi/authup/issues/919)) ([e24a5ef](https://github.com/Tada5hi/authup/commit/e24a5efcc7201aba2b747d9352927a648d88e954))
* hash user password on registration endpoint ([bd3bc18](https://github.com/Tada5hi/authup/commit/bd3bc1855e735e7d36d742952fe14b8d43bb1609))


### Features

* enhanced swagger generation ([50a171f](https://github.com/Tada5hi/authup/commit/50a171f5b070f1faf22ee5a81913c908365571c7))





# [0.16.0](https://github.com/Tada5hi/authup/compare/v0.15.4...v0.16.0) (2023-02-28)


### Bug Fixes

* **deps:** bump locter from 1.0.5 to 1.0.6 ([#902](https://github.com/Tada5hi/authup/issues/902)) ([626900d](https://github.com/Tada5hi/authup/commit/626900de382aca81ed6f25e14fca693bffeeb28b))
* **deps:** bump vitepress from 1.0.0-alpha.47 to 1.0.0-alpha.48 ([#897](https://github.com/Tada5hi/authup/issues/897)) ([e2cd682](https://github.com/Tada5hi/authup/commit/e2cd6823c3aa52c6cbf56de58ae47919b8a3a5af))


### Features

* add support to lock/unlock user name manipulation ([2fcb2c5](https://github.com/Tada5hi/authup/commit/2fcb2c5e50c62aa727b0109dd1dff0647b699231))
* **server-adapter:** restructured package structure + enhanced logging ([f01ad48](https://github.com/Tada5hi/authup/commit/f01ad4872031199bd90e85f4913c3a0d01a29722))





## [0.15.4](https://github.com/Tada5hi/authup/compare/v0.15.3...v0.15.4) (2023-02-24)


### Bug Fixes

* allow dot character in user name ([e430b4c](https://github.com/Tada5hi/authup/commit/e430b4c6b54dee72303bceeb33dcc8692abde73a))
* allow filtering by drop_able realm attribute ([5cd20a3](https://github.com/Tada5hi/authup/commit/5cd20a39f63436c6550f2b1fb1e50c7cb862798e))





## [0.15.3](https://github.com/Tada5hi/authup/compare/v0.15.2...v0.15.3) (2023-02-23)


### Bug Fixes

* bum routup dependencies + adjusted docs url in star command ([cdd7f5a](https://github.com/Tada5hi/authup/commit/cdd7f5acde04155d3fd4d694583265bd5724dcba))
* **deps:** bump @ucast/mongo2js from 1.3.3 to 1.3.4 ([#863](https://github.com/Tada5hi/authup/issues/863)) ([baee990](https://github.com/Tada5hi/authup/commit/baee990378cc7fe613042ebae66b80f0139fe713))
* **deps:** bump express-validator from 6.14.3 to 6.15.0 ([#864](https://github.com/Tada5hi/authup/issues/864)) ([653f5d7](https://github.com/Tada5hi/authup/commit/653f5d7c4fd3bbe5b2f5b32d0a824cc340fed43b))
* **deps:** bump locter from 1.0.1 to 1.0.2 ([#853](https://github.com/Tada5hi/authup/issues/853)) ([e593ab6](https://github.com/Tada5hi/authup/commit/e593ab6df880294d1d1d4ed81d05910ac20be706))
* **deps:** bump locter from 1.0.3 to 1.0.5 ([#867](https://github.com/Tada5hi/authup/issues/867)) ([37de7af](https://github.com/Tada5hi/authup/commit/37de7afb2eccaf830f8567959f34e91492fe3689))
* **deps:** bump typeorm-extension from 2.5.0 to 2.5.2 ([#884](https://github.com/Tada5hi/authup/issues/884)) ([7689aea](https://github.com/Tada5hi/authup/commit/7689aea07323e28fac7f97e692fb3c11e44d3f80))
* **deps:** bump undici from 5.16.0 to 5.19.1 ([#866](https://github.com/Tada5hi/authup/issues/866)) ([bfcfaa5](https://github.com/Tada5hi/authup/commit/bfcfaa53ae26d4da012d2d29a46b9f76f34ee801))
* **deps:** bump vitepress from 1.0.0-alpha.45 to 1.0.0-alpha.46 ([#852](https://github.com/Tada5hi/authup/issues/852)) ([32bc42d](https://github.com/Tada5hi/authup/commit/32bc42d359788f0b89bcad439ca3ffa7640d1745))
* **deps:** bump vitepress from 1.0.0-alpha.46 to 1.0.0-alpha.47 ([#882](https://github.com/Tada5hi/authup/issues/882)) ([535ddbb](https://github.com/Tada5hi/authup/commit/535ddbb8dcf4c894f6907d8bfc7cf39c4129a5ab))
* **deps:** bump yargs from 17.6.2 to 17.7.0 ([#874](https://github.com/Tada5hi/authup/issues/874)) ([e1aa371](https://github.com/Tada5hi/authup/commit/e1aa371bf833a255dfa07da33ce88fd7f1ee61ff))
* **deps:** bump yargs from 17.7.0 to 17.7.1 ([#890](https://github.com/Tada5hi/authup/issues/890)) ([2035fd8](https://github.com/Tada5hi/authup/commit/2035fd8fe70bbbdc4fbf51f646b9c5344790cf4b))
* **deps:** updated typeorm-extension ([fc74f4a](https://github.com/Tada5hi/authup/commit/fc74f4ad114904a74d0e46416aa564306ec32082))





## [0.15.2](https://github.com/Tada5hi/authup/compare/v0.15.1...v0.15.2) (2023-02-14)


### Bug Fixes

* **deps:** bump zod from 3.20.2 to 3.20.6 ([#843](https://github.com/Tada5hi/authup/issues/843)) ([b94e056](https://github.com/Tada5hi/authup/commit/b94e056c8d4fe100845bb446019da381a61322e5))
* **server-database:** readable/writable query resources ([a542df1](https://github.com/Tada5hi/authup/commit/a542df174c9810766a5463099ca313c8c7f8d966))





## [0.15.1](https://github.com/Tada5hi/authup/compare/v0.15.0...v0.15.1) (2023-02-08)


### Bug Fixes

* **deps:** bump better-sqlite3 from 8.0.1 to 8.1.0 ([#837](https://github.com/Tada5hi/authup/issues/837)) ([74879e9](https://github.com/Tada5hi/authup/commit/74879e9d69c49bc5dbc14ae69d5022d9ac955d0d))
* **deps:** bump typeorm from 0.3.11 to 0.3.12 ([#838](https://github.com/Tada5hi/authup/issues/838)) ([ead58dd](https://github.com/Tada5hi/authup/commit/ead58dd35f18659d7a2df6f244d40919ec78b167))
* restructured middlewares + increased allowed requests per windwoMs ([ed62026](https://github.com/Tada5hi/authup/commit/ed62026d06ad30220066ccc3947d477d6e2053af))





# [0.15.0](https://github.com/Tada5hi/authup/compare/v0.14.1...v0.15.0) (2023-02-07)


### Bug Fixes

* **deps:** bump locter from 0.8.0 to 0.8.2 ([#813](https://github.com/Tada5hi/authup/issues/813)) ([719de90](https://github.com/Tada5hi/authup/commit/719de90521c4878714fed3b2911e2c94d0a0872a))
* **deps:** bump locter to v1 ([bcd53ac](https://github.com/Tada5hi/authup/commit/bcd53acad4a9591a2aa1f7676d6baa4d4416bef5))
* **deps:** bump redis-extension from 1.2.2 to 1.2.3 ([#824](https://github.com/Tada5hi/authup/issues/824)) ([914fe7e](https://github.com/Tada5hi/authup/commit/914fe7e6c72989eeaf4c5b0134e419340c5c964a))
* **deps:** bump vitepress from 1.0.0-alpha.43 to 1.0.0-alpha.45 ([#811](https://github.com/Tada5hi/authup/issues/811)) ([539abca](https://github.com/Tada5hi/authup/commit/539abca2a05e56d93444b3f4fadd3283ac02dc4f))
* **deps:** bump vue from 3.2.45 to 3.2.47 ([#825](https://github.com/Tada5hi/authup/issues/825)) ([69d44a6](https://github.com/Tada5hi/authup/commit/69d44a62684e980225cb5c416d4ccb4d5e5f902d))
* oauth2 code flow with open-id or access-token response type ([0ccb3e5](https://github.com/Tada5hi/authup/commit/0ccb3e5c0a1c869eb2235101e4d98445f77c3b0a))
* **server-database:** use default database options as fallback ([3fdc229](https://github.com/Tada5hi/authup/commit/3fdc2298d161324459bca957b7d3a227776728a6))


### Features

* error response payload builder ([7c92967](https://github.com/Tada5hi/authup/commit/7c92967f1c3fa1fb706927626d286cbb50a5846e))
* renamed process env handling ([4fbdef2](https://github.com/Tada5hi/authup/commit/4fbdef2a661948969a8bfad5bfced5a4289ed465))
* **server-http:** restructured & optimized oauth2 sub module ([8d8802d](https://github.com/Tada5hi/authup/commit/8d8802d002616880e289b9eacc3ad60df5d3e2b6))





## [0.14.1](https://github.com/Tada5hi/authup/compare/v0.14.0...v0.14.1) (2023-01-30)


### Bug Fixes

* **server:** bump locter dependency ([d0d0ad2](https://github.com/Tada5hi/authup/commit/d0d0ad2ea29c7d6ab0a64beb37835f4df40afde5))
* **server:** saving seeder result on setup command ([d75f9ba](https://github.com/Tada5hi/authup/commit/d75f9ba82a76d07f3d337d45ca8877f41c3c810d))





# [0.14.0](https://github.com/Tada5hi/authup/compare/v0.13.0...v0.14.0) (2023-01-29)


### Features

* minor code cleanup + fixed redis caching strategy ([a5286b7](https://github.com/Tada5hi/authup/commit/a5286b716e6432bd872cda2e06def8f0c3ab9111))





# [0.13.0](https://github.com/Tada5hi/authup/compare/v0.12.1...v0.13.0) (2023-01-28)


### Features

* reverted server-* packages back to cjs to strange behaviour ([9cc9c36](https://github.com/Tada5hi/authup/commit/9cc9c360447b9ca39f04cda93ecb7e9eeb7966f7))





## [0.12.1](https://github.com/Tada5hi/authup/compare/v0.12.0...v0.12.1) (2023-01-28)


### Bug Fixes

* peer-dependency version + updated license information ([f693215](https://github.com/Tada5hi/authup/commit/f69321538afbd2923287209593cdebcedaa29637))





# [0.12.0](https://github.com/Tada5hi/authup/compare/v0.11.1...v0.12.0) (2023-01-28)


### Features

* use tsc for transpiling of decorator packages ([2c41385](https://github.com/Tada5hi/authup/commit/2c41385201f6555b0bacaf09af5ad9779ab2a6c5))





## [0.11.1](https://github.com/Tada5hi/authup/compare/v0.11.0...v0.11.1) (2023-01-27)


### Bug Fixes

* **deps:** bump ilingo to v2.2.1 ([eebc902](https://github.com/Tada5hi/authup/commit/eebc902495debf127679f8c2619deef00249b041))
* **deps:** bump nodemailer from 6.9.0 to 6.9.1 ([#808](https://github.com/Tada5hi/authup/issues/808)) ([bb240b3](https://github.com/Tada5hi/authup/commit/bb240b33d87fc1eeaab5ee55c1dc9f8a4da50bb4))
* **deps:** bump pg from 8.8.0 to 8.9.0 ([#807](https://github.com/Tada5hi/authup/issues/807)) ([9b607d6](https://github.com/Tada5hi/authup/commit/9b607d6c170fb79e35300c8e074a5cbac4353ec8))
* **deps:** updated dependencies ([b3d221c](https://github.com/Tada5hi/authup/commit/b3d221c862c4f4dbd0ccf018566ef00796fcd591))
* **server-http:** relative path resolving ([4f8d3e6](https://github.com/Tada5hi/authup/commit/4f8d3e60d69907d1982d0bd32b542512e10c3bdc))





# [0.11.0](https://github.com/Tada5hi/authup/compare/v0.10.1...v0.11.0) (2023-01-27)


### Bug Fixes

* **deps:** bump cookiejar from 2.1.3 to 2.1.4 ([#777](https://github.com/Tada5hi/authup/issues/777)) ([3aa1a41](https://github.com/Tada5hi/authup/commit/3aa1a414a971d3f13c28388df0c2ff0fc6fe71a9))
* **deps:** bump express-validator from 6.14.2 to 6.14.3 ([#772](https://github.com/Tada5hi/authup/issues/772)) ([632a942](https://github.com/Tada5hi/authup/commit/632a94288fa5f7017cf6e0731647c0517f4dc058))
* **deps:** bump rc9 from 2.0.0 to 2.0.1 ([#789](https://github.com/Tada5hi/authup/issues/789)) ([943df77](https://github.com/Tada5hi/authup/commit/943df77563c2d282ff1fc716179409fd41e30036))
* **deps:** bump redis-extension from 1.2.0 to 1.2.1 ([#795](https://github.com/Tada5hi/authup/issues/795)) ([17afd4e](https://github.com/Tada5hi/authup/commit/17afd4e3ffaaf4320d1f5847a91ef160a5acbafe))
* **deps:** updated nuxt to v3.1.1 ([8070cf0](https://github.com/Tada5hi/authup/commit/8070cf083b7efe2a21b4fd2e8106a612eaba5de4))
* prefix node module imports with node: ([e866876](https://github.com/Tada5hi/authup/commit/e866876f6a64f50946ca7fd9945fce0958ebd6d9))
* **ui:** add nav toggling + add additional nesting layer header/sidebar ([07ea051](https://github.com/Tada5hi/authup/commit/07ea051a5226a266699d1e849a21b6c5c85d0613))
* **vue:** replaced esbuild with swc core ([a59a667](https://github.com/Tada5hi/authup/commit/a59a667fb5ca580464703311b776159f91bbc91a))


### Features

* **ui:** add initial head meta tags ([536cb08](https://github.com/Tada5hi/authup/commit/536cb08fad8e887ec7b334d577dd40bfe685f310))





## [0.10.1](https://github.com/Tada5hi/authup/compare/v0.10.0...v0.10.1) (2023-01-23)


### Bug Fixes

* **deps:** bump vitepress from 1.0.0-alpha.38 to 1.0.0-alpha.40 ([#771](https://github.com/Tada5hi/authup/issues/771)) ([47b8f94](https://github.com/Tada5hi/authup/commit/47b8f944ea4b8d1062c2dec9986c0893a0d0849a))
* **deps:** reverted minimatch version to v5 ([7385d0d](https://github.com/Tada5hi/authup/commit/7385d0d25b729087000f81d2d04c2033f7464958))





# [0.10.0](https://github.com/Tada5hi/authup/compare/v0.9.0...v0.10.0) (2023-01-20)


### Features

* bump (peer-) dependency version ([f2faacb](https://github.com/Tada5hi/authup/commit/f2faacb0f19b81251bb063dd49a2d91539e4e39d))





# [0.9.0](https://github.com/Tada5hi/authup/compare/v0.8.0...v0.9.0) (2023-01-20)


### Bug Fixes

* **deps:** bump locter from 0.6.2 to 0.7.1 ([9e1d44b](https://github.com/Tada5hi/authup/commit/9e1d44b580826202f8e210c7e4f2e45531398b22))
* **deps:** bump minimatch from 5.1.2 to 6.1.5 ([#763](https://github.com/Tada5hi/authup/issues/763)) ([179226c](https://github.com/Tada5hi/authup/commit/179226cc1c312cc7c95c2fe1711164df15b1dfe1))
* **deps:** bump vitepress from 1.0.0-alpha.36 to 1.0.0-alpha.38 ([#757](https://github.com/Tada5hi/authup/issues/757)) ([327b220](https://github.com/Tada5hi/authup/commit/327b220512f789d014092274d34347b8fadd8d6d))
* **deps:** updated typeorm-extension ([3b0aee9](https://github.com/Tada5hi/authup/commit/3b0aee95c23fbe619b611f67c11f77832c2a582e))
* **server-common:** use logger for env loading error ([985bee9](https://github.com/Tada5hi/authup/commit/985bee9ae0842aa8c2583561fe971b04d5376d0c))


### Features

* lazy password grant + minor entity management ui guards ([127ec1c](https://github.com/Tada5hi/authup/commit/127ec1c13f108f2a032aba67dd3b662d35251dc7))
* **server-http:** increase max requests per minute ([9e82df4](https://github.com/Tada5hi/authup/commit/9e82df4399be7b295163a06694c6d147cf34dc33))
* **ui:** fix store usage + implemented realm state ([4384c55](https://github.com/Tada5hi/authup/commit/4384c55d66dcc7919df3508e4f96b5189cbc3a60))
* **ui:** implemented realm switching in admin area ([d902af7](https://github.com/Tada5hi/authup/commit/d902af78d85c270f75425eef01e191a1cc7504ac))





# [0.8.0](https://github.com/Tada5hi/authup/compare/v0.7.0...v0.8.0) (2023-01-16)


### Bug Fixes

* **deps:** bump @types/jsonwebtoken from 9.0.0 to 9.0.1 ([f2ef31c](https://github.com/Tada5hi/authup/commit/f2ef31c46eae74a9d8b8d219a3bcb418d2d48bb0))
* **deps:** bump continu from 1.0.4 to 1.0.5 ([069a816](https://github.com/Tada5hi/authup/commit/069a81689500f95d0e32542b9eb2e0493c18ce43))
* **deps:** bump nodemailer from 6.8.0 to 6.9.0 ([fb374e4](https://github.com/Tada5hi/authup/commit/fb374e42faa4443876c28a91ffd78b51d9276f5c))
* **deps:** bump smob from 0.0.6 to 0.0.7 ([535685c](https://github.com/Tada5hi/authup/commit/535685cfb55e58dfa88635d1f08c0e3909d417dd))
* **deps:** bump vitepress from 1.0.0-alpha.35 to 1.0.0-alpha.36 ([aeaf9f2](https://github.com/Tada5hi/authup/commit/aeaf9f2bdcf195fffa411c00632837fc7cba7a36))


### Features

* replaced ts-jest & partially rollup with swc ([bf2b1aa](https://github.com/Tada5hi/authup/commit/bf2b1aa7ed4f0ee9e63fabf0d1d38754bbfa3310))





# [0.7.0](https://github.com/Tada5hi/authup/compare/v0.6.3...v0.7.0) (2023-01-11)


### Bug Fixes

* **deps:** bump @routup/static from 0.2.1 to 0.4.0 ([3cd7461](https://github.com/Tada5hi/authup/commit/3cd7461fb0a36221c5db1e8d34ad9930a8cc1b68))
* **deps:** bump locter from 0.6.1 to 0.6.2 ([b50a892](https://github.com/Tada5hi/authup/commit/b50a892101f677a91d8661c1d74627310c8d54c6))
* **server-http:** expire date creation for authorization code ([07ba21a](https://github.com/Tada5hi/authup/commit/07ba21ae9227068b1618c65012f47ae2da0a616a))
* **server-http:** expire date creation for refresh token ([3cd443c](https://github.com/Tada5hi/authup/commit/3cd443c559c45d901c613e946470dd4aabb3a916))


### Features

* unified entity columns for sqlite, mysql & postgres ([f379caa](https://github.com/Tada5hi/authup/commit/f379caac7b7f95145629734b692a7d38a472c9b2))





## [0.6.3](https://github.com/Tada5hi/authup/compare/v0.6.2...v0.6.3) (2023-01-10)


### Bug Fixes

* **common:** peer-dependency version ([76902ca](https://github.com/Tada5hi/authup/commit/76902ca1aadbcf9f96de147f428c2e322bfee916))





## [0.6.2](https://github.com/Tada5hi/authup/compare/v0.6.1...v0.6.2) (2023-01-10)


### Bug Fixes

* **deps:** bump json5 from 1.0.1 to 1.0.2 ([8f9e305](https://github.com/Tada5hi/authup/commit/8f9e30537e934fd9d0e871224b019ea60d92191d))
* **deps:** bump luxon from 1.28.0 to 1.28.1 ([b7cde23](https://github.com/Tada5hi/authup/commit/b7cde236b60b5042c0ccda66671f52b8b2b275b6))
* **deps:** updated peer-dependencies + oauth2 client library ([d91981e](https://github.com/Tada5hi/authup/commit/d91981e7cafe0def6fef26e5daa3042524c9a3e0))





## [0.6.1](https://github.com/Tada5hi/authup/compare/v0.6.0...v0.6.1) (2023-01-08)


### Bug Fixes

* robot secret env parsing ([19e81cb](https://github.com/Tada5hi/authup/commit/19e81cb3efb20d92101f39b5feff4c0b3ab5fc39))





# [0.6.0](https://github.com/Tada5hi/authup/compare/v0.5.0...v0.6.0) (2023-01-08)


### Bug Fixes

* oauth2 authorization code grant flow ([6422a9b](https://github.com/Tada5hi/authup/commit/6422a9b207474596363b3d48ce12e0c8e184ae8d))


### Features

* add prometheus + rate-limit support ([5b1a9cd](https://github.com/Tada5hi/authup/commit/5b1a9cdb7edafa7b1e696a2b68d41bef5ae2c397))





# [0.5.0](https://github.com/Tada5hi/authup/compare/v0.4.0...v0.5.0) (2023-01-08)


### Bug Fixes

* **deps:** bump @routup/static from 0.1.2 to 0.2.0 ([61ebacb](https://github.com/Tada5hi/authup/commit/61ebacba1d9f4a7eb6e882d0e3096b6e79c1eedd))
* **deps:** bump @routup/static from 0.2.0 to 0.2.1 ([39296ff](https://github.com/Tada5hi/authup/commit/39296fff669071757c777cdb6c32b9e7556ea713))
* **deps:** bump @types/jsonwebtoken from 8.5.9 to 9.0.0 ([17bc27b](https://github.com/Tada5hi/authup/commit/17bc27b85466a34a61b0d4c89e516760d549d42e))
* **deps:** bump @types/morgan from 1.9.3 to 1.9.4 ([389ee97](https://github.com/Tada5hi/authup/commit/389ee97c0a02710797bfaf35a08a82d857d86671))
* **deps:** bump jsonwebtoken from 8.5.1 to 9.0.0 ([34e9209](https://github.com/Tada5hi/authup/commit/34e9209d27899f6cf7a0be72676290ba2a62ebed))
* **deps:** bump typeorm-extension from 2.4.0 to 2.4.1 ([406b70b](https://github.com/Tada5hi/authup/commit/406b70b95ee7be043ca09b5b2c2057422f1d33dc))
* **deps:** bump vitepress from 1.0.0-alpha.33 to 1.0.0-alpha.35 ([77acc30](https://github.com/Tada5hi/authup/commit/77acc3076084140fb7be4cad23a3a576778b1264))
* **server-database:** enable/disable robot depending on config value ([080cd83](https://github.com/Tada5hi/authup/commit/080cd8375cb151dde656bb3fdda3666351a1d1a1))
* **server:** reset migrations + run migration transaction individually ([82d70a5](https://github.com/Tada5hi/authup/commit/82d70a56250bb18a29d32832571db6e13c1652a5))


### Features

* add healthcheck cli command ([208c62f](https://github.com/Tada5hi/authup/commit/208c62fbde68da0c1ae63378e47692d9a889d3cc))
* add robot/user renaming constraints + non owned permission assign ([ea12e73](https://github.com/Tada5hi/authup/commit/ea12e7309c6d539ec005cc5460ef50a2ebe8c931))
* **server-database:** updated indexes + realmified resources ([cb5e19e](https://github.com/Tada5hi/authup/commit/cb5e19ef1e49cdde6c0e63c6e59167638a9f79d6))
* **server-http:** allow name/slug identifier for fetching resource ([c05a69f](https://github.com/Tada5hi/authup/commit/c05a69f46da14e08966acd636644e65addc83370))





# [0.4.0](https://github.com/Tada5hi/authup/compare/v0.3.1...v0.4.0) (2022-12-21)


### Bug Fixes

* **deps:** bump @types/nodemailer from 6.4.6 to 6.4.7 ([148e5fe](https://github.com/Tada5hi/authup/commit/148e5fe574a26b940be0de43a950852a832ae7dc))
* **deps:** bump locter from 0.6.0 to 0.6.1 ([236bf62](https://github.com/Tada5hi/authup/commit/236bf627fc338e670671615c2a6b036811aff086))
* **deps:** bump minimatch from 5.1.1 to 5.1.2 ([c656530](https://github.com/Tada5hi/authup/commit/c656530601d987367e957a917b11e28bf09868c4))
* **deps:** bump typeorm-extension from 2.3.1 to 2.4.0 ([17b1307](https://github.com/Tada5hi/authup/commit/17b1307b5d466cdf95523dec42688f6564fb8069))
* **deps:** bump vitepress from 1.0.0-alpha.30 to 1.0.0-alpha.31 ([1f8fbc1](https://github.com/Tada5hi/authup/commit/1f8fbc1f4241affcf0753f61369c3b933f331f02))
* **deps:** bump vitepress from 1.0.0-alpha.31 to 1.0.0-alpha.32 ([3363cc3](https://github.com/Tada5hi/authup/commit/3363cc3af8f9faa72ec7b50ee7a26a04cef9a695))
* **deps:** bump zod from 3.19.1 to 3.20.1 ([8c7075e](https://github.com/Tada5hi/authup/commit/8c7075e27f7105f89dddf7bec2c341e146788771))
* **deps:** bump zod from 3.20.1 to 3.20.2 ([4477c61](https://github.com/Tada5hi/authup/commit/4477c6160da7a579db589e49f81c22aaca4e414c))
* updated routup dependency ([94f6797](https://github.com/Tada5hi/authup/commit/94f6797b51f4dff18e88e6a54836f5f131936802))


### Features

* add scope management (http-endpoint, db-entity, ...) ([2ab4236](https://github.com/Tada5hi/authup/commit/2ab42364e44f032cb93c9946c40a9fd71f287c44))
* further enhancement for client & scope management ([29d1f3e](https://github.com/Tada5hi/authup/commit/29d1f3ee5ecde14afa0b692dd9589887bc2df54e))
* only pre-parse cookie & query if options are set ([528c414](https://github.com/Tada5hi/authup/commit/528c414756e6f6fddf362d12c37e4b0a549f92b0))
* **ui:** add oauth2 authorization modal ([858e972](https://github.com/Tada5hi/authup/commit/858e9723dc3bd319b5b05f4a29f5c1a6d1e690fd))
* use continu for config management ([88b057d](https://github.com/Tada5hi/authup/commit/88b057dd6f15fb77c6a25197b51e6e0765e4fbe5))





## [0.3.1](https://github.com/Tada5hi/authup/compare/v0.3.0...v0.3.1) (2022-12-12)


### Bug Fixes

* **ui:** minor enahcenement to auth store & middleware ([80b97d0](https://github.com/Tada5hi/authup/commit/80b97d02977795ece02d60d4daff5eae58d03028))





# [0.3.0](https://github.com/Tada5hi/authup/compare/v0.2.2...v0.3.0) (2022-12-12)


### Bug Fixes

* **server-database:** better constraints for robot-,client-&role-entity ([d519cfd](https://github.com/Tada5hi/authup/commit/d519cfd90b4ce0f7f7b0cf5f1af1f48cbe4b2c64))
* **server-http:** enhance {user,role,robot} endpoint validation ([842afcc](https://github.com/Tada5hi/authup/commit/842afccee90a0c3f7510ba61edf1cfe9f7840033))
* **server-http:** minor issue with user validation ([1bc4a65](https://github.com/Tada5hi/authup/commit/1bc4a655e6f3ed6b9dca5679a13db32d1978da9b))
* **ui:** minor fixes (list-builder,{client,permission}-form,...) ([666b41f](https://github.com/Tada5hi/authup/commit/666b41f2fccc370815046087a621882f0159f1cc))


### Features

* add client/application management ([5327e9b](https://github.com/Tada5hi/authup/commit/5327e9bf411dfeeadef60d8f28ea81e0bc638f38))
* allow non realm assigned clients ([3be4011](https://github.com/Tada5hi/authup/commit/3be401106c5b03f1151c182e63eae0a0d543fa36))
* enhanced & extended permission management ([3c33bd0](https://github.com/Tada5hi/authup/commit/3c33bd0e0dcf1035d546fce375a76bb1c1312a05))
* refactored db schema - uuid as primary key for realm & perms ([9f9d10e](https://github.com/Tada5hi/authup/commit/9f9d10e5e1e2fc739f9f3c26a0eb0b4449097d19))
* **server-http:** set realm_name in token payload ([b6a5783](https://github.com/Tada5hi/authup/commit/b6a578329d77b240d4117fb626065512dcfcef2c))





## [0.2.2](https://github.com/Tada5hi/authup/compare/v0.2.1...v0.2.2) (2022-12-09)


### Bug Fixes

* **deps:** bump typeorm-extension from 2.3.0 to 2.3.1 ([aaccef7](https://github.com/Tada5hi/authup/commit/aaccef744d37f10146c9905611d9b819bc080a30))
* **routup-http:** updated rotuup dependencies ([da6a6a7](https://github.com/Tada5hi/authup/commit/da6a6a7ebd75fc20f05db9b7540070e6fea2d187))





## [0.2.1](https://github.com/Tada5hi/authup/compare/v0.2.0...v0.2.1) (2022-12-09)


### Bug Fixes

* **server-http:** add missing type export ([5c0a994](https://github.com/Tada5hi/authup/commit/5c0a994116655e091d847d99d291b817b6ff02db))





# [0.2.0](https://github.com/Tada5hi/authup/compare/v0.1.6...v0.2.0) (2022-12-09)


### Bug Fixes

* **server-http:** expose use-request-env util ([201fdab](https://github.com/Tada5hi/authup/commit/201fdabe29eeec7faadeb52b11db419ce4129119))


### Features

* **server-database:** add migration generate fn ([7a5b364](https://github.com/Tada5hi/authup/commit/7a5b364eebf5f0e0da0c9bc3e51fed89b2a2e547))





## [0.1.6](https://github.com/Tada5hi/authup/compare/v0.1.5...v0.1.6) (2022-12-08)


### Bug Fixes

* **authup:** better process output parsing ([edc3ca4](https://github.com/Tada5hi/authup/commit/edc3ca471821d2ef7f122e8cdc86452364d56a69))





## [0.1.5](https://github.com/Tada5hi/authup/compare/v0.1.4...v0.1.5) (2022-12-08)


### Bug Fixes

* **ui:** make output file executable ([ba21fad](https://github.com/Tada5hi/authup/commit/ba21fadd4ff062091283ca5ff632bb5279f1655b))





## [0.1.4](https://github.com/Tada5hi/authup/compare/v0.1.3...v0.1.4) (2022-12-08)


### Bug Fixes

* use package-name for npx execution ([401dd26](https://github.com/Tada5hi/authup/commit/401dd267ea556ba86c126ffb3ba4a16388c04475))





## [0.1.3](https://github.com/Tada5hi/authup/compare/v0.1.2...v0.1.3) (2022-12-08)


### Bug Fixes

* **authup:** reading config for ui & server ([605d8ee](https://github.com/Tada5hi/authup/commit/605d8eecc70a63ff2ad0a5267aaef56525c98759))





## [0.1.2](https://github.com/Tada5hi/authup/compare/v0.1.1...v0.1.2) (2022-12-08)


### Bug Fixes

* **server:** add shebang to cli entrypoint ([f77eb85](https://github.com/Tada5hi/authup/commit/f77eb85a55d4becdcd996a634a4fbcc463b2cba4))





## [0.1.1](https://github.com/Tada5hi/authup/compare/v0.1.0...v0.1.1) (2022-12-08)


### Bug Fixes

* **authup:** use module path only as fallback for execution ([e0ddcb0](https://github.com/Tada5hi/authup/commit/e0ddcb09c04a9b5c6a4e12c95a618d527fbc4a30))
* **server-http:** make local package.json existence optional ([d6105fa](https://github.com/Tada5hi/authup/commit/d6105fa9213cde311bf6238b35b381cc5832320b))





# 0.1.0 (2022-12-08)


### Bug Fixes

* applying default web-url ([02435bb](https://github.com/Tada5hi/authup/commit/02435bb9667d1450a0800ea883ed8e7297312458))
* bump typeorm-extension & rapiq version ([a980f80](https://github.com/Tada5hi/authup/commit/a980f80c35cb6a581886d398e3e3317815507e3b))
* bump typeorm-extension, rapiq & routup version ([e37b993](https://github.com/Tada5hi/authup/commit/e37b993bfbf3d11b24c696d59f1382cc4379a72c))
* **deps:** bump @ebec/http from 0.0.4 to 0.1.0 ([016baa2](https://github.com/Tada5hi/authup/commit/016baa22fd25390b0320e90d77a0fb870716c294))
* **deps:** bump @vue-layout/core from 0.1.0 to 0.1.1 ([1284918](https://github.com/Tada5hi/authup/commit/1284918cf1efcc2af98066f65ad2d58f72630ac2))
* **deps:** bump bcrypt from 5.0.1 to 5.1.0 ([be88eee](https://github.com/Tada5hi/authup/commit/be88eee35a09780120df3870e40888ec608ba711))
* **deps:** bump better-sqlite3 from 7.6.2 to 8.0.0 ([0a0a3b4](https://github.com/Tada5hi/authup/commit/0a0a3b4075c60864d55ac3e7f163b0c18c092e5a))
* **deps:** bump bootstrap from 5.2.1 to 5.2.2 ([84e13eb](https://github.com/Tada5hi/authup/commit/84e13ebc5a3e302efce9d350f001b30389349379))
* **deps:** bump dotenv from 16.0.2 to 16.0.3 ([19ac616](https://github.com/Tada5hi/authup/commit/19ac6162d463bf70a5b39ddfc606f09c78bf8692))
* **deps:** bump locter from 0.2.2 to 0.3.1 ([17a44c0](https://github.com/Tada5hi/authup/commit/17a44c0774a6ddf8824405f19167ec2486e857ec))
* **deps:** bump locter from 0.3.1 to 0.3.2 ([e636ef7](https://github.com/Tada5hi/authup/commit/e636ef75df4eca677a39da94ec351eee9125070c))
* **deps:** bump nodemailer from 6.7.8 to 6.8.0 ([3826392](https://github.com/Tada5hi/authup/commit/38263920d2a7691d9c6214b1c5b0f006225a1d71))
* **deps:** bump regenerator-runtime from 0.13.9 to 0.13.10 ([a84c0db](https://github.com/Tada5hi/authup/commit/a84c0db55f9033baa8bbb2d1cd1106b66bf80256))
* **deps:** bump swagger-ui-express from 4.5.0 to 4.6.0 ([1c1e416](https://github.com/Tada5hi/authup/commit/1c1e4161cf6523ad416c7981f36bb12bd56207a9))
* **deps:** bump typeorm-extension from 2.1.10 to 2.1.11 ([31adcd3](https://github.com/Tada5hi/authup/commit/31adcd30d6aa06512374c8e87b1f5e3e6674209b))
* **deps:** bump typeorm-extension from 2.1.11 to 2.1.12 ([d26000f](https://github.com/Tada5hi/authup/commit/d26000f7242283259bb63a8b3b44c43194014199))
* **deps:** bump typeorm-extension from 2.1.12 to 2.1.14 ([4351470](https://github.com/Tada5hi/authup/commit/4351470990f88b7f2c5c46236369a3d96360271d))
* **deps:** bump typeorm-extension from 2.1.14 to 2.1.15 ([1edfaba](https://github.com/Tada5hi/authup/commit/1edfabae3a95fec9073806494ae673574f682c04))
* **deps:** bump typeorm-extension from 2.2.10 to 2.2.11 ([2659666](https://github.com/Tada5hi/authup/commit/26596666b0eb690494bc5299b3e437da7f14ea95))
* **deps:** bump typeorm-extension from 2.2.11 to 2.2.12 ([9b9d5b5](https://github.com/Tada5hi/authup/commit/9b9d5b5692527aa4ed4fe357c5d6e0c5be513a5e))
* **deps:** bump typeorm-extension from 2.2.12 to 2.2.13 ([329d26b](https://github.com/Tada5hi/authup/commit/329d26b8772966d887ddffdc9998c619444441da))
* **deps:** bump typeorm-extension from 2.2.8 to 2.2.9 ([9d2a7a2](https://github.com/Tada5hi/authup/commit/9d2a7a24500b055a44c0894edb08666994127109))
* **deps:** bump typeorm-extension from 2.2.9 to 2.2.10 ([fde1bcd](https://github.com/Tada5hi/authup/commit/fde1bcd60ec597fd7f842d8465478000591225eb))
* **deps:** bump vitepress from 1.0.0-alpha.16 to 1.0.0-alpha.17 ([3f7cf8f](https://github.com/Tada5hi/authup/commit/3f7cf8f7ea8260ef8bb811635b294b6d59cbbd19))
* **deps:** bump vitepress from 1.0.0-alpha.17 to 1.0.0-alpha.19 ([2d6d968](https://github.com/Tada5hi/authup/commit/2d6d9686e4e1c1f7087b432214bd8621c20d2c0d))
* **deps:** bump vitepress from 1.0.0-alpha.19 to 1.0.0-alpha.20 ([61651d2](https://github.com/Tada5hi/authup/commit/61651d2ae4bcf104083e8f6b275c7e77de18f586))
* **deps:** bump vitepress from 1.0.0-alpha.20 to 1.0.0-alpha.21 ([c0ca022](https://github.com/Tada5hi/authup/commit/c0ca022c78d5454b4a8703bdc44443f3dcd870b8))
* **deps:** bump vitepress from 1.0.0-alpha.21 to 1.0.0-alpha.22 ([4e7be2f](https://github.com/Tada5hi/authup/commit/4e7be2fc4609f9197c7405ce60e67db1d2264676))
* **deps:** bump vitepress from 1.0.0-alpha.25 to 1.0.0-alpha.26 ([4e5cd53](https://github.com/Tada5hi/authup/commit/4e5cd53dc925c3415e459b9d69fdc218ba81575b))
* **deps:** bump vitepress from 1.0.0-alpha.26 to 1.0.0-alpha.28 ([f0bf20b](https://github.com/Tada5hi/authup/commit/f0bf20b4357bcca8f22301dfe5bcff696261cd3f))
* **deps:** bump vitepress from 1.0.0-alpha.28 to 1.0.0-alpha.29 ([4236bef](https://github.com/Tada5hi/authup/commit/4236befc9f148ec822137b0a40f248ff66d328d6))
* **deps:** bump vitepress from 1.0.0-alpha.29 to 1.0.0-alpha.30 ([8f25c6c](https://github.com/Tada5hi/authup/commit/8f25c6c51c511d9c9d30b38faf12c5cf2a2f57f4))
* **deps:** bump vue from 3.2.39 to 3.2.40 ([e878b09](https://github.com/Tada5hi/authup/commit/e878b09808b7bda6abef052c5b9b67ecb687b14e))
* **deps:** bump vue from 3.2.40 to 3.2.41 ([8009eb1](https://github.com/Tada5hi/authup/commit/8009eb103df2f96bbd222c1640ff113d78abb02e))
* **deps:** bump vue from 3.2.41 to 3.2.44 ([219a272](https://github.com/Tada5hi/authup/commit/219a27243bbe0a1b31bbcb3a1f7204c8557669c6))
* **deps:** bump vue from 3.2.44 to 3.2.45 ([fda7de1](https://github.com/Tada5hi/authup/commit/fda7de10263b8df071ff9b79081ccebc11d98ce9))
* **deps:** bump yargs from 17.5.1 to 17.6.0 ([e6b70e2](https://github.com/Tada5hi/authup/commit/e6b70e218b5bbb685e59eaad1ecc093d5484c0cb))
* **deps:** bump yargs from 17.6.0 to 17.6.2 ([621c7bc](https://github.com/Tada5hi/authup/commit/621c7bcb14e478dc98a780a45bab92f4077a1d14))
* **deps:** increased swagger lib version ([a986e1a](https://github.com/Tada5hi/authup/commit/a986e1a2b387bb6f30d42578ac8a98182493127d))
* **deps:** updated dependencies ([1a3e934](https://github.com/Tada5hi/authup/commit/1a3e93407c9fbf1fa8fdbeecb7bf20bbbe4170de))
* **deps:** updated dependencies ([6518175](https://github.com/Tada5hi/authup/commit/6518175b0a827bdd91eb63a7fd36740dbc8e23b1))
* **deps:** updated hapic-* ([e6bc7b9](https://github.com/Tada5hi/authup/commit/e6bc7b9d388a4dda2d9f194a23b8ab37cf05e2b6))
* **deps:** updated routup ( & decorators) ([c3c0aba](https://github.com/Tada5hi/authup/commit/c3c0aba7d11e9075821f536e16fe2167dc8a5e7d))
* http endpoints with query relations ([47141a1](https://github.com/Tada5hi/authup/commit/47141a1a5f41875b1469d537b2d2ccb1442931be))
* nginx reverse proxy + add query sort for permissions ([b939cfa](https://github.com/Tada5hi/authup/commit/b939cfa1f94fb38450c0fa388688c71bf4a4d795))
* run database-seed for integrity on upgrade ([80c6e48](https://github.com/Tada5hi/authup/commit/80c6e483dbc0a436589b012633621fe73d9893ef))
* **server-adapter:** replaced express with routup ([1e44e1f](https://github.com/Tada5hi/authup/commit/1e44e1f4e918578e4fb79fb9442d6adc7fbb46c9))
* **server-core:** added missing realm_id filter for roles endpoint ([6186aa1](https://github.com/Tada5hi/authup/commit/6186aa1c827578e04780c6d9adad8a03594790a2))
* **server-core:** adjustment for response status-codes & test suite ([e575b7b](https://github.com/Tada5hi/authup/commit/e575b7b4d9cc1d39f06813bf1052bf69ac66a295))
* **server-core:** keep subscribers during upgrade ([8239763](https://github.com/Tada5hi/authup/commit/823976326e2629ab55e7b7f8ca5980dd58294943))
* **server-core:** replaced swagger-ui serve middleware ([bf096a2](https://github.com/Tada5hi/authup/commit/bf096a2e7c11fd5e25977eedceab98fa29bbce17))
* **server-core:** swagger generation ([a660de5](https://github.com/Tada5hi/authup/commit/a660de5b1a99dee7a300853f10c00282fef52a07))
* **server-core:** swagger generation ([d91cd5f](https://github.com/Tada5hi/authup/commit/d91cd5fbb55607036dace944f1ac25cf52da338d))
* **server-core:** use option of core build output for swagger options ([e68d978](https://github.com/Tada5hi/authup/commit/e68d978479ed6e90f7443984a04096ac11375f15))
* **server-utils:** ensure token payload is decoded ([eecb656](https://github.com/Tada5hi/authup/commit/eecb6566e922a2e0ba917e028531fdc72c89391c))
* **server:** add migration file ([40a1e08](https://github.com/Tada5hi/authup/commit/40a1e08c87b527d6bf046c0d55a6b408f5e5b72b))
* updated typeorm-extension & smob dependency ([50ea810](https://github.com/Tada5hi/authup/commit/50ea810b4ffae39291ec29317e6f7da371dc875d))
* **vue:** exports + restructrure file structure ([2bfc512](https://github.com/Tada5hi/authup/commit/2bfc512989b46a57877957f10991e351fa544d60))
* **vue:** extendend submit handler create context ([af26051](https://github.com/Tada5hi/authup/commit/af260513f7ced8373eac9355e7a5b778feb72535))


### Features

* add global cli & enhanced config handling ([95a1549](https://github.com/Tada5hi/authup/commit/95a1549c70ed18e9bc58e2f4fb5734712ab20a35))
* add void logger ([14a321e](https://github.com/Tada5hi/authup/commit/14a321ec4f39559da156ebc592fa8118dc5d5be0))
* better config handling ([b1582b7](https://github.com/Tada5hi/authup/commit/b1582b798174c2c44e06271f3250db637a159bfd))
* enhance check for readable & writable realm resources ([a048358](https://github.com/Tada5hi/authup/commit/a048358f3e6bc1ddfbffe2ec76148b1ebee276ed))
* only allow robot/role permission assignment for owned permissions ([9dfd9d3](https://github.com/Tada5hi/authup/commit/9dfd9d39ed4420f5d42b4fa9e03e88f04f840189))
* prepare global cli ([ed4539c](https://github.com/Tada5hi/authup/commit/ed4539c0b736f8b522e7a1af716ff6e3ab2d8200))
* renamed server-utils to server-common package ([f3b50e8](https://github.com/Tada5hi/authup/commit/f3b50e8021c4d3fd8ed78d1de33266ddc5714aa7))
* **server-core:** replaced http framework ([6273ae6](https://github.com/Tada5hi/authup/commit/6273ae680f82a4e27ba527b9eb260bb81ee75d20))
* **ui:** add identity-provider management + explicit import NuxtPage ([2cca37b](https://github.com/Tada5hi/authup/commit/2cca37b666cbece3c2b212a9787d5f3f49866144))
* **ui:** added domain list event management + minor fixes ([b5062db](https://github.com/Tada5hi/authup/commit/b5062dbe940c9cf7f29713864a7ddb5b08cfddf5))


### Performance Improvements

* enhanced swagger generation ([84113ad](https://github.com/Tada5hi/authup/commit/84113ad10c3c1a8164772216cf455cf7700e46bf))
* optimized http endpoints + merged github workflows ([cba2de4](https://github.com/Tada5hi/authup/commit/cba2de47c9ecce74c42be21ae951f90264b982df))
* **server-core:** further http endpoint optimization for request query ([31997e5](https://github.com/Tada5hi/authup/commit/31997e5b3ccb19ceb708037ad87ae1e13c77601f))
