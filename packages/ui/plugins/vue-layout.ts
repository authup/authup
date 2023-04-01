/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { install, setPresets } from '@authup/vue';
import type { NavigationStore } from '@vue-layout/basic';
import { createPlugin } from '@vue-layout/basic';
import { getBuildInPresets } from '@vue-layout/hyperscript';
import { storeToRefs } from 'pinia';
import type { Pinia } from 'pinia';
import { defineNuxtPlugin } from '#app';
import { buildNavigationProvider } from '../config/layout';
import { useAuthStore } from '../store/auth';

export default defineNuxtPlugin((ctx) => {
    const navigationStore = useState<NavigationStore>(() => ({
        items: [],
        itemsActive: [],
    }));

    const store = useAuthStore(ctx.$pinia as Pinia);
    const { loggedIn } = storeToRefs(store);

    const presets = getBuildInPresets(['bootstrapV5', 'fontAwesome']);

    ctx.vueApp.use(createPlugin({
        navigationStore,
        navigationProvider: buildNavigationProvider({
            isLoggedIn: () => loggedIn.value,
            hasPermission: (name) => store.has(name),
        }),
        presets,
    }));

    ctx.vueApp.use(install, {
        httpClient: ctx.$api,
        presets,
    });
});
