# @authup/client-web-kit-theme

Kit-level vuecs theme for authup. Composes [`@vuecs/theme-tailwind`](https://www.npmjs.com/package/@vuecs/theme-tailwind) with the per-element overrides that components in `@authup/client-web-kit` need.

App-level concerns (heading sizes, Bootstrap-compat shims for legacy markup, brand tokens) live in [`@authup/client-web-theme`](../client-web-theme), which extends this package.

## Install

```bash
npm install @authup/client-web-kit-theme tailwindcss @tailwindcss/vite
```

## Usage

In your Vue app entry — register side-by-side with the app-level theme:

```ts
import vuecs from '@vuecs/core';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import clientWebTheme from '@authup/client-web-theme';

app.use(vuecs, {
    themes: [clientWebKitTheme(), clientWebTheme()],
});
```

In your CSS entry (or transitively via `@authup/client-web-theme`):

```css
@import "@authup/client-web-kit-theme";
```

This single import pulls in `tailwindcss`, `@vuecs/design` (concrete OKLCH tokens), and `@vuecs/theme-tailwind` (Tailwind ↔ vc-color rebind).
