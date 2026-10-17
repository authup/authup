<p align="center">
    <img src="./.github/assets/logo.svg" alt="Authup logo: a periwinkle-to-rose keyhole on a translucent tile" width="128" height="128" />
</p>

<h1 align="center">Authup</h1>

<p align="center">
    <b>Self-hostable identity and access management for your applications and APIs.</b><br>
    Login pages, OAuth2 and OpenID Connect, second factors, external logins and permissions,<br>
    in one process you start with a single command.
</p>

<p align="center">
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="https://www.npmjs.com/package/authup"><img src="https://img.shields.io/npm/v/authup?label=npm" alt="npm version" /></a>
    <a href="https://snyk.io/test/github/authup/authup"><img src="https://snyk.io/test/github/authup/authup/badge.svg" alt="Known vulnerabilities" /></a>
    <a href="./LICENSING.md"><img src="https://img.shields.io/badge/license-AGPL--3.0%20%2F%20Apache--2.0-blue" alt="License: AGPL-3.0 for apps, Apache-2.0 for packages" /></a>
</p>

<p align="center">
    <a href="#why-authup"><b>Why Authup</b></a>
    ·
    <a href="#quick-start">Quick start</a>
    ·
    <a href="#protect-your-api">Protect your API</a>
    ·
    <a href="#packages">Packages</a>
    ·
    <a href="https://authup.org">Documentation</a>
</p>

---

## Why Authup?

Every application with users ends up with the same layer: a login form, password reset mails, sessions, tokens, a second factor, "Sign in with GitHub", an admin screen to manage it all, and `if (user.isAdmin)` checks spread through every API. Each piece is easy to start and hard to get right, and none of it is what your application is about.

Authup is that layer, run as a service:

| Concern | Without it | With Authup |
|---|---|---|
| **Login pages** | You build login, registration, password recovery and consent screens and keep them secure | Hosted pages on the identity provider's origin: login, consent, registration, activation, password recovery, logout and device verification |
| **Protocols** | A hand-rolled JWT or session scheme every client has to learn | OAuth 2.0 and OpenID Connect: authorization code with PKCE, client credentials, refresh tokens rotated with replay detection, device authorization grant, discovery, userinfo, RP-initiated and back-channel logout |
| **Second factor** | A TOTP library glued onto your login | TOTP, recovery codes, email codes and WebAuthn passkeys, enrolled by the user in the account console |
| **External logins** | One integration per provider | OAuth2 and OpenID Connect providers (presets for GitHub, Google, Facebook, Instagram, PayPal), LDAP, and account linking |
| **Authorization** | Role checks hard-coded in every route | Permissions granted to roles, users and clients. Each grant carries a realm reach (`own`, `ownOrNull`, `any`) and optional policies: attributes, identity, time, date, realm match, composites |
| **Tenants** | A tenant column on every table and every query | Realms, each with its own users, clients, roles and signing keys, and realm administrators |
| **Your APIs** | Verifying tokens and fetching keys yourself | Server adapters for Node `http`, Socket.IO and the Web `Request` API, verifying locally against the realm's cached keys or by introspection |
| **Administration** | Database scripts | An admin console for every entity, and an account console where users manage their profile, password, authenticators, sessions, connected accounts and applications |
| **Audit** | Log lines nobody can query | A security event log (logins, failed logins, refresh replays, entity changes) with a dashboard, kept 90 days by default, plus Prometheus metrics |
| **Deployment** | A stack of services to wire together | One image and one process; `npm create authup` writes the docker, compose, Helm or bare-metal files; the same image splits into core, console and worker replicas |

Your applications sign in at Authup; your APIs verify what Authup issued:

<p align="center">
    <img src="./.github/assets/architecture.svg" alt="Your applications (a web app with the authorization code flow and PKCE, a service with client credentials, a CLI with the device grant) sign in at Authup and receive tokens. One Authup process serves the OAuth2 and OpenID Connect endpoints, the realm signing keys, the management API and the auth, admin and account consoles on one origin, backed by PostgreSQL or MySQL and optionally Redis. Applications send the access token as a Bearer header to your APIs, whose Authup server adapter verifies it locally with the realm's cached keys or remotely by introspection. For more traffic the same image runs as separate core, console and worker replicas." width="100%" />
</p>

**Table of Contents**

