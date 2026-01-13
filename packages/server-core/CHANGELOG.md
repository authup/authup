# Change Log

## [1.0.0-beta.28](https://github.com/authup/authup/compare/v1.0.0-beta.27...v1.0.0-beta.28) (2026-01-13)


### ⚠ BREAKING CHANGES

* require esm import capabilities
* email non null column
* ESM only

### Features

* add active, secret_hashed & secret_encrypted property + assign client always to realm ([#2758](https://github.com/authup/authup/issues/2758)) ([2d0f112](https://github.com/authup/authup/commit/2d0f112d2ed5bb1ad7eec04bccf3ca7dae61fb4f))
* generate and hash client secret if required ([#2800](https://github.com/authup/authup/issues/2800)) ([36debf9](https://github.com/authup/authup/commit/36debf9167a37a21086675f21c378d76b2582eed))
* generate migrations ([#2789](https://github.com/authup/authup/issues/2789)) ([1338f5c](https://github.com/authup/authup/commit/1338f5c629f590c17aa5891790d8bec98048626a))
* make email address mandatory ([#2782](https://github.com/authup/authup/issues/2782)) ([c8e5e08](https://github.com/authup/authup/commit/c8e5e08b6abdb1af8bdc9771bd4a7ae822e71360))
* move credentials fns of client, robot & user to dedicated services ([#2759](https://github.com/authup/authup/issues/2759)) ([0741696](https://github.com/authup/authup/commit/074169606ff994700e247e4654cfe5365b3fbd8a))
* session management ([#2785](https://github.com/authup/authup/issues/2785)) ([c035b11](https://github.com/authup/authup/commit/c035b118ccdfc76ee61249ebeb4ee149f6792acb))


### Bug Fixes

* authenticatation in ldap identity provider authenticator ([e9365a9](https://github.com/authup/authup/commit/e9365a9c0cc12a31db0c748c76d1137b4123b92e))
* **deps:** bump the minorandpatch group across 1 directory with 13 updates ([#2780](https://github.com/authup/authup/issues/2780)) ([41eba21](https://github.com/authup/authup/commit/41eba214494520ad418d4a3ac3ccee3cd96dc19e))
* **deps:** bump the minorandpatch group across 1 directory with 14 updates ([#2797](https://github.com/authup/authup/issues/2797)) ([56489db](https://github.com/authup/authup/commit/56489db9f7e35a9467ff5c91b6833d243ab9c738))
* **deps:** bump the minorandpatch group across 1 directory with 8 updates ([#2764](https://github.com/authup/authup/issues/2764)) ([04ee74b](https://github.com/authup/authup/commit/04ee74b8abdb275c3de3c97170a33c3ca8e1069f))
* **deps:** bump the minorandpatch group across 1 directory with 8 updates ([#2786](https://github.com/authup/authup/issues/2786)) ([784234d](https://github.com/authup/authup/commit/784234da3a83a576c4e6932069de843187f6d733))
* **deps:** bump the minorandpatch group with 34 updates ([#2756](https://github.com/authup/authup/issues/2756)) ([9240ce1](https://github.com/authup/authup/commit/9240ce18515ea9501a6790a53efe375a4c2b28ac))
* **deps:** bump the minorandpatch group with 5 updates ([#2770](https://github.com/authup/authup/issues/2770)) ([141c50d](https://github.com/authup/authup/commit/141c50d4a76e5d5aa27b336365ca02e9f12ddf7b))
* **deps:** bump the minorandpatch group with 5 updates ([#2802](https://github.com/authup/authup/issues/2802)) ([d299619](https://github.com/authup/authup/commit/d29961929bee7fce0070adb6a61d1ff063036a77))
* **deps:** bump the minorandpatch group with 8 updates ([#2769](https://github.com/authup/authup/issues/2769)) ([d86fa30](https://github.com/authup/authup/commit/d86fa30bed013f4245cecc0d03758b1f8b219da1))
* **deps:** bump typeorm from 0.3.27 to 0.3.28 in the minorandpatch group ([#2765](https://github.com/authup/authup/issues/2765)) ([56c8043](https://github.com/authup/authup/commit/56c80434ec8405259507b9102f2b09017c1400d9))
* **deps:** bump typeorm-extension in the minorandpatch group ([#2775](https://github.com/authup/authup/issues/2775)) ([d6d374a](https://github.com/authup/authup/commit/d6d374ad2081beeb780cc5cc19f3da1ee53e2c98))
* isInactive check if oauth2 token verifier ([4b8b2e6](https://github.com/authup/authup/commit/4b8b2e6f519f3237ffad48928f267367a45d3243))
* issue tokens (same jti & ineherited exp) ([da0d7dd](https://github.com/authup/authup/commit/da0d7dde72bb39935fdd19ee5d5d62c51434d367))
* listening on host + port in http module ([95a4623](https://github.com/authup/authup/commit/95a4623b7cde3c192f6784793e97451102f720a2))
* migrate from jest to vitest ([#2754](https://github.com/authup/authup/issues/2754)) ([191fd23](https://github.com/authup/authup/commit/191fd23035ee31eeca444f6d2165256a4f79ae72))
* millisecond cache specification for oauth2 sub entity loading ([16c9df0](https://github.com/authup/authup/commit/16c9df05da2ee0a0f54a210cc36ca367cbc7765c))
* normalize scope names to lower-case + renamed client-scope to scope repo ([cb5e23b](https://github.com/authup/authup/commit/cb5e23b39e8313f7068fdae10be3c83322f47cdd))
* oauth2 scope check in authorize code request verifier ([ddb72d8](https://github.com/authup/authup/commit/ddb72d8eff6cd9964f20aff9064f0d86ff791ebb))
* set dotenv loading option to quiet ([5a1186f](https://github.com/authup/authup/commit/5a1186f8f9f634eda7a97c2e0de747ca0eebc312))
* use explicit type imports + bundler for core package ([7c714e3](https://github.com/authup/authup/commit/7c714e39bd6b476a0e6daf14bd4012a9c430e4ce))
* using session manager in authorization middleware ([c84a7cc](https://github.com/authup/authup/commit/c84a7cc69ea91b76c7620fce4824add9c3790b80))


### Miscellaneous Chores

* set min node engine version ([2d6e8a7](https://github.com/authup/authup/commit/2d6e8a794b731ccaa73f3da8c4e0e81fd1178a58))


### Code Refactoring

* migrated to esm only packages ([f988074](https://github.com/authup/authup/commit/f9880742e8fa6487afaf5878aedc520b37622a37))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/core-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/core-http-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/errors bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/server-kit bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
    * @authup/specs bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28
  * devDependencies
    * @authup/client-web-slim bumped from ^1.0.0-beta.27 to ^1.0.0-beta.28

## [1.0.0-beta.27](https://github.com/authup/authup/compare/v1.0.0-beta.26...v1.0.0-beta.27) (2025-07-17)


### Features

* find user,robot & client lazy ([#2673](https://github.com/authup/authup/issues/2673)) ([331b3ee](https://github.com/authup/authup/commit/331b3ee86cacdb99590a19386facedd2c32cee2b))
* move authorize & login component to kit package ([#2663](https://github.com/authup/authup/issues/2663)) ([defcdda](https://github.com/authup/authup/commit/defcdda91e944f7a113d872b8528c32646204000))
* refactored internal scope handling & authorize error formatting ([#2676](https://github.com/authup/authup/issues/2676)) ([9444ec2](https://github.com/authup/authup/commit/9444ec23a12e00c3397eda2bb28cbc08193f9a69))
* serve authorization component form via api ([#2666](https://github.com/authup/authup/issues/2666)) ([c88a13f](https://github.com/authup/authup/commit/c88a13f2f5f60b28a76526b0469b623c73b3ab78))
* serve static files in public folder ([a426bd2](https://github.com/authup/authup/commit/a426bd253494a3af6d8bf7b3625743128df133bf))
* slime web app with vite ([#2689](https://github.com/authup/authup/issues/2689)) ([2084e99](https://github.com/authup/authup/commit/2084e99dc30c1ba7f3ad9fa4af371ad40d59fcd7))
* track authroization through idp redirect & callback ([#2669](https://github.com/authup/authup/issues/2669)) ([5cab0f4](https://github.com/authup/authup/commit/5cab0f405c2d9361f62d1aeb03f83fe8e23c7326))
* validate user in idp account creation ([#2671](https://github.com/authup/authup/issues/2671)) ([084ec15](https://github.com/authup/authup/commit/084ec151348591fea272c93b66fa5601780266d3))


### Bug Fixes

* cleanup policy evaluator function signature ([4cd41db](https://github.com/authup/authup/commit/4cd41db762d00b60303165630f93c8da3f8074da))
* **deps:** bump dependencies ([c5e66dd](https://github.com/authup/authup/commit/c5e66ddd50ea4f4b596e47ff99e3a3d6c8133e22))
* **deps:** bump the minorandpatch group across 1 directory with 11 updates ([#2672](https://github.com/authup/authup/issues/2672)) ([242bedd](https://github.com/authup/authup/commit/242bedd9c611b84293ba75cc9427892c7ac962c6))
* **deps:** bump the minorandpatch group across 1 directory with 21 updates ([#2653](https://github.com/authup/authup/issues/2653)) ([eb5cdcd](https://github.com/authup/authup/commit/eb5cdcd775466506ec4d86166e6de55e9868f46b))
* **deps:** bump the minorandpatch group across 1 directory with 22 updates ([#2687](https://github.com/authup/authup/issues/2687)) ([f10970b](https://github.com/authup/authup/commit/f10970b89ae166cb33de9841bb221b40eb28081c))
* **deps:** bump the minorandpatch group across 1 directory with 6 updates ([#2692](https://github.com/authup/authup/issues/2692)) ([b0c963a](https://github.com/authup/authup/commit/b0c963a3135ebfccc908f0b1bec2900faccdc59a))
* remove non unique entries on start up ([cae3df5](https://github.com/authup/authup/commit/cae3df562005936efc6bb9b79c9050ee81b300b0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/core-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/core-http-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/errors bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/server-kit bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
    * @authup/specs bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27
  * devDependencies
    * @authup/client-web-slim bumped from ^1.0.0-beta.26 to ^1.0.0-beta.27

## [1.0.0-beta.26](https://github.com/authup/authup/compare/v1.0.0-beta.25...v1.0.0-beta.26) (2025-04-14)


### Bug Fixes

* add e-mail to LICENSE file + set next version ([004ee6a](https://github.com/authup/authup/commit/004ee6a2a7fb93506535c8baeebff5981667036a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/core-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/core-http-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/errors bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/server-kit bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26
    * @authup/specs bumped from ^1.0.0-beta.25 to ^1.0.0-beta.26

## [1.0.0-beta.25](https://github.com/authup/authup/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2025-04-08)


### ⚠ BREAKING CHANGES

* sqlite not longer supported for production

### Features

* add client_id reference in role model + updated unique constraints ([6a1bc89](https://github.com/authup/authup/commit/6a1bc89b87d1cfa40c45f12245137c3a5a5ec896))
* add route (handler) to retrieve expanded policy tree ([3079444](https://github.com/authup/authup/commit/3079444f04eaf16a29dacb4aa3339ccc284029ff))
* client-{permission,role} relations ([#2570](https://github.com/authup/authup/issues/2570)) ([95e5e85](https://github.com/authup/authup/commit/95e5e855083b20fc17e7df9047a97948d66aac3d))
* correct client usage in security context ([#2579](https://github.com/authup/authup/issues/2579)) ([26f0118](https://github.com/authup/authup/commit/26f0118184c98bf04f499d19526b1cf0d034cad6))
* deprecate sqlite for production environment ([#2574](https://github.com/authup/authup/issues/2574)) ([75fc3aa](https://github.com/authup/authup/commit/75fc3aa4164d2ceda9bb8084dca9cf4f51252c5c))
* enable reading explicit root & children policies ([#2561](https://github.com/authup/authup/issues/2561)) ([07ae0db](https://github.com/authup/authup/commit/07ae0dbe8f6975357788bc1af572ccad87f367e7))
* enhance cli migration command ([3ec235b](https://github.com/authup/authup/commit/3ec235b03509bbc36795bb01790f505a1c9c71ca))
* extend tree repository save & find  ([#2559](https://github.com/authup/authup/issues/2559)) ([88f5247](https://github.com/authup/authup/commit/88f52473b048f4a27cd991c01fd9d7aaf50a4bf3))
* initial policy components ([#2562](https://github.com/authup/authup/issues/2562)) ([f73cd74](https://github.com/authup/authup/commit/f73cd7476970f563a07307ee12e1742de9eeaf32))
* permit tree like policy submission ([#2560](https://github.com/authup/authup/issues/2560)) ([b43afdb](https://github.com/authup/authup/commit/b43afdbacf63c3e809b34a50a576e12c9133367c))
* prepare migrations for next release ([#2593](https://github.com/authup/authup/issues/2593)) ([72f69fa](https://github.com/authup/authup/commit/72f69fa5ed11bf2c8596a094e12f5413a1fa2c89))
* remove identity provider slug field ([#2575](https://github.com/authup/authup/issues/2575)) ([19e111b](https://github.com/authup/authup/commit/19e111b96321c915014417ad5148307724dc93ee))
* rename channel & namespace builder heplpers ([e86e18c](https://github.com/authup/authup/commit/e86e18c2821b6a0b9afa7c27efabbc6d0d9b5c7c))
* stricter restrictions for resource name attribute ([57965ea](https://github.com/authup/authup/commit/57965eae29523b59c46e86b6f12e7b44752ae301))
* unified entity picker mechanism ([#2581](https://github.com/authup/authup/issues/2581)) ([831aeb2](https://github.com/authup/authup/commit/831aeb20e1937f8106395e0e8f71c122b89bf256))


### Bug Fixes

* enable reverting mysql migration 1740991051622-Default ([0b0616e](https://github.com/authup/authup/commit/0b0616e2bfe5c07b202f4d91d7c38d4e6d07ed82))
* eplicit restrcit veryfing client credentials for non public clients ([460dbbd](https://github.com/authup/authup/commit/460dbbd4b57fcd732d8178d3822b59f44cbbd4de))
* if non global policy is assigned to permission, realms must match ([c6167b5](https://github.com/authup/authup/commit/c6167b522546613b50c2b563e8a4954bdfae29fa))
* policy ancestor assignment ([#2568](https://github.com/authup/authup/issues/2568)) ([ca4cad7](https://github.com/authup/authup/commit/ca4cad73d3051ea4da53b56a7d7848a0e2e15f95))
* rename domain-type to resource-type ([c01ec66](https://github.com/authup/authup/commit/c01ec66ff0cb8c06c6e360878b4f40a7eed30fb7))
* rename domain-type-map to resource-type-map ([131b296](https://github.com/authup/authup/commit/131b29665df32c82456e9543b50710278e90c479))
* renamed types & interfaces ([45c2fb7](https://github.com/authup/authup/commit/45c2fb78e8948fcc2d41e3615dad35d906e94b2f))
* update year range in LICENSE file ([8dd6da9](https://github.com/authup/authup/commit/8dd6da98cbfd8f910397de7391402af1e7517cc9))
* use uncrypto to support web crypto api with different targets ([e37a0ba](https://github.com/authup/authup/commit/e37a0bad390fe7984fc9d68bf4572e5e1aa9e442))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/core-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/core-http-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/errors bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/server-kit bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25
    * @authup/specs bumped from ^1.0.0-beta.24 to ^1.0.0-beta.25

## [1.0.0-beta.24](https://github.com/authup/authup/compare/v1.0.0-beta.23...v1.0.0-beta.24) (2025-01-18)


### Features

* allow inlcusion of related relations for some http endpoints ([1b8e1b4](https://github.com/authup/authup/commit/1b8e1b48d1060648ce6cf963015051322d616769))
* allow sorting by id, created_at & updated_at for relational entities via http endpoints ([1eb66b2](https://github.com/authup/authup/commit/1eb66b2c2748e3f96e5ba622f6d62c5d73952476))
* don't always generate swagger documentation on startup ([#2511](https://github.com/authup/authup/issues/2511)) ([eb35d00](https://github.com/authup/authup/commit/eb35d0020d9d90aabeef9cb2ab086d506c24c8cf))
* implemented oauth2 PKCE specification ([#2487](https://github.com/authup/authup/issues/2487)) ([d6f6e65](https://github.com/authup/authup/commit/d6f6e659ac0eb319183778ddeaa8dd03d2269bbd))
* merge packages rules & schema to security ([#2506](https://github.com/authup/authup/issues/2506)) ([2ea6407](https://github.com/authup/authup/commit/2ea6407390cad4900416994e1af78dca1b36a170))
* refactor & split security package ([#2551](https://github.com/authup/authup/issues/2551)) ([1b38eed](https://github.com/authup/authup/commit/1b38eed204658cdde11b92f93027b843f47f43bf))
* split kit package in errors, rules & schema package ([#2500](https://github.com/authup/authup/issues/2500)) ([ff5a6e7](https://github.com/authup/authup/commit/ff5a6e731f4ea71faaefd1cd6fe02fbc0dc398e6))
* use web crypto api ([#2502](https://github.com/authup/authup/issues/2502)) ([b088ae4](https://github.com/authup/authup/commit/b088ae4fac82debecdd5da4b47967c77654c47cc))


### Bug Fixes

* **deps:** bump @hapic/oauth2 to v3.x ([c83f480](https://github.com/authup/authup/commit/c83f480cee897402d11ae701012ac7f239a5e566))
* **deps:** bump the minorandpatch group across 1 directory with 18 updates ([#2494](https://github.com/authup/authup/issues/2494)) ([cc6562e](https://github.com/authup/authup/commit/cc6562eed230f76c984e1ee26942ce705dd03fdf))
* **deps:** bump the minorandpatch group across 1 directory with 26 updates ([#2524](https://github.com/authup/authup/issues/2524)) ([0c9dd69](https://github.com/authup/authup/commit/0c9dd697705b0156412cb9c3bad09a83caea5948))
* **deps:** bump the minorandpatch group with 12 updates ([#2554](https://github.com/authup/authup/issues/2554)) ([cbccab3](https://github.com/authup/authup/commit/cbccab35970ec9cc5d3a6e9950f932b773e07c07))
* generating oauth2 code challenge (base64 instead of hex) ([69201cd](https://github.com/authup/authup/commit/69201cde4c89127d830eacd0e446fdfa41be332b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/access bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/core-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/core-http-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/errors bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/server-kit bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24
    * @authup/specs bumped from ^1.0.0-beta.23 to ^1.0.0-beta.24

## [1.0.0-beta.23](https://github.com/authup/authup/compare/v1.0.0-beta.22...v1.0.0-beta.23) (2024-11-10)


### Bug Fixes

* **deps:** bump better-sqlite3 from 11.3.0 to 11.5.0 ([#2422](https://github.com/authup/authup/issues/2422)) ([ba8a783](https://github.com/authup/authup/commit/ba8a7831533007275925e9ed5f4c15e9e43fc6e2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/core-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/core-http-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23
    * @authup/server-kit bumped from ^1.0.0-beta.22 to ^1.0.0-beta.23

## [1.0.0-beta.22](https://github.com/authup/authup/compare/v1.0.0-beta.21...v1.0.0-beta.22) (2024-10-23)


### Features

* cache access of permission-db-provider ([a0ee2f7](https://github.com/authup/authup/commit/a0ee2f7455f2bc2a9f71cf67af0a49a885fc7174))
* enhance identity provider picker view ([6e44be9](https://github.com/authup/authup/commit/6e44be986dd59d124cf91d88e9b9fdfe5ed5c0ac))
* moved and seperated domains directory ([#2424](https://github.com/authup/authup/issues/2424)) ([fde5757](https://github.com/authup/authup/commit/fde5757243868cc1a5af0d2c9f75ab82dd2af8a2))
* refactor oauth2 module & initial (oauth2-) cache implementation ([#2413](https://github.com/authup/authup/issues/2413)) ([88fc07d](https://github.com/authup/authup/commit/88fc07de1cb795f659a8d6d02572da1e77a4004f))
* support in-memory cache for db ([#2417](https://github.com/authup/authup/issues/2417)) ([c8e4cc6](https://github.com/authup/authup/commit/c8e4cc6a73c7b25ca52e740047c3f4e49c384684))
* token revoke endpoint & oauth2 grant flow refactor ([#2409](https://github.com/authup/authup/issues/2409)) ([d287ddc](https://github.com/authup/authup/commit/d287ddc0b5d177fa015c3892baf052a999de6686))


### Bug Fixes

* align setting response cookies ([86fce96](https://github.com/authup/authup/commit/86fce964626732c90ff721f8084493c54eca4e3b))
* bump vuecs packages & cleaned up layout config ([3e5cbdb](https://github.com/authup/authup/commit/3e5cbdbccfc723b72a9d69c21c181a6685d1c6e7))
* enhance strategy to normalize config ([0b87f8e](https://github.com/authup/authup/commit/0b87f8e571acb22e65a4facfb565cbd08da93b5c))
* reading own identity without permisisons ([c62ac57](https://github.com/authup/authup/commit/c62ac578cf3eb8cfd941c805091e066155696c3d))
* saving user-roles & user-permissions via identity-provider ([25e836f](https://github.com/authup/authup/commit/25e836f2aa66ddced4e6dceb945eb6fb13bea277))
* simplify request env key access ([12a5011](https://github.com/authup/authup/commit/12a5011fb703b105671cb259e15e94fa419996a9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/core-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/core-http-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22
    * @authup/server-kit bumped from ^1.0.0-beta.21 to ^1.0.0-beta.22

## [1.0.0-beta.21](https://github.com/authup/authup/compare/v1.0.0-beta.20...v1.0.0-beta.21) (2024-10-13)


### Bug Fixes

* creating user (+ roles & permissions) by idp identity ([#2391](https://github.com/authup/authup/issues/2391)) ([7362886](https://github.com/authup/authup/commit/7362886c5aede960c7005df2655f859dd9d48e1d))
* **deps:** bump docker node image to v20.x & typeorm-extension ([36c4f57](https://github.com/authup/authup/commit/36c4f57d743795fb191daa939c5a7a88b9910cc3))
* **deps:** bump locter from 2.1.3 to 2.1.4 ([#2392](https://github.com/authup/authup/issues/2392)) ([d1dce83](https://github.com/authup/authup/commit/d1dce831f021029c9f370adcd7323c2fba0a47a2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/core-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/core-http-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21
    * @authup/server-kit bumped from ^1.0.0-beta.20 to ^1.0.0-beta.21

## [1.0.0-beta.20](https://github.com/authup/authup/compare/v1.0.0-beta.19...v1.0.0-beta.20) (2024-09-28)


### Features

* add built_in & display_name attribute to few entities ([#2193](https://github.com/authup/authup/issues/2193)) ([42d062f](https://github.com/authup/authup/commit/42d062f3e600aed43f69164b2f6297851d402070))
* add cookieDomain option ([32e933c](https://github.com/authup/authup/commit/32e933c8839a8592af4c937adc33a51bd3ba1da7))
* clean up user-, role- & robot-repository ([#2313](https://github.com/authup/authup/issues/2313)) ([b74ab1a](https://github.com/authup/authup/commit/b74ab1a1b172f2428299c18df7b379905fb54ed1))
* different errors for permission-checker check fn(s) ([a040838](https://github.com/authup/authup/commit/a0408389c847f1bd9b70bcd770ff2569f784c6fc))
* don't build policy identity for req if oauth2 scope is not global ([0b04d93](https://github.com/authup/authup/commit/0b04d93f7f179176479cc17d1e40b388f776be81))
* fix policy parserFn names + strict mode ([120bdea](https://github.com/authup/authup/commit/120bdea866fcadb45c8096c9f0b855d73b7603c9))
* initial realm-match policy & remove explicit resource realm restriction ([#2210](https://github.com/authup/authup/issues/2210)) ([1f51863](https://github.com/authup/authup/commit/1f51863b6a46d6a116877b0734876502de7eb669))
* introduce identity_provider_role- & client_scope permissions ([ada3183](https://github.com/authup/authup/commit/ada31831c0ce72358cf87ba25b5c9162a3f9e3a1))
* make permission/ability fns async ([#2116](https://github.com/authup/authup/issues/2116)) ([c0491c1](https://github.com/authup/authup/commit/c0491c1ea3fdec651c7ad83d60b929c42cca715a))
* merge commands to application class ([0f52e0c](https://github.com/authup/authup/commit/0f52e0c1b1cb6edd67d2b2e985e79ddb67d3b3b5))
* move permission & policy logic to new package ([#2128](https://github.com/authup/authup/issues/2128)) ([53f9b33](https://github.com/authup/authup/commit/53f9b33b15e08d6a2def0f7d4659129a03a51252))
* moved built-in policy parser, attributes query fixer, ... ([0599b54](https://github.com/authup/authup/commit/0599b5423d203583845782c74cd1755ef06bd7c6))
* permisison-binding policy & policy-engine + permission-checker override ([#2298](https://github.com/authup/authup/issues/2298)) ([5871d72](https://github.com/authup/authup/commit/5871d72e0404e71c372b3d70875c4b84c56f02e4))
* permission check api endpoint ([#2319](https://github.com/authup/authup/issues/2319)) ([9e57f84](https://github.com/authup/authup/commit/9e57f8479f98bf96d99632a0d1a52b9df6f740aa))
* permission repository for permission manager ([#2129](https://github.com/authup/authup/issues/2129)) ([afe3700](https://github.com/authup/authup/commit/afe3700e9822e3983b8867cad927ea74b9747133))
* permit non owned permissions to be checked ([#2294](https://github.com/authup/authup/issues/2294)) ([2c44a8d](https://github.com/authup/authup/commit/2c44a8daa9e50903dee146cb548500972287f209))
* policy check api endpoint ([#2330](https://github.com/authup/authup/issues/2330)) ([37e5389](https://github.com/authup/authup/commit/37e53891641b388d93d7eb23e9f55924ec245cce))
* refactor http controller validation ([#2177](https://github.com/authup/authup/issues/2177)) ([bea9db9](https://github.com/authup/authup/commit/bea9db902b7f1ed8f8b01e7342198d454cd6917c))
* refactored db-cache, aggregators & bump redis-extension ([#2198](https://github.com/authup/authup/issues/2198)) ([5736d5a](https://github.com/authup/authup/commit/5736d5ab0d52332ced1b92e60f7b109c706ca920))
* relocate subject & subject-kind helper fns ([e7a6ee0](https://github.com/authup/authup/commit/e7a6ee070728a37de6393b78e8d60acfec972072))
* remove isRealmResourceWritable checks where possible ([f1172f0](https://github.com/authup/authup/commit/f1172f082e43aafef4dbe22451bec0eeaab8b0af))
* simplify permission manager & merge permissions of same realm ([#2133](https://github.com/authup/authup/issues/2133)) ([08c5cf7](https://github.com/authup/authup/commit/08c5cf7697f140663b6ffc396ec8028a3057c2e2))
* use citty instead of yargs for server-core package ([#2293](https://github.com/authup/authup/issues/2293)) ([cade65d](https://github.com/authup/authup/commit/cade65d137f346fadc18b9ac0063ca635245bcf6))
* write handlers for controllers ([#2185](https://github.com/authup/authup/issues/2185)) ([ae8997a](https://github.com/authup/authup/commit/ae8997aae542ccb75dff03f7656c74d20f128e33))


### Bug Fixes

* auto generate robot secret if not defined via payload ([7bf3135](https://github.com/authup/authup/commit/7bf31354be4ea3a8ccb1312dcc40f4480678503b))
* **deps:** bump @routup/decorators from 3.4.0 to 3.4.1 ([#2337](https://github.com/authup/authup/issues/2337)) ([bf2ae8d](https://github.com/authup/authup/commit/bf2ae8d73b26b9b44a81bb037e68dc4488b34155))
* **deps:** bump @routup/swagger from 2.4.0 to 2.4.1 ([#2322](https://github.com/authup/authup/issues/2322)) ([ca6873e](https://github.com/authup/authup/commit/ca6873e23a2d39ab7a5d8286ff78358275866839))
* **deps:** bump @validup/adapter-routup from 0.1.6 to 0.1.7 ([#2272](https://github.com/authup/authup/issues/2272)) ([b08fac1](https://github.com/authup/authup/commit/b08fac14b45f9aa097ec066e39f95b66cad7ec37))
* **deps:** bump @validup/adapter-validator from 0.1.5 to 0.1.6 ([#2274](https://github.com/authup/authup/issues/2274)) ([5f6ca59](https://github.com/authup/authup/commit/5f6ca5930cec46bbf0cc6b341d61af1c2d86f159))
* **deps:** bump @validup/adapter-zod from 0.1.5 to 0.1.6 ([#2273](https://github.com/authup/authup/issues/2273)) ([eac473c](https://github.com/authup/authup/commit/eac473c49cb81b52cc5ae609ccd36957ed228c20))
* **deps:** bump better-sqlite3 from 11.1.2 to 11.2.1 ([#2246](https://github.com/authup/authup/issues/2246)) ([b63fcc4](https://github.com/authup/authup/commit/b63fcc411ee4bed68f99abfb320d1174a76b5c42))
* **deps:** bump better-sqlite3 from 11.2.1 to 11.3.0 ([#2302](https://github.com/authup/authup/issues/2302)) ([7072746](https://github.com/authup/authup/commit/7072746499f10f3c8b9759a349a8bb14b809a0df))
* **deps:** bump locter from 2.1.0 to 2.1.1 ([#2252](https://github.com/authup/authup/issues/2252)) ([1b5b413](https://github.com/authup/authup/commit/1b5b4138a36337442f8246fe0f887bc7e761c01f))
* **deps:** bump locter from 2.1.1 to 2.1.2 ([#2362](https://github.com/authup/authup/issues/2362)) ([a439d1c](https://github.com/authup/authup/commit/a439d1c4fee377c908805e790b538078a5de73cd))
* **deps:** bump mysql2 from 3.10.0 to 3.10.1 ([#2065](https://github.com/authup/authup/issues/2065)) ([a9c7d44](https://github.com/authup/authup/commit/a9c7d44c8f3d4119f763d97ab5b59318923565df))
* **deps:** bump mysql2 from 3.10.2 to 3.11.0 ([#2184](https://github.com/authup/authup/issues/2184)) ([c6ea31e](https://github.com/authup/authup/commit/c6ea31e7be3de6c51a2d929e529d855a164b4290))
* **deps:** bump mysql2 from 3.11.0 to 3.11.3 ([#2328](https://github.com/authup/authup/issues/2328)) ([c710f04](https://github.com/authup/authup/commit/c710f04583df4b91c6ddfad3c62e531deaf9df94))
* **deps:** bump nodemailer and @types/nodemailer ([#2344](https://github.com/authup/authup/issues/2344)) ([6dd1adb](https://github.com/authup/authup/commit/6dd1adba8e87f857636eaeeab40012a4b501a6b2))
* **deps:** bump pg from 8.12.0 to 8.13.0 ([#2340](https://github.com/authup/authup/issues/2340)) ([997a0af](https://github.com/authup/authup/commit/997a0afae7624711b53ecb8e64354c5fdb6c35b6))
* **deps:** bump typeorm-extension from 3.6.0 to 3.6.1 ([#2219](https://github.com/authup/authup/issues/2219)) ([381e722](https://github.com/authup/authup/commit/381e72221a1099fcf19e7c41b5840e1bd212f903))
* **deps:** bump validup from 0.1.5 to 0.1.6 ([#2275](https://github.com/authup/authup/issues/2275)) ([8aac82f](https://github.com/authup/authup/commit/8aac82f8edcc955046ea42f410c937686390911d))
* enforce uniqueness for all database types ([48cd4a7](https://github.com/authup/authup/commit/48cd4a70b62993ee99864aa68babbc29eacfa0a1))
* fallback to authorization header in token introspect endpoint handler ([4d08cc5](https://github.com/authup/authup/commit/4d08cc57c038cd5fccf5af482911f6b29ebffb52))
* rate-limit middleware & fix permission db provider ([66e43f3](https://github.com/authup/authup/commit/66e43f39d45cd1f6e0139d00bf9d16984c2b2b5a))
* remove permission-item aggregate fn helper ([66a1d92](https://github.com/authup/authup/commit/66a1d92fea12805e7fbb3dc386bf069e90fbeb94))
* renamed helper buildPolicyDataForRequest ([6810bc3](https://github.com/authup/authup/commit/6810bc3a65947e614be23ca0d68fd8daaabf1243))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20
    * @authup/core-kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20
    * @authup/core-http-kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20
    * @authup/server-kit bumped from ^1.0.0-beta.19 to ^1.0.0-beta.20

## [1.0.0-beta.19](https://github.com/authup/authup/compare/v1.0.0-beta.18...v1.0.0-beta.19) (2024-06-30)


### Features

* add http api client for policy entity ([bee1f3a](https://github.com/authup/authup/commit/bee1f3a9d0acbf600f4f1b1f6b7dd89a3d9288fa))
* add policy (event context, domain type, subscriber, ...) ([42fbbb3](https://github.com/authup/authup/commit/42fbbb30211db0ad867a290d7571f2bcdd2118e6))
* reworked ability management and access ([#2102](https://github.com/authup/authup/issues/2102)) ([b3dc45c](https://github.com/authup/authup/commit/b3dc45c2a1d0cd403e8ab545bd87ce4e49738758))
* validate req id param + adjusted role repository ([#2109](https://github.com/authup/authup/issues/2109)) ([a05f1ad](https://github.com/authup/authup/commit/a05f1ad81b10f2b59b99d3e0b1d9a659a16fda6c))


### Bug Fixes

* cookie access in vue plugin & allow read on common attributes (realm/identity-provider) ([1cbb1a7](https://github.com/authup/authup/commit/1cbb1a7a08c1dce5aa7f7c60f776117e45dfdddc))
* **deps:** bump better-sqlite3 from 11.0.0 to 11.1.1 ([#2104](https://github.com/authup/authup/issues/2104)) ([6df6aee](https://github.com/authup/authup/commit/6df6aeef481a21d338d7e2e751e8864b08096229))
* remove console.log statement ([8ffda96](https://github.com/authup/authup/commit/8ffda96a625ec810fcea2190de2a06cfd00e1000))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/config bumped from ^1.0.0-beta.18 to ^1.0.1-beta.18
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
