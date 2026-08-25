/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    buildVuecsInstallOptions,
    createCookieRef,
    injectStore,
    install,
    syncTranslatorLocaleFromManager,
    useTranslation,
} from '@authup/client-web-kit';
import { TranslatorTranslationCommonKey, TranslatorTranslationNamespace, matchLocale  } from '@authup/i18n';
import { createPinia } from 'pinia';
import { createApp, ref } from 'vue';

import { de } from 'date-fns/locale/de';
import { es } from 'date-fns/locale/es';
import { fr } from 'date-fns/locale/fr';

import vuecs from '@vuecs/core';
import { installLocale } from '@vuecs/locale';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import clientWebTheme from '@authup/client-web-theme';
import installButton from '@vuecs/button';
import installCountdown from '@vuecs/countdown';
import installElements from '@vuecs/elements';
import installForms from '@vuecs/forms';
import installIcon from '@vuecs/icon';
import installList from '@vuecs/list';
import installNavigation from '@vuecs/navigation';
import installOverlays from '@vuecs/overlays';
import installPagination from '@vuecs/pagination';
import installTable from '@vuecs/table';
import installTimeago from '@vuecs/timeago';

import './tailwind.css';

// Registers the build-time icon subset (see `NuxtIconBundle` in
// ../vite.config.ts) on `@iconify/vue`, which is what `<VCIcon>` reads.
import 'virtual:nuxt-icon-bundle/register';

import VApp from './App.vue';
import { resolveAdminConsoleConfig } from './config';
import { provideAdminConsoleConfig } from './di';
import { createRoutingGuard } from './guard';
import { createAdminConsoleRouter } from './router';

const config = resolveAdminConsoleConfig();

const app = createApp(VApp);
const pinia = createPinia();

app.use(pinia);

const router = createAdminConsoleRouter(config.basePath);

app.use(router);

provideAdminConsoleConfig(config, app);

// Locale persistence via @vuecs/locale: the `vc-locale` cookie (shared with
// the auth pages and the account console on the IdP origin) backs the
// locale source.
const localeSource = createCookieRef('vc-locale', undefined, 'auto');
const localeHandles = installLocale(app, {
    source: localeSource,
    navigatorLanguage: ref(typeof navigator !== 'undefined' ? navigator.language : undefined),
});

// Install the kit FIRST so `installTranslator()` provides the ilingo locale
// before `buildVuecsInstallOptions()` (below) reads it via `useTranslation`.
install(app, {
    baseURL: config.apiUrl,
    pinia,
    cookieSession: config.cookieSession,
    translatorLocale: matchLocale(localeHandles.resolved.value),
    // Scope the session cookies to the sub-path authup is served under
    // (shared with the hosted auth pages and the account console: one
    // session per deployment). See resolveCookiePath in ./config.ts.
    cookiePath: config.cookiePath,
});

// One-way: ilingo (authup catalogs) follows vuecs's resolved locale.
syncTranslatorLocaleFromManager(app);

// After install(): the store factory the guard resolves is provided there.
router.beforeEach(createRoutingGuard({
    store: injectStore(pinia, app),
    config,
}));

// `buildVuecsInstallOptions()` calls `useTranslation` -> `injectIlingo`,
// which needs an active injection context, hence `app.runWithContext()`.
const vuecsOptions = app.runWithContext(() => buildVuecsInstallOptions({
    // Kit theme first, app theme overrides win on conflicts.
    themes: [clientWebKitTheme(), clientWebTheme()],
}));

app.use(vuecs, {
    ...vuecsOptions,
    defaults: {
        ...vuecsOptions.defaults,
        // The breadcrumb `<nav>` landmark's accessible name. `@vuecs/navigation`
        // pins it to the English literal "Breadcrumb" and no page passes
        // `:label`, so without this a screen reader announces it in English
        // on every localized page.
        breadcrumb: {
            label: app.runWithContext(() => useTranslation({
                namespace: TranslatorTranslationNamespace.COMMON,
                key: TranslatorTranslationCommonKey.BREADCRUMB,
            })),
        },
    },
});

// Install vuecs BEFORE the per-package plugins so the theme manager carries
// authup's themes before they run.
app.use(installButton);
app.use(installElements);
app.use(installForms);
app.use(installList);
// Provides the app-level ToastManager + AlertDialogManager that
// `useToast()` / `useAlertDialog()` inject.
app.use(installOverlays);
app.use(installPagination);
app.use(installTable);
app.use(installIcon);
// Registry-only install (@vuecs/navigation 4.x): each `<VCNavItems>` owns
// its items via `:data`.
app.use(installNavigation);
app.use(installCountdown);
// Every authored UI locale (en is the built-in default): relative times
// follow the language switcher like the rest of the copy.
app.use(installTimeago, {
    locales: {
        de,
        es,
        fr,
    },
});

router.isReady().then(() => {
    app.mount('#app');
});
