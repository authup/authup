/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Theme } from '@vuecs/core';
import tailwindTheme, { merge } from '@vuecs/theme-tailwind';

export { merge };

/**
 * Authup theme for vuecs components.
 *
 * Composes `@vuecs/theme-tailwind` (semantic Tailwind v4 classes referencing
 * `--vc-color-*` tokens) with authup-specific per-element overrides. Consumers
 * register a single theme:
 *
 *     app.use(vuecs, { themes: [authupTheme()] });
 *
 * Reskinning (palette swap, dark mode) is handled by redefining `--vc-color-*`
 * variables — `setColorPalette()` from `@vuecs/theme-tailwind` or toggling
 * `.dark` on `<html>` works without further theme configuration.
 */
export default function authupTheme(): Theme {
    const base = tailwindTheme();

    return {
        ...base,
        classesMergeFn: merge,
        elements: {
            ...base.elements,
            // Authup-specific element overrides go here as they crystallize
            // during template migration. The structural vc-* classes from
            // base are preserved by the theme manager's merge step.
        },
    };
}
