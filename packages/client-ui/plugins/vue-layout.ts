/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import installAuthup from '@authup/client-vue';
import type { APIClient } from '@authup/core';
import type { PluginBaseOptions } from '@vue-layout/core';
import type { NavigationStore } from '@vue-layout/navigation';
import bootstrap from '@vue-layout/preset-bootstrap-v5';
import fontAwesome from '@vue-layout/preset-font-awesome';

import installCountdown from '@vue-layout/countdown';
import installFormControl from '@vue-layout/form-controls';
import installNavigation from '@vue-layout/navigation';
import installPagination from '@vue-layout/pagination';

import type { Pinia } from 'pinia';
import { storeToRefs } from 'pinia';
import { defineNuxtPlugin, useState } from '#app';
import { buildNavigationProvider } from '~/config/layout';
import { useAuthStore } from '../store/auth';

export default defineNuxtPlugin((ctx) => {
    const baseOptions : PluginBaseOptions = {
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
            pagination: {
                class: 'pagination',
                itemClass: 'page-item',
            },
        },
    };

    ctx.vueApp.use(installCountdown, baseOptions);
    ctx.vueApp.use(installFormControl, baseOptions);

    const navigationStore = useState<NavigationStore>(() => ({
        items: [],
        itemsActive: [],
    }));

    const store = useAuthStore(ctx.$pinia as Pinia);
    const { loggedIn } = storeToRefs(store);

    ctx.vueApp.use(installNavigation, {
        ...baseOptions,
        store: navigationStore,
        provider: buildNavigationProvider({
            isLoggedIn: () => loggedIn.value,
            hasPermission: (name) => store.has(name),
        }),
    });

    ctx.vueApp.use(installPagination, baseOptions);

    // preset missing ...
    ctx.vueApp.use(installAuthup, {
        apiClient: ctx.$api as APIClient,
        components: false,
        ...baseOptions,
    });
});
