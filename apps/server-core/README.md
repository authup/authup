<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-core</h1>

<p align="center">
    <b>The Authup identity provider: OAuth2 and OpenID Connect endpoints plus the management API, as a library.</b><br>
    Run it with the <code>authup</code> CLI, or build it into your own process with its application factories.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-core"><img src="https://img.shields.io/npm/v/@authup/server-core" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License: AGPL-3.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/server-core?

An identity provider is more than a token endpoint: it is the authorization request and its consent, refresh token rotation, signing keys per tenant, second factors, external logins, a permission model and an API to manage all of it. server-core is that server. It renders no page: the hosted login pages and both consoles are separate services that reach it over HTTP.

| Concern | Without it | With server-core |
|---|---|---|
| **Protocols** | A hand-rolled token scheme | Authorization code with PKCE, client credentials, refresh tokens with replay detection, device authorization, discovery, userinfo, introspection, revocation, RP-initiated and back-channel logout |
| **Tenants** | A tenant column on every table | Realms with their own users, clients, roles and signing keys |
| **Authorization** | Role checks in every route | Permissions granted to roles, users and clients, each grant with a realm reach and optional policies |
| **Management** | Database scripts | A typed REST API for every entity, with a filterable, sortable query language |
| **Audit** | Log lines | A security event log with statistics, plus Prometheus metrics |

