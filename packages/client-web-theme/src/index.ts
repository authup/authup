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
 * Currently a pass-through over `@vuecs/theme-tailwind`. The module
 * exists as the single project-wide entry point so future per-element
 * overrides land in one place. Consumers register a single theme:
 *
 *     app.use(vuecs, { themes: [authupTheme()] });
 *
 * To add overrides, replace the body with a merge over the base theme:
 *
 *     const base = tailwindTheme();
 *     return {
 *         ...base,
 *         elements: {
 *             ...base.elements,
 *             button: { classes: { root: 'extra-authup-class' } },
 *         },
 *     };
 *
 * Reskinning (palette swap, dark mode) is handled by redefining
 * `--vc-color-*` variables — `setColorPalette()` from
 * `@vuecs/theme-tailwind` or toggling `.dark` on `<html>` works without
 * any theme configuration here.
 */
export default function authupTheme() {
    return tailwindTheme();
}
