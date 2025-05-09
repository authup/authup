/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectStore, install } from '@authup/client-web-kit';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import { applyStoreManagerOptions, installStoreManager } from '@vuecs/form-controls/core';
import bootstrap from '@vuecs/preset-bootstrap-v5';
import fontAwesome from '@vuecs/preset-font-awesome';

import '@fortawesome/fontawesome-free/css/all.css';
import 'bootstrap/dist/css/bootstrap.css';
import '@vuecs/pagination/dist/index.css';
import '@authup/client-web-kit/dist/index.css';
import '../../../client-web/assets/css/bootstrap-override.css';
import '../../../client-web/assets/css/root.css';
import '../../../client-web/assets/css/form.css';
import '../../../client-web/assets/css/generics.css';

import App from './App.vue';
import Authorize from './Authorize.vue';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const router = createRouter({
    history: createWebHistory(),
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

let baseURL;
if (
    typeof window !== 'undefined' &&
    typeof window.baseURL === 'string'
) {
    baseURL = window.baseURL;
}

install(app, {
    baseURL,
    pinia,
});

const storeManager = installStoreManager(app);
applyStoreManagerOptions(storeManager, {
    presets: {
        bootstrap,
        fontAwesome,
    },
});

app.mount('#app');
