<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/kit</h1>

<p align="center">
    <b>Context-free helpers shared across Authup: URL pattern matching, ids, names and serialization.</b><br>
    The utilities the rest of the Authup monorepo builds on, with no Authup domain knowledge in them.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/kit"><img src="https://img.shields.io/npm/v/@authup/kit" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

`@authup/kit` sits at the bottom of the Authup dependency graph: [`@authup/core-kit`](https://github.com/authup/authup/tree/master/packages/core-kit), [`@authup/access`](https://github.com/authup/authup/tree/master/packages/access), the HTTP client, the server packages and the consoles all import it. You get it transitively with any of them. Install it directly only when your own code wants the same redirect-pattern matching or name generation Authup uses, for example to check a redirect URI against a client's registered patterns before sending a user to Authup.

## Installation

```shell
npm install @authup/kit
```

ESM only. Node.js `>=26.0.0`; the helpers use Web APIs only (`URL`, `atob`, `btoa`), so they also run in a browser.

## Usage

### Match redirect URIs against patterns

```typescript
import { isSafeRedirectURLScheme, isSimpleMatch, isSimpleURLMatch } from '@authup/kit';

isSimpleURLMatch('https://app.example.com/callback', 'https://*.example.com/**'); // true
isSimpleURLMatch('https://evil.test?.example.com/cb', 'https://*.example.com/**'); // false
isSimpleMatch('users/42', ['users/*', 'roles/*']); // true

isSafeRedirectURLScheme('myapp://cb'); // true
isSafeRedirectURLScheme('javascript:alert(1)'); // false
```

- `*` matches a run of characters (the empty run included) that does not cross a `/`; `**` matches the rest of the value. Once the value is exhausted, a separator in front of a wildcard is optional, so `https://example.com` matches `https://example.com/**`.
- `isSimpleMatch` compares case sensitively and knows one boundary, `/`. Use `isSimpleURLMatch` for any trust decision over a URL: it canonicalizes both the value and the pattern (host case, default port, userinfo, dot segments) first, so a wildcard in the host cannot escape into a query or fragment.
- A value that does not parse as a URL never matches. A custom scheme (`myapp://cb`) is compared verbatim.
- `isSafeRedirectURLScheme` refuses `javascript:`, `data:`, `vbscript:`, `blob:`, `filesystem:`, `file:`, `about:` and anything that does not parse.

### Generate names, secrets and ids

```typescript
import { createNanoID, generateName, generateSecret, isUUID } from '@authup/kit';

generateName(); // e.g. 'brave-otter-1a2b3c'
generateName('seed'); // the same name for the same seed
generateSecret(); // 32 characters, never seeded
createNanoID(); // 21 characters of [0-9a-z]
createNanoID(10);
isUUID('7c9e6679-7425-40de-944b-e07fc1f099d6'); // true
```

- `generateName` always returns a slug (`[a-z0-9-]`, at most 128 characters). Pass a hydration-stable seed such as Vue's `useId()` to get the same name on the server and client render.
- `generateSecret` takes no seed on purpose: a secret must not derive from a predictable value. Generate it client-side only.

### Serialize values for storage

```typescript
import { deserialize, serialize } from '@authup/kit';

serialize('admin'); // '"admin"'
serialize(false); // 'false'
deserialize<boolean>('false'); // false
deserialize<string>('admin'); // 'admin'
```

`serialize` JSON-quotes strings, writes booleans, numbers, `null` and `undefined` bare, and turns a `RegExp` or `bigint` into its string form. `deserialize` is `destr`, so it reads both the quoted and a bare legacy string.

### Build URLs under a sub-path

```typescript
import { buildURL, getURLBasePath } from '@authup/kit';

buildURL('https://acme.tld/api', 'authorize').href; // 'https://acme.tld/api/authorize'
getURLBasePath('https://acme.tld/auth/'); // '/auth'
getURLBasePath('https://acme.tld'); // ''
```

`new URL('authorize', 'https://acme.tld/api')` drops `/api`; `buildURL` keeps it. An absent or invalid base throws, like `new URL`.

## API

| Export | Kind | Purpose |
|---|---|---|
| `isSimpleMatch`, `isSimpleURLMatch`, `patternHasGlobstarInAuthority` | function | Glob matching for values and URLs; detect a `**` in a pattern's authority (reject it at write time) |
| `isSafeRedirectURLScheme` | function | Refuse script-capable and local redirect schemes |
| `generateName`, `generateSecret`, `createNanoID`, `slugify` | function | Readable names, client secrets, random ids, slugs |
| `isUUID`, `isBCryptHash` | function | Shape checks |
| `serialize`, `deserialize` | function | Type-preserving string storage |
| `buildURL`, `getURLBasePath`, `makeURLPublicAccessible` | function | URL helpers (`makeURLPublicAccessible` rewrites `0.0.0.0` to `127.0.0.1`) |
| `base64URLEncode`, `base64URLDecode`, `base64ToArrayBuffer`, `arrayBufferToBase64` | function | Base64 and base64url conversion |
| `template` | function | Replace `{{key}}` placeholders from a data object; unknown keys stay untouched |
| `toArray`, `toStringArray`, `toArrayElement` | function | Normalize a value-or-array |
| `isObject`, `isScalar`, `hasOwnProperty`, `isPropertySet`, `extendObject`, `flattenObject`, `pickRecord`, `omitRecord`, `omitObjectProperties`, `removeObjectProperty` | function | Object helpers |
| `wait` | function | Promise-based delay |
| `DecisionStrategy` | enum | `affirmative`, `unanimous`, `consensus` |
| `ValidatorGroup` | enum | `create`, `update`, `provisioning` |
| `EnvironmentName` | enum | `production`, `test`, `development` |
| `ObjectLiteral`, `Result`, `ObjectRequired`, `ObjectOptional` | type | Shared type helpers; `Result<T>` is `{ success: true, data } \| { success: false, error }` |

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
