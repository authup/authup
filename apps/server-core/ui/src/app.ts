/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildSubmitButtonDefaults, injectStore, install } from '@authup/client-web-kit';
import { omitRecord } from '@authup/kit';
import { createPinia } from 'pinia';
import type { App } from 'vue';
import { createSSRApp } from 'vue';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';

import vuecs from '@vuecs/core';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import clientWebTheme from '@authup/client-web-theme';
import fontAwesome from '@vuecs/icons-font-awesome';
import installForms from '@vuecs/forms';
import installPagination from '@vuecs/pagination';
import { addCollection } from '@iconify/vue';
import faBrands from '@iconify-json/fa6-brands/icons.json';
import faSolid from '@iconify-json/fa6-solid/icons.json';

import './tailwind.css';
import '@authup/client-web-kit/../dist/style.css';

import type { Router } from 'vue-router';
import Authorize from './pages/authorize.vue';
import VApp from './App.vue';
import { providePayload } from './di';
import type { HydrationPayload } from './types';

addCollection(faSolid);
addCollection(faBrands);

export function createApp(payload: HydrationPayload) : {
    app: App,
    router: Router
} {
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
                path: '/authorize',
            },
        ],
    });

    router.beforeEach(async (to) => {
        const store = injectStore(pinia);

        const code = typeof to.query.code === 'string' ? to.query.code : undefined;
        if (code) {
            try {
                await store.exchangeAuthorizationCode(code);

                return {
                    path: to.path,
                    query: omitRecord(to.query, ['code']),
                    hash: to.hash,
                };
            } catch {
                // code exchange failed
            }
        }

        try {
            await store.resolve();
        } catch {
            await store.logout();
        }

        return undefined;
    });

    app.use(router);

    providePayload(payload, app);

    // Install vuecs BEFORE the kit / per-package plugins so the theme
    // manager is populated when components mount (see the matching note
    // in `apps/client-web/plugins/vuecs.ts`).
    app.use(vuecs, {
        // Register both themes side-by-side (mirrors the Nuxt plugin).
        // Kit theme first, app theme layers on top.
        themes: [clientWebKitTheme(), clientWebTheme()],
        icons: [fontAwesome()],
        defaults: {
            // Wire authup's translator + icon choices into vuecs's
            // DefaultsManager so `useSubmitButton()` / `buildFormSubmit()`
            // resolve to locale-reactive labels with no per-call work.
            // Mirrors the Nuxt plugin in apps/client-web/plugins/vuecs.ts.
            submitButton: buildSubmitButtonDefaults(),
        },
    });
    app.use(installForms);
    app.use(installPagination);

    install(app, {
        baseURL: payload?.config?.baseURL,
        pinia,
    });

    return {
        app,
        router,
    };
}

