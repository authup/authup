/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineTheme } from '@vuecs/core';

export { default as clientWebKitTheme, merge } from '@authup/client-web-kit-theme';

/**
 * App-level theme. Layers authup app-specific concerns (Bootstrap-compat
 * class shims, heading scale, brand tokens) on top of the kit theme.
 *
 * Consumers register both themes — order matters: the kit-level theme
 * first so its element class strings are the baseline, then the app
 * theme so its overrides win:
 *
 *     import clientWebKitTheme from '@authup/client-web-kit-theme';
 *     import clientWebTheme from '@authup/client-web-theme';
 *
 *     app.use(vuecs, {
 *         themes: [clientWebKitTheme(), clientWebTheme()],
 *     });
 *
 * The split lets host apps without the Bootstrap-compat needs (e.g. a
 * future fresh app built fully on `<VCButton>` / `<VCAlert>`) register
 * only the kit theme and skip the compat layer.
 *
 * Reskinning (palette swap, dark mode) is handled by redefining
 * `--vc-color-*` variables — `setColorPalette()` from
 * `@vuecs/theme-tailwind` or toggling `.dark` on `<html>` works without
 * any theme configuration here.
 */
export default function clientWebTheme() {
    return defineTheme({
        // App-level element overrides go here. Currently empty —
        // the kit theme already handles `formGroup.mb-3`. Drop future
        // per-element tweaks (button defaults, table head styling, ...)
        // into an `elements: { ... }` block below.
        elements: {},
    });
}
