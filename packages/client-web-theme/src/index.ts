/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import tailwindTheme, { merge } from '@vuecs/theme-tailwind';

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
    const base = tailwindTheme();

    return {
        ...base,
        elements: {
            ...base.elements,
            // Bottom margin between stacked form groups. theme-tailwind's
            // default formGroup root is `flex flex-col gap-1` (gap between
            // label / input / hint inside ONE group), but it leaves no
            // spacing between consecutive groups. authup's entity forms
            // stack 5-10 groups; without mb-3 they collapse against each
            // other.
            formGroup: { classes: { root: 'mb-3' } },
        },
    };
}
