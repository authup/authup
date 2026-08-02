/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ModuleOptions } from '@authup/client-web-nuxt';
import { API_URL_DEFAULT } from '@authup/core-http-kit';
import { CLIENT_ADMIN_CONSOLE_NAME } from '@authup/core-kit';
import path from 'node:path';
import { defineNuxtConfig } from 'nuxt/config';
import tailwindcss from '@tailwindcss/vite';
import { NuxtIconBundle } from '@nuxt/icon/vite';

const repositoryRoot = path.resolve(__dirname, '..', '..');

export default defineNuxtConfig({
    vite: {
        plugins: [
            tailwindcss(),
            // Bundle ONLY the icons this app renders, instead of registering
            // the whole Font Awesome 6 solid + brands collections at runtime
            // (1,902 icons, ~429 KB gzip, for a few dozen used ones). The
            // plugin scans source for `<collection>:<name>` literals and emits
            // them into `virtual:nuxt-icon-bundle/register`, which registers
            // through `addIcon` from `@iconify/vue` — the same global store
            // `<VCIcon>` resolves against, so no component changes are needed.
            //
            // This is @nuxt/icon's STANDALONE vite plugin, not the Nuxt module:
            // apps/server-core/ui (plain Vite, no Nuxt) uses the exact same
            // plugin and glob list, so the two apps cannot drift.
            //
            // Keep the globs in sync with apps/server-core/ui/vite.config.ts.
            // Every path that can carry an icon name must be listed: this app,
            // `@authup/client-web-kit` (components + identity-provider preset
            // tables), and `@vuecs/icons-font-awesome`, whose preset supplies
            // the behavioral defaults (pagination arrows, submit-button icons,
            // alert icons, collapse chevrons) whose names exist ONLY there.
            NuxtIconBundle({
                cwd: repositoryRoot,
                scan: {
                    globInclude: [
                        'apps/client-admin-console/{pages,components,layouts,composables,config,plugins}/**/*.{vue,ts}',
                        'packages/client-web-kit/src/**/*.{vue,ts}',
                        'node_modules/@vuecs/icons-font-awesome/dist/*.mjs',
                    ],
                    globExclude: [],
                },
            }),
        ],
    },

    devtools: { componentInspector: false },

    // The OAuth2 callback exchanges a single-use authorization code using a
    // PKCE verifier kept in sessionStorage — a client-only resource. Render
    // the route client-side only so the route middleware never runs during
    // SSR (where it would exchange without the verifier and consume the
    // code). See packages/client-web-nuxt RoutingInterceptor.
    routeRules: { '/login/callback': { ssr: false } },

    experimental: {
        // todo: enable after v3.12.4
        scanPageMeta: false,
        appManifest: false,
    },

    css: [
        // App-local Tailwind v4 entry — `@import`s @authup/client-web-theme
        // (which transitively pulls in @authup/client-web-kit-theme +
        // tailwindcss + @vuecs/design + @vuecs/theme-tailwind + every
        // authup-owned stylesheet) and adds `@source` scopes for this
        // app's own template tree + per-app nested vuecs deps. With the
        // theme split, the app no longer holds any project CSS directly.
        '@/assets/css/tailwind.css',
    ],

    alias: {
        '@authup/access': path.join(__dirname, '..', '..', 'packages', 'access', 'src'),
        '@authup/core-kit': path.join(__dirname, '..', '..', 'packages', 'core-kit', 'src'),
        '@authup/core-http-kit': path.join(__dirname, '..', '..', 'packages', 'core-http-kit', 'src'),
        '@authup/kit': path.join(__dirname, '..', '..', 'packages', 'kit', 'src'),
        '@authup/client-web-kit': path.join(__dirname, '..', '..', 'packages', 'client-web-kit', 'src'),
        '@authup/client-web-kit-theme': path.join(__dirname, '..', '..', 'packages', 'client-web-kit-theme', 'src'),
        '@authup/client-web-theme': path.join(__dirname, '..', '..', 'packages', 'client-web-theme', 'src'),
        '@authup/specs': path.join(__dirname, '..', '..', 'packages', 'specs', 'src'),
    },

    runtimeConfig: {
        apiUrl: process.env.API_URL_SERVER,
        public: {
            apiUrl: process.env.API_URL || API_URL_DEFAULT,
            publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
            cookieDomain: process.env.COOKIE_DOMAIN,
            // The OAuth2 client the console authenticates against — the
            // per-realm built-in `admin-console` client (plan 079).
            // Runtime-overridable via NUXT_PUBLIC_CLIENT_ID for forks that
            // register their own client.
            clientId: process.env.CLIENT_ID || CLIENT_ADMIN_CONSOLE_NAME,
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
        '@vuecs/nuxt',
    ],

    // @vuecs/nuxt — only wire color-mode persistence here. Theme
    // registration + per-package plugins stay in plugins/vuecs.ts
    // (which handles installButton / installForms / etc. + defaults +
    // translator-locale binding). `themes: []` prevents the module from
    // auto-installing a duplicate theme manager.
    //
    // `injectTokens: false` — @vuecs/design is already pulled in via
    // @authup/client-web-kit-theme's CSS @import chain.
    vuecs: {
        injectTokens: false,
        themes: [],
        colorMode: { value: 'system' },
        colorPalette: false,
    },

    compatibilityDate: '2025-01-13',
});
