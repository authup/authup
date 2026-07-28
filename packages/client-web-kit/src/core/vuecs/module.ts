/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { icons as fa6Brands } from '@iconify-json/fa6-brands';
import { icons as fa6Solid } from '@iconify-json/fa6-solid';
import { addCollection } from '@iconify/vue';
import fontAwesome from '@vuecs/icons-font-awesome';
import { buildSubmitButtonDefaults } from '../form';
import type { VuecsInstallOptions, VuecsInstallOptionsInput } from './types';

/**
 * Register the Iconify icon collections authup's UI renders from
 * (Font Awesome 6 solid + brands). Call once at app bootstrap, before
 * the first `<VCIcon>` render.
 */
export function registerIconCollections() : void {
    addCollection(fa6Solid);
    addCollection(fa6Brands);
}

/**
 * Build the `app.use(vuecs, ...)` install options shared by authup's UI
 * consumers (apps/client-web's vuecs plugin + the embedded SSR app in
 * apps/server-core/ui): the Font Awesome icon preset and the
 * translator-wired submit-button defaults. Themes stay a caller concern —
 * the kit must not depend on the theme packages (the kit theme peers the
 * kit) — and are passed through in the given order (kit theme first, app
 * theme layers on top).
 *
 * MUST be called within an injection context (a component setup, a Nuxt
 * plugin's `setup()`, or `app.runWithContext(...)`) AFTER the kit's
 * `install()` ran — `buildSubmitButtonDefaults()` reads the ilingo locale
 * provider via `inject()`.
 */
export function buildVuecsInstallOptions(input: VuecsInstallOptionsInput = {}) : VuecsInstallOptions {
    return {
        themes: input.themes,
        icons: [fontAwesome()],
        defaults: { submitButton: buildSubmitButtonDefaults() },
    };
}
