/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    StoreAuthStatus,
    buildVuecsInstallOptions,
    clearAuthorizationRequest,
    createCookieRef,
    injectStore,
    install,
    loadAuthorizationRequest,
    syncTranslatorLocaleFromManager,
} from '@authup/client-web-kit';
import { matchLocale } from '@authup/i18n';
import { omitRecord } from '@authup/kit';
import { OAuth2ErrorCode } from '@authup/specs';
import { createPinia } from 'pinia';
import { createApp, ref } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import { de } from 'date-fns/locale/de';
import { es } from 'date-fns/locale/es';
import { fr } from 'date-fns/locale/fr';

import vuecs from '@vuecs/core';
import { installLocale } from '@vuecs/locale';
import clientWebKitTheme from '@authup/client-web-kit-theme';
import clientWebTheme from '@authup/client-web-theme';
import installForms from '@vuecs/forms';
import installIcon from '@vuecs/icon';
import installOverlays from '@vuecs/overlays';
import installPagination from '@vuecs/pagination';
import installTimeago from '@vuecs/timeago';

import './tailwind.css';

// Registers the build-time icon subset (see `NuxtIconBundle` in
// ../vite.config.ts) on `@iconify/vue`, which is what `<VCIcon>` reads.
import 'virtual:nuxt-icon-bundle/register';

import VApp from './App.vue';
import { resolveAccountConsoleConfig } from './config';
import { provideAccountConsoleConfig } from './di';
import AccountShell from './pages/index.vue';
import Applications from './pages/applications.vue';
import Authenticators from './pages/authenticators.vue';
import ConnectedAccounts from './pages/connected-accounts.vue';
import Overview from './pages/overview.vue';
import Password from './pages/password.vue';
import Sessions from './pages/sessions.vue';
import { loadAccountConsoleRef, setAccountConsoleRef } from './ref';

const config = resolveAccountConsoleConfig();

// Seed the trusted back-link holder from the server-validated injected
// config. Only the login round-trip recovery below ever updates it again.
setAccountConsoleRef(config.ref);

const app = createApp(VApp);
const pinia = createPinia();

app.use(pinia);

const router = createRouter({
    // The base path is the mount point (default /account) — route paths
    // below are relative to it, so the app works embedded under a
    // publicUrl sub-path and on a standalone host alike.
    history: createWebHistory(config.basePath),
    routes: [
        {
            component: AccountShell,
            path: '/',
            children: [
                {
                    component: Overview,
                    path: '',
                },
                {
                    component: Password,
                    path: 'password',
                },
                {
                    component: Authenticators,
                    path: 'authenticators',
                },
                {
                    component: ConnectedAccounts,
                    path: 'connected-accounts',
                },
                {
                    component: Sessions,
                    path: 'sessions',
                },
                {
                    component: Applications,
                    path: 'applications',
                },
                {
                    path: ':pathMatch(.*)',
                    redirect: '/',
                },
            ],
        },
    ],
});

router.beforeEach(async (to) => {
    const store = injectStore(pinia);

    // Drain the login-kick stash on any return, not only a successful code
    // exchange: an error=access_denied return must not leave an entry
    // behind. Single use either way.
    const recoveredRef = loadAccountConsoleRef();
    if (recoveredRef) {
        setAccountConsoleRef(recoveredRef);
    }

    const code = typeof to.query.code === 'string' ? to.query.code : undefined;
    if (code) {
        // The login kick saved an authorization request carrying the PKCE
        // verifier + client/realm binding — the exchange must present them.
        // Single-use either way: consumed on success, dropped on failure
        // (a reload must not replay the code).
        const request = loadAuthorizationRequest();
        if (request) {
            const state = typeof to.query.state === 'string' ? to.query.state : undefined;

            let failed = false;
            try {
                if (request.state !== state) {
                    throw new Error('The authorization request state does not match.');
                }

                await store.exchangeAuthorizationCode(code, {
                    code_verifier: request.code_verifier,
                    redirect_uri: request.redirect_uri,
                    client_id: request.client_id,
                    realm_id: request.realm_id,
                });
            } catch {
                failed = true;
            }

            clearAuthorizationRequest();

            const query = omitRecord(to.query, ['code', 'state']);
            if (failed) {
                // Surfaced by the shell page as a readable error state; its
                // presence also suppresses the automatic re-kick into the
                // code flow (no unattended redirect loop).
                query.error = OAuth2ErrorCode.INVALID_GRANT;
            }

            // The kick stashed the active ref because the redirect_uri
            // carries no query string. Put it back into the URL for
            // visibility (bookmarking, nav links); the trusted holder was
            // already updated above.
            if (recoveredRef && typeof query.ref === 'undefined') {
                query.ref = recoveredRef;
            }

            return {
                path: to.path,
                query,
                hash: to.hash,
            };
        }

        // No saved request — the code cannot be redeemed (the account
        // console client mandates PKCE). Drop it from the URL.
        return {
            path: to.path,
            query: omitRecord(to.query, ['code', 'state']),
            hash: to.hash,
        };
    }

    try {
        await store.resolve();

        // A settled resolve leaves the session either complete or absent, so
        // anything else is a session this console cannot render: a subject that
        // is not a user (a client token seeded into the origin's shared cookie
        // set) keeps `user` null, and the shell, the realm chooser and the
        // sign-out control are all gated on the status it therefore never
        // reaches. Without this it would hold its loading state with no way
        // out. Treat it like a failed resolve.
        if (store.status === StoreAuthStatus.RESTORING) {
            await store.logout();
        }
    } catch {
        await store.logout();
    }

    return undefined;
});

app.use(router);

provideAccountConsoleConfig(config, app);

// Locale persistence via @vuecs/locale: the `vc-locale` cookie (shared with
// the auth pages on the IdP origin) backs the locale source.
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
    translatorLocale: matchLocale(localeHandles.resolved.value),
    // Scope the session cookies to the sub-path authup is served under
    // (shared with the hosted auth pages — one session per deployment).
    // Root-scoped cookies collide with a same-origin host application that
    // uses the kit's cookie names; see resolveCookiePath in ./config.ts.
    cookiePath: config.cookiePath,
});

// One-way: ilingo (authup catalogs) follows vuecs's resolved locale.
syncTranslatorLocaleFromManager(app);

// `buildVuecsInstallOptions()` calls `useTranslation` → `injectIlingo`,
// which needs an active injection context — hence `app.runWithContext()`.
const vuecsOptions = app.runWithContext(() => buildVuecsInstallOptions({ themes: [clientWebKitTheme(), clientWebTheme()] }));

// Install vuecs BEFORE the per-package plugins so the theme manager carries
// authup's themes before they run.
app.use(vuecs, vuecsOptions);
app.use(installForms);
app.use(installIcon);
// Provides the app-level ToastManager + AlertDialogManager that
// `useToast()` / `useAlertDialog()` inject.
app.use(installOverlays);
app.use(installPagination);
// <VCTimeago> is imported explicitly where used; the install carries the
// date-fns locales so relative times follow the active UI locale.
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
