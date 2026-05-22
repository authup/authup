/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ModuleOptions } from '@authup/client-web-nuxt';
import path from 'node:path';
import { defineNuxtConfig } from 'nuxt/config';
import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
    vite: {
        plugins: [
            tailwindcss(),
        ],
    },

    devtools: { componentInspector: false },

    experimental: {
        // todo: enable after v3.12.4
        scanPageMeta: false,
        appManifest: false,
    },

    css: [
        // vuecs CSS pipeline (Tailwind variant) — the @authup/client-web-theme
        // entry pulls in:
        //   1. tailwindcss           — utility layer + @theme directive
        //   2. @vuecs/design         — concrete --vc-color-* OKLCH tokens
        //   3. @vuecs/theme-tailwind — rebinds Tailwind --color-* ↔ --vc-color-*
        //   4. authup design tokens  — project palette / radii / typography
        // The Tailwind v4 vite plugin (configured under `vite.plugins` above)
        // processes the `@import "tailwindcss"` directive at build time.
        '@authup/client-web-theme/index.css',
        '@authup/client-web-kit/../dist/style.css',
        '@fortawesome/fontawesome-free/css/all.css',
        '@/assets/css/vue-layout-navigation.css',
        '@/assets/css/root.css',
        '@/assets/css/core/header.css',
        '@/assets/css/core/navbar.css',
        '@/assets/css/core/body.css',
        '@/assets/css/core/sidebar.css',
        '@/assets/css/core/footer.css',
        '@/assets/css/domain.css',
        '@/assets/css/card.css',
        '@/assets/css/form.css',
        '@/assets/css/generics.css',
    ],

    alias: {
        '@authup/access': path.join(__dirname, '..', '..', 'packages', 'access', 'src'),
        '@authup/core-kit': path.join(__dirname, '..', '..', 'packages', 'core-kit', 'src'),
        '@authup/core-http-kit': path.join(__dirname, '..', '..', 'packages', 'core-http-kit', 'src'),
        '@authup/kit': path.join(__dirname, '..', '..', 'packages', 'kit', 'src'),
        '@authup/client-web-kit': path.join(__dirname, '..', '..', 'packages', 'client-web-kit', 'src'),
        '@authup/client-web-theme': path.join(__dirname, '..', '..', 'packages', 'client-web-theme', 'src'),
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

