/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fontAwesome from '@vuecs/icons-font-awesome';
import { buildSubmitButtonDefaults } from '../form';
import type { VuecsInstallOptions, VuecsInstallOptionsInput } from './types';

/**
 * Build the `app.use(vuecs, ...)` install options shared by authup's UI
 * consumers (apps/client-admin-console's vuecs plugin + the embedded SSR app in
 * apps/client-auth-console): the Font Awesome icon preset and the
 * translator-wired submit-button defaults. Themes stay a caller concern —
 * the kit must not depend on the theme packages (the kit theme peers the
 * kit) — and are passed through in the given order (kit theme first, app
 * theme layers on top).
 *
 * MUST be called within an injection context (a component setup, a Nuxt
 * plugin's `setup()`, or `app.runWithContext(...)`) AFTER the kit's
 * `install()` ran — `buildSubmitButtonDefaults()` reads the ilingo locale
 * provider via `inject()`.
 *
 * Defaults for components the kit does not depend on stay with their
 * consumer: a `@vuecs/navigation` key (the breadcrumb landmark label) would
 * only type-check here if the kit declared that package, and it uses none
 * of its components.
 */
export function buildVuecsInstallOptions(input: VuecsInstallOptionsInput = {}) : VuecsInstallOptions {
    return {
        themes: input.themes,
        icons: [fontAwesome()],
        defaults: { submitButton: buildSubmitButtonDefaults() },
    };
}
