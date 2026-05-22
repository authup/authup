/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ModuleOptions } from '@authup/client-web-nuxt';
import path from 'node:path';
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
    build: {
        transpile: [
            'vue-toastification',
        ],
    },

    devtools: { componentInspector: false },

    experimental: {
        // todo: enable after v3.12.4
        scanPageMeta: false,
        appManifest: false,
    },

    css: [
        // vuecs CSS pipeline (Bootstrap variant) — required cascade order
        // per @vuecs/theme-bootstrap doctrine:
        //   1. Bootstrap → default --bs-* CSS variables.
        //   2. @vuecs/design/standalone → --vc-color-* tokens against a
        //      Tailwind-free OKLCH palette catalog.
        //   3. @vuecs/theme-bootstrap → bridges --bs-* ↔ --vc-color-*.
        //   4. Per-component CSS (forms, table, button, elements, …)
        //      consumes the --vc-color-* tokens above.
        // Without (2)/(3)/(4), form controls / tables / buttons render
        // unstyled (no borders, no spacing, default browser look).
        'bootstrap/dist/css/bootstrap.css',
        '@vuecs/design/standalone.css',
        '@vuecs/theme-bootstrap/index.css',
        '@vuecs/button/dist/style.css',
        '@vuecs/elements/dist/style.css',
        '@vuecs/forms/dist/style.css',
        '@vuecs/navigation/dist/style.css',
        '@vuecs/pagination/dist/style.css',
        '@vuecs/table/dist/style.css',
        '@authup/client-web-kit/../dist/style.css',
        '@fortawesome/fontawesome-free/css/all.css',
        '@/assets/css/vue-layout-navigation.css',
        '@/assets/css/vue-toastification.css',
        '@/assets/css/root.css',
        '@/assets/css/core/header.css',
        '@/assets/css/core/navbar.css',
        '@/assets/css/core/body.css',
        '@/assets/css/core/sidebar.css',
        '@/assets/css/core/footer.css',
        '@/assets/css/domain.css',
        '@/assets/css/root.css',
        '@/assets/css/card.css',
        '@/assets/css/form.css',
        '@/assets/css/generics.css',
        '@/assets/css/bootstrap-override.css',
    ],

    alias: {
        '@authup/access': path.join(__dirname, '..', '..', 'packages', 'access', 'src'),
        '@authup/core-kit': path.join(__dirname, '..', '..', 'packages', 'core-kit', 'src'),
        '@authup/core-http-kit': path.join(__dirname, '..', '..', 'packages', 'core-http-kit', 'src'),
        '@authup/kit': path.join(__dirname, '..', '..', 'packages', 'kit', 'src'),
        '@authup/client-web-kit': path.join(__dirname, '..', '..', 'packages', 'client-web-kit', 'src'),
        '@authup/specs': path.join(__dirname, '..', '..', 'packages', 'specs', 'src'),
    },

    runtimeConfig: {
        apiUrl: process.env.API_URL_SERVER,
        public: {
            apiUrl: process.env.API_URL || 'http://localhost:3001',
            publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
            cookieDomain: process.env.COOKIE_DOMAIN,
        },
    },

    modules: [
        '@pinia/nuxt',
        [
            // '../client-web-nuxt/src/module', {
            '@authup/client-web-nuxt',
{
    apiURLRuntimeKey: 'apiUrl',
    cookieDomainRuntimeKey: 'cookieDomain',
} satisfies ModuleOptions,
        ],
        [
            '@nuxtjs/google-fonts',
            {
                families: {
                    Asap: true,
                    Nunito: true,
                },
                download: true,
            },
        ],
    ],

    compatibilityDate: '2025-01-13',
});

