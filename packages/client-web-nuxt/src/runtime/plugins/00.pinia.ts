/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type StateTree, createPinia, setActivePinia } from 'pinia';
import { defineNuxtPlugin } from '#imports';

export default defineNuxtPlugin({
    name: 'authupPinia',
    enforce: 'pre',
    async setup(nuxt) {
        if (nuxt.$pinia) {
            return {

            };
        }

        const pinia = createPinia();
        nuxt.vueApp.use(pinia);
        setActivePinia(pinia);

        if (import.meta.server) {
            nuxt.payload.pinia = pinia.state.value;
        } else if (nuxt.payload && nuxt.payload.pinia) {
            pinia.state.value = nuxt.payload.pinia as Record<string, StateTree>;
        }

        // Inject $pinia
        return {
            provide: {
                pinia,
            },
        };
    },
});
