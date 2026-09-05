# @authup/server-config

[![npm version](https://badge.fury.io/js/@authup%2Fserver-config.svg)](https://badge.fury.io/js/@authup%2Fserver-config)
[![main](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/authup/authup/badge.svg)](https://snyk.io/test/github/authup/authup)

Every key of `authup.yml`, declared exactly once.

`@authup/server-config-kit` is the MECHANISM (the declaration shape, the
environment readers, the passes over a registry). This package is the set of
KEYS: every configuration key an authup deployment understands, with its
document path, its environment variable, its default, its reader and its zod
type.

A service declares nothing. It SELECTS the keys it reads, by name, and its own
config type is an intersection of the section types it selected from. So two
services reading one key cannot spell its path, its environment variable or its
reader differently, and a service cannot silently forget a key either: the key
is either named or it is not read.

One module per document section, under `src/sections/`:

| Directory | Section |
|---|---|
| `root` | the root keys (`publicUrl`, `internalUrl`, `trustedOrigins`, `db`, `redis`, `smtp`, ...) |
| `theme` | `theme.*` |
| `core` | `core.*` |
| `admin-console` | `adminConsole.*` |
| `account-console` | `accountConsole.*` |
| `auth-console` | `authConsole.*` |

`SCHEMA` is the whole document: what `authup config schema` prints and what
`authup config validate` checks a file against, so a console's key is neither
missing from the emitted JSON Schema nor reported as unread.

The document types its own values with authup's own types
(`DatabaseConnectionOptions`, `RedisConnectionOptions`, `SMTPConnectionOptions`,
`MiddlewareOptions`) rather than the ones of whichever library eventually
consumes them. This package sits below every server package, so borrowing would
drag typeorm and six `@routup/*` packages into a static file server.

## Installation

```bash
npm install @authup/server-config --save
```

## Usage

```typescript
import { ADMIN_CONSOLE_SCHEMA, ROOT_SCHEMA, SECTION_KEY, THEME_SCHEMA } from '@authup/server-config';
import { defineSchema } from '@authup/server-config-kit';

export const CONFIG_SCHEMA = defineSchema<ConfigInput>({
    ...ADMIN_CONSOLE_SCHEMA,
    ...ROOT_SCHEMA,
    [SECTION_KEY.THEME]: THEME_SCHEMA,
});
```

## License

Made with 💚

Published under [Apache-2.0 License](./LICENSE).
