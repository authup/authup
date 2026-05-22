/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectTranslatorLocale } from '@authup/client-web-kit';
import { de } from 'date-fns/locale/de';
import { watch } from 'vue';

import vuecs from '@vuecs/core';
import authupTheme from '@authup/client-web-theme';
import fontAwesome from '@vuecs/icons-font-awesome';

import installCountdown from '@vuecs/countdown';
import installTimeago, { injectLocale as injectTimeagoLocale } from '@vuecs/timeago';
import installButton from '@vuecs/button';
import installElements from '@vuecs/elements';
import installForms from '@vuecs/forms';
import installList from '@vuecs/list';
import installOverlays from '@vuecs/overlays';
import installPagination from '@vuecs/pagination';
import installTable from '@vuecs/table';
import installIcon from '@vuecs/icon';

import { defineNuxtPlugin } from '#imports';

export default defineNuxtPlugin({
    // Name this plugin so other plugins can express ordering against it.
    // `vuecs-navigation` MUST depend on this — `@vuecs/navigation`'s
    // `install()` calls `installThemeManager(app, {})` with no themes,
    // and `installThemeManager` is first-install-wins. If vuecs-navigation
    // runs before this plugin, the authup theme below is silently
    // dropped at theme-manager creation time, and every component renders
    // with only its `vc-*` defaults (no Tailwind utility classes — fields
    // look unstyled).
    name: 'vuecs',
    // Runs AFTER `authup:kit` because `injectTranslatorLocale()` below
    // requires the ilingo locale provider that `installTranslator()`
    // sets up inside the kit's `install()`. Using `enforce: 'pre'` here
    // would invert the order and throw "An ilingo locale is not present
    // in the vue context.", aborting the plugin chain before pinia's
    // setup runs and producing a misleading "$pinia undefined" SSR
    // error from `@pinia/nuxt`'s `app:rendered` hook. The kit's
    // `install()` only registers `app.component(...)`s — it does not
    // render them — so installing the vuecs theme manager afterwards
    // is still in time for the first page render.
    dependsOn: ['authup'],
    setup(ctx) {
        ctx.vueApp.use(vuecs, {
            themes: [authupTheme()],
            icons: [fontAwesome()],
        });

        // vuecs's `installThemeManager` is first-install-wins (see
        // `@vuecs/core/dist/index.mjs`); installing per-package plugins
        // BEFORE `app.use(vuecs, ...)` above would freeze the manager
        // with no themes. Order matters.
        ctx.vueApp.use(installButton);
        ctx.vueApp.use(installElements);
        ctx.vueApp.use(installForms);
        ctx.vueApp.use(installList);
        ctx.vueApp.use(installOverlays);
        ctx.vueApp.use(installPagination);
        ctx.vueApp.use(installTable);
        ctx.vueApp.use(installIcon);

        ctx.vueApp.use(installCountdown);
        ctx.vueApp.use(installTimeago, { locales: { de } });

        const locale = injectTranslatorLocale();
        const timeagoLocale = injectTimeagoLocale();
        timeagoLocale.value = locale.value;
        watch(locale, (val) => {
            timeagoLocale.value = val;
        });
    },
});
