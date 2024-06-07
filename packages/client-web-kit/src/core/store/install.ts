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
import type { CookieGetFn, CookieSetFn, CookieUnsetFn } from '../../types';
import { STORE_ID } from './constants';
import { createStore } from './create';
import { hasStore, provideStore } from './singleton';
import type { StoreInstallOptions } from './types';

export function installStore(app: App, options: StoreInstallOptions = {}) {
    if (hasStore(app)) {
        return;
    }

    const storeCreator = defineStore(
        STORE_ID,
        () => createStore({ baseURL: options.baseURL }),
    );
    const store = storeCreator(options.pinia);

    const cookies = useCookies();

    let cookieGet : CookieGetFn;
    if (options.cookieGet) {
        cookieGet = options.cookieGet;
    } else {
        cookieGet = cookies.get;
    }

    let cookieSet: CookieSetFn;
    if (options.cookieSet) {
        cookieSet = options.cookieSet;
    } else {
        cookieSet = cookies.set;
    }

    let cookieUnset : CookieUnsetFn;
    if (options.cookieUnset) {
        cookieUnset = options.cookieUnset;
    } else if (options.cookieSet) {
        cookieUnset = (key: string) => {
            (options.cookieSet as CookieSetFn)(key, null);
        };
    } else {
        cookieUnset = cookies.remove;
    }

    const initStore = () => {
        if (store.initialized) {
            return;
        }

        store.setInitialized(true);

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

    store.$onAction((action) => {
        if (action.store.$id !== STORE_ID) {
            return;
        }

        if (action.name === 'logout') {
            cookieUnset(CookieName.ACCESS_TOKEN);
            cookieUnset(CookieName.ACCESS_TOKEN_EXPIRE_DATE);
            cookieUnset(CookieName.REFRESH_TOKEN);
            cookieUnset(CookieName.USER);
            cookieUnset(CookieName.REALM);
            cookieUnset(CookieName.REALM_MANAGEMENT);
        }
    });

    initStore();

    store.$subscribe((
        mutation,
        state,
    ) => {
        if (mutation.storeId !== STORE_ID) {
            return;
        }

        if (state.accessToken) {
            cookieSet(CookieName.ACCESS_TOKEN, state.accessToken);
        }

        if (state.accessTokenExpireDate) {
            cookieSet(CookieName.ACCESS_TOKEN_EXPIRE_DATE, state.accessTokenExpireDate);
        }

        if (state.refreshToken) {
            cookieSet(CookieName.REFRESH_TOKEN, state.refreshToken);
        }

        if (state.user) {
            cookieSet(CookieName.USER, state.user);
        }

        if (state.realm) {
            cookieSet(CookieName.REALM, state.realm);
        }

        if (state.realmManagement) {
            cookieSet(CookieName.REALM_MANAGEMENT, state.realmManagement);
        }
    });

    provideStore(storeCreator, app);
}
