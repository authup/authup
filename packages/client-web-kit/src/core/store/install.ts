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
            cookieSession: options.cookieSession,
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

            for (const key of Object.values(CookieName)) {
                cookieUnset(key, { path });
            }
        }
    };

    /**
     * The cookies holding a token pair. Cookie mode (plan 088) neither reads
     * nor writes them.
     *
     * NOT reading them is the whole of finding 1: the hosted auth pages write
     * these names at the same path on the same origin, so seeding them gave
     * the console a bearer, and header-wins precedence meant the session
     * cookie was never consulted — the cookie path would have been unreachable
     * on its own happy path. The authentication hook stays installed (it is
     * inert without an access token, and `installHTTPClient` throws when it
     * was never provided).
     *
     * NOT writing them matters just as much: those cookies are the hosted auth
     * console's lingering SSO session, which `prompt=none` and
     * `prompt=select_account` depend on for every other RP on the origin. A
     * console `logout()` clears every token ref, so with the listeners
     * attached it would clear those cookies as a side effect. The console does
     * not write them.
     *
     * Scoped precisely, because the wider claim would be wrong: this is about
     * the COOKIES, not the session behind them. A deliberate sign-out does end
     * the session row, and since the authorize flow reuses the bearer session
     * (#3191 session continuity) that row IS the hosted page's session, so
     * signing out of the account console signs the browser out of the IdP.
     * That is the intended semantic on the IdP's own origin. What it leaves
     * behind is stale token cookies naming a deleted row: they fail at the API
     * (the middleware checks the session), so the state self-heals, and
     * `/token/introspect` reporting them `active` in the meantime is its
     * documented jti+exp contract rather than a session check.
     */
    const TOKEN_COOKIE_NAMES : string[] = [
        CookieName.ACCESS_TOKEN,
        CookieName.ACCESS_TOKEN_EXPIRE_DATE,
        CookieName.REFRESH_TOKEN,
        CookieName.ID_TOKEN,
    ];

    const isTokenCookie = (key: string) => options.cookieSession &&
        TOKEN_COOKIE_NAMES.includes(key);

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
            if (isTokenCookie(key)) {
                continue;
            }

            value = cookieGet(key);
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

    // Skipped entirely in cookie mode — see TOKEN_COOKIE_NAMES above.
    if (!options.cookieSession) {
        storeDispatcher.on(
            StoreDispatcherEventName.ACCESS_TOKEN_EXPIRE_DATE_UPDATED,
            (input) => {
                if (input) {
                    cookieSet(CookieName.ACCESS_TOKEN_EXPIRE_DATE, input, {
                        maxAge: maxAgeFn(),
                        path: cookiePath,
                    });
                } else {
                    cookieUnset(CookieName.ACCESS_TOKEN_EXPIRE_DATE, { path: cookiePath });
                }
            },
        );

        storeDispatcher.on(
            StoreDispatcherEventName.ACCESS_TOKEN_UPDATED,
            (input) => {
                if (input) {
                    const maxAge = maxAgeFn();
                    cookieSet(CookieName.ACCESS_TOKEN, input, {
                        maxAge,
                        path: cookiePath,
                    });
                } else {
                    cookieUnset(CookieName.ACCESS_TOKEN, { path: cookiePath });
                }
            },
        );

        storeDispatcher.on(
            StoreDispatcherEventName.REFRESH_TOKEN_UPDATED,
            (input) => {
                if (input) {
                    cookieSet(CookieName.REFRESH_TOKEN, input, { path: cookiePath });
                } else {
                    cookieUnset(CookieName.REFRESH_TOKEN, { path: cookiePath });
                }
            },
        );

        storeDispatcher.on(
            StoreDispatcherEventName.ID_TOKEN_UPDATED,
            (input) => {
                if (input) {
                    cookieSet(CookieName.ID_TOKEN, input, { path: cookiePath });
                } else {
                    cookieUnset(CookieName.ID_TOKEN, { path: cookiePath });
                }
            },
        );
    }

    storeDispatcher.on(
        StoreDispatcherEventName.REALM_UPDATED,
        (input) => {
            if (input) {
                cookieSet(CookieName.REALM, input, { path: cookiePath });
            } else {
                cookieUnset(CookieName.REALM, { path: cookiePath });
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.REALM_MANAGEMENT_UPDATED,
        (input) => {
            if (input) {
                cookieSet(CookieName.REALM_MANAGEMENT, input, { path: cookiePath });
            } else {
                cookieUnset(CookieName.REALM_MANAGEMENT, { path: cookiePath });
            }
        },
    );

    dropShadowingCookies();

    /**
     * The user record is deliberately NOT persisted.
     *
     * Its value was the verbatim `/userinfo` body, and extra attributes are
     * flattened onto that response AFTER the query projection, so nothing
     * bounded its size: one operator-defined attribute is enough to push the
     * cookie past the 4096 byte limit, where the browser drops it silently.
     * It also carried the email and both names into the header of every
     * request on the origin, static assets included. The store now builds the
     * subject from the introspection response `resolve()` already awaits, so
     * there is nothing to persist and nothing to restore.
     *
     * Copies written by earlier versions are swept here rather than left to
     * expire: they carry no `maxAge`, so an open browser would keep sending one
     * until it closes. The sweep is conditional because the name is a bare
     * `user` on the pinned path — an unconditional delete would reach a
     * same-named cookie belonging to another app on the origin on every single
     * install, rather than once for a browser carrying the kit's own leftover.
     */
    if (cookieGet(CookieName.USER)) {
        cookieUnset(CookieName.USER, { path: cookiePath });
    }

    readCookies();

    provideStoreFactory(storeFactory, app);
}
