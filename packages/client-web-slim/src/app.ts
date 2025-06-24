/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectStore, install } from '@authup/client-web-kit';
import { createPinia } from 'pinia';
import type { App } from 'vue';
import { createSSRApp } from 'vue';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';

import { applyStoreManagerOptions, installStoreManager } from '@vuecs/form-controls/core';
import bootstrap from '@vuecs/preset-bootstrap-v5';
import fontAwesome from '@vuecs/preset-font-awesome';

import '@fortawesome/fontawesome-free/css/all.css';
import 'bootstrap/dist/css/bootstrap.css';
import '@vuecs/pagination/dist/index.css';
import '@authup/client-web-kit/../dist/index.css';
import '../../client-web/assets/css/bootstrap-override.css';
import '../../client-web/assets/css/root.css';
import '../../client-web/assets/css/form.css';
import '../../client-web/assets/css/generics.css';

import type { Router } from 'vue-router';
import Authorize from './Authorize.vue';
import VApp from './App.vue';
import { providePayload } from './di';
import type { HydrationPayload } from './types';

export function createApp(payload: HydrationPayload) : {app: App, router: Router} {
    const app = createSSRApp(VApp);
    const pinia = createPinia();

    app.use(pinia);

    const isClient = typeof window !== 'undefined';

    const router = createRouter({
        history: isClient ?
            createWebHistory() :
            createMemoryHistory(),
        routes: [
            {
                component: Authorize,
                path: '/:pathMatch(.*)*',
            },
        ],
    });

    router.beforeEach(async () => {
        const store = injectStore(pinia);

        try {
            await store.resolve();
        } catch (e) {
            await store.logout();
        }
    });

    app.use(router);

    providePayload(payload, app);

    install(app, {
        baseURL: payload?.config?.baseURL,
        pinia,
    });

    const storeManager = installStoreManager(app);
    applyStoreManagerOptions(storeManager, {
        presets: {
            bootstrap,
            fontAwesome,
        },
    });

    return { app, router };
}
