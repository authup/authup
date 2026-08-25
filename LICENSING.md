# Licensing

Authup uses a dual-licensing model. The monorepo contains components under two different licenses —
each application and package directory carries its own `LICENSE` file, which is authoritative for the
code in that directory.

## Overview

| Component | License |
|---|---|
| [apps/server-core](apps/server-core) (`@authup/server-core`) | AGPL-3.0-only **or** commercial |
| [apps/client-admin-console](apps/client-admin-console) (`@authup/client-admin-console`) | AGPL-3.0-only **or** commercial |
| [apps/client-account-console](apps/client-account-console) (`@authup/client-account-console`) | AGPL-3.0-only **or** commercial |
| [apps/client-auth-console](apps/client-auth-console) (`@authup/client-auth-console`) | AGPL-3.0-only **or** commercial |
| All packages under [packages/](packages) (`@authup/kit`, `@authup/core-kit`, `@authup/core-http-kit`, `@authup/access`, `@authup/errors`, `@authup/specs`, `@authup/i18n`, `@authup/server-kit`, `@authup/server-adapter-*`, `@authup/client-web-kit*`, `@authup/client-web-theme`, `@authup/client-web-nuxt`, ...) | Apache-2.0 |

In short: **the Authup product (server and consoles) is AGPL-3.0; everything you need to
integrate your own application with an Authup server stays permissively licensed (Apache-2.0).**

## What this means for you

### Research, education & non-profit

Use Authup freely under the AGPL-3.0. Academic and research deployments, university projects, and
non-profit organizations typically have no difficulty meeting the AGPL's conditions.

### Open-source projects

Use Authup freely under the AGPL-3.0. If you modify the Authup applications and make them available
to users over a network, the AGPL requires you to publish your modifications under the same license.

### Integrating with an Authup server

Client libraries, SDKs, server adapters, and shared kits under `packages/` are Apache-2.0. Building
a (closed-source, commercial, or otherwise proprietary) application that *talks to* an Authup server —
via `@authup/core-http-kit`, the `@authup/server-adapter-*` middlewares, `@authup/client-web-kit`,
or any other published package — does **not** subject your application to the AGPL.

### Commercial use of the applications

Running unmodified Authup applications is permitted under the AGPL-3.0. If your organization

- modifies Authup and does not want to publish those modifications,
- embeds or redistributes Authup as part of a proprietary product, or
- offers Authup (modified or not) to third parties as a managed/hosted service without AGPL obligations,

then a commercial license is available. Contact **contact@tada5hi.net** for terms.

## Prior versions

All versions published **up to and including `v1.0.0-beta.46`** were released under the
Apache-2.0 license and remain so — a license change is never retroactive. The dual-licensing model
applies to all subsequent releases.

## Contributions

Contributions are accepted under the project's
[Contributor License Agreement](https://gist.github.com/tada5hi/0777b868a51c7a6e4080b9d1b19c8192),
enforced via CLA Assistant on every pull request. The CLA grants the project maintainer the rights
required to distribute contributions under both the open-source and commercial license — contributors
retain ownership of their work.