- [Quick start](#quick-start)
  - [Try it locally](#try-it-locally)
  - [Run it with Docker](#run-it-with-docker)
  - [Generate the deployment files](#generate-the-deployment-files)
- [How a request is authorized](#how-a-request-is-authorized)
- [Protect your API](#protect-your-api)
- [Call the management API](#call-the-management-api)
- [Scale out](#scale-out)
- [Applications](#applications)
- [Packages](#packages)
- [Development](#development)
- [Notes](#notes)
- [Contributing](#contributing)
- [Citation](#citation)
- [License](#license)

## Quick start

Authup needs Node.js `^22.13.0`, `^23.5.0` or `>=24.0.0`.

### Try it locally

```shell
npx authup@latest start
```

With no database configured, Authup outside production falls back to SQLite and writes `db.sqlite` into the current directory. That is for trying things out, not for production.

One listener on `http://localhost:3000` serves everything:

| Path | What |
|---|---|
| `/` | The API, the OAuth2 and OpenID Connect endpoints |
| `/console/admin` | The admin console |
| `/console/account` | The account console for end users |
| `/console/auth` | The hosted login, consent, registration and password recovery pages |

Sign in to the admin console as `admin` with the password `start123` in the `master` realm, and change it (`USER_ADMIN_PASSWORD` sets it before the first boot).

### Run it with Docker

The image runs in production mode, which refuses SQLite, so point it at a PostgreSQL or MySQL database:

```shell
docker run \
  -p 3000:3000 \
  -e PUBLIC_URL=http://localhost:3000 \
  -e DB_TYPE=postgres \
  -e DB_HOST=postgres.example.com \
  -e DB_PORT=5432 \
  -e DB_USERNAME=authup \
  -e DB_PASSWORD=secret \
  -e DB_DATABASE=authup \
  authup/authup:latest start
```

The same values can live in an `authup.yml` file; environment variables win over the file. The [deployment guide](https://authup.org/guide/deployment/) covers compose files with the database included, reverse proxies and every configuration key.

### Generate the deployment files

```shell
npm create authup@latest
```

A few questions (target, public URL, database, registration, mail, admin password) and the wizard writes a `docker run` env file, a compose project, Helm values for the chart at `https://helm.authup.org`, or a bare-metal project. It never overwrites a file without `--force`, and it pins the image tag or the `authup` dependency to its own release (the Helm values name no tag; the chart's version decides it).

## How a request is authorized

<p align="center">
    <img src="./.github/assets/flow.svg" alt="Your application sends the browser to the hosted /authorize page with PKCE. The person signs in with a password, LDAP or an external provider such as GitHub, Google or any OpenID Connect provider, completes a second factor (TOTP, passkey or email code) if one is enrolled, and consents once per application. Your application redeems the code at /token for an access and a refresh token. Your API verifies the access token and decides with grants: each grant is a permission, such as user_update, a realm reach of own, ownOrNull or any, and an optional policy such as attributes or time." width="100%" />
</p>

- **The hosted pages decide the steps.** A second factor is only asked for when the person has one enrolled, or when `MFA_REQUIRED` is set. Consent is remembered per application, and Authup's own consoles skip it.
- **Refresh tokens rotate.** Every refresh returns a new pair. Presenting a used refresh token again revokes the whole session.
- **A grant is three things.** The permission (`user_update`), how far it reaches (`own` realm, `ownOrNull` for the own realm and global rows, or `any` realm), and optional policies that must pass as well. Authup evaluates the same model for its own management API.

## Protect your API

Install an adapter and its verifier:

```shell
npm install @authup/server-adapter-node @authup/server-adapter-kit
```

The middleware reads the `Authorization: Bearer` header, verifies the token and hands you its claims, which you attach to the request. It works with Node's `http` server, Express and anything else with a `(req, res, next)` signature:

```typescript
import type { TokenVerificationData } from '@authup/server-adapter-kit';
import { TokenVerifier } from '@authup/server-adapter-kit';
import { createMiddleware } from '@authup/server-adapter-node';

declare module 'node:http' {
    interface IncomingMessage {
        auth?: TokenVerificationData;
    }
}

app.use(createMiddleware({
    tokenVerifier: new TokenVerifier({ baseURL: 'https://auth.example.com' }),
    tokenVerifierHandler: (req, data) => {
        req.auth = data;
    },
}));

app.get('/orders', (req, res) => {
    if (!req.auth) {
        res.statusCode = 401;
        res.end();
        return;
    }

    res.end(`orders of ${req.auth.sub} in realm ${req.auth.realm_name}`);
});
```

The `declare module` block types `req.auth` everywhere, including Express's `Request`, which extends `IncomingMessage`. A request without a token passes through with `req.auth` unset; an invalid or expired token is handed to `next(error)`.

The verifier runs in one of two modes:

| Mode | When | What you get |
|---|---|---|
| **Local** | No `creator` passed | The signature is checked against the keys of the realm named in the token, fetched once and kept for 5 minutes. No request to Authup per call. `permissions` is empty: an access token does not carry them |
| **Remote** | A `creator` passed | The token is introspected with your API's own client credentials. `permissions` lists the grants of the token's subject |

Remote mode lets the API decide on permissions:

```typescript
import { createClientTokenCreator } from '@authup/core-http-kit';
import { TokenVerifier } from '@authup/server-adapter-kit';

const tokenVerifier = new TokenVerifier({
    baseURL: 'https://auth.example.com',
    creator: createClientTokenCreator(
        { id: process.env.AUTHUP_CLIENT_ID ?? '', secret: process.env.AUTHUP_CLIENT_SECRET ?? '' },
        { client: { baseURL: 'https://auth.example.com' } },
    ),
});

export async function canReadOrders(token: string) {
    const data = await tokenVerifier.verify(token);
    return data.permissions.some((permission) => permission.name === 'order_read');
}
```

Give the API's client the `token_introspect` permission. Without it, the API may only introspect tokens issued to itself, and every other token is reported inactive.

Pass a `cache` to keep verified tokens between requests: for the token's remaining lifetime, or at most `maxRemoteCacheTTL` seconds in remote mode, which bounds how long a revoked token is still accepted.

For Socket.IO use [`@authup/server-adapter-socket-io`](packages/server-adapter-socket-io), and for runtimes built on the Web `Request` API use [`@authup/server-adapter-web`](packages/server-adapter-web).

## Call the management API

Everything the admin console does goes through the same HTTP API, and [`@authup/core-http-kit`](packages/core-http-kit) types every endpoint:

```typescript
import { Client, ClientAuthenticationHook, createClientTokenCreator } from '@authup/core-http-kit';

const client = new Client({ baseURL: 'https://auth.example.com' });

const hook = new ClientAuthenticationHook({
    tokenCreator: createClientTokenCreator(
        { id: process.env.AUTHUP_CLIENT_ID ?? '', secret: process.env.AUTHUP_CLIENT_SECRET ?? '' },
        { client: { baseURL: 'https://auth.example.com' } },
    ),
});
hook.attach(client);

const { data: users, meta } = await client.user.getMany({
    filters: { realmId: '<realm id>' },
    pagination: { limit: 20 },
});
```

The hook fetches a token on the first `401`, retries the request and refreshes the token before it expires. Every collection takes `filters`, `sort`, `fields`, `relations` and `pagination`, limited to what the entity's schema allows (`GET /<collection>/@schema` lists it).

From a terminal, the CLI does the same after a device login:

```shell
npx authup login --server https://auth.example.com --client <client id>
npx authup api user list --filter "name=~adm~" --limit 20
```

## Scale out

The one process from the quick start is a set of roles of one binary:

| Command | Runs |
|---|---|
| `authup start` | Everything on one listener: API, all enabled consoles, background sweeps |
| `authup start core` | The API and the identity provider alone |
| `authup start console [admin\|account\|auth]` | One console, or every enabled one, each on its own port |
| `authup start worker` | The background sweeps alone, with a health endpoint and no API |

All roles read the same `authup.yml`. Running API and console replicas side by side needs Redis, since an authorization code is minted on one replica and redeemed on another. See [console replicas](https://authup.org/guide/deployment/console-replicas) and [worker](https://authup.org/guide/deployment/worker).

## Applications

| Name | Type | Description |
|---|---|---|
| [authup](apps/authup) | CLI | The operator binary: `start` and its roles, `migration`, `healthcheck`, `config`, and the client commands `login`, `logout`, `whoami` and `api` |
| [server-core](apps/server-core) | Service | The OAuth2 and OpenID Connect endpoints and the management API |
| [server-auth-console](apps/server-auth-console) | Service | Renders the hosted login, consent and workflow pages on the identity provider's origin |
| [server-admin-console](apps/server-admin-console) | Service | Serves the admin console bundle with its runtime configuration and theme |
| [server-account-console](apps/server-account-console) | Service | Serves the account console bundle with its runtime configuration and theme |
| [client-auth-console](apps/client-auth-console) | Bundle | The server-rendered Vue app behind the hosted pages; replace it to reskin them |
| [client-admin-console](apps/client-admin-console) | Bundle | The administration single-page app, also hostable on its own |
| [client-account-console](apps/client-account-console) | Bundle | The end-user self-service single-page app, also hostable on its own |

## Packages

| Name | Version | Description |
|---|---|---|
| [access](packages/access) | [![npm](https://img.shields.io/npm/v/@authup/access?label=)](https://www.npmjs.com/package/@authup/access) | Permission and policy evaluation, usable outside the server |
| [client-web-kit](packages/client-web-kit) | [![npm](https://img.shields.io/npm/v/@authup/client-web-kit?label=)](https://www.npmjs.com/package/@authup/client-web-kit) | Vue components and composables: login forms, entity forms and lists, the auth store |
| [client-web-kit-theme](packages/client-web-kit-theme) | [![npm](https://img.shields.io/npm/v/@authup/client-web-kit-theme?label=)](https://www.npmjs.com/package/@authup/client-web-kit-theme) | Base vuecs theme and component styles for `client-web-kit` |
| [client-web-nuxt](packages/client-web-nuxt) | [![npm](https://img.shields.io/npm/v/@authup/client-web-nuxt?label=)](https://www.npmjs.com/package/@authup/client-web-nuxt) | Nuxt module for applications signing in with Authup |
| [client-web-theme](packages/client-web-theme) | [![npm](https://img.shields.io/npm/v/@authup/client-web-theme?label=)](https://www.npmjs.com/package/@authup/client-web-theme) | Authup's application theme for vuecs components |
| [core-http-kit](packages/core-http-kit) | [![npm](https://img.shields.io/npm/v/@authup/core-http-kit?label=)](https://www.npmjs.com/package/@authup/core-http-kit) | Typed HTTP client for every endpoint, with the token refresh hook |
| [core-kit](packages/core-kit) | [![npm](https://img.shields.io/npm/v/@authup/core-kit?label=)](https://www.npmjs.com/package/@authup/core-kit) | Domain types, constants and validators |
| [core-realtime-kit](packages/core-realtime-kit) | [![npm](https://img.shields.io/npm/v/@authup/core-realtime-kit?label=)](https://www.npmjs.com/package/@authup/core-realtime-kit) | Toolkit for realtime clients |
| [create-authup](packages/create-authup) | [![npm](https://img.shields.io/npm/v/create-authup?label=)](https://www.npmjs.com/package/create-authup) | `npm create authup`: writes docker, compose, Helm or bare-metal deployment files |
| [errors](packages/errors) | [![npm](https://img.shields.io/npm/v/@authup/errors?label=)](https://www.npmjs.com/package/@authup/errors) | Error codes and error classes shared by server and clients |
| [i18n](packages/i18n) | [![npm](https://img.shields.io/npm/v/@authup/i18n?label=)](https://www.npmjs.com/package/@authup/i18n) | Translations in English, German, French and Spanish |
| [kit](packages/kit) | [![npm](https://img.shields.io/npm/v/@authup/kit?label=)](https://www.npmjs.com/package/@authup/kit) | General utilities without service context |
| [server-adapter-kit](packages/server-adapter-kit) | [![npm](https://img.shields.io/npm/v/@authup/server-adapter-kit?label=)](https://www.npmjs.com/package/@authup/server-adapter-kit) | Token verification, key and result caching for the adapters |
| [server-adapter-node](packages/server-adapter-node) | [![npm](https://img.shields.io/npm/v/@authup/server-adapter-node?label=)](https://www.npmjs.com/package/@authup/server-adapter-node) | Middleware for Node `http`, Express and compatible servers |
| [server-adapter-socket-io](packages/server-adapter-socket-io) | [![npm](https://img.shields.io/npm/v/@authup/server-adapter-socket-io?label=)](https://www.npmjs.com/package/@authup/server-adapter-socket-io) | Socket.IO middleware for token verification |
| [server-adapter-web](packages/server-adapter-web) | [![npm](https://img.shields.io/npm/v/@authup/server-adapter-web?label=)](https://www.npmjs.com/package/@authup/server-adapter-web) | Token verification for the Web `Request` API |
| [server-config](packages/server-config) | [![npm](https://img.shields.io/npm/v/@authup/server-config?label=)](https://www.npmjs.com/package/@authup/server-config) | Every key of `authup.yml`, declared once |
| [server-config-kit](packages/server-config-kit) | [![npm](https://img.shields.io/npm/v/@authup/server-config-kit?label=)](https://www.npmjs.com/package/@authup/server-config-kit) | Configuration registries: environment readers, validation, defaults, JSON Schema |
| [server-console-kit](packages/server-console-kit) | [![npm](https://img.shields.io/npm/v/@authup/server-console-kit?label=)](https://www.npmjs.com/package/@authup/server-console-kit) | Serving, security headers and theming shared by the console services |
| [server-kit](packages/server-kit) | [![npm](https://img.shields.io/npm/v/@authup/server-kit?label=)](https://www.npmjs.com/package/@authup/server-kit) | Shared server-side contracts and utilities |
| [server-test-kit](packages/server-test-kit) | [![npm](https://img.shields.io/npm/v/@authup/server-test-kit?label=)](https://www.npmjs.com/package/@authup/server-test-kit) | Test fakes for server packages |
| [specs](packages/specs) | [![npm](https://img.shields.io/npm/v/@authup/specs?label=)](https://www.npmjs.com/package/@authup/specs) | Constants and types for OAuth2, OpenID Connect and JWT |

## Development

```shell
npm install
npm run build
npm run dev
```

`npm run dev` runs the experimental `authup dev` command: server-core runs from TypeScript and every console is served with hot module replacement, all on `http://localhost:3000`. Run `npm run test` for the test suite and `npm run lint` for the linter; the build is required before testing.

## Notes

- **The default admin password is public.** `admin` / `start123` is provisioned on the first boot unless `USER_ADMIN_PASSWORD` says otherwise. Change it, or set `USER_ADMIN_ENABLED=false` once you have another administrator.
- **SQLite is for trying things out.** It works outside production only, and a deployment with more than one replica needs PostgreSQL or MySQL plus Redis.
- **Local verification does not see revocations.** An adapter in local mode accepts an access token until it expires (15 minutes by default) even after its session was revoked, and disabling a signing key reaches it after its key cache expires (5 minutes by default). Use remote mode where that matters.
- **Console theming is experimental.** A mounted theme directory rebrands every console without a rebuild; its layout and manifest may still change.

## Contributing

Before starting to work on a pull request, it is important to review the guidelines for
[contributing](./CONTRIBUTING.md) and the [code of conduct](./CODE_OF_CONDUCT.md).
These guidelines will help to ensure that contributions are made effectively and are accepted.

## Citation

If you use Authup in academic work, please cite it. Citation metadata is maintained in
[`CITATION.cff`](./CITATION.cff): GitHub renders a **"Cite this repository"** button from it.

Authup is archived on [Zenodo](https://doi.org/10.5281/zenodo.20836542), which mints a DOI for
each release. The badge below resolves to the **concept DOI**: it always points to the latest
version; to cite a specific release, use that version's DOI from the
[Zenodo record](https://doi.org/10.5281/zenodo.20836542).

[![DOI](https://zenodo.org/badge/380934910.svg)](https://doi.org/10.5281/zenodo.20836542)

Example (BibTeX):

```bibtex
@software{placzek_authup,
  author    = {Placzek, Peter},
  title     = {Authup},
  url       = {https://github.com/authup/authup},
  doi       = {10.5281/zenodo.20836542},
  publisher = {Zenodo}
}
```

## License

Made with 💚

Authup is dual-licensed:

- All **applications** under [apps/](apps) (the CLI, core and console services,
  and client bundles) are published under the [AGPL-3.0](./LICENSE). A
  commercial license is available for organizations that cannot meet the AGPL's
  conditions.
- All **packages** under [packages/](packages) (client libraries, SDKs, server adapters, shared kits)
  remain under the permissive [Apache 2.0 License](packages/kit/LICENSE): integrating your own
  application with an Authup server never subjects it to the AGPL.

See [LICENSING.md](./LICENSING.md) for details, or contact **contact@tada5hi.net** for commercial licensing.
