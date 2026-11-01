<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-config-kit</h1>

<p align="center">
    <b>Declare a config type once and derive its environment reader, defaults, validation and JSON Schema.</b><br>
    The mechanism behind every Authup service's configuration, with no knowledge of which keys exist.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-config-kit"><img src="https://img.shields.io/npm/v/@authup/server-config-kit" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

A registry is a plain object that maps every key of a config type onto its zod type, a description, a default and, optionally, an environment variable plus the reader that turns the raw string into a value. This package holds the declaration shape and the passes over such a registry. Which keys exist is not its business: for Authup that is [`@authup/server-config`](https://github.com/authup/authup/tree/master/packages/server-config), which declares every key of `authup.yml` once. Server-core and the three console services select from it and run these passes. Its one internal dependency is `@authup/kit`, so a console service reads its configuration without inheriting server-core's native crypto bindings, logger or Redis client.

You install it directly only when you build a service of your own on the same registry model.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
- [Entry fields](#entry-fields)
- [API](#api)
- [Notes](#notes)
- [License](#license)

## Installation

```shell
npm install @authup/server-config-kit zod validup
```

`zod` is what your entries are typed with and `validup` provides the `Container` that `mountSchema` attaches validators to. Both are dependencies of this package as well; install them so your code imports the same copy.

The package is ESM only and needs Node.js `>=26.0.0`.

## Usage

### Declare a registry

```typescript
import { z } from 'zod';
import {
    defineSchema,
    readEnvBoolStrict,
    readEnvInt,
    readEnvString,
} from '@authup/server-config-kit';

type ListenerConfig = { host: string, port: number };
type Config = { publicUrl: string, debug: boolean, listener: ListenerConfig };

const LISTENER_SCHEMA = defineSchema<ListenerConfig>({
    host: {
        type: z.string(),
        default: '0.0.0.0',
        description: 'Address the listener binds.',
        env: 'HOST',
        readEnv: readEnvString,
    },
    port: {
        type: z.number().int().nonnegative(),
        default: 3000,
        description: 'Port the listener binds.',
        env: 'PORT',
        readEnv: readEnvInt,
    },
}, { pathPrefix: 'listener' });

export const SCHEMA = defineSchema<Config, 'publicUrl'>({
    publicUrl: {
        type: z.url(),
        description: 'Public URL. Derived from the listener port when unset.',
        env: 'PUBLIC_URL',
        readEnv: readEnvString,
        resolve: ({ value, get }) => (value as string | undefined) ||
            `http://localhost:${get('listener.port') as number}`,
    },
    debug: {
        type: z.boolean(),
        default: false,
        description: 'Verbose logging.',
        env: 'DEBUG',
        readEnv: readEnvBoolStrict,
    },
    listener: LISTENER_SCHEMA,
});
```

- **The type parameter is the exhaustiveness check.** A key of `Config` with no entry fails the build at the `defineSchema` call.
- **The second type parameter lists derived keys.** Every key not listed must declare a `default`; a listed key (here `publicUrl`) may not, and is computed by its `resolve`.
- **A section is a nested registry.** `pathPrefix` stamps `listener.host` and `listener.port` as the document paths of every entry that spells no `path` of its own, so the section declares its keys in its own vocabulary.

### Read, layer, validate and resolve

```typescript
import { Container } from 'validup';
import {
    buildSchemaDefaults,
    mergeSchemaData,
    mountSchema,
    readSchemaFromEnv,
    readSchemaFromFileTree,
    resolveSchemaData,
} from '@authup/server-config-kit';

declare const tree: unknown; // the parsed configuration file

export async function loadConfig(): Promise<Config> {
    const input = mergeSchemaData<Config>(
        SCHEMA,
        readSchemaFromFileTree<Config>(tree, SCHEMA),
        readSchemaFromEnv<Config>(SCHEMA),
    );

    const validator = new Container<Config>();
    mountSchema(validator, SCHEMA);
    const parsed = await validator.run(input);

    return resolveSchemaData<Config>(
        SCHEMA,
        mergeSchemaData<Config>(SCHEMA, buildSchemaDefaults<Config>(SCHEMA), parsed),
    ) as Config;
}
```

- **`mergeSchemaData` takes its sources lowest precedence first**, so the environment beats the file and the file beats the defaults. It recurses where the registry declares a section and replaces every other value whole, so an array or a connection object is never merged element by element.
- **`readSchemaFromFileTree` reads each key at its absolute document path.** A key the tree does not spell is absent, and so is a section with no key spelled.
- **`mountSchema` mounts every key as optional.** validup strips what nothing claims, so a section is mounted as a child container rather than skipped.
- **`resolveSchemaData` runs every `resolve` over merged data.** `get(path)` reaches any other key by its document path and resolves that key first if it derives too. Declaration order does not matter; a cycle throws and names the chain.

### Check a document and publish its schema

```typescript
import { buildSchemaJSONSchema, findUnknownSchemaPaths } from '@authup/server-config-kit';

const unknown: string[] = findUnknownSchemaPaths<Config>(tree, SCHEMA);
const document = buildSchemaJSONSchema(SCHEMA, { title: 'my-service' });
```

`findUnknownSchemaPaths` lists every path of the document that no entry claims, skipping keys that start with `x-`. `buildSchemaJSONSchema` emits a JSON Schema draft-07 document shaped like the configuration file: each property carries its description, its static default and its environment variable under `x-authup-env`.

## Entry fields

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `z.ZodType` | yes | What the value is validated against, and what the JSON Schema property is generated from |
| `description` | `string` | yes | Operator-facing text, published in the JSON Schema |
| `default` | value or `() => value` | unless the key is derived | A function is called on every `buildSchemaDefaults` run; an array default is copied per run |
| `path` | `string` | no | Absolute dotted location in the document. Defaults to `pathPrefix.key`, or the key at the root |
| `env` | `string` | with `readEnv` | Environment variable the key is read from |
| `readEnv` | `(raw, name) => unknown` | with `env` | Turns the raw string into a value; answering `undefined` leaves the key to the lower layers |
| `resolve` | `({ value, get }) => value` | no | Derives the final value from what the merge produced and from other keys |

### Environment readers

| Reader | Behaviour |
|---|---|
| `readEnvString` | The string; an empty string is skipped |
| `readEnvRaw` | The untrimmed string; skipped when blank |
| `readEnvInt` | An integer through `envix` |
| `readEnvBool` | Lenient boolean through `envix`; an unrecognized value is skipped |
| `readEnvBoolStrict` | Accepts `true t 1 yes y on` and `false f 0 no n off`, case-insensitive; any other non-blank value throws naming the variable |
| `readEnvArray` | A comma-separated list; an empty list is skipped |
| `readEnvBoolOrString` | A boolean word as a boolean, anything else as a string (a connection URL) |

## API

| Export | Kind | Purpose |
|---|---|---|
| `defineSchema` | function | Declare an object a registry and stamp `pathPrefix` paths |
| `readSchemaFromEnv` | function | Values of every entry carrying `env` |
| `readSchemaFromFileTree` | function | Values read from a parsed document by path |
| `buildSchemaDefaults` | function | Static and function-valued defaults |
| `mergeSchemaData` | function | Section-aware layering of the passes above |
| `resolveSchemaData` | function | Run every entry's `resolve` |
| `mountSchema` | function | Mount one validup validator per key onto a `Container` |
| `buildSchemaJSONSchema` | function | JSON Schema draft-07 document of the registry |
| `findUnknownSchemaPaths` | function | Document paths no entry claims |
| `readEnvString`, `readEnvRaw`, `readEnvInt`, `readEnvBool`, `readEnvBoolStrict`, `readEnvArray`, `readEnvBoolOrString` | function | Environment readers |
| `readSchemaEntryFromEnv`, `resolveSchemaEnvNames` | function | Single-entry environment read and its variable names |
| `isSchema`, `isSchemaInput`, `isSchemaEntry`, `isSchemaEntryInput`, `assertSchemaValue` | function | Tell a registry from an entry |
| `Schema`, `SchemaEntry`, `SchemaInput`, `SchemaEntryInput`, `SchemaEnvReader`, `SchemaResolveContext`, `SchemaEntryResolver`, `SchemaDefineOptions` | type | Declaration shapes |
| `SCHEMA_SYMBOL` | constant | The marker `defineSchema` sets |

## Notes

- **Compose registries with `mergeSchemaData`, never a spread of the results.** A later pass that carries one key of a section would replace the whole section object and drop every other key's file value and default.
- **A spread registry is a new object and must be declared again.** The `defineSchema` marker is a non-enumerable symbol, so `{ ...A, ...B }` loses it; wrap the composition in `defineSchema` as well.
- **A registry value is an entry or a nested registry, nothing else.** Every pass throws on a third kind of value instead of skipping it.
- **A function-valued default is left out of the JSON Schema**, since it depends on the process (cwd, `NODE_ENV`).
- **The file read does not coerce.** The environment readers turn strings into values; a file value reaches you as written, so run the validator over it.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
