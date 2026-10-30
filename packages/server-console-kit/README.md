<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/server-console-kit</h1>

<p align="center">
    <b>Serve a built console bundle: shell splicing, security headers, asset rebasing and operator theming.</b><br>
    The page-serving mechanism Authup's admin, account and auth console services share.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/server-console-kit"><img src="https://img.shields.io/npm/v/@authup/server-console-kit" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

A console service turns a built console bundle into an HTTP response, and the steps are the same whichever console it serves: read the shared `vc-locale` and `vc-color-mode` cookies, stamp them onto `<html>`, splice the runtime config or the rendered markup into the template, replace the bundle's fixed vite base in every asset URL, apply the operator theme and set the headers a login surface needs. This package owns those steps, so [`server-admin-console`](https://github.com/authup/authup/tree/master/apps/server-admin-console), [`server-account-console`](https://github.com/authup/authup/tree/master/apps/server-account-console) and [`server-auth-console`](https://github.com/authup/authup/tree/master/apps/server-auth-console) cannot spell them differently. It also composes a console's module graph (config, theme, HTTP listener), which is what `authup start console` and each per-console binary start.

You install it directly only to build a console service of your own; to rebrand Authup's consoles, mount a theme directory instead (see [Console theming](https://authup.org/guide/deployment/theming)).

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
- [Theme manifest](#theme-manifest)
- [API](#api)
- [Notes](#notes)
- [License](#license)

## Installation

```shell
npm install @authup/server-console-kit routup
```

`routup` is a peer dependency: the helpers take a routup `IAppEvent` and your service owns the `App`.

The package is ESM only and needs Node.js `>=26.0.0`.

## Usage

### Serve a static console

```typescript
import { App, defineCoreHandler } from 'routup';
import type { Config, IThemeProvider } from '@authup/server-console-kit';
import {
    THEME_ASSET_MOUNT_PATH,
    createThemeAssetsHandler,
    defineStaticConsole,
} from '@authup/server-console-kit';

declare const packageRoot: string; // your service's own package directory

const staticConsole = defineStaticConsole({
    packageName: '@acme/my-console',
    marker: '<!--my-config-->',
    viteBase: '/my-console/',
    cwd: packageRoot,
});

export async function createHandler(config: Config, theme?: IThemeProvider): Promise<App> {
    const app = new App();

    if (theme) {
        app.use(THEME_ASSET_MOUNT_PATH, createThemeAssetsHandler(theme));
    }

    app.use(defineCoreHandler({
        method: 'get',
        path: '/*page',
        fn: (event) => staticConsole.serve(event, {
            basePath: '/my-console',
            assetBasePath: '/my-console/',
            theme,
            config: { apiUrl: 'https://auth.example.com' },
        }),
    }));

    return app;
}
```

`serve` reads `<dist>/index.html` on every request, replaces `marker` with `<script>window.__AUTHUP__ = ...</script>` built from `config`, stamps `lang` and the color-mode class from the cookies, rewrites every `src` and `href` starting with `viteBase` to `assetBasePath`, applies the theme and sets the page headers. Mounting the bundle's `assets/` directory is your service's job.

| Definition field | Description |
|---|---|
| `packageName` | The npm package whose `dist/` holds `index.html` and `assets/` |
| `marker` | The template marker the runtime config replaces |
| `viteBase` | The vite `base` the bundle was built with |
| `cwd` | Where the `node_modules` ancestor walk for `packageName` starts: your package root, never the process cwd |
| `distPath` | Optional substituted package directory, consulted before the walk |
| `readShell` | Optional `(event) => Promise<string>` replacing the `index.html` read, for serving from source |

### Run it as a service

```typescript
import type { Config } from '@authup/server-console-kit';
import { InjectionKey, createApplication } from '@authup/server-console-kit';

const application = createApplication<Config>({
    config: () => ({
        port: 3030,
        host: '0.0.0.0',
        theme: { directoryPath: '', fragmentsEnabled: false },
    }),
    createHandler,
});

await application.setup();
const app = application.container.resolve(InjectionKey.App);
// later: await application.teardown();
```

`createApplication` composes three modules: config (resolves the factory once), theme (loads a `ThemeProvider` when `theme.directoryPath` exists, and fails the boot on an invalid manifest) and HTTP (builds the handler and listens on `port` and `host`). Pass `listen: false` to build the app without a listener and mount `InjectionKey.App` on someone else's. A token registered on the container before `setup()` wins over the module that would register it.

### Use the helpers in a render of your own

```typescript
import {
    ThemeProvider,
    applyTheme,
    applyUIPageHeaders,
    readUIClientPreferences,
    rebaseAssetURLs,
    replaceTemplateMarker,
    stampHtmlAttributes,
} from '@authup/server-console-kit';

const theme = new ThemeProvider({ directoryPath: '/etc/authup/theme' });
await theme.load();

let body = replaceTemplateMarker(template, '<!--app-html-->', appHtml);
body = stampHtmlAttributes(body, readUIClientPreferences(event));
body = rebaseAssetURLs(body, '/console/auth/', '/login/');
body = await applyTheme(body, theme, '/login');

applyUIPageHeaders(event);
```

`applyUIPageHeaders` sets `content-type: text/html; charset=utf-8`, `vary: cookie`, `content-security-policy: frame-ancestors 'none'`, `x-frame-options: DENY`, `referrer-policy: no-referrer` and `cache-control: no-store`.

## Theme manifest

A theme directory holds `theme.json`, an `assets/` directory served under `<basePath>/theme`, and optionally `fragments/head.html`.

| Field | Type | Description |
|---|---|---|
| `version` | `1` | Required; the only accepted value |
| `title` | `string` | Replaces the document `<title>`, 1 to 200 characters |
| `favicon` | asset path | Replaces the console's own icon links |
| `logo`, `logoDark` | image asset path | Painted in place of the built-in mark, in light and dark mode |
| `stylesheet` | asset path | Linked after the token block |
| `tokens`, `tokensDark` | `Record<string, string>` | CSS custom properties, emitted inside `@layer authup-theme` for `:root` and `.dark` |

An asset path starts with `assets/` and ends in `.css`, `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`, `.ico`, `.woff` or `.woff2`. A token name matches `^--[a-z][a-z0-9-]*$`; a value is at most 256 characters and contains none of `} < > ; @ \`, `/*`, `url(` or `expression(`. An unknown key is refused.

## API

| Export | Kind | Purpose |
|---|---|---|
| `defineStaticConsole` | function | Per-console serving closure (`serve`, `resolveDistPath`, `resolvePackagePath`) |
| `createApplication` | function | Config, theme and HTTP modules as one orkos `Application` |
| `ConfigModule`, `ThemeModule`, `HTTPModule` | class | The three modules, for a composition of your own |
| `InjectionKey`, `ModuleName` | constant | Container tokens (`Config`, `App`, `Server`, `Theme`) and module names |
| `createThemeProvider` | function | A loaded `ThemeProvider`, or `undefined` when the directory is unset or missing |
| `replaceTemplateMarker` | function | Splice a value into a template without `$` pattern expansion |
| `injectHeadContent`, `stampDocumentTitle`, `removeFaviconLinks` | function | Head edits |
| `stampHtmlAttributes`, `readUIClientPreferences` | function | `lang` and color mode from the shared cookies |
| `rebaseAssetURLs` | function | Replace the vite base in every `src` and `href` |
| `serializeInlineScriptJSON` | function | JSON safe inside an inline `<script>` |
| `applyUIPageHeaders` | function | The page headers listed above |
| `ThemeProvider`, `applyTheme`, `createThemeAssetsHandler` | class, function | Load, apply and serve an operator theme |
| `parseThemeManifest`, `ThemeManifestValidator`, `buildThemeHead`, `escapeHtml`, `themeAssetExtension` | function, class | The portable theme contract |
| `THEME_*` | constant | Theme layout, grammar and content types |
| `LOCALE_COOKIE`, `COLOR_MODE_COOKIE` | constant | `vc-locale`, `vc-color-mode` |
| `StaticConsoleDefinition`, `StaticConsoleServeOptions`, `StaticConsole`, `Config`, `CreateApplicationContext`, `IThemeProvider`, `ThemeManifest`, `ConsoleLogger` | type | Shapes of the above |

## Notes

- **Never splice with `String.prototype.replace` and a string value.** It expands `$&`, `` $` ``, `$'` and `$$` inside the value, and values spliced into a console shell carry request input. `replaceTemplateMarker` passes a function instead.
- **State is per instance.** Every `defineStaticConsole` call resolves and caches on its own, so two handlers in one process never share a substituted package or a resolved bundle. Only a found bundle is cached; one built after boot is picked up on the next request.
- **A missing bundle is a per-request error**, an `InternalError` naming the package, never a failed boot.
- **A theme fails loud once and soft after.** An invalid manifest throws at `load()`; one that turns invalid while running keeps the last valid manifest and logs. `theme.json` and `head.html` are re-checked at most once a second.
- **`fragments/head.html` is opt-in and unsanitized.** It is read only with `fragmentsEnabled: true` and spliced into every console's `<head>` as written, so mount the directory read-only and from operator-owned storage.
- **Theme assets follow symlinks but stay inside `assets/`.** Every request is realpath-checked against the directory, so a Kubernetes ConfigMap volume works and a link pointing outside it is not served.
- **Declare the package, never bundle it.** The container tokens are symbols created at import, so a second inlined copy has tokens that resolve against nothing.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
