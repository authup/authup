/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    buildVuecsInstallOptions,
    injectStore,
    install,
    syncTranslatorLocaleFromManager,
} from '@authup/client-web-kit';
import type { IClient } from '@authup/core-http-kit';
import { matchLocale } from '@authup/i18n';
import { getURLBasePath, isObject, omitRecord } from '@authup/kit';
import { createPinia } from 'pinia';
import type { App } from 'vue';
import { createSSRApp, ref } from 'vue';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';

import vuecs from '@vuecs/core';
import { installLocale } from '@vuecs/locale';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import clientWebTheme from '@authup/client-web-theme';
import installForms from '@vuecs/forms';
import installIcon from '@vuecs/icon';
import installOverlays from '@vuecs/overlays';
import installPagination from '@vuecs/pagination';

import './tailwind.css';

// Registers the build-time icon subset (see `NuxtIconBundle` in
// ui/vite.config.ts) on `@iconify/vue`, which is what `<VCIcon>` reads.
// Replaces the kit's `registerIconCollections()`, which pulled both full
// Font Awesome collections into the bundle.
import 'virtual:nuxt-icon-bundle/register';

import type { Router } from 'vue-router';
import Activate from './pages/activate.vue';
import Authorize from './pages/authorize.vue';
import Logout from './pages/logout.vue';
import PasswordForgot from './pages/password-forgot.vue';
import PasswordReset from './pages/password-reset.vue';
import Register from './pages/register.vue';
import VApp from './App.vue';
import { createCookieRef } from './cookie';
import { providePayload } from './di';
import type { HydrationPayload } from './types';

export type CreateAppOptions = {
    httpClient?: IClient
};

export function createApp(payload: HydrationPayload, options: CreateAppOptions = {}) : {
    app: App,
    router: Router
} {
    const app = createSSRApp(VApp);
    const pinia = createPinia();

    app.use(pinia);

    const isClient = typeof window !== 'undefined';

    // When authup is publicly served under a sub-path (baseURL carries a
    // pathname), the browser location includes the prefix — the router base
    // strips it so route matching keeps working on hydration.
    const basePath = getURLBasePath(payload?.config?.baseURL);

    const router = createRouter({
        history: isClient ?
            createWebHistory(basePath) :
            createMemoryHistory(basePath),
        routes: [
            {
                component: Authorize,
                path: '/authorize',
            },
            {
                component: Register,
                path: '/register',
            },
            {
                component: Activate,
                path: '/activate',
            },
            {
                component: PasswordForgot,
                path: '/password-forgot',
            },
            {
                component: PasswordReset,
                path: '/password-reset',
            },
            {
                component: Logout,
                path: '/logout',
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

    // Locale persistence via @vuecs/locale: the `vc-locale` cookie (same
    // name as @vuecs/nuxt's plugin, so client-web shares it on a common
    // origin) backs the locale source. Server-side `renderUIPage` reads
    // the cookie into `payload.config.locale`; `installLocale` resolves
    // `auto` against the browser language and bridges the resolved value
    // into vuecs's `Config['locale']` (timeago & friends).
    const localeSource = createCookieRef('vc-locale', payload?.config?.locale, 'auto');
    const localeHandles = installLocale(app, {
        source: localeSource,
        navigatorLanguage: ref(typeof navigator !== 'undefined' ? navigator.language : undefined),
    });

    // Bucket for the SSR to client handoff: filled while rendering and
    // serialized with the rest of the payload afterwards (see server.ts),
    // so the client adopts what the render already fetched.
    const hydration = isObject(payload) ?
        (payload.hydration || (payload.hydration = {})) :
        {};

    // Install the kit FIRST so `installTranslator()` provides the ilingo
    // locale before `buildSubmitButtonDefaults()` (below) reads it via
    // `useTranslation`. Mirrors apps/client-web where the `authup:kit`
    // plugin runs before the `vuecs` plugin (`dependsOn: ['authup']`).
    // The kit's `install()` only registers components (no render) and
    // deliberately does NOT install a theme manager, so installing vuecs
    // afterwards is still in time for the first render.
    install(app, {
        baseURL: payload?.config?.baseURL,
        httpClient: options.httpClient,
        pinia,
        translatorLocale: matchLocale(localeHandles.resolved.value),
        isServer: !isClient,
        hydrationStore: {
            get: <T>(key: string) => hydration[key] as T | undefined,
            set: (key: string, value: unknown) => {
                hydration[key] = value;
            },
            delete: (key: string) => {
                delete hydration[key];
            },
        },
    });

    // One-way: ilingo (authup catalogs) follows vuecs's resolved locale — the
    // source of truth. The language switcher writes vuecs (`useLocaleControl`),
    // which updates the cookie-backed source above, so no reverse bridge.
    syncTranslatorLocaleFromManager(app);

    // `buildVuecsInstallOptions()` (shared with apps/client-web's vuecs
    // plugin: icon preset + translator-wired submit-button defaults) calls
    // `useTranslation` → `injectIlingo`, which reads the ilingo instance
    // via `inject()`. Outside a component setup there is no active
    // injection context, so it must run inside `app.runWithContext()` to
    // see the app-level provide that `installTranslator` (via `install`
    // above) registered. apps/client-web gets this for free because Nuxt
    // runs plugin `setup()` within an injection context.
    const vuecsOptions = app.runWithContext(() => buildVuecsInstallOptions({
        // Register both themes side-by-side (mirrors the Nuxt plugin).
        // Kit theme first, app theme layers on top.
        themes: [clientWebKitTheme(), clientWebTheme()],
    }));

    // Install vuecs BEFORE the per-package plugins (forms/icon/pagination)
    // so the theme manager carries authup's themes before they run.
    app.use(vuecs, vuecsOptions);
    app.use(installForms);
    app.use(installIcon);
    // Provides the app-level ToastManager + AlertDialogManager that
    // `useToast()` / `useAlertDialog()` inject (the <VCToastProvider> in
    // App.vue only supplies the Reka toast context, not the manager).
    app.use(installOverlays);
    app.use(installPagination);

    return {
        app,
        router,
    };
}

