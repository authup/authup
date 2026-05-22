/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectStore, install } from '@authup/client-web-kit';
import { omitRecord } from '@authup/kit';
import { createPinia } from 'pinia';
import type { App } from 'vue';
import { createSSRApp } from 'vue';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';

import vuecs from '@vuecs/core';
import bootstrap from '@vuecs/theme-bootstrap';
import fontAwesome from '@vuecs/icons-font-awesome';
import installForms from '@vuecs/forms';
import installPagination from '@vuecs/pagination';

// vuecs CSS pipeline (Bootstrap variant) — required cascade order per
// @vuecs/theme-bootstrap doctrine:
//   1. Bootstrap → default --bs-* variables.
//   2. @vuecs/design/standalone → --vc-color-* tokens (Tailwind-free OKLCH).
//   3. @vuecs/theme-bootstrap → bridges --bs-* ↔ --vc-color-*.
//   4. Per-component CSS (forms, table, button, elements, …) consumes
//      the --vc-color-* tokens above.
// Mirrors the client-web nuxt.config.ts pipeline so the consent UI's
// vuecs SFCs render with the same Bootstrap-themed look.
import 'bootstrap/dist/css/bootstrap.css';
import '@vuecs/design/standalone.css';
import '@vuecs/theme-bootstrap/index.css';
import '@vuecs/button/dist/style.css';
import '@vuecs/elements/dist/style.css';
import '@vuecs/forms/dist/style.css';
import '@vuecs/pagination/dist/style.css';
import '@vuecs/table/dist/style.css';
import '@authup/client-web-kit/../dist/style.css';
import '@fortawesome/fontawesome-free/css/all.css';
import '../../../client-web/assets/css/bootstrap-override.css';
import '../../../client-web/assets/css/root.css';
import '../../../client-web/assets/css/form.css';
import '../../../client-web/assets/css/generics.css';

import type { Router } from 'vue-router';
import Authorize from './pages/authorize.vue';
import VApp from './App.vue';
import { providePayload } from './di';
import type { HydrationPayload } from './types';

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
        themes: [bootstrap()],
        icons: [fontAwesome()],
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

