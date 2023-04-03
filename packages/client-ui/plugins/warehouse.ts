/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenKind } from '@authup/core';
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

    const keys : string[] = Object.values(AuthBrowserStorageKey);
    for (let i = 0; i < keys.length; i++) {
        const value = warehouse.get(keys[i]);
        if (!value) {
            continue;
        }

        switch (keys[i]) {
            case AuthBrowserStorageKey.ACCESS_TOKEN:
                authStore.setToken(OAuth2TokenKind.ACCESS, value);
                break;
            case AuthBrowserStorageKey.ACCESS_TOKEN_EXPIRE_DATE:
                authStore.setTokenExpireDate(new Date(value));
                break;
            case AuthBrowserStorageKey.REFRESH_TOKEN:
                authStore.setToken(OAuth2TokenKind.REFRESH, value);
                break;
            case AuthBrowserStorageKey.USER:
                authStore.setUser(value);
                break;
            case AuthBrowserStorageKey.REALM:
                authStore.setRealm(value);
                break;
            case AuthBrowserStorageKey.REALM_MANAGEMENT:
                authStore.setRealmManagement(value);
                break;
        }
    }

    authStore.$subscribe((mutation, state) => {
        if (mutation.storeId !== 'auth') return;

        if (typeof state.accessToken === 'undefined') {
            warehouse.remove(AuthBrowserStorageKey.ACCESS_TOKEN);
            warehouse.remove(AuthBrowserStorageKey.ACCESS_TOKEN_EXPIRE_DATE);
        } else {
            warehouse.set(AuthBrowserStorageKey.ACCESS_TOKEN, state.accessToken);
        }

        if (typeof state.accessTokenExpireDate === 'undefined') {
            warehouse.remove(AuthBrowserStorageKey.ACCESS_TOKEN_EXPIRE_DATE);
        } else {
            warehouse.set(AuthBrowserStorageKey.ACCESS_TOKEN_EXPIRE_DATE, state.accessTokenExpireDate);
        }

        if (typeof state.refreshToken === 'undefined') {
            warehouse.remove(AuthBrowserStorageKey.REFRESH_TOKEN);
        } else {
            warehouse.set(AuthBrowserStorageKey.REFRESH_TOKEN, state.refreshToken);
        }

        if (typeof state.user === 'undefined') {
            warehouse.remove(AuthBrowserStorageKey.USER);
        } else {
            warehouse.set(AuthBrowserStorageKey.USER, state.user);
        }

        if (typeof state.realm === 'undefined') {
            warehouse.remove(AuthBrowserStorageKey.REALM);
        } else {
            warehouse.set(AuthBrowserStorageKey.REALM, state.realm);
        }

        if (typeof state.realmManagement === 'undefined') {
            warehouse.remove(AuthBrowserStorageKey.REALM_MANAGEMENT);
        } else {
            warehouse.set(AuthBrowserStorageKey.REALM_MANAGEMENT, state.realmManagement);
        }
    });
});
