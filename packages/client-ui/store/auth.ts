/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    OAuth2TokenGrantResponse, OAuth2TokenIntrospectionResponse, Realm, User,
} from '@authup/core';
import {
    APIClient, AbilityManager, OAuth2TokenKind, isAPIClientTokenExpiredError,
} from '@authup/core';
import { defineStore } from 'pinia';
import { computed, ref, useRuntimeConfig } from '#imports';

export const useAuthStore = defineStore('auth', () => {
    const config = useRuntimeConfig();

    const client = new APIClient({
        baseURL: config.public.apiUrl,
    });

    // --------------------------------------------------------------------

    const accessToken = ref<string | undefined>(undefined);
    const accessTokenExpireDate = ref<Date | undefined>(undefined);

    const refreshToken = ref<string | undefined>(undefined);

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
    };

    let refreshTokenPromise : Promise<OAuth2TokenGrantResponse> | undefined;

    const attemptRefreshToken = () : Promise<OAuth2TokenGrantResponse> => {
        if (!refreshToken.value) {
            return Promise.reject(new Error('No refresh token is present.'));
        }

        if (!refreshTokenPromise) {
            unsetToken(OAuth2TokenKind.ACCESS);

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
    const userResolved = ref(false);

    const setUser = (entity: User) => {
        user.value = entity;
        userResolved.value = true;
    };

    const unsetUser = () => {
        user.value = undefined;
        userResolved.value = false;
    };

    // --------------------------------------------------------------------

    const abilityManager = new AbilityManager();

    const token = ref<undefined | OAuth2TokenIntrospectionResponse>(undefined);
    const tokenResolved = ref(false);

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
        tokenResolved.value = true;

        token.value = entity;

        if (entity.exp) {
            const expireDate = new Date(entity.exp * 1000);
            setTokenExpireDate(expireDate);
        }

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
        tokenResolved.value = false;

        token.value = undefined;

        realm.value = undefined;
        realmManagement.value = undefined;

        abilityManager.set([]);
    };

    // --------------------------------------------------------------------

    type ResolveContext = {
        refresh?: boolean,
        attempts?: number
    };
    const resolve = async (ctx: ResolveContext = {}) => {
        if (
            !accessToken.value ||
            (ctx.attempts && ctx.attempts > 3)
        ) return;

        try {
            if (!tokenResolved.value || ctx.refresh) {
                const token = await client.token.introspect<OAuth2TokenIntrospectionResponse>({
                    token: accessToken.value,
                }, {
                    authorizationHeader: {
                        type: 'Bearer',
                        token: accessToken.value,
                    },
                });
                setTokenInfo(token);

                tokenResolved.value = true;
            }

            if (!userResolved.value || ctx.refresh) {
                const entity = await client.userInfo.get(`Bearer ${accessToken.value}`) as User;
                setUser(entity);

                userResolved.value = true;
            }
        } catch (e) {
            if (isAPIClientTokenExpiredError(e)) {
                await attemptRefreshToken();

                await resolve({
                    refresh: true,
                    attempts: ctx.attempts ? ctx.attempts++ : 1,
                });

                return;
            }

            throw e;
        }
    };

    const handleTokenGrantResponse = (response: OAuth2TokenGrantResponse) => {
        const expireDate = new Date(Date.now() + response.expires_in * 1000);
        setTokenExpireDate(expireDate);

        setToken(OAuth2TokenKind.ACCESS, response.access_token);
        if (response.refresh_token) {
            setToken(OAuth2TokenKind.REFRESH, response.refresh_token);
        }
    };

    const loggedIn = computed<boolean>(() => !!accessToken.value);
    const login = async (ctx: { name: string, password: string, realmId?: string}) => {
        try {
            const data = await client.token.createWithPasswordGrant({
                username: ctx.name,
                password: ctx.password,
                ...(realmId ? { realm_id: ctx.realmId } : {}),
            });

            handleTokenGrantResponse(data);

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
        setToken,
        setTokenExpireDate,
        unsetToken,

        token,
        handleTokenGrantResponse,
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
