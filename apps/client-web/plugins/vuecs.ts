/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildVuecsInstallOptions, registerIconCollections } from '@authup/client-web-kit';
import { de } from 'date-fns/locale/de';

import vuecs from '@vuecs/core';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import clientWebTheme from '@authup/client-web-theme';

import installCountdown from '@vuecs/countdown';
import installTimeago from '@vuecs/timeago';
import installButton from '@vuecs/button';
import installElements from '@vuecs/elements';
import installForms from '@vuecs/forms';
import installList from '@vuecs/list';
import installOverlays from '@vuecs/overlays';
import installPagination from '@vuecs/pagination';
import installTable from '@vuecs/table';
import installIcon from '@vuecs/icon';
import installNavigation from '@vuecs/navigation';

import { defineNuxtPlugin } from '#imports';

registerIconCollections();

export default defineNuxtPlugin({
    // Name this plugin so other plugins can express ordering against it.
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
        // Locale is owned by vuecs (the @vuecs/nuxt locale plugin — enabled by
        // default — manages the `vc-locale` cookie + `Config['locale']`, the
        // same way color-mode owns `vc-color-mode`). The language switcher
        // writes vuecs (`useLocaleControl`); ilingo follows one-way via
        // `syncTranslatorLocaleFromManager` in the post plugin. So no
        // `config.locale` feed here.
        //
        // `buildVuecsInstallOptions()` (shared with the embedded SSR app in
        // apps/server-core/ui) supplies the icon preset + the
        // translator-wired submit-button defaults; it runs after the kit's
        // translator install (`dependsOn: ['authup']`), so `useTranslation`
        // inside the helper sees the live ilingo locale provider.
        ctx.vueApp.use(vuecs, buildVuecsInstallOptions({
            // Register both themes side-by-side. The kit theme owns
            // overrides the kit's own components need (e.g. formGroup
            // margin); the app theme layers app-specific concerns
            // (heading scale, Bootstrap-compat shims) on top. Order
            // matters: kit first, app overrides win on conflicts.
            themes: [clientWebKitTheme(), clientWebTheme()],
        }));

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
        // Registry-only install (@vuecs/navigation 4.x): no item list and no
        // NavigationManager — each `<VCNavItems>` owns its items via `:data`.
        // Installed here (after `app.use(vuecs)`) so the theme manager already
        // carries the authup themes before navigation's own
        // `installThemeManager` call runs.
        ctx.vueApp.use(installNavigation);

        ctx.vueApp.use(installCountdown);
        ctx.vueApp.use(installTimeago, { locales: { de } });
    },
});
