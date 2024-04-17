/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Adapter } from 'browser-storage-adapter';
import type { Pinia } from 'pinia';
import { defineNuxtPlugin, useCookie } from '#app';
import { AuthBrowserStorageKey } from '../config/auth';
import { useAuthStore } from '../store/auth';

declare module '#app' {
    interface NuxtApp {
        $warehouse: Adapter;
    }
}

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $warehouse: Adapter;
    }
}

export default defineNuxtPlugin((ctx) => {
    const warehouse = new Adapter({
        driver: {
            cookie: {
                path: '/',
            },
        },
        isServer: () => !!process.server,
        setCookie: (key, value) => {
            const cookie = useCookie<unknown>(key);
            cookie.value = value;
        },
        getCookie: (key) => {
            const cookie = useCookie(key);
            return cookie.value;
        },
    });

    ctx.provide('warehouse', warehouse);

    const authStore = useAuthStore(ctx.$pinia as Pinia);
    if (process.server) {
        const keys: string[] = Object.values(AuthBrowserStorageKey);
        for (let i = 0; i < keys.length; i++) {
            const value = warehouse.get(keys[i]);
            if (!value) {
                continue;
            }

            switch (keys[i]) {
                case AuthBrowserStorageKey.ACCESS_TOKEN:
                    if (!authStore.accessToken) {
                        authStore.setAccessToken(value);
                    }
                    break;
                case AuthBrowserStorageKey.ACCESS_TOKEN_EXPIRE_DATE:
                    if (!authStore.accessTokenExpireDate) {
                        authStore.setAccessTokenExpireDate(value);
                    }
                    break;
                case AuthBrowserStorageKey.REFRESH_TOKEN:
                    if (!authStore.refreshToken) {
                        authStore.setRefreshToken(value);
                    }
                    break;
                case AuthBrowserStorageKey.USER:
                    if (!authStore.user) {
                        authStore.setUser(value);
                    }
                    break;
                case AuthBrowserStorageKey.REALM:
                    if (!authStore.realm) {
                        authStore.setRealm(value);
                    }
                    break;
                case AuthBrowserStorageKey.REALM_MANAGEMENT:
                    if (!authStore.realmManagement) {
                        authStore.setRealmManagement(value);
                    }
                    break;
            }
        }
    }

    authStore.$subscribe((mutation, state) => {
        if (mutation.storeId !== 'auth') return;

        if (state.accessToken) {
            warehouse.set(AuthBrowserStorageKey.ACCESS_TOKEN, state.accessToken);
        } else {
            warehouse.remove(AuthBrowserStorageKey.ACCESS_TOKEN);
        }

        if (state.accessTokenExpireDate) {
            warehouse.set(AuthBrowserStorageKey.ACCESS_TOKEN_EXPIRE_DATE, state.accessTokenExpireDate);
        } else {
            warehouse.remove(AuthBrowserStorageKey.ACCESS_TOKEN_EXPIRE_DATE);
        }

        if (state.refreshToken) {
            warehouse.set(AuthBrowserStorageKey.REFRESH_TOKEN, state.refreshToken);
        } else {
            warehouse.remove(AuthBrowserStorageKey.REFRESH_TOKEN);
        }

        if (state.user) {
            warehouse.set(AuthBrowserStorageKey.USER, state.user);
        } else {
            warehouse.remove(AuthBrowserStorageKey.USER);
        }

        if (state.realm) {
            warehouse.set(AuthBrowserStorageKey.REALM, state.realm);
        } else {
            warehouse.remove(AuthBrowserStorageKey.REALM);
        }

        if (state.realmManagement) {
            warehouse.set(AuthBrowserStorageKey.REALM_MANAGEMENT, state.realmManagement);
        } else {
            warehouse.remove(AuthBrowserStorageKey.REALM_MANAGEMENT);
        }
    });
});
