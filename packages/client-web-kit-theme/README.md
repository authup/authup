<p align="center">
    <img src="https://raw.githubusercontent.com/authup/authup/master/.github/assets/logo.svg" alt="Authup logo" width="96" height="96" />
</p>

<h1 align="center">@authup/client-web-kit-theme</h1>

<p align="center">
    <b>The styles and vuecs theme the @authup/client-web-kit components render with, built on Tailwind CSS v4.</b><br>
    Every component class and design token of the kit, overridable through <code>--authup-*</code> CSS variables.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@authup/client-web-kit-theme"><img src="https://img.shields.io/npm/v/@authup/client-web-kit-theme" alt="npm version" /></a>
    <a href="https://github.com/authup/authup/actions/workflows/main.yml"><img src="https://github.com/authup/authup/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="https://authup.org">Documentation</a>
</p>

---

## Where it fits

[`@authup/client-web-kit`](https://github.com/authup/authup/tree/master/packages/client-web-kit) ships no `<style>` blocks; its component CSS lives here, next to a vuecs theme that composes [`@vuecs/theme-tailwind`](https://www.npmjs.com/package/@vuecs/theme-tailwind) with the element overrides the kit needs. Authup's three consoles load it through [`@authup/client-web-theme`](https://github.com/authup/authup/tree/master/packages/client-web-theme), which adds Authup's brand on top. Install this package directly when you use the kit in your own app and want its components styled without Authup's brand colors and chrome.

## Installation

```shell
npm install @authup/client-web-kit-theme @vuecs/core @vuecs/design @vuecs/theme-tailwind @vuecs/tree tailwindcss
```

The `@vuecs/*` packages and `tailwindcss` (`^4.3.2`) are peer dependencies. `@authup/client-web-kit` is an optional peer, declared so a pnpm install places it next to this package where the stylesheet looks for its class strings. You need a Tailwind v4 build step, for example `@tailwindcss/vite`. The package is ESM-only; build tooling needs Node.js `>=26.0.0`.

## Usage

### Register the theme

```typescript
import { createApp } from 'vue';
import vuecs from '@vuecs/core';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import App from './App.vue';

const app = createApp(App);
app.use(vuecs, { themes: [clientWebKitTheme()] });
```

With `@authup/client-web-theme`, register both, the kit theme first: `themes: [clientWebKitTheme(), clientWebTheme()]`.

### Import the stylesheet

```css
@import "@authup/client-web-kit-theme";
```

```typescript
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [tailwindcss()],
});
```

- The bare import resolves through the package's `style` export condition to `assets/css/index.css`; `@authup/client-web-kit-theme/index.css` names the same file for a CSS array (Vite, Nuxt `css`).
- That one file pulls in `tailwindcss`, `@vuecs/design` (the `--vc-color-*` tokens), `@vuecs/theme-tailwind` (which binds Tailwind's colors onto them) and `@vuecs/tree/style.css`.
- **It must go through Tailwind.** The CSS ships as source with `@import`, `@source` and `@custom-variant` directives; linked directly into a page, nothing in it resolves.
- It scans this package, the installed `@authup/client-web-kit` and `@vuecs/*` for class names. Add `@source` lines for your own templates in your CSS entry.

### Override a token

```css
@layer base {
    :root {
        --authup-auth-accent: #0f766e;
        --authup-picker-item-active-background: #0f766e;
    }
}
```

The tokens sit in `@layer authup`, declared before `base`, so an override in `@layer base` or in an unlayered `:root` wins without `!important`. Their defaults reference the `--vc-color-*` aliases, so they follow dark mode on their own. The groups:

| Prefix | Styles |
|---|---|
| `--authup-auth-*` | The logged-out shell: aurora backdrop, card, logo, accent colors (`AAuthShell`, `AAuthGadgets`, `AAuthBackLink`) |
| `--authup-account-*` | The account console shell (`AAccountShell`): width, card, nav, surfaces |
| `--authup-picker-item-*` | The tile pickers (policy type, identity provider, authenticator kind) |
| `--authup-realm-grid-item-*` | The realm chooser (`ARealmGrid`) |
| `--authup-login-provider-*` | The identity-provider buttons on the login form |

`--authup-auth-logo-image` / `--authup-account-logo-image` paint an image over the built-in logo mark, and the matching `-logo-mark-visibility` hides the mark's own shapes.

## API

| Export | Kind | Purpose |
|---|---|---|
| default (`clientWebKitTheme`) | function | Returns the vuecs theme: `@vuecs/theme-tailwind` plus the kit's element overrides |
| `merge` | function | Re-exported from `@vuecs/theme-tailwind`, for composing class strings in your own theme |
| `@authup/client-web-kit-theme` (style condition), `/index.css` | CSS | The stylesheet |

## Notes

- **Do not bundle the CSS before Tailwind sees it.** Bundlers that pre-process CSS can strip the bare `@layer theme, vuecs, authup, base, components, utilities;` statement at the top, and the layer order is what lets your overrides win.
- **Dark mode is the `.dark` class on an ancestor**, not the OS preference: the stylesheet redefines Tailwind's `dark` variant as `&:where(.dark, .dark *)`, which is what `@vuecs/design`'s `bindColorMode` toggles.
- **Component classes are `a-`-prefixed** (`.a-picker-item`, `.a-auth-shell`) and live in `@layer components`, so a Tailwind utility on the element overrides a single property.

## License

Made with 💚

Published under the [Apache 2.0 License](./LICENSE).
