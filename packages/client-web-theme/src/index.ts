/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineTheme, extend } from '@vuecs/core';

// `ThemeElements` in @vuecs/core is empty until a component package's module
// augmentation loads; these imports pull in the declarations for the element
// keys styled below, so they type-check in every consumer compiling this file.
import type {} from '@vuecs/button';
import type {} from '@vuecs/table';

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
        elements: {
            /*
             * theme-tailwind's button root sets only
             * `disabled:cursor-not-allowed`, leaving the enabled button
             * with the default cursor. Append `cursor-pointer` so enabled
             * buttons get the pointer affordance; the `disabled:` variant
             * keeps priority on disabled buttons via its higher
             * pseudo-class specificity (same pattern theme-tailwind already
             * uses for the switch element). `extend()` appends to the
             * resolved class string instead of replacing it, so the full
             * upstream root (sizes, colors, focus ring) is preserved.
             */
            button: { classes: { root: extend('cursor-pointer') } },

            /*
             * Strip the baked `text-left` from theme-tailwind's
             * `tableHeadCell.classes.root` (default:
             * `"px-3 text-left font-medium"`).
             *
             * Without this override, a consumer-side
             * `headerClass: 'text-center'` on a `TableColumn` loses to
             * the theme's `text-left` on CSS source-order, so authup's
             * entity index pages would have to use Tailwind v4's
             * `!important` suffix (`'text-center!'`) just to override.
             * Centralising the strip here means the call sites stay
             * clean — `headerClass: 'text-center'` works as written
             * — and the single fix point makes future theme-tailwind
             * changes easy to absorb.
             *
             * Authup's entity tables always specify alignment per
             * column, so removing the default doesn't visually
             * regress anything; columns without an explicit alignment
             * would fall through to the browser default for `<th>`
             * (`text-align: center`), which is fine for the rare
             * unspecified case.
             */
            tableHeadCell: { classes: { root: 'px-3 font-medium' } },
        },
    });
}
