/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    StoreDispatcherEventName, injectStore, injectStoreDispatcher, injectTranslatorLocale,
} from '@authup/client-web-kit';
import { de } from 'date-fns/locale/de';
import { watch } from 'vue';
import type { StoreManagerOptions } from '@vuecs/core';
import bootstrap from '@vuecs/preset-bootstrap-v5';
import fontAwesome from '@vuecs/preset-font-awesome';

import installCountdown from '@vuecs/countdown';
import installFormControl from '@vuecs/form-controls';
import { injectNavigationManager, install as installNavigation } from '@vuecs/navigation';
import installPagination from '@vuecs/pagination';
import installTimeago, { injectLocale as injectTimeagoLocale } from '@vuecs/timeago';
import { applyStoreManagerOptions, installStoreManager } from '@vuecs/form-controls/core';

import { type Pinia } from 'pinia';
import { defineNuxtPlugin } from '#imports';
import { Navigation } from '../config/layout';

export default defineNuxtPlugin({
    dependsOn: ['authup'],
    setup(ctx) {
        const storeManagerOptions: StoreManagerOptions = {
            presets: {
                bootstrap,
                fontAwesome,
            },
            defaults: {
                list: {
                    class: 'list',
                },
                listBody: {
                    class: 'list-body',
                },
                listItem: {
                    class: 'list-item',
                },
            },
        };

        const storeManager = installStoreManager(ctx.vueApp);
        applyStoreManagerOptions(storeManager, storeManagerOptions);

        ctx.vueApp.use(installCountdown);
        ctx.vueApp.use(installFormControl);
        ctx.vueApp.use(installTimeago, {
            locales: {
                de,
            },
        });

        const store = injectStore(ctx.$pinia as Pinia);
        const navigation = new Navigation(store);

        ctx.vueApp.use(installNavigation, {
            items: ({
                level,
                parent,
            }) => navigation.getItems(level, parent),
        });

        const navigationManager = injectNavigationManager(ctx.vueApp);
        const storeDispatcher = injectStoreDispatcher(ctx.vueApp);
        storeDispatcher.on(
            StoreDispatcherEventName.ACCESS_TOKEN_UPDATED,
            async (token) => {
                let path = ctx._route.fullPath;
                if (
                    !!token &&
                    ctx._route.query &&
                    ctx._route.query.redirect
                ) {
                    path = `${ctx._route.query.redirect}`;
                }

                return navigationManager.build({
                    reset: true,
                    path,
                });
            },
        );

        ctx.vueApp.use(installPagination);

        // preset missing ...

        const locale = injectTranslatorLocale();
        const timeagoLocale = injectTimeagoLocale();
        timeagoLocale.value = locale.value;
        watch(locale, (val) => {
            timeagoLocale.value = val;
        });
    },
});
