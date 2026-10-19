<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-config</h1>

<p align="center">
    <b>Every key of authup.yml, declared once: path, environment variable, default, reader and zod type.</b><br>
    Authup's services select the keys they read instead of declaring them, so no two can spell one differently.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-config"><img src="https://img.shields.io/npm/v/@authup/server-config" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

[`@authup/server-config-kit`](https://github.com/authup/authup/tree/master/packages/server-config-kit) is the mechanism (the declaration shape, the environment readers, the passes over a registry). This package is the set of keys: the whole `authup.yml` document as one registry per section. Server-core and the three console services each build their configuration as a selection of these sections, and the `authup` CLI runs `config validate` and `config schema` against the whole document. The values are typed with Authup's own types rather than those of typeorm or routup, so a console importing this package pulls in no database driver or HTTP middleware.

You install it directly when you write tooling around an Authup deployment's configuration, or a service that has to read the same document. To configure a deployment, see the [configuration guide](https://authup.org/guide/deployment/) instead.

**Table of Contents**

- [Installation](#installation)
- [Sections](#sections)
- [Usage](#usage)
- [API](#api)
- [Notes](#notes)
- [License](#license)

## Installation

```shell
npm install @authup/server-config @authup/server-config-kit
```

The package is ESM only and needs Node.js `^22.13.0 || ^23.5.0 || >=24.0.0`.

## Sections

The document nests one section per service. A section declares its keys in the vocabulary of the service it configures (`url`, `port`, `host`), and the section name supplies the location.

| Section | Schema | Keys |
|---|---|---|
| root | `ROOT_SCHEMA` | `env`, `rootPath`, `host` (`HOST`, the default host every listener inherits), `publicUrl`, `internalUrl`, `trustedOrigins`, `db`, `redis`, `smtp` |
| `theme` | `THEME_SCHEMA` | `directoryPath`, `fragmentsEnabled` |
| `core` | `CORE_SCHEMA` | server-core's listener, worker, token lifetimes, registration and recovery, rate limits, event log, MFA, built-in admin and system client, middleware toggles |
| `authConsole` | `AUTH_CONSOLE_SCHEMA` | `url`, `path`, `port` (3020), `host` |
| `adminConsole` | `ADMIN_CONSOLE_SCHEMA` | `url`, `enabled`, `path`, `port` (3021), `host` |
| `accountConsole` | `ACCOUNT_CONSOLE_SCHEMA` | `url`, `enabled`, `path`, `port` (3022), `host` |

`SCHEMA` is all of them together, and `AuthupConfig` its type. Every variable name is a member of the `EnvironmentVariable` enum.

## Usage

### Select the keys a service reads

```typescript
import type { CoreConfig, EnvironmentVariable, RootConfig, ThemeConfig, ToObjectLiteral } from '@authup/server-config';
import { CORE_SCHEMA, ROOT_SCHEMA, SECTION_KEY, THEME_SCHEMA } from '@authup/server-config';
import { defineSchema } from '@authup/server-config-kit';

type ConfigInput = ToObjectLiteral<
    RootConfig &
    {
        [SECTION_KEY.THEME]: ThemeConfig,
        [SECTION_KEY.CORE]: Pick<CoreConfig, 'host' | 'port'>,
    }
>;

export const CONFIG_SCHEMA = defineSchema<ConfigInput, 'publicUrl' | 'internalUrl' | 'db'>({
    ...ROOT_SCHEMA,
    [SECTION_KEY.THEME]: THEME_SCHEMA,
    [SECTION_KEY.CORE]: defineSchema<Pick<CoreConfig, 'host' | 'port'>, never, EnvironmentVariable>({
        host: CORE_SCHEMA.host,
        port: CORE_SCHEMA.port,
    }),
});
```

A section is spread flat when it is the service's own, and kept under its section key otherwise. Selecting single entries (`CORE_SCHEMA.host`) rather than a whole section keeps that section's other derivations out: running a section's resolvers also runs its invariants.

### Read the document

```typescript
import { readConfigRaw } from '@authup/server-config';
import { buildSchemaDefaults, mergeSchemaData, resolveSchemaData } from '@authup/server-config-kit';

const raw = await readConfigRaw<ConfigInput>(CONFIG_SCHEMA, {
    fs: { cwd: '/etc/authup' },
    env: true,
});

const config = resolveSchemaData<ConfigInput>(
    CONFIG_SCHEMA,
    mergeSchemaData<ConfigInput>(CONFIG_SCHEMA, buildSchemaDefaults<ConfigInput>(CONFIG_SCHEMA), raw),
) as ConfigInput;

config.publicUrl; // derived from core.host and core.port when the document names none
```

`readConfigRaw` reads the file, the environment, or both; with both, the environment wins and a list from the environment replaces the file's list. `fs` takes `cwd`, an explicit `file` (string or array) and an `fn` hook; `env` takes `fn`. Validate the result with `mountSchema` from the kit before resolving when it comes from an operator.

### Inspect a configuration file

```typescript
import { SCHEMA, inspectConfigFile } from '@authup/server-config';
import { buildSchemaJSONSchema } from '@authup/server-config-kit';

const { files, unknown } = await inspectConfigFile({ cwd: '/etc/authup' });
const schema = buildSchemaJSONSchema(SCHEMA, { title: 'authup' });
```

`files` lists what was loaded (empty means the configuration comes from the environment alone) and `unknown` every path no key claims, which is what `authup config validate` reports. `buildSchemaJSONSchema(SCHEMA, ...)` is what `authup config schema` prints.

## API

| Export | Kind | Purpose |
|---|---|---|
| `SCHEMA` | registry | The whole document |
| `ROOT_SCHEMA`, `THEME_SCHEMA`, `CORE_SCHEMA`, `AUTH_CONSOLE_SCHEMA`, `ADMIN_CONSOLE_SCHEMA`, `ACCOUNT_CONSOLE_SCHEMA` | registry | One section each |
| `AuthupConfig`, `RootConfig`, `ThemeConfig`, `CoreConfig`, `CoreWorkerConfig`, `AuthConsoleConfig`, `AdminConsoleConfig`, `AccountConsoleConfig` | type | Section value types |
| `DatabaseConnectionOptions`, `RedisConnectionOptions`, `SMTPConnectionOptions`, `MiddlewareOptions`, `CertificateSource` | type | Value types of individual keys |
| `ToObjectLiteral`, `AuthupConfigDerivedKey` | type | Building blocks for a service's own config type |
| `SECTION_KEY`, `EnvironmentVariable` | enum | Section names and every environment variable |
| `FILE_NAME`, `FILE_EXTENSIONS` | constant | `authup` plus `yml yaml json js mjs cjs ts mts` |
| `AUTH_CONSOLE_BASE_PATH`, `ADMIN_CONSOLE_BASE_PATH`, `ACCOUNT_CONSOLE_BASE_PATH` | constant | `/console/auth`, `/console/admin`, `/console/account` |
| `CERTIFICATE_SOURCES`, `EVENT_LOG_RETENTION_DAYS_DEFAULT`, `DEVELOPMENT_ORIGIN` | constant | Allowed certificate sources, the 90 day default, `http://localhost:5173` |
| `readConfigRaw`, `readConfigRawFromEnv`, `readConfigRawFromFS`, `readConfigFileTree`, `inspectConfigFile` | function | Read and inspect the document |
| `derivePublicUrl`, `resolveTrustedOrigins`, `expandToOrigins`, `assertConsoleOrigin`, `resolveRootRelativePath`, `toPublicHost` | function | The derivations the resolvers use |
| `isValidTrustProxyListEntry`, `canonicalizeTrustProxy`, `canonicalizeTrustProxyListEntry`, `canonicalizeTrustProxyValue` | function | `trustProxy` parsing |
| `urlOrEmpty` | zod type | A URL or the empty string |

## Notes

- **Normalization belongs to the document, not to a service.** `publicUrl`, `internalUrl`, `trustedOrigins`, every console `url` and every path key resolve inside the registry, so a console started on its own computes the same values server-core does.
- **`publicUrl` needs `core.host` and `core.port` in the selection.** Its resolver reads both; a registry without them fails `resolveSchemaData` with an error naming the missing key.
- **A console URL may change the path, never the origin.** A console `url` on another origin than `publicUrl` throws during resolution.
- **`trustedOrigins` refuses `**` in a host**, and a bare host expands to its http and https origin. Outside production `http://localhost:5173` is appended.
- **Only `authup.<ext>` is read.** A file of the retired `authup.conf` family is reported with a warning when found in the directory, and refused when named explicitly.
- **The read is permissive.** An unknown path is skipped rather than refused, so a document written for a newer version still boots; use `inspectConfigFile` or `authup config validate` to see what was ignored.
- **The `DB_*` variables are not in this registry.** They come from typeorm-extension and are read by server-core directly.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
