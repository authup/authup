/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    PermissionEvaluator,
    PermissionMemoryProvider,
    PolicyEngine,
} from '@authup/access';
import { OAuth2Error } from '@authup/specs';
import type { IClient } from '@authup/core-http-kit';
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
import { Client } from '@authup/core-http-kit';
import { StoreAuthOrigin, StoreAuthStatus } from './constants';
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

        // not .finally(): the derived promise it returns would reject
        // unobserved whenever the shared promise rejects (unhandledrejection
        // on every failed refresh/resolve).
        const clear = () => {
            setTimeout(() => {
                promise = undefined;
            }, 0);
        };
        promise.then(clear, clear);

        return promise;
    };
}

type RealmMinimal = Pick<Realm, 'id' | 'name'>;

export function createStore(context: StoreCreateContext) {
    const client : IClient = context.httpClient ?? new Client({ baseURL: context.baseURL });

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

    // The OIDC id_token from the last grant response. Retained (+ cookie
    // persisted) so a downstream RP logout can pass it as `id_token_hint` to
    // the authup `end_session_endpoint` — otherwise every kit RP degrades to
    // the click-gated confirm page.
    const idToken = ref<string | null>(null);
    const setIdToken = (input: string | null) => {
        idToken.value = input;

        context.dispatcher.emit(
            StoreDispatcherEventName.ID_TOKEN_UPDATED,
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

    // The id of the session backing the current access token. Sourced from the
    // token introspection response so the UI can mark "this device" and avoid a
    // confusing silent self-logout on the current row.
    const sessionId = ref<string | null>(null);

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

    const permissionProvider = new PermissionMemoryProvider();
    const permissionEvaluator = new PermissionEvaluator({
        provider: permissionProvider,
        policyEngine: new PolicyEngine(),
    });

    // --------------------------------------------------------------------

    // Marks an interactive login()/exchangeAuthorizationCode() in flight —
    // status reads AUTHENTICATING for its whole duration, so consumers never
    // have to interpret the intermediate token/realm/user writes.
    const interactionInFlight = ref<StoreAuthOrigin.LOGIN | StoreAuthOrigin.EXCHANGE | null>(null);

    // How the current session became authenticated in THIS app instance.
    // Stamped by login()/exchangeAuthorizationCode() on success and by a
    // resolve() that finds a session while no origin is set (cookie restore);
    // a later resolve() never overwrites an interactive origin.
    const lastAuthOrigin = ref<`${StoreAuthOrigin}` | null>(null);

    // Presence-derived on purpose: reachable from the raw setter surface and
    // from @pinia/nuxt payload hydration alike (an internal "resolved" flag
    // would desync from the transferred refs). AUTHENTICATED = the state is
    // complete, not "server-validated" — validation is resolve()'s job.
    const status = computed<StoreAuthStatus>(() => {
        if (interactionInFlight.value) {
            return StoreAuthStatus.AUTHENTICATING;
        }

        if (!accessToken.value) {
            return StoreAuthStatus.ANONYMOUS;
        }

        return realm.value && user.value ?
            StoreAuthStatus.AUTHENTICATED :
            StoreAuthStatus.RESTORING;
    });

    // Bumped by cleanup(). An interaction/revalidation captures the value when
    // it starts staging and its commit aborts when it changed — a logout that
    // interleaved with the staged network round-trips must not be undone by a
    // late commit (zombie-commit guard).
    const tokenGeneration = ref(0);

    // The current session has been validated (introspected) once in this app
    // instance. Not returned: per-instance bookkeeping, deliberately NOT part
    // of the hydration payload — a fresh instance always revalidates.
    const validated = ref(false);

    // A token refresh landed since the last commit: status stays
    // authenticated, but the next resolve() runs an AWAITED revalidation
    // (failure keeps routing into the navigation guards' catch).
    const resolutionStale = ref(false);

    // --------------------------------------------------------------------

    const cleanup = async () => {
        const tempAccessToken = accessToken.value;
        const tempRefreshToken = refreshToken.value;

        setAccessToken(null);
        setAccessTokenExpireDate(null);
        setRefreshToken(null);
        setIdToken(null);
        setUser(null);
        sessionId.value = null;
        setRealm(null);
        setRealmManagement(null);

        lastAuthOrigin.value = null;

        permissionProvider.setMany([]);

        validated.value = false;
        resolutionStale.value = false;
        tokenGeneration.value += 1;

        try {
            if (tempAccessToken) {
                await client.token.revoke({ token: tempAccessToken });
            }
        } catch {
            // ...
        }

        try {
            if (tempRefreshToken) {
                await client.token.revoke({ token: tempRefreshToken });
            }
        } catch {
            // ...
        }
    };

    // --------------------------------------------------------------------

    // Pure fetchers — they take the token explicitly and mutate nothing, so a
    // session can be STAGED across multiple round-trips and committed in one
    // synchronous block (no consumer ever observes a half-built store).

    const fetchTokenIntrospection = async (
        token: string,
    ) : Promise<OAuth2TokenIntrospectionResponse> => client.token.introspect<OAuth2TokenIntrospectionResponse>(
        { token },
        {
            authorizationHeader: {
                type: 'Bearer',
                token,
            },
        },
    );

    const fetchUserInfo = async (token: string) : Promise<User> => client.userInfo.get<User>(`Bearer ${token}`);

    type SessionCommitContext = {
        // tokenGeneration captured when staging started
        generation: number,
        // the token introspection/userinfo ran against
        token: string,
        // tokens to apply — absent for a revalidation of the current token
        grant?: OAuth2TokenGrantResponse,
        introspection: OAuth2TokenIntrospectionResponse,
        // absent when the current user is kept (revalidation)
        user?: User,
        // login/exchange stamp explicitly; a restore stamps only when unset
        origin?: StoreAuthOrigin.LOGIN | StoreAuthOrigin.EXCHANGE,
    };

    // The single synchronous write path for a staged session. The write order
    // is load-bearing (expire date before access token — the cookie listener
    // derives the token cookie's maxAge from the already-written expire date)
    // and nothing in here may await. Atomicity holds for the reactive layer;
    // dispatcher subscribers (cookie sync, auth hook) still observe the
    // individual setter events synchronously, exactly as before.
    const commitSession = (ctx: SessionCommitContext) : boolean => {
        if (ctx.generation !== tokenGeneration.value) {
            return false;
        }

        if (ctx.grant) {
            applyTokenGrantResponse(ctx.grant);
        }

        // A background hook refresh may have rotated the token while a
        // revalidation's introspection was in flight — never re-arm the
        // expire date (and thus the refresh timer) from a superseded token.
        if (ctx.introspection.exp && ctx.token === accessToken.value) {
            setAccessTokenExpireDate(new Date(ctx.introspection.exp * 1000));
        }

        if (ctx.introspection.session_id) {
            sessionId.value = ctx.introspection.session_id;
        }

        if (
            ctx.introspection.realm_id &&
            ctx.introspection.realm_name
        ) {
            // deliberate direct write (not setRealm): a REALM_UPDATED emit
            // would start persisting a realm cookie for the first time and
            // open a pre-resolve staleness surface (plan 045 review).
            realm.value = {
                id: ctx.introspection.realm_id,
                name: ctx.introspection.realm_name,
            };

            if (!realmManagement.value) {
                setRealmManagement(realm.value);
            }
        }

        if (ctx.user) {
            setUser(ctx.user);
        }

        if (ctx.introspection.permissions) {
            permissionProvider.setMany(ctx.introspection.permissions.map((permission) => ({
                permission: {
                    name: permission.name,
                    realm_id: permission.realm_id,
                    client_id: permission.client_id,
                },
            })));
        }

        validated.value = true;
        resolutionStale.value = false;

        if (ctx.origin) {
            lastAuthOrigin.value = ctx.origin;
        } else if (!lastAuthOrigin.value) {
            lastAuthOrigin.value = StoreAuthOrigin.RESTORE;
        }

        return true;
    };

    // A staged grant that will never be committed (failure or abort) must be
    // revoked best-effort: the tokens were never written to any ref or cookie,
    // so no later logout() could reach them — without this, a transient
    // introspection failure orphans a live server session.
    const revokeStagedGrant = async (response: OAuth2TokenGrantResponse) => {
        try {
            await client.token.revoke({ token: response.access_token });
        } catch {
            // best-effort
        }

        if (response.refresh_token) {
            try {
                await client.token.revoke({ token: response.refresh_token });
            } catch {
                // best-effort
            }
        }
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

        // A refresh grant response carries no id_token — keep the retained one
        // rather than clearing it (the session is unchanged).
        if (response.id_token) {
            setIdToken(response.id_token);
        }

        // A bare token apply leaves the identity data (realm/user/permissions)
        // unrefreshed — the next resolve() runs an awaited revalidation.
        // commitSession() clears the flag again right after it applies a
        // grant, so only token-only updates (refresh grants) stay stale.
        resolutionStale.value = true;
    };

    // --------------------------------------------------------------------

    const refreshSession = createPromiseShareWrapperFn(
        async (): Promise<void> => {
            if (!refreshToken.value) {
                throw new OAuth2Error('The access token can not be renewed.');
            }

            try {
                const response = await client.token.createWithRefreshToken({ refresh_token: refreshToken.value });

                // marks the resolution stale: status stays authenticated,
                // the next resolve() revalidates (awaited).
                applyTokenGrantResponse(response);
            } catch (e) {
                await cleanup();

                throw e;
            }
        },
    );

    // --------------------------------------------------------------------

    // Stage introspection (+ userinfo when no user is present yet) for the
    // current token and commit. Returns silently when the commit was aborted
    // by an interleaved cleanup() — the caller's post-state (anonymous) is
    // already what the user asked for.
    const revalidate = async () : Promise<void> => {
        const generation = tokenGeneration.value;
        const token = accessToken.value;
        if (!token) {
            return;
        }

        const introspection = await fetchTokenIntrospection(token);
        const userInfo = user.value ? undefined : await fetchUserInfo(token);

        commitSession({
            generation,
            token,
            introspection,
            user: userInfo,
        });
    };

    // todo: rename to reload() ?
    const resolveInternal = async () : Promise<void> => {
        context.dispatcher.emit(StoreDispatcherEventName.RESOLVING);

        if (
            !accessToken.value &&
            refreshToken.value
        ) {
            await refreshSession();
        }

        if (
            accessToken.value &&
            (!validated.value || resolutionStale.value)
        ) {
            try {
                await revalidate();
            } catch (e) {
                // a still-valid refresh token may recover the session
                if (refreshToken.value) {
                    await refreshSession();
                    await revalidate();
                } else {
                    throw e;
                }
            }
        }

        // A session found by resolve() with no origin set is a restore
        // (cookie hydration / raw seeding); never overwrite an interactive
        // origin — a later resolve() on a logged-in session is a no-op here.
        if (accessToken.value && !lastAuthOrigin.value) {
            lastAuthOrigin.value = StoreAuthOrigin.RESTORE;
        }

        context.dispatcher.emit(StoreDispatcherEventName.RESOLVED);
    };

    const resolve = createPromiseShareWrapperFn(resolveInternal);

    /**
     * @deprecated Coarse "a token exists" flag — read {@link status} instead
     * (AUTHENTICATED additionally implies realm + user are present).
     */
    const loggedIn = computed<boolean>(() => !!accessToken.value);
    // Stage introspection + userinfo for a fresh grant, then commit
    // atomically. On failure or an aborted commit the staged tokens are
    // revoked best-effort — nothing was written, so nothing else could.
    // `generation` is captured by the caller BEFORE its first round-trip, so
    // a logout anywhere in the staged window aborts the commit.
    const establishSession = async (
        response: OAuth2TokenGrantResponse,
        origin: StoreAuthOrigin.LOGIN | StoreAuthOrigin.EXCHANGE,
        generation: number,
    ) : Promise<void> => {
        let committed = false;

        try {
            const introspection = await fetchTokenIntrospection(response.access_token);
            const userInfo = await fetchUserInfo(response.access_token);

            committed = commitSession({
                generation,
                token: response.access_token,
                grant: response,
                introspection,
                user: userInfo,
                origin,
            });
        } finally {
            if (!committed) {
                await revokeStagedGrant(response);
            }
        }

        if (!committed) {
            throw new OAuth2Error('The session was torn down before the login could be established.');
        }
    };

    const login = async (ctx: StoreLoginContext) => {
        context.dispatcher.emit(StoreDispatcherEventName.LOGGING_IN);

        interactionInFlight.value = StoreAuthOrigin.LOGIN;

        try {
            const response = await client.token.createWithPassword({
                username: ctx.name,
                password: ctx.password,
                ...(ctx.realmId ? { realm_id: ctx.realmId } : {}),
            });

            // Clear any previous identity's state (notably a retained id_token —
            // a password response carries none, and the atomic commit would
            // keep the stale one) and best-effort revoke its tokens before
            // establishing the fresh session (plan 047.3). cleanup() bumps the
            // generation, so the staged window's snapshot is taken AFTER it.
            await cleanup();

            await establishSession(response, StoreAuthOrigin.LOGIN, tokenGeneration.value);
        } finally {
            interactionInFlight.value = null;
        }

        context.dispatcher.emit(StoreDispatcherEventName.LOGGED_IN);
    };

    const exchangeAuthorizationCode = async (
        code: string,
        params: {
            code_verifier?: string,
            redirect_uri?: string,
            client_id?: string,
            realm_id?: string
        } = {},
    ) => {
        interactionInFlight.value = StoreAuthOrigin.EXCHANGE;

        try {
            const response = await client.token.createWithAuthorizationCode({
                code,
                ...params,
            });

            // wipe + revoke the previous identity before establishing the new
            // one (a failed GRANT above leaves prior state intact — pinned).
            await cleanup();

            await establishSession(response, StoreAuthOrigin.EXCHANGE, tokenGeneration.value);
        } finally {
            interactionInFlight.value = null;
        }
    };

    const logout = async () => {
        context.dispatcher.emit(StoreDispatcherEventName.LOGGING_OUT);

        await cleanup();

        context.dispatcher.emit(StoreDispatcherEventName.LOGGED_OUT);
    };

    return {
        cookiesRead,
        setCookiesRead,

        permissionEvaluator,

        login,
        logout,
        loggedIn,
        status,
        lastAuthOrigin,
        resolve,
        exchangeAuthorizationCode,

        applyTokenGrantResponse,
        accessToken,
        setAccessToken,
        accessTokenExpireDate,
        setAccessTokenExpireDate,
        refreshToken,
        setRefreshToken,

        idToken,
        setIdToken,

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

        sessionId,
    };
}
