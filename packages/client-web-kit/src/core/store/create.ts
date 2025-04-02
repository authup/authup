/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionChecker,
    PermissionMemoryProvider,
    PolicyEngine,
} from '@authup/access';
import {
    OAuth2Error,
} from '@authup/specs';
import { computed, ref } from 'vue';
import type {
    OAuth2TokenGrantResponse,
    OAuth2TokenIntrospectionResponse,
} from '@authup/specs';
import type {
    Realm,
    User,
} from '@authup/core-kit';
import { REALM_MASTER_NAME } from '@authup/core-kit';
import {
    Client, isClientTokenExpiredError,
} from '@authup/core-http-kit';
import { StoreDispatcherEventName } from './dispatcher';
import type { StoreCreateContext, StoreLoginContext } from './types';

type InputFn = (...args: any[]) => Promise<any>;
type OutputFn<F extends InputFn> = (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>>;

function createPromiseShareWrapperFn<F extends InputFn>(
    fn: F,
) : OutputFn<F> {
    let promise : Promise<Awaited<ReturnType<F>>> | undefined;

    return (...args: Parameters<F>) => {
        if (promise) {
            return promise;
        }

        promise = new Promise<Awaited<ReturnType<F>>>(
            (resolve, reject) => {
                fn(...args)
                    .then((r) => resolve(r))
                    .catch((e) => reject(e));
            },
        );

        promise.finally(() => {
            setTimeout(() => {
                promise = undefined;
            }, 0);
        });

        return promise;
    };
}

type RealmMinimal = Pick<Realm, 'id' | 'name'>;

export function createStore(context: StoreCreateContext) {
    const client = new Client({
        baseURL: context.baseURL,
    });

    const cookiesRead = ref<boolean>(false);
    const setCookiesRead = (value: boolean) => {
        cookiesRead.value = value;
    };

    // --------------------------------------------------------------------

    const accessToken = ref<string | null>(null);
    const setAccessToken = (input: string | null) => {
        accessToken.value = input;

        context.dispatcher.emit(
            StoreDispatcherEventName.ACCESS_TOKEN_UPDATED,
            input,
        );
    };

    // --------------------------------------------------------------------

    const accessTokenExpireDate = ref<Date | null>(null);
    const setAccessTokenExpireDate = (input: Date | number | string | null) => {
        if (typeof input === 'number' || typeof input === 'string') {
            accessTokenExpireDate.value = new Date(input); // verify microseconds or seconds
        } else {
            accessTokenExpireDate.value = input;
        }

        context.dispatcher.emit(
            StoreDispatcherEventName.ACCESS_TOKEN_EXPIRE_DATE_UPDATED,
            accessTokenExpireDate.value,
        );
    };

    // --------------------------------------------------------------------

    const refreshToken = ref<string | null>(null);
    const setRefreshToken = (input: string | null) => {
        refreshToken.value = input;

        context.dispatcher.emit(
            StoreDispatcherEventName.REFRESH_TOKEN_UPDATED,
            input,
        );
    };

    // --------------------------------------------------------------------

    const user = ref<User | null>(null);
    const userId = computed<string | null>(() => (user.value ? user.value.id : null));

    const setUser = (input: User | null) => {
        user.value = input;

        context.dispatcher.emit(StoreDispatcherEventName.USER_UPDATED, input);
    };

    // --------------------------------------------------------------------

    const realm = ref<RealmMinimal | null>(null);
    const realmId = computed<string | undefined>(() => (realm.value ? realm.value.id : undefined));
    const realmName = computed<string | undefined>(() => (realm.value ? realm.value.name : undefined));
    const realmIsRoot = computed<boolean>(() => {
        if (realm.value) {
            return realm.value.name === REALM_MASTER_NAME;
        }

        return false;
    });

    const setRealm = (input: RealmMinimal | null) => {
        realm.value = input;

        context.dispatcher.emit(StoreDispatcherEventName.REALM_UPDATED, input);
    };

    const realmManagement = ref<RealmMinimal | null>(null);
    const realmManagementId = computed<string | undefined>(() => (realmManagement.value ? realmManagement.value.id : realmId.value));
    const realmManagementName = computed<string | undefined>(() => (realmManagement.value ? realmManagement.value.name : realmName.value));

    const setRealmManagement = (input: RealmMinimal | null) => {
        realmManagement.value = input;

        context.dispatcher.emit(StoreDispatcherEventName.REALM_MANAGEMENT_UPDATED, input);
    };

    // --------------------------------------------------------------------

    const permissionRepository = new PermissionMemoryProvider();
    const permissionChecker = new PermissionChecker({
        provider: permissionRepository,
        policyEngine: new PolicyEngine(),
    });

    // --------------------------------------------------------------------

    const cleanup = async () => {
        const tempAccessToken = accessToken.value;
        const tempRefreshToken = refreshToken.value;

        setAccessToken(null);
        setAccessTokenExpireDate(null);
        setRefreshToken(null);
        setUser(null);
        setRealm(null);
        setRealmManagement(null);

        permissionRepository.setMany([]);

        tokenResolved.value = false;
        userResolved.value = false;

        try {
            if (tempAccessToken) {
                await client.token.revoke({
                    token: tempAccessToken,
                });
            }
        } catch (e) {
            // ...
        }

        try {
            if (tempRefreshToken) {
                await client.token.revoke({
                    token: tempRefreshToken,
                });
            }
        } catch (e) {
            // ...
        }
    };

    // --------------------------------------------------------------------

    const userResolved = ref(false);
    const resolveUser = async () : Promise<void> => {
        if (!accessToken.value || userResolved.value) {
            return Promise.resolve();
        }

        userResolved.value = true;

        return client.userInfo.get<User>(`Bearer ${accessToken.value}`)
            .then((response) => {
                setUser(response);
            });
    };

    // --------------------------------------------------------------------

    const tokenResolved = ref(false);
    const resolveToken = async () : Promise<void> => {
        if (!accessToken.value || tokenResolved.value) {
            return Promise.resolve();
        }

        tokenResolved.value = true;

        return client.token.introspect<OAuth2TokenIntrospectionResponse>({
            token: accessToken.value,
        }, {
            authorizationHeader: {
                type: 'Bearer',
                token: accessToken.value,
            },
        })
            .then((response) => {
                if (response.exp) {
                    const expireDate = new Date(response.exp * 1000);
                    setAccessTokenExpireDate(expireDate);
                }

                if (
                    response.realm_id &&
                    response.realm_name
                ) {
                    realm.value = {
                        id: response.realm_id,
                        name: response.realm_name,
                    };

                    if (!realmManagement.value) {
                        setRealmManagement(realm.value);
                    }
                }

                if (response.permissions) {
                    permissionRepository.setMany(response.permissions.map((permission) => ({
                        name: permission.name,
                        realmId: permission.realm_id,
                        clientId: permission.client_id,
                    })));
                }
            });
    };

    // --------------------------------------------------------------------

    const applyTokenGrantResponse = (
        response: OAuth2TokenGrantResponse,
    ) => {
        const expireDate = new Date(Date.now() + response.expires_in * 1000);

        setAccessTokenExpireDate(expireDate);
        setAccessToken(response.access_token);

        if (response.refresh_token) {
            setRefreshToken(response.refresh_token);
        } else {
            setRefreshToken(null);
        }
    };

    // --------------------------------------------------------------------

    const refreshSession = createPromiseShareWrapperFn(
        async (): Promise<void> => {
            if (!refreshToken.value) {
                throw new OAuth2Error('The access token can not be renewed.');
            }

            try {
                const response = await client.token.createWithRefreshToken({
                    refresh_token: refreshToken.value,
                });

                applyTokenGrantResponse(response);
            } catch (e) {
                await cleanup();

                throw e;
            } finally {
                tokenResolved.value = false;
                userResolved.value = false;
            }
        },
    );

    // --------------------------------------------------------------------

    // todo: rename to reload() ?
    const resolveInternal = async () : Promise<void> => {
        context.dispatcher.emit(StoreDispatcherEventName.RESOLVING);

        try {
            if (
                !accessToken.value &&
                refreshToken.value
            ) {
                await refreshSession();
            }

            if (accessToken.value) {
                await resolveToken();

                if (!user.value) {
                    await resolveUser();
                }
            }
        } catch (e) {
            if (
                isClientTokenExpiredError(e) &&
                refreshToken.value
            ) {
                await refreshSession();
                await resolveToken();
                await resolveUser();
            } else {
                throw e;
            }
        }

        context.dispatcher.emit(StoreDispatcherEventName.RESOLVED);
    };

    const resolve = createPromiseShareWrapperFn(resolveInternal);

    const loggedIn = computed<boolean>(() => !!accessToken.value);
    const login = async (ctx: StoreLoginContext) => {
        context.dispatcher.emit(StoreDispatcherEventName.LOGGING_IN);

        const response = await client.token.createWithPassword({
            username: ctx.name,
            password: ctx.password,
            ...(realmId.value ? { realm_id: ctx.realmId } : {}),
        });

        applyTokenGrantResponse(response);

        await resolveToken();
        await resolveUser();

        context.dispatcher.emit(StoreDispatcherEventName.LOGGED_IN);
    };

    const logout = async () => {
        context.dispatcher.emit(StoreDispatcherEventName.LOGGING_OUT);

        await cleanup();

        context.dispatcher.emit(StoreDispatcherEventName.LOGGED_OUT);
    };

    return {
        cookiesRead,
        setCookiesRead,

        permissionChecker,

        login,
        logout,
        loggedIn,
        resolve,

        applyTokenGrantResponse,
        accessToken,
        setAccessToken,
        accessTokenExpireDate,
        setAccessTokenExpireDate,
        refreshToken,
        setRefreshToken,

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
}
