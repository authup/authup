/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectTranslatorLocale } from '@authup/client-web-kit';
import { de } from 'date-fns/locale/de';
import { watch } from 'vue';

import vuecs, { extend } from '@vuecs/core';
import bootstrap from '@vuecs/theme-bootstrap';
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
    // Must run BEFORE `@authup/client-web-kit`'s `install()` mounts
    // any A* components that reference `useComponentTheme(...)`. The
    // kit deliberately does NOT install vuecs internals (per a comment
    // in its `module.ts`) precisely so this plugin owns the theme +
    // icon configuration. The `authup` plugin then runs after — by
    // the time its setup fires, the theme manager is fully populated.
    enforce: 'pre',
    setup(ctx) {
        ctx.vueApp.use(vuecs, {
            themes: [bootstrap()],
            icons: [fontAwesome()],
            overrides: {
                elements: {
                    list: { classes: { root: extend('list') } },
                    listBody: { classes: { root: extend('list-body') } },
                    listItem: { classes: { root: extend('list-item') } },
                },
            },
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