Most deployments never install this package directly: the [`authup`](https://github.com/authup/authup/tree/master/apps/authup) CLI depends on it and starts it. Install it when you embed the server in a process of your own.

## Installation

```shell
npm install @authup/server-core
```

Node.js `^22.13.0 || ^23.5.0 || >=24.0.0`. The package is ESM-only and ships no binary. The PostgreSQL, MySQL and SQLite drivers (`pg`, `mysql2`, `better-sqlite3`) come with it.

## Usage

### Start the server

```typescript
import { createApplication, registerShutdownHandlers } from '@authup/server-core';

const app = createApplication();
await app.setup();

registerShutdownHandlers(app);
```

`createApplication()` builds the module graph (config, logger, cache, mail, database, provisioning, LDAP, authentication, identity, OAuth2, background components, HTTP), and `setup()` reads the configuration from `authup.yml` in the current directory and the environment, applies migrations (unless `core.migrationEnabled` is `false`), provisions the `master` realm and listens. `registerShutdownHandlers` tears the application down on `SIGINT` / `SIGTERM`, exits immediately on a second signal and forces the exit after 10 seconds.

### Mount your own routes on the listener

```typescript
import { createApplication, HTTPModule } from '@authup/server-core';

const app = createApplication({
    http: new HTTPModule({
        mount: (router) => {
            router.use('/extra', extraHandler);
        },
    }),
});

await app.setup();
```

`mount` runs inside `HTTPModule.setup()`: after the controllers, so a wildcard route of yours cannot shadow a protocol route, and before the error middleware and the listener, so your routes inherit the error handling. This is how `authup start` puts the three consoles on server-core's port.

### Run the background worker alone

```typescript
import { createWorkerApplication, registerShutdownHandlers } from '@authup/server-core';

const worker = createWorkerApplication();
await worker.setup();

registerShutdownHandlers(worker);
```

The worker runs the cron sweeps (expired sessions and tokens, the event log retention and rollups) with a health listener on `core.worker.port` and nothing else. It never applies migrations, and it refuses to boot while `core.worker.enabled` is `false`. An API replica hands its sweeps over by setting `core.worker.enabled: false`.

### Reuse the migration command

```typescript
import { defineCommand, runMain } from 'citty';
import { defineCLIMigrationCommand } from '@authup/server-core';

await runMain(defineCommand({
    subCommands: {
        migration: defineCLIMigrationCommand(),
    },
}));
```

The command takes `run`, `revert` or `status` and creates the database when it does not exist.

## Configuration

Keys are declared once in [`@authup/server-config`](https://github.com/authup/authup/tree/master/packages/server-config); server-core reads the root keys and its own `core` section. The ones most deployments set:

| Key | Environment variable | Default | Description |
|---|---|---|---|
| `publicUrl` | `PUBLIC_URL` | derived from `core.host` and `core.port` | Where clients reach the API; every issuer derives from it |
| `host` | `HOST` | `0.0.0.0` | The deployment-wide bind address; every listener inherits it |
| `core.port` | `PORT` | `3000` | The API listener port |
| `db` | `DB_*` | SQLite outside production | The database connection |
| `redis` | `REDIS` | `false` | The cache; required when more than one replica runs |
| `trustedOrigins` | `TRUSTED_ORIGINS` | `[]` | Extra first-party origins the per-realm system clients may redirect to; every listed origin can obtain a full-permission user token |
| `core.migrationEnabled` | `MIGRATION_ENABLED` | `true` | Apply migrations at boot |
| `core.worker.enabled` | `WORKER_ENABLED` | `true` | Run the background sweeps in this process |
| `core.worker.port` | `WORKER_PORT` | inherits `PORT` | The worker health listener port |
| `core.userAdminPassword` | `USER_ADMIN_PASSWORD` | `start123` | The password of the provisioned `admin` user |
| `core.tokenAccessMaxAge` | `TOKEN_ACCESS_MAX_AGE` | `900` | Access token lifetime in seconds |
| `core.tokenRefreshMaxAge` | `TOKEN_REFRESH_MAX_AGE` | `259200` | Refresh token lifetime in seconds |
| `core.registrationEnabled` | `REGISTRATION_ENABLED` | `false` | Allow self-registration |
| `core.passwordRecoveryEnabled` | `PASSWORD_RECOVERY_ENABLED` | `false` | Allow password reset by mail |
| `core.mfaEnabled` | `MFA_ENABLED` | `false` | Allow second factors |
| `core.secretsEncryptionKey` | `SECRETS_ENCRYPTION_KEY` | `''` | Base64 32-byte key that wraps signing and encryption key material at rest |

`authup config schema` prints every key. The environment wins over `authup.yml`.

## API

The barrel (`src/index.ts`) re-exports the application, the CLI building blocks and the HTTP and database adapters. The entry points for an embedder:

| Export | Kind | Purpose |
|---|---|---|
| `createApplication` | Function | The full server: API, identity provider and background components |
| `createWorkerApplication` | Function | The background components with a health listener only |
| `ApplicationBuilder` | Class | Compose a module graph slot by slot |
| `HTTPModule` | Class | The HTTP module; `mount` composes routes onto its listener |
| `ConfigModule` | Class | Hand an already-read configuration to the graph |
| `defineCLIMigrationCommand` | Function | The `migration run\|revert\|status` command |
| `defineCLIHealthCheckCommand` | Function | The `healthcheck` command |
| `registerShutdownHandlers` | Function | `SIGINT` / `SIGTERM` teardown with a forced exit after 10 seconds |
| `CLI_CONFIG_ARGS`, `applyCLIConfigArgs` | Constant, Function | The `--configDirectory` / `--configFile` arguments |

## Notes

- **No page is rendered here.** `GET /authorize`, `/register`, `/activate`, `/password-forgot`, `/password-reset`, `/logout` and `/device` redirect to the auth console service with the request's own query; only the two cookie-mode login routes per console (`/console/<name>/login/start`, `/console/<name>/callback`) stay on server-core.
- **Production refuses SQLite.** With `NODE_ENV=production` the database must be PostgreSQL or MySQL.
- **A worker never migrates.** With `core.migrationEnabled: false` on every API replica, run `authup migration run` once per release.

## License

Made with 💚

Published under the [AGPL-3.0](./LICENSE). A commercial license is available; see [LICENSING.md](https://github.com/authup/authup/blob/master/LICENSING.md).
