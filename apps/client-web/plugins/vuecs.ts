/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    injectTranslatorLocale,
} from '@authup/client-web-kit';
import { de } from 'date-fns/locale/de';
import { watch } from 'vue';
import type { StoreManagerOptions } from '@vuecs/core';
import bootstrap from '@vuecs/preset-bootstrap-v5';
import fontAwesome from '@vuecs/preset-font-awesome';

import installCountdown from '@vuecs/countdown';
import installTimeago, { injectLocale as injectTimeagoLocale } from '@vuecs/timeago';
import { applyStoreManagerOptions, installStoreManager } from '@vuecs/form-controls/core';

import { defineNuxtPlugin } from '#imports';

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
        ctx.vueApp.use(installTimeago, {
            locales: {
                de,
            },
        });

        // preset missing ...

        const locale = injectTranslatorLocale();
        const timeagoLocale = injectTimeagoLocale();
        timeagoLocale.value = locale.value;
        watch(locale, (val) => {
            timeagoLocale.value = val;
        });
    },
});
