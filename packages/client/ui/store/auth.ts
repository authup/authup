/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    OAuth2TokenGrantResponse,
    OAuth2TokenIntrospectionResponse,
    Realm,
    User,
} from '@authup/common';
import {
    AbilityManager,
    ErrorCode,
    OAuth2TokenKind,
    hasOwnProperty,
} from '@authup/common';
import { Client } from '@hapic/oauth2';
import { isClientError } from 'hapic';
import { defineStore } from 'pinia';
import { computed, ref, useRuntimeConfig } from '#imports';
import { useRouter } from '#app';

export const useAuthStore = defineStore('auth', () => {
    const config = useRuntimeConfig();

    const client = new Client({
        options: {
            token_endpoint: new URL('token', config.public.apiUrl).href,
            introspection_endpoint: new URL('token/introspect', config.public.apiUrl).href,
            userinfo_endpoint: new URL('users/@me', config.public.apiUrl).href,
        },
    });

    client.mountResponseInterceptor((r) => r, ((error) => {
        if (typeof error?.response?.data?.message === 'string') {
            error.message = error.response.data.message;
            return Promise.reject(error);
        }

        return Promise.reject(new Error('A network error occurred.'));
    }));

    // --------------------------------------------------------------------

    const accessToken = ref<string | undefined>(undefined);
    const accessTokenExpireDate = ref<Date | undefined>(undefined);

    const refreshToken = ref<string | undefined>(undefined);
    let refreshTokenJob : undefined | ReturnType<typeof setTimeout>;

    const registerRefreshTokenJob = () => {
        if (!accessTokenExpireDate.value) {
            return;
        }

        const callback = async () => {
            const router = useRouter();

            await router.push({
                path: '/logout',
                query: {
                    redirect: router.currentRoute.value.fullPath,
                },
            });
        };

        if (refreshTokenJob) {
            clearTimeout(refreshTokenJob);
        }

        const timeoutMilliSeconds = accessTokenExpireDate.value.getTime() - Date.now() - 30.000;

        if (timeoutMilliSeconds < 0) {
            Promise.resolve()
                .then(callback);
        }

        refreshTokenJob = setTimeout(callback, timeoutMilliSeconds);
    };

    const setToken = (kind: OAuth2TokenKind, token: string) => {
        switch (kind) {
            case OAuth2TokenKind.ACCESS: {
                accessToken.value = token;
                break;
            }
            case OAuth2TokenKind.REFRESH:
                refreshToken.value = token;
                break;
        }
    };

    const unsetToken = (kind: OAuth2TokenKind) => {
        switch (kind) {
            case OAuth2TokenKind.ACCESS: {
                accessToken.value = undefined;
                accessTokenExpireDate.value = undefined;
                break;
            }
            case OAuth2TokenKind.REFRESH:
                refreshToken.value = undefined;
                break;
        }
    };

    const setTokenExpireDate = (date: Date) => {
        accessTokenExpireDate.value = date;

        registerRefreshTokenJob();
    };

    let refreshTokenPromise : Promise<OAuth2TokenGrantResponse> | undefined;

    const attemptRefreshToken = () : Promise<OAuth2TokenGrantResponse> => {
        if (!refreshToken.value) {
            return Promise.reject(new Error('No refresh token is present.'));
        }

        if (!refreshTokenPromise) {
            refreshTokenPromise = client.token.createWithRefreshToken({
                refresh_token: refreshToken.value,
            })
                .then((r) => {
                    refreshTokenPromise = undefined;
                    return r;
                })
                .catch((e) => {
                    logout();

                    refreshTokenPromise = undefined;
                    throw e;
                });

            return refreshTokenPromise;
        }

        return refreshTokenPromise;
    };

    // --------------------------------------------------------------------

    const user = ref<User | undefined>(undefined);
    const userId = computed<string | undefined>(() => (user.value ? user.value.id : undefined));
    let userResolved = false;

    const setUser = (entity: User) => {
        user.value = entity;
        userResolved = true;
    };

    const unsetUser = () => {
        user.value = undefined;
        userResolved = false;
    };

    const resolveUser = async (force?: boolean) => {
        if (!accessToken.value || (userResolved && !force)) return;
        userResolved = true;

        try {
            const entity = await client.userInfo.get(accessToken.value) as User;
            setUser(entity);
        } catch (e) {
            if (
                isClientError(e) &&
                e.response &&
                e.response.data &&
                hasOwnProperty(e.response.data, 'code') &&
                e.response.data.code === ErrorCode.TOKEN_EXPIRED
            ) {
                await attemptRefreshToken();
                await resolveUser(true);

                return;
            }

            throw e;
        }
    };

    // --------------------------------------------------------------------

    const abilityManager = new AbilityManager();

    const token = ref<undefined | OAuth2TokenIntrospectionResponse>(undefined);
    let tokenResolved = false;

    const has = (name: string) => abilityManager.has(name);

    const realm = ref<undefined | Pick<Realm, 'id' | 'name'>>(undefined);
    const realmId = computed<string | undefined>(() => (realm.value ? realm.value.id : undefined));
    const realmName = computed<string | undefined>(() => (realm.value ? realm.value.name : undefined));

    const setRealm = (entity: Pick<Realm, 'id' | 'name'>) => {
        realm.value = entity;
    };

    const realmManagement = ref<undefined | Pick<Realm, 'id' | 'name'>>(undefined);
    const realmManagementId = computed<string | undefined>(() => (realmManagement.value ? realmManagement.value.id : realmId.value));
    const realmManagementName = computed<string | undefined>(() => (realmManagement.value ? realmManagement.value.name : realmName.value));

    const setRealmManagement = (entity: Pick<Realm, 'id' | 'name'>) => {
        realmManagement.value = entity;
    };

    const setTokenInfo = (entity: OAuth2TokenIntrospectionResponse) => {
        tokenResolved = true;

        token.value = entity;

        if (
            entity.realm_id &&
            entity.realm_name
        ) {
            realm.value = {
                id: entity.realm_id,
                name: entity.realm_name,
            };

            if (typeof realmManagement.value === 'undefined') {
                setRealmManagement(realm.value);
            }
        }

        if (entity.permissions) {
            abilityManager.set(entity.permissions);
        }
    };

    const unsetTokenInfo = () => {
        tokenResolved = false;

        token.value = undefined;

        realm.value = undefined;
        realmManagement.value = undefined;

        abilityManager.set([]);
    };

    const introspectToken = async (force?: boolean) => {
        if (!accessToken.value || (tokenResolved && !force)) return;
        tokenResolved = true;

        try {
            const token = await client.token.introspect(accessToken.value) as OAuth2TokenIntrospectionResponse;
            setTokenInfo(token);
        } catch (e) {
            if (
                isClientError(e) &&
                e.response &&
                e.response.data &&
                hasOwnProperty(e.response.data, 'code') &&
                e.response.data.code === ErrorCode.TOKEN_EXPIRED
            ) {
                await attemptRefreshToken();
                await introspectToken(true);

                return;
            }

            throw e;
        }
    };

    // --------------------------------------------------------------------

    const resolve = async () => {
        if (!accessToken.value) return;

        await resolveUser();
        await introspectToken();
    };

    const loggedIn = computed<boolean>(() => !!accessToken.value);
    const login = async (name: string, password: string) => {
        try {
            const data = await client.token.createWithPasswordGrant({
                username: name,
                password,
            });

            const expireDate = new Date(Date.now() + data.expires_in * 1000);
            setTokenExpireDate(expireDate);

            setToken(OAuth2TokenKind.ACCESS, data.access_token);
            if (data.refresh_token) {
                setToken(OAuth2TokenKind.REFRESH, data.refresh_token);
            }

            await resolve();
        } catch (e) {
            unsetToken(OAuth2TokenKind.ACCESS);
            unsetToken(OAuth2TokenKind.REFRESH);

            throw e;
        }
    };

    const logout = () => {
        unsetToken(OAuth2TokenKind.ACCESS);
        unsetToken(OAuth2TokenKind.REFRESH);

        unsetUser();
        unsetTokenInfo();
    };

    return {
        login,
        logout,
        loggedIn,
        resolve,

        accessToken,
        accessTokenExpireDate,
        refreshToken,
        attemptRefreshToken,
        setToken,
        setTokenExpireDate,
        unsetToken,

        token,
        setTokenInfo,
        unsetTokenInfo,

        realm,
        realmId,
        realmName,
        setRealm,

        realmManagement,
        realmManagementId,
        realmManagementName,
        setRealmManagement,

        user,
        userId,
        setUser,
        unsetUser,

        has,
    };
});
