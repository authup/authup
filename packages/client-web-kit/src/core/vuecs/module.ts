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
 *
 * This registers BOTH collections in full: 1,902 icons, roughly 429 KB
 * gzip, where an app renders a few dozen. Prefer bundling only what is
 * rendered, which authup's own two apps do via `@nuxt/icon`'s standalone
 * vite plugin:
 *
 * ```ts
 * // vite.config.ts (or nuxt.config.ts under `vite.plugins`)
 * import { NuxtIconBundle } from '@nuxt/icon/vite';
 *
 * NuxtIconBundle({
 *     scan: {
 *         globInclude: [
 *             'src/**\/*.{vue,ts}',
 *             'node_modules/@authup/client-web-kit/dist/**\/*.mjs',
 *             'node_modules/@vuecs/icons-font-awesome/dist/*.mjs',
 *         ],
 *         globExclude: [],
 *     },
 * })
 * ```
 *
 * ```ts
 * // app entry, instead of calling this function
 * import 'virtual:nuxt-icon-bundle/register';
 * ```
 *
 * The plugin registers through `addIcon` from `@iconify/vue`, the same
 * global store `<VCIcon>` resolves against, so no component changes are
 * needed. Scanning this package and `@vuecs/icons-font-awesome` is
 * required: kit components and the identity-provider preset tables hold
 * roughly half the icon names, and the vuecs preset's behavioral defaults
 * (pagination arrows, submit-button icons, alert icons, collapse chevrons)
 * exist only inside that package.
 *
 * Kept for consumers that cannot run a build-time scan.
 *
 * @deprecated prefer the build-time icon bundle described above.
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
