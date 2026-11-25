# Changelog

## [1.0.0-beta.77](https://github.com/authup/authup/compare/v1.0.0-beta.77...v1.0.0-beta.77) (2026-11-25)


### Features

* bump dependencies and adopt their new features ([#3914](https://github.com/authup/authup/issues/3914)) ([aaf787b](https://github.com/authup/authup/commit/aaf787b98e6409c8f3e68e54a051d37f3093f551))

## [1.0.0-beta.77](https://github.com/authup/authup/compare/v1.0.0-beta.76...v1.0.0-beta.77) (2026-11-23)


### ⚠ BREAKING CHANGES

* **server-adapter-kit:** RedisTokenCache is no longer exported by @authup/server-adapter-kit; import it from @authup/server-adapter-redis.

### Bug Fixes

* **server-adapter-kit:** upstream errors, redis cache package ([#3894](https://github.com/authup/authup/issues/3894)) ([8354fff](https://github.com/authup/authup/commit/8354fff1955b0bbfa6d6e40fab47b66269e4c086))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @authup/server-adapter-kit bumped from ^1.0.0-beta.76 to ^1.0.0-beta.77
