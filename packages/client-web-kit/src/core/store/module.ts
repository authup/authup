/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computed, ref } from 'vue';
import type {
    OAuth2TokenGrantResponse,
    OAuth2TokenIntrospectionResponse,
} from '@authup/kit';
import type {
    Realm,
    User,
} from '@authup/core-kit';
import { REALM_MASTER_NAME } from '@authup/core-kit';
import {
    Client, isClientTokenExpiredError,
} from '@authup/core-http-kit';
import {
    Abilities,
} from '@authup/kit';
import type { StoreCreateContext, StoreLoginContext, StoreResolveContext } from './type';

export const createStore = (context: StoreCreateContext) => {
    const client = new Client({
        baseURL: context.baseURL,
    });

    // --------------------------------------------------------------------

    const accessToken = ref<string | undefined>(undefined);
    const setAccessToken = (input?: string) => {
        accessToken.value = input;
    };

    // --------------------------------------------------------------------

    const accessTokenExpireDate = ref<Date | undefined>(undefined);
    const setAccessTokenExpireDate = (input?: Date | number | string) => {
        if (typeof input === 'number' || typeof input === 'string') {
            accessTokenExpireDate.value = new Date(input); // verify microseconds or seconds
            return;
        }

        accessTokenExpireDate.value = input;
    };

    // --------------------------------------------------------------------

    const refreshToken = ref<string | undefined>(undefined);
    const setRefreshToken = (input?: string) => {
        refreshToken.value = input;
    };

    // --------------------------------------------------------------------

    const handleTokenGrantResponse = (response: OAuth2TokenGrantResponse) => {
        const expireDate = new Date(Date.now() + response.expires_in * 1000);

        setAccessTokenExpireDate(expireDate);
        setAccessToken(response.access_token);
        setRefreshToken(response.refresh_token);
    };

    // --------------------------------------------------------------------

    let refreshTokenPromise : Promise<OAuth2TokenGrantResponse> | undefined;

    const attemptRefreshToken = () : Promise<OAuth2TokenGrantResponse> => {
        if (!refreshToken.value) {
            return Promise.reject(new Error('No refresh token is present.'));
        }

        if (refreshTokenPromise) {
            return refreshTokenPromise;
        }

        refreshTokenPromise = client.token.createWithRefreshToken({
            refresh_token: refreshToken.value,
        })
            .then((r) => {
                handleTokenGrantResponse(r);

                return r;
            })
            .finally(() => {
                refreshTokenPromise = undefined;
            });

        return refreshTokenPromise;
    };

    // --------------------------------------------------------------------

    const user = ref<User | undefined>(undefined);
    const userId = computed<string | undefined>(() => (user.value ? user.value.id : undefined));
    const userResolved = ref(false);

    const setUser = (entity?: User) => {
        user.value = entity;
        userResolved.value = !!entity;
    };

    // --------------------------------------------------------------------

    const realm = ref<undefined | Pick<Realm, 'id' | 'name'>>(undefined);
    const realmId = computed<string | undefined>(() => (realm.value ? realm.value.id : undefined));
    const realmName = computed<string | undefined>(() => (realm.value ? realm.value.name : undefined));
    const realmIsRoot = computed<boolean>(() => {
        if (realm.value) {
            return realm.value.name === REALM_MASTER_NAME;
        }

        return false;
    });

    const setRealm = (entity?: Pick<Realm, 'id' | 'name'>) => {
        realm.value = entity;
    };

    const realmManagement = ref<undefined | Pick<Realm, 'id' | 'name'>>(undefined);
    const realmManagementId = computed<string | undefined>(() => (realmManagement.value ? realmManagement.value.id : realmId.value));
    const realmManagementName = computed<string | undefined>(() => (realmManagement.value ? realmManagement.value.name : realmName.value));

    const setRealmManagement = (entity?: Pick<Realm, 'id' | 'name'>) => {
        realmManagement.value = entity;
    };

    const abilities = new Abilities();

    const tokenInfo = ref<undefined | OAuth2TokenIntrospectionResponse>(undefined);
    const tokenResolved = ref(false);
    const setTokenInfo = (entity?: OAuth2TokenIntrospectionResponse) => {
        tokenResolved.value = !!entity;

        tokenInfo.value = entity;

        if (!entity) {
            setRealm(undefined);
            setRealmManagement(undefined);
            abilities.set([]);
            return;
        }

        if (entity.exp) {
            const expireDate = new Date(entity.exp * 1000);
            setAccessTokenExpireDate(expireDate);
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
            abilities.set(entity.permissions);
        }
    };

    // --------------------------------------------------------------------

    const resolve = async (ctx: StoreResolveContext = {}) => {
        if (!accessToken.value || (ctx.attempts && ctx.attempts > 3)) return;

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
            if (isClientTokenExpiredError(e)) {
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

    const loggedIn = computed<boolean>(() => !!accessToken.value);
    const login = async (ctx: StoreLoginContext) => {
        try {
            const response = await client.token.createWithPasswordGrant({
                username: ctx.name,
                password: ctx.password,
                ...(realmId.value ? { realm_id: ctx.realmId } : {}),
            });

            handleTokenGrantResponse(response);

            await resolve();
        } catch (e) {
            setUser(undefined);

            throw e;
        }
    };

    const logout = () => {
        setAccessToken(undefined);
        setRefreshToken(undefined);
        setUser(undefined);
        setTokenInfo(undefined);
    };

    return {
        abilities,

        login,
        logout,
        loggedIn,
        resolve,

        handleTokenGrantResponse,
        accessToken,
        setAccessToken,
        accessTokenExpireDate,
        setAccessTokenExpireDate,
        refreshToken,
        setRefreshToken,

        tokenInfo,
        setTokenInfo,

        realm,
        realmId,
        realmIsRoot,
        realmName,
        setRealm,

        realmManagement,
        realmManagementId,
        realmManagementName,
        setRealmManagement,

        user,
        userId,
        setUser,
    };
};
