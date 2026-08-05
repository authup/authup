/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core-http-kit';
import { useCookies } from '@vueuse/integrations/useCookies';
import { defineStore } from 'pinia';
import type { App } from 'vue';
import type {
    CookieGetFn, 
    CookieOptions, 
    CookieSetFn, 
    CookieUnsetFn,
} from '../../types';
import { COOKIE_PATH, STORE_ID } from './constants';
import { createStore } from './create';
import { StoreDispatcherEventName, createStoreDispatcher, provideStoreDispatcher } from './dispatcher';
import { hasStoreFactory, provideStoreFactory } from './singleton';
import type { StoreInstallOptions } from './types';

export function installStore(app: App, options: StoreInstallOptions = {}) {
    if (hasStoreFactory(app)) {
        return;
    }

    const storeDispatcher = createStoreDispatcher();
    provideStoreDispatcher(storeDispatcher, app);

    const storeFactory = defineStore(
        STORE_ID,
        () => createStore({
            baseURL: options.baseURL,
            httpClient: options.httpClient,
            dispatcher: storeDispatcher,
        }),
    );
    const store = storeFactory(options.pinia);

    let cookieGet : CookieGetFn;
    if (options.cookieGet) {
        cookieGet = options.cookieGet;
    } else {
        const cookies = useCookies();
        cookieGet = cookies.get;
    }

    let cookieSet: CookieSetFn;
    if (options.cookieSet) {
        cookieSet = options.cookieSet;
    } else {
        const cookies = useCookies();
        cookieSet = cookies.set;
    }

    let cookieUnset : CookieUnsetFn;
    if (options.cookieUnset) {
        cookieUnset = options.cookieUnset;
    } else if (options.cookieSet) {
        cookieUnset = (key: string, opts: CookieOptions) => {
            (options.cookieSet as CookieSetFn)(key, null, opts);
        };
    } else {
        const cookies = useCookies();
        cookieUnset = cookies.remove;
    }

    // Written explicitly, because a cookie stored without a `Path` takes the
    // browser's default-path: the directory of the writing document. The
    // account console at `/account` and the hosted auth pages at `/` are one
    // origin sharing one session under one set of cookie names, so the
    // implicit paths gave them two shadowing sets that expire independently.
    const cookiePath = options.cookiePath || COOKIE_PATH;

    /**
     * Namespace a store cookie under the configured application.
     *
     * `.` rather than `:` because RFC 6265 defines a cookie name as an RFC
     * 2616 token, whose separator set includes `:`. Browsers accept it,
     * proxies and cookie libraries do not uniformly.
     */
    const cookieName = (name: string) => (
        options.cookiePrefix ? `${options.cookiePrefix}.${name}` : name
    );

    const cookieNames = Object.values(CookieName).map(cookieName);

    /**
     * Drop the copies written before the path was pinned.
     *
     * Those sit on the browser's default-path for the writing document
     * (RFC 6265 5.1.4): `/account` for the account console. A pinned write
     * does not overwrite them, and they WIN the read, because
     * `document.cookie` lists the longer path first and the parser keeps the
     * first match. Hydration would then persist what they hold back onto the
     * pinned path, replacing a live refresh token with a stale one, which the
     * next refresh replays into family revocation. So they are cleared once,
     * before reading, and the browser falls back to the pinned session (or to
     * signed out, if that one already lapsed).
     *
     * Cleared is every path a cookie could sit on and still reach this
     * document, which by the RFC 6265 5.2.4 path-match is each `/`-boundary
     * prefix of the current path PLUS that path itself. The last part is not
     * redundant: `/account` serves the console too, and a copy written from
     * `/account/password` sits on exactly `/account`, matching it. Only the
     * store's own names are touched, and never on the pinned path.
     *
     * With a `cookiePrefix` set, only THIS application's names are cleared.
     * The bare tier belongs to the hosted auth pages, so clearing it would
     * sign the visitor out of the IdP as a side effect of loading an app.
     */
    const dropShadowingCookies = () => {
        const pathname = typeof window === 'undefined' ?
            undefined :
            window.location?.pathname;

        if (typeof pathname !== 'string') {
            return;
        }

        let path = '';
        for (const segment of pathname.split('/')) {
            if (!segment) {
                continue;
            }

            path += `/${segment}`;
            if (path === cookiePath) {
                continue;
            }

            for (const key of cookieNames) {
                cookieUnset(key, { path });
            }
        }
    };

    const readCookies = () => {
        if (store.cookiesRead) {
            return;
        }

        store.setCookiesRead(true);

        // The expire date must hydrate BEFORE the access token: the cookie
        // listener's write-back echo derives the token cookie's maxAge from
        // the already-written expire date (the same pinned order
        // applyTokenGrantResponse follows) — enum order would re-persist the
        // token as a session cookie.
        const keys : string[] = [
            CookieName.ACCESS_TOKEN_EXPIRE_DATE,
            ...Object.values(CookieName).filter(
                (key) => key !== CookieName.ACCESS_TOKEN_EXPIRE_DATE,
            ),
        ];

        let value : any;
        for (const key of keys) {
            value = cookieGet(cookieName(key));
            if (!value) {
                continue;
            }

            switch (key) {
                case CookieName.ACCESS_TOKEN:
                    if (!store.accessToken) {
                        store.setAccessToken(value);
                    }
                    break;
                case CookieName.ACCESS_TOKEN_EXPIRE_DATE:
                    if (!store.accessTokenExpireDate) {
                        store.setAccessTokenExpireDate(value);
                    }
                    break;
                case CookieName.REFRESH_TOKEN:
                    if (!store.refreshToken) {
                        store.setRefreshToken(value);
                    }
                    break;
                case CookieName.ID_TOKEN:
                    if (!store.idToken) {
                        store.setIdToken(value);
                    }
                    break;
                case CookieName.USER:
                    if (!store.user) {
                        store.setUser(value);
                    }
                    break;
                case CookieName.REALM:
                    if (!store.realm) {
                        store.setRealm(value);
                    }
                    break;
                case CookieName.REALM_MANAGEMENT:
                    if (!store.realmManagement) {
                        store.setRealmManagement(value);
                    }
                    break;
            }
        }
    };

    const maxAgeFn = () => {
        if (!store.accessTokenExpireDate) {
            return undefined;
        }

        return Math.floor(
            Math.max(1000, new Date(`${store.accessTokenExpireDate}`).getTime() - Date.now()) /
            1000,
        );
    };

    storeDispatcher.on(
        StoreDispatcherEventName.ACCESS_TOKEN_EXPIRE_DATE_UPDATED,
        (input) => {
            if (input) {
                cookieSet(cookieName(CookieName.ACCESS_TOKEN_EXPIRE_DATE), input, {
                    maxAge: maxAgeFn(),
                    path: cookiePath,
                });
            } else {
                cookieUnset(cookieName(CookieName.ACCESS_TOKEN_EXPIRE_DATE), { path: cookiePath });
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.ACCESS_TOKEN_UPDATED,
        (input) => {
            if (input) {
                const maxAge = maxAgeFn();
                cookieSet(cookieName(CookieName.ACCESS_TOKEN), input, {
                    maxAge,
                    path: cookiePath,
                });
            } else {
                cookieUnset(cookieName(CookieName.ACCESS_TOKEN), { path: cookiePath });
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.REFRESH_TOKEN_UPDATED,
        (input) => {
            if (input) {
                cookieSet(cookieName(CookieName.REFRESH_TOKEN), input, { path: cookiePath });
            } else {
                cookieUnset(cookieName(CookieName.REFRESH_TOKEN), { path: cookiePath });
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.ID_TOKEN_UPDATED,
        (input) => {
            if (input) {
                cookieSet(cookieName(CookieName.ID_TOKEN), input, { path: cookiePath });
            } else {
                cookieUnset(cookieName(CookieName.ID_TOKEN), { path: cookiePath });
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.USER_UPDATED,
        (input) => {
            if (input) {
                cookieSet(cookieName(CookieName.USER), input, { path: cookiePath });
            } else {
                cookieUnset(cookieName(CookieName.USER), { path: cookiePath });
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.REALM_UPDATED,
        (input) => {
            if (input) {
                cookieSet(cookieName(CookieName.REALM), input, { path: cookiePath });
            } else {
                cookieUnset(cookieName(CookieName.REALM), { path: cookiePath });
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.REALM_MANAGEMENT_UPDATED,
        (input) => {
            if (input) {
                cookieSet(cookieName(CookieName.REALM_MANAGEMENT), input, { path: cookiePath });
            } else {
                cookieUnset(cookieName(CookieName.REALM_MANAGEMENT), { path: cookiePath });
            }
        },
    );

    dropShadowingCookies();
    readCookies();

    provideStoreFactory(storeFactory, app);
}
