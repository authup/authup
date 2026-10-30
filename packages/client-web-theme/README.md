<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/client-web-theme</h1>

<p align="center">
    <b>Authup's own look for vuecs and @authup/client-web-kit: brand colors, surfaces and console chrome on Tailwind v4.</b><br>
    The theme the admin, account and auth consoles render with, as one stylesheet and one theme function.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/client-web-theme"><img src="https://img.shields.io/npm/v/@authup/client-web-theme" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

This is the app-level layer on top of [`@authup/client-web-kit-theme`](https://github.com/authup/authup/tree/master/packages/client-web-kit-theme): it adds Authup's brand accents (periwinkle, rose), the light and dark surface ramps, the header, sidebar and footer chrome of the consoles, and a few element overrides (button cursor, table header alignment, breadcrumb layout). Authup's three consoles use it. Install it when you build an app that should look like an Authup console; for the kit's components without Authup's brand, use `@authup/client-web-kit-theme` alone.

## Installation

```shell
npm install @authup/client-web-theme @vuecs/core @vuecs/design @vuecs/theme-tailwind tailwindcss
```

`@vuecs/core`, `@vuecs/design`, `@vuecs/theme-tailwind` and `tailwindcss` (`^4.3.2`) are peer dependencies; `@authup/client-web-kit-theme` comes along as a dependency, together with its own peer `@vuecs/tree`. You need a Tailwind v4 build step, for example `@tailwindcss/vite`. The package is ESM-only; build tooling needs Node.js `>=26.0.0`.

## Usage

### Register both themes

```typescript
import { createApp } from 'vue';
import vuecs from '@vuecs/core';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import clientWebTheme from '@authup/client-web-theme';
import App from './App.vue';

const app = createApp(App);
app.use(vuecs, {
    themes: [clientWebKitTheme(), clientWebTheme()],
});
```

**Register the kit theme too, and first.** `clientWebTheme()` only carries the overrides; it does not extend `@vuecs/theme-tailwind` itself, so registered alone the components lose their base classes.

### Import the stylesheet

```css
@import "@authup/client-web-theme";
```

```typescript
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [tailwindcss()],
});
```

- The bare import resolves through the `style` export condition to `assets/css/index.css`; `@authup/client-web-theme/index.css` names the same file for a CSS array (`css: ['@authup/client-web-theme/index.css']`).
- It imports `@authup/client-web-kit-theme`'s stylesheet first, which brings `tailwindcss`, `@vuecs/design` and `@vuecs/theme-tailwind`, so you need no other import.
- **It must go through Tailwind**: the file ships as source. Add `@source` lines for your own templates in your CSS entry.

### Reskin it

```css
:root {
    --authup-periwinkle: #0f766e;
}
```

```typescript
import { setColorPalette } from '@vuecs/theme-tailwind';

setColorPalette({ primary: 'emerald' });
```

- The tokens are declared in `@layer base`, so override them from an unlayered `:root` (or from `@layer base` after the import).
- `--authup-surface-*` and `--authup-on-surface*` are the content surfaces; they flip under `.dark` and feed the `--vc-color-bg*`, `-fg*` and `-border` tokens every `<VC*>` component reads.
- `--authup-chrome-*` are the header, sidebar and footer colors, which follow the light surfaces and switch to the `--authup-slate-*` ramp in dark mode.
- `--authup-periwinkle`, `--authup-rose`, `--authup-salmon` and `--authup-green` are the brand accents, constant across modes. Periwinkle drives the `primary` palette.
- `setColorPalette()` swaps a whole semantic scale for a Tailwind palette at runtime by injecting an unlayered `:root` block; it is a no-op on the server.
- Dark mode is the `.dark` class on an ancestor, as in the kit theme.

## API

| Export | Kind | Purpose |
|---|---|---|
| default (`clientWebTheme`) | function | Returns the vuecs theme with Authup's element overrides |
| `@authup/client-web-theme` (style condition), `/index.css` | CSS | The stylesheet, including the kit theme's |

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
