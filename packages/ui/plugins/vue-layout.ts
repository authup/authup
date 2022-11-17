/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NavigationStore, createPlugin } from '@vue-layout/basic';
import { defineNuxtPlugin } from '#app';
import { buildNavigationProvider } from '../config/layout';
import { useAuthStore } from '../store/auth';

export default defineNuxtPlugin((ctx) => {
    const navigationStore = useState<NavigationStore>(() => ({
        items: [],
        itemsActive: [],
    }));

    const store = useAuthStore(ctx.$pinia);

    ctx.vueApp.use(createPlugin({
        navigationStore,
        navigationProvider: buildNavigationProvider({
            isLoggedIn: () => store.loggedIn,
            hasPermission: (name) => store.has(name),
        }),
        presets: [
            'bootstrapV5',
            'fontAwesome',
        ],
    }));
});
