<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/i18n</h1>

<p align="center">
    <b>Authup's translation catalogs in English, German, French and Spanish, ready for an ilingo store.</b><br>
    The labels, error messages and mail copy the consoles and the server use, without a framework attached.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/i18n"><img src="https://img.shields.io/npm/v/@authup/i18n" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Why @authup/i18n?

An application that embeds Authup's UI components, renders Authup's error codes or names its permissions needs the same words Authup uses, in the same languages. This package is those words as plain data: an [ilingo](https://github.com/tada5hi/ilingo) catalog tree you load into a store, plus the locale registry and the key enums.

| Concern | Without it | With it |
|---|---|---|
| **Error messages** | A message table for every `ErrorCode` you might receive | `authupError` namespace, keyed by the `ErrorCode` values of `@authup/errors` |
| **Permission and scope names** | Showing raw identifiers such as `user_update` | `authupPermission`, `authupScope` and `authupPolicy` give a display name per built-in identifier |
| **Locales** | A list of supported languages kept in step by hand | `LOCALES`, `isLocale` and `matchLocale` over the four authored locales |
| **Key drift** | A key missing in one language shows up at runtime | Every catalog is typed against its key enum, and a parity test checks all four locales |

## Installation

```shell
npm install @authup/i18n ilingo
```

ESM only. Node.js `>=26.0.0`. `ilingo` is a dependency of this package; install it yourself as well when your code builds the `Ilingo` instance. `@ebec/core` and `validup` are optional peers: they matter only for the typed `IssueDataByCode` augmentation this package declares.

## Usage

### Load the catalogs

```typescript
import {
    CATALOGS,
    DEFAULT_LOCALE,
    TranslatorTranslationMailKey,
    TranslatorTranslationNamespace,
    matchLocale,
} from '@authup/i18n';
import { ErrorCode } from '@authup/errors';
import { Ilingo, MemoryStore } from 'ilingo';

const ilingo = new Ilingo({
    store: new MemoryStore({ data: CATALOGS }),
    locale: DEFAULT_LOCALE,
});

const locale = matchLocale('de-DE') ?? DEFAULT_LOCALE; // 'de'

await ilingo.get({
    namespace: TranslatorTranslationNamespace.ERROR,
    key: ErrorCode.ENTITY_NOT_FOUND,
    locale,
});

await ilingo.get({
    namespace: TranslatorTranslationNamespace.MAIL,
    key: TranslatorTranslationMailKey.PASSWORD_RESET_EXPIRY,
    data: { minutes: 30 },
}); // 'The code expires in 30 minutes.'
```

- `CATALOGS` is an ilingo `CatalogNode` (locale, then namespace, then translations), so `MemoryStore({ data: CATALOGS })` takes it as is and `getSync` works too.
- `matchLocale` lowercases the tag, keeps the primary subtag and returns it when it is an authored locale, else `undefined`.
- Values may carry `{{name}}` placeholders, filled from `data`.

### Pick singular or plural

```typescript
import { TranslatorTranslationEntityKey, TranslatorTranslationNamespace } from '@authup/i18n';
import type { Ilingo } from 'ilingo';

declare const ilingo: Ilingo;

await ilingo.get({
    namespace: TranslatorTranslationNamespace.ENTITY,
    key: TranslatorTranslationEntityKey.USER,
    count: 1,
}); // 'User'
```

Entity nouns are ilingo plural nodes: `count: 1` selects the singular, any other count the plural.

## Namespaces

| Enum member | Namespace | Keys |
|---|---|---|
| `ENTITY` | `authupEntity` | `TranslatorTranslationEntityKey`, plural nouns |
| `FIELD` | `authupField` | `TranslatorTranslationFieldKey` |
| `ACTION` | `authupAction` | `TranslatorTranslationActionKey` |
| `COMMON` | `authupCommon` | `TranslatorTranslationCommonKey` |
| `CLIENT` | `authupClient` | `TranslatorTranslationClientKey` |
| `APP` | `authupApp` | `TranslatorTranslationAppKey` |
| `ERROR` | `authupError` | `ErrorCode` from `@authup/errors` |
| `MAIL` | `authupMail` | `TranslatorTranslationMailKey`, transactional mail copy |
| `PERMISSION` | `authupPermission` | `PermissionName` from `@authup/core-kit` |
| `SCOPE` | `authupScope` | `ScopeName` from `@authup/core-kit` |
| `POLICY` | `authupPolicy` | `SystemPolicyName` from `@authup/access` |
| `VUECS` | `vuecs` | `TranslatorTranslationVuecsKey`, overrides for `@vuecs/*` components |

## API

| Export | Kind | Purpose |
|---|---|---|
| `CATALOGS` | const | Every authored locale and namespace, as an ilingo catalog node |
| `TranslatorTranslation<Namespace><Language>` | const | One namespace of one locale, e.g. `TranslatorTranslationErrorGerman` |
| `TranslatorTranslationNamespace` | enum | The namespace names above |
| `TranslatorTranslation<Namespace>Key` | enum | The key set of each authup-owned namespace |
| `LOCALES`, `LOCALE_CODES`, `DEFAULT_LOCALE` | const | `en`, `de`, `fr`, `es` with their native names; the default is `en` |
| `isLocale`, `matchLocale` | function | Narrow a string or a BCP-47 tag onto an authored locale |
| `LocaleCode`, `LocaleDescriptor`, `NamespaceTranslations`, `AuthupErrorData`, `SystemPolicyNameValue` | type | Locale, catalog and error-data types |

## Notes

- **Policy names contain dots.** `system.default` is a path to ilingo, so escape the dots when you look one up: `key: 'system\\.default'`.
- **The namespaces are prefixed with `authup`** so they cannot collide with a host application's own catalogs. Only `vuecs` is not, because it overrides the `@vuecs/*` components' own namespace.
- **Every catalog is loaded eagerly.** All four locales are in `CATALOGS`; there is no lazy loading per locale yet.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
