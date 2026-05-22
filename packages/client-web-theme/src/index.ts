/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import tailwindTheme, { merge } from '@vuecs/theme-tailwind';
import { defineTheme, extend } from '@vuecs/core';

export { merge };

/**
 * Authup theme for vuecs components.
 *
 * Layers authup-specific per-element overrides on top of
 * `@vuecs/theme-tailwind`. The theme manager merges classes with the
 * base, so overrides only need to declare the deltas — twMerge
 * (`classesMergeFn`) dedups conflicting utilities.
 *
 *     app.use(vuecs, { themes: [authupTheme()] });
 *
 * Reskinning (palette swap, dark mode) is handled by redefining
 * `--vc-color-*` variables — `setColorPalette()` from
 * `@vuecs/theme-tailwind` or toggling `.dark` on `<html>` works without
 * any theme configuration here.
 */
export default function authupTheme() {
    return defineTheme({
        extends: [
            tailwindTheme(),
        ],
        elements: {
            // Bottom margin between stacked form groups. theme-tailwind's
            // default formGroup root is `flex flex-col gap-1` (gap between
            // label / input / hint inside ONE group), but it leaves no
            // spacing between consecutive groups.
            //
            // Use mb-6 (24px) — the inter-group spacing needs to be
            // clearly larger than the intra-group gap-1 (4px), otherwise
            // the trailing hint visually floats between groups and reads
            // as belonging to the next group. mb-3 (12px = 3x the gap)
            // wasn't enough; mb-6 gives a clean 6x ratio.
            //
            // `extend()` marks the value as ADDITIVE — without it,
            // vuecs's `mergeClasses` ASSIGNS the override, replacing the
            // base entirely. Replacing dropped `flex flex-col gap-1`,
            // which caused label + control to render inline instead of
            // stacked. With extend(), twMerge concatenates: the final
            // root becomes `flex flex-col gap-1 mb-6`.
            formGroup: { classes: { root: extend('mb-6') } },
        },
    });
}
