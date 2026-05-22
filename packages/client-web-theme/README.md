# @authup/client-web-theme

Authup's vuecs theme. Composes [`@vuecs/theme-tailwind`](https://www.npmjs.com/package/@vuecs/theme-tailwind) with authup-specific element overrides and exposes a single CSS entry.

## Install

```bash
npm install @authup/client-web-theme tailwindcss @tailwindcss/vite
```

## Usage

In your Vue app entry:

```ts
import { createApp } from 'vue';
import vuecs from '@vuecs/core';
import authupTheme from '@authup/client-web-theme';

const app = createApp(App);
app.use(vuecs, { themes: [authupTheme()] });
```

In your CSS entry:

```css
@import "@authup/client-web-theme";
```

This single import pulls in `tailwindcss`, `@vuecs/design` (concrete OKLCH tokens), and `@vuecs/theme-tailwind` (rebinds Tailwind's `--color-*` onto `--vc-color-*`).

In your Vite config:

```ts
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [tailwindcss(), /* ... */],
});
```

## Reskinning

Override `--vc-color-*` CSS variables (e.g. inside `@layer base { :root { ... } }`) or call `setColorPalette({ primary: 'emerald' })` from `@vuecs/theme-tailwind`. Dark mode toggles via `.dark` on `<html>`.
