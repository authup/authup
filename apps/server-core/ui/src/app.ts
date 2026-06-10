/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    buildSubmitButtonDefaults, 
    injectStore, 
    injectTranslatorLocale, 
    install,
} from '@authup/client-web-kit';
import { isLocale } from '@authup/i18n';
import { omitRecord } from '@authup/kit';
import { createPinia } from 'pinia';
import type { App } from 'vue';
import { createSSRApp, ref, watch } from 'vue';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';

import vuecs from '@vuecs/core';
import { installLocale } from '@vuecs/locale';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import clientWebTheme from '@authup/client-web-theme';
import fontAwesome from '@vuecs/icons-font-awesome';
import installForms from '@vuecs/forms';
import installIcon from '@vuecs/icon';
import installPagination from '@vuecs/pagination';
import { addCollection } from '@iconify/vue';
import faBrands from '@iconify-json/fa6-brands/icons.json';
import faSolid from '@iconify-json/fa6-solid/icons.json';

import './tailwind.css';
import '@authup/client-web-kit/../dist/style.css';

import type { Router } from 'vue-router';
import Activate from './pages/activate.vue';
import Authorize from './pages/authorize.vue';
import PasswordForgot from './pages/password-forgot.vue';
import PasswordReset from './pages/password-reset.vue';
import Register from './pages/register.vue';
import VApp from './App.vue';
import { createCookieRef } from './cookie';
import { providePayload } from './di';
import type { HydrationPayload } from './types';

addCollection(faSolid);
addCollection(faBrands);

// Map a BCP-47 tag (e.g. `de-DE` resolved from `vc-locale` / the browser
// language) onto an authup catalog locale, or undefined when unauthored.
function toAuthupLocale(input?: string) : string | undefined {
    if (!input) {
        return undefined;
    }

    const [short] = input.toLowerCase().split('-');
    return isLocale(short) ? short : undefined;
}

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

    // Install the kit FIRST so `installTranslator()` provides the ilingo
    // locale before `buildSubmitButtonDefaults()` (below) reads it via
    // `useTranslation`. Mirrors apps/client-web where the `authup:kit`
    // plugin runs before the `vuecs` plugin (`dependsOn: ['authup']`).
    // The kit's `install()` only registers components (no render) and
    // deliberately does NOT install a theme manager, so installing vuecs
    // afterwards is still in time for the first render.
    install(app, {
        baseURL: payload?.config?.baseURL,
        pinia,
        translatorLocale: toAuthupLocale(localeHandles.resolved.value),
    });

    // Two-way bridge between the persisted vuecs locale and ilingo (the
    // translator the language switcher writes): resolved → ilingo keeps
    // catalogs in sync with `auto`/external changes; ilingo → source
    // persists a switcher pick into the cookie. Values converge, so the
    // pair cannot loop.
    const translatorLocale = app.runWithContext(() => injectTranslatorLocale());
    watch(localeHandles.resolved, (value) => {
        const mapped = toAuthupLocale(value);
        if (mapped && mapped !== translatorLocale.value) {
            translatorLocale.value = mapped;
        }
    });
    watch(translatorLocale, (value) => {
        if (isLocale(value) && toAuthupLocale(localeSource.value) !== value) {
            localeSource.value = value;
        }
    });

    // `buildSubmitButtonDefaults()` calls `useTranslation` → `injectIlingo`,
    // which reads the ilingo instance via `inject()`. Outside a component
    // setup there is no active injection context, so it must run inside
    // `app.runWithContext()` to see the app-level provide that
    // `installTranslator` (via `install` above) registered. apps/client-web
    // gets this for free because Nuxt runs plugin `setup()` within an
    // injection context.
    const submitButton = app.runWithContext(() => buildSubmitButtonDefaults());

    // Install vuecs BEFORE the per-package plugins (forms/icon/pagination)
    // so the theme manager carries authup's themes before they run.
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
            submitButton,
        },
    });
    app.use(installForms);
    app.use(installIcon);
    app.use(installPagination);

    return {
        app,
        router,
    };
}

