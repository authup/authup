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
 * Kit-level theme. Composes `@vuecs/theme-tailwind` with the per-element
 * overrides the components in `@authup/client-web-kit` need.
 *
 * Consumers register this side-by-side with any app-level theme (e.g.
 * `@authup/client-web-theme`):
 *
 *     app.use(vuecs, {
 *         themes: [clientWebKitTheme(), clientWebTheme()],
 *     });
 *
 * The split keeps app-specific tweaks (heading sizes, the Bootstrap
 * compat layer, brand tokens) out of the kit-level theme so the kit
 * stays portable across host apps.
 */
export default function clientWebKitTheme() {
    return defineTheme({
        extends: [tailwindTheme()],
        elements: {
            // Bottom margin between stacked form groups. theme-tailwind's
            // default formGroup root is `flex flex-col gap-1` (gap inside
            // the group); without `mb-3` the entity forms stack flush.
            //
            // `extend()` is load-bearing: vuecs's `applyOverrides` REPLACES
            // by default, so a raw `'mb-3'` would drop `flex flex-col gap-1`
            // and the form-group children render inline.
            formGroup: { classes: { root: extend('mb-3') } },
        },
    });
}

