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
    CookieGetFn, CookieOptions, CookieSetFn, CookieUnsetFn,
} from '../../types';
import { STORE_ID } from './constants';
import { createStore } from './create';
import { StoreDispatcherEventName, createStoreDispatcher, provideStoreDispatcher } from './event-bus';
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

    const readCookies = () => {
        if (store.cookiesRead) {
            return;
        }

        store.setCookiesRead(true);

        const keys = Object.values(CookieName);

        let value : any;
        for (let i = 0; i < keys.length; i++) {
            value = cookieGet(keys[i]);
            if (!value) {
                continue;
            }

            switch (keys[i]) {
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
                cookieSet(CookieName.ACCESS_TOKEN_EXPIRE_DATE, input, {
                    maxAge: maxAgeFn(),
                });
            } else {
                cookieUnset(CookieName.ACCESS_TOKEN_EXPIRE_DATE, {});
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
                });
            } else {
                cookieUnset(CookieName.ACCESS_TOKEN, {});
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.REFRESH_TOKEN_UPDATED,
        (input) => {
            if (input) {
                cookieSet(CookieName.REFRESH_TOKEN, input, {});
            } else {
                cookieUnset(CookieName.REFRESH_TOKEN, {});
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.USER_UPDATED,
        (input) => {
            if (input) {
                cookieSet(CookieName.USER, input, {});
            } else {
                cookieUnset(CookieName.USER, {});
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.REALM_UPDATED,
        (input) => {
            if (input) {
                cookieSet(CookieName.REALM, input, {});
            } else {
                cookieUnset(CookieName.REALM, {});
            }
        },
    );

    storeDispatcher.on(
        StoreDispatcherEventName.REALM_MANAGEMENT_UPDATED,
        (input) => {
            if (input) {
                cookieSet(CookieName.REALM_MANAGEMENT, input, {});
            } else {
                cookieUnset(CookieName.REALM_MANAGEMENT, {});
            }
        },
    );

    readCookies();

    provideStoreFactory(storeFactory, app);
}
