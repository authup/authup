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
import { OAuth2Error, OAuth2SubKind } from '@authup/specs';
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
import type { StoreCreateContext, StoreLoginContext, StoreLogoutOptions } from './types';

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
type UserMinimal = Pick<User, 'id' | 'name' | 'displayName'>;

/**
 * The subject claims the introspection endpoint answers with, alongside the
 * token payload it echoes. Declared here rather than on
 * `OAuth2TokenIntrospectionResponse`, because the endpoint maps entity columns
 * onto claim names and passes a nullable column through as `null` (a display
 * name arrives as `nickname: null`), where the OIDC claim types model an absent
 * claim as an omitted string.
 */
type SubjectClaims = {
    name?: string | null,
    nickname?: string | null,
};

export function createStore(context: StoreCreateContext) {
    const client : IClient = context.httpClient ?? new Client({ baseURL: context.baseURL });

    const cookiesRead = ref<boolean>(false);
    /**
     * @deprecated Kit-internal hydration bookkeeping — not part of the supported surface.
     * Kept as a working shim (kit cookie hydration + downstream seeding);
     * slated for removal in a future major.
     */
    const setCookiesRead = (value: boolean) => {
        cookiesRead.value = value;
    };

    // --------------------------------------------------------------------

    const accessToken = ref<string | null>(null);
    /**
     * @deprecated Raw token mutation — use login()/logout()/resolve() (or applyTokenGrantResponse for a grant response) instead.
     * Kept as a working shim (kit cookie hydration + downstream seeding);
     * slated for removal in a future major.
     */
    const setAccessToken = (input: string | null) => {
        accessToken.value = input;

        context.dispatcher.emit(
            StoreDispatcherEventName.ACCESS_TOKEN_UPDATED,
            input,
        );
    };

    // --------------------------------------------------------------------

    const accessTokenExpireDate = ref<Date | null>(null);
    /**
     * @deprecated Raw token mutation — the expire date is derived from grant/introspection responses.
     * Kept as a working shim (kit cookie hydration + downstream seeding);
     * slated for removal in a future major.
     */
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
    /**
     * @deprecated Raw token mutation — use login()/logout()/resolve() (or applyTokenGrantResponse for a grant response) instead.
     * Kept as a working shim (kit cookie hydration + downstream seeding);
     * slated for removal in a future major.
     */
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
    /**
     * @deprecated Raw token mutation — the id_token rides the grant response (applyTokenGrantResponse retains it across refreshes).
     * Kept as a working shim (kit cookie hydration + downstream seeding);
     * slated for removal in a future major.
     */
    const setIdToken = (input: string | null) => {
        idToken.value = input;

        context.dispatcher.emit(
            StoreDispatcherEventName.ID_TOKEN_UPDATED,
            input,
        );
    };

    // --------------------------------------------------------------------

    /**
     * The token's subject, narrowed to what is actually rendered: the id every
     * owner-scoped query filters on, and the name / display name the account
     * chip and the authorize page's "continue as" label read. A full `User` was
     * held here once, at the cost of a `/userinfo` round-trip per restore, and
     * no consumer ever read a field outside these three.
     */
    const user = ref<UserMinimal | null>(null);
    const userId = computed<string | null>(() => (user.value ? user.value.id : null));

    // Narrowed at the sink like `setRealmManagement`: callers hand over whole
    // entity rows (the account console re-seeds it from the profile form's
    // response), and the ref is what the SSR payload carries.
    const setUser = (input: UserMinimal | null) => {
        user.value = input ? {
            id: input.id,
            name: input.name,
            displayName: input.displayName,
        } : null;

        context.dispatcher.emit(StoreDispatcherEventName.USER_UPDATED, user.value);
    };

    // --------------------------------------------------------------------

    // The id of the session backing the current access token. Sourced from the
    // token introspection response so the UI can mark "this device" and avoid a
    // confusing silent self-logout on the current row.
    const sessionId = ref<string | null>(null);

    // The achieved OIDC acr of the current session's token (urn:authup:pwd |
    // urn:authup:mfa), sourced from introspection. Lets the hosted authorize
    // ladder skip a redundant second-factor prompt right after a login whose
    // grant already verified the factor (otp param / MFA-pending ticket).
    const acr = ref<string | null>(null);


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

    /**
     * @deprecated Raw identity mutation — the realm is derived from token introspection during resolve()/login().
     * Kept as a working shim (kit cookie hydration + downstream seeding);
     * slated for removal in a future major.
     */
    const setRealm = (input: RealmMinimal | null) => {
        realm.value = input;

        context.dispatcher.emit(StoreDispatcherEventName.REALM_UPDATED, input);
    };

    const realmManagement = ref<RealmMinimal | null>(null);
    const realmManagementId = computed<string | undefined>(() => (realmManagement.value ? realmManagement.value.id : realmId.value));
    const realmManagementName = computed<string | undefined>(() => (realmManagement.value ? realmManagement.value.name : realmName.value));

    const setRealmManagement = (input: RealmMinimal | null) => {
        // Narrowed at the sink, not at the call sites: the value is
        // cookie-persisted, and callers hand over whole entity rows (the realm
        // switcher passes the table row straight through), so the free-text
        // `description` column would ride the header of every request.
        realmManagement.value = input ? { id: input.id, name: input.name } : null;

        context.dispatcher.emit(
            StoreDispatcherEventName.REALM_MANAGEMENT_UPDATED,
            realmManagement.value,
        );
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

        if (context.cookieSession) {
            // There is no token to derive presence from — the credential is an
            // opaque `HttpOnly` cookie this code cannot read, so the session is
            // exactly what the last resolve() brought back. RESTORING is
            // therefore unreachable, which is load-bearing: a consumer that
            // treats a settled RESTORING as a failed resolve (the account
            // console's router guard does) would sign every cookie session out.
            return realm.value && user.value ?
                StoreAuthStatus.AUTHENTICATED :
                StoreAuthStatus.UNAUTHENTICATED;
        }

        if (!accessToken.value) {
            // A surviving refresh token is session presence too: the
            // access-token cookie expires via maxAge while the refresh-token
            // cookie is a session cookie, so an RT-only hydration is a normal
            // restorable state — it must read RESTORING for the whole restore
            // instead of flapping unauthenticated → restoring mid-resolve().
            return refreshToken.value ?
                StoreAuthStatus.RESTORING :
                StoreAuthStatus.UNAUTHENTICATED;
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

    // Returns the generation it bumped to: a caller staging a session MUST use
    // that value (not a later tokenGeneration read) — the bump happens before
    // the awaited revoke round-trips, so a concurrent interaction's cleanup()
    // may bump again before this one resumes, and reading the ref afterwards
    // would let both commits pass the guard (the loser's committed tokens
    // would be clobbered without revocation).
    const cleanup = async () : Promise<number> => {
        const tempAccessToken = accessToken.value;
        const tempRefreshToken = refreshToken.value;

        setAccessToken(null);
        setAccessTokenExpireDate(null);
        setRefreshToken(null);
        setIdToken(null);
        setUser(null);
        sessionId.value = null;
        acr.value = null;
        setRealm(null);
        setRealmManagement(null);

        lastAuthOrigin.value = null;

        permissionProvider.setMany([]);

        validated.value = false;
        resolutionStale.value = false;
        tokenGeneration.value += 1;
        const generation = tokenGeneration.value;

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

        return generation;
    };

    // --------------------------------------------------------------------

    // Pure fetchers — they take the token explicitly and mutate nothing, so a
    // session can be STAGED across multiple round-trips and committed in one
    // synchronous block (no consumer ever observes a half-built store).

    /**
     * The `active` check is the point of the wrapper. The endpoint answers 200
     * with the full payload for a token it will not honour - revoked, or past
     * its expiry - so reading the claims alone commits a dead token as a live
     * session: identity set, permissions set, validated true, right up until
     * the next protected call 401s.
     *
     * Rejecting instead of returning a flag hands both staging sites the path
     * they already have for an introspection that failed outright: a stale
     * restore falls through to `refreshSession()`, and a fresh grant reverts
     * and revokes what it staged.
     */
    const fetchTokenIntrospection = async (
        token: string,
    ) : Promise<OAuth2TokenIntrospectionResponse> => {
        const response = await client.token.introspect<OAuth2TokenIntrospectionResponse>(
            { token },
            {
                authorizationHeader: {
                    type: 'Bearer',
                    token,
                },
            },
        );

        if (!response.active) {
            throw new OAuth2Error('The access token is not active.');
        }

        return response;
    };

    /**
     * The introspected token's subject, built from the response itself: the
     * introspection endpoint resolves the identity server-side and answers
     * with its OpenID claims (`name`, and `displayName` under `nickname`), so
     * a second `/userinfo` round-trip fetched a whole entity to restate three
     * fields the store already had in hand.
     *
     * Deriving it also settles the identity question the predecessor had to ask
     * separately: the held user cannot drift from the token, because it IS the
     * token's subject on every commit. A non-user subject yields null rather
     * than a failed lookup — `/userinfo` resolves `@me` through the user
     * service, which throws for a client actor and took the whole `resolve()`
     * down with it.
     */
    const buildUser = (
        introspection: OAuth2TokenIntrospectionResponse,
    ) : UserMinimal | null => {
        if (
            introspection.sub_kind !== OAuth2SubKind.USER ||
            !introspection.sub
        ) {
            return null;
        }

        const { name, nickname } = introspection as SubjectClaims;

        return {
            id: introspection.sub,
            name: name || '',
            displayName: nickname || null,
        };
    };

    type SessionCommitContextBase = {
        // tokenGeneration captured when staging started
        generation: number,
        // tokens to apply — absent for a revalidation of the current token
        grant?: OAuth2TokenGrantResponse,
        introspection: OAuth2TokenIntrospectionResponse,
        // login/exchange stamp explicitly; a restore stamps only when unset
        origin?: StoreAuthOrigin.LOGIN | StoreAuthOrigin.EXCHANGE,
    };

    /**
     * `tokenless` is an EXPLICIT discriminator, not a derived one. Cookie mode
     * commits a session that has no token at all, and the guards below ask
     * "is this still the current token" — left to `ctx.token ===
     * accessToken.value` that comparison would be decided by an
     * `undefined === null` accident and answer false forever, permanently
     * skipping the `resolutionStale` clear.
     */
    type SessionCommitContext = SessionCommitContextBase & (
        {
            tokenless?: false,
            // the token introspection ran against
            token: string,
        } | {
            tokenless: true,
            token?: undefined,
        }
    );

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

        // A tokenless commit is always current: nothing can rotate a token
        // that does not exist.
        const tokenIsCurrent = ctx.tokenless ?
            true :
            ctx.token === accessToken.value;

        // A background hook refresh may have rotated the token while a
        // revalidation's introspection was in flight — never re-arm the
        // expire date (and thus the refresh timer) from a superseded token.
        // Cookie mode never arms it at all: an expire date would start a
        // refresh timer with no refresh token behind it.
        if (!ctx.tokenless && ctx.introspection.exp && tokenIsCurrent) {
            setAccessTokenExpireDate(new Date(ctx.introspection.exp * 1000));
        }

        if (ctx.introspection.session_id) {
            sessionId.value = ctx.introspection.session_id;
        }

        acr.value = ctx.introspection.acr ?? null;

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

        // Only the subject IDENTITY is authoritative here. A held user with the
        // same id is at least as fresh as these claims — the account console
        // re-seeds it from its own profile-form response — and a commit staged
        // before such a save would otherwise revert the name it just wrote. The
        // predecessor kept it for the same reason: `isTokenSubject` skipped the
        // fetch on an id match.
        const subject = buildUser(ctx.introspection);
        if (!user.value || user.value.id !== subject?.id) {
            setUser(subject);
        }

        if (ctx.introspection.permissions) {
            permissionProvider.setMany(ctx.introspection.permissions.map((permission) => ({
                permission: {
                    name: permission.name,
                    realmId: permission.realm_id,
                    clientId: permission.client_id,
                },
            })));
        }

        validated.value = true;

        // A background hook refresh that rotated the token mid-staging set the
        // flag for the NEW token — clearing it for a superseded commit would
        // skip the promised awaited revalidation on the next resolve().
        if (tokenIsCurrent) {
            resolutionStale.value = false;
        }

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

            const generation = tokenGeneration.value;

            let response : OAuth2TokenGrantResponse;
            try {
                response = await client.token.createWithRefreshToken({ refresh_token: refreshToken.value });
            } catch (e) {
                // a cleanup() that interleaved with the round-trip already
                // tore the state down — don't tear it down a second time.
                if (generation === tokenGeneration.value) {
                    await cleanup();
                }

                throw e;
            }

            // Zombie-commit guard (same contract as commitSession): a logout
            // that landed while the refresh round-trip was in flight stays
            // final — the late grant is dropped and revoked best-effort (it
            // was never written, so no later logout() could reach it).
            if (generation !== tokenGeneration.value) {
                await revokeStagedGrant(response);

                throw new OAuth2Error('The session was torn down before the token could be refreshed.');
            }

            // marks the resolution stale: status stays authenticated,
            // the next resolve() revalidates (awaited).
            applyTokenGrantResponse(response);
        },
    );

    // --------------------------------------------------------------------

    // Stage the introspection for the current token and commit. Returns
    // silently when the commit was aborted
    // by an interleaved cleanup() — the caller's post-state (unauthenticated) is
    // already what the user asked for.
    const revalidate = async () : Promise<void> => {
        const generation = tokenGeneration.value;
        const token = accessToken.value;
        if (!token) {
            return;
        }

        const introspection = await fetchTokenIntrospection(token);

        commitSession({
            generation,
            token,
            introspection,
        });
    };

    /**
     * Cookie mode's counterpart to `revalidate()`. The session context comes
     * from `GET /account/session`, which answers the same projection the
     * introspection endpoint builds for a bearer — so `commitSession` needs no
     * shape of its own.
     *
     * There is nothing to renew here: the credential either still names a live
     * session or it does not, and a failure propagates to the caller exactly
     * like a failed introspection does.
     */
    const revalidateCookieSession = async () : Promise<void> => {
        const generation = tokenGeneration.value;

        const introspection = await client.account.getSession();

        if (!introspection.active) {
            // The credential is gone, or its session ended server-side. Drop
            // whatever this instance still holds so the app renders signed out
            // rather than a stale identity.
            if (user.value || realm.value) {
                await cleanup();
            }

            return;
        }

        commitSession({
            generation,
            tokenless: true,
            introspection,
        });
    };

    // todo: rename to reload() ?
    const resolveInternal = async () : Promise<void> => {
        context.dispatcher.emit(StoreDispatcherEventName.RESOLVING);

        if (context.cookieSession) {
            if (!validated.value || resolutionStale.value) {
                await revalidateCookieSession();
            }

            if (user.value && !lastAuthOrigin.value) {
                lastAuthOrigin.value = StoreAuthOrigin.RESTORE;
            }

            context.dispatcher.emit(StoreDispatcherEventName.RESOLVED);

            return;
        }

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
    // Stage the introspection for a fresh grant, then commit
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

            committed = commitSession({
                generation,
                token: response.access_token,
                grant: response,
                introspection,
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
                ...(ctx.otp ? { otp: ctx.otp } : {}),
            });

            // Clear any previous identity's state (notably a retained id_token —
            // a password response carries none, and the atomic commit would
            // keep the stale one) and best-effort revoke its tokens before
            // establishing the fresh session (plan 047.3). The staged window's
            // snapshot is the generation cleanup() itself bumped to — never a
            // later ref read, which a concurrent interaction may have bumped.
            const generation = await cleanup();

            await establishSession(response, StoreAuthOrigin.LOGIN, generation);
        } finally {
            interactionInFlight.value = null;
        }

        context.dispatcher.emit(StoreDispatcherEventName.LOGGED_IN);
    };

    // Establish a session from an out-of-band grant response — the MFA-pending
    // ticket completion (issue #3242): the challenge verify returns the full
    // grant, and applying it here keeps login semantics (LOGGING_IN/LOGGED_IN
    // events, AUTHENTICATING status, lastAuthOrigin = login) identical to a
    // password-grant login.
    const loginWithTokenGrant = async (response: OAuth2TokenGrantResponse) => {
        context.dispatcher.emit(StoreDispatcherEventName.LOGGING_IN);

        interactionInFlight.value = StoreAuthOrigin.LOGIN;

        try {
            const generation = await cleanup();

            await establishSession(response, StoreAuthOrigin.LOGIN, generation);
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
            const generation = await cleanup();

            await establishSession(response, StoreAuthOrigin.EXCHANGE, generation);
        } finally {
            interactionInFlight.value = null;
        }
    };

    /**
     * `revoke` (default true) decides whether a cookie-mode logout ENDS the
     * server-side session or merely tears down this instance.
     *
     * It exists because the two are no longer the same act. With a bearer the
     * teardown was always local, so a caller that logged out on a failed
     * `resolve()` — the account console's router guard does — lost nothing a
     * reload could not restore. In cookie mode the same call revokes the
     * `auth_sessions` row, so a transient failure (a 5xx, an aborted request,
     * a proxy hiccup) would DESTROY a healthy session rather than re-read it.
     * A failed resolve is not an intent to sign out; pass `revoke: false`
     * there and keep the default for a real sign-out.
     */
    const logout = async (options: StoreLogoutOptions = {}) => {
        const revoke = options.revoke ?? true;

        context.dispatcher.emit(StoreDispatcherEventName.LOGGING_OUT);

        if (context.cookieSession && revoke) {
            // The credential lives server-side, so the local teardown below
            // cannot reach it: the session has to be ended over the wire.
            // Best effort — a failed call must still leave this instance
            // signed out, and the cookie stops resolving the moment the
            // server drops the handle.
            try {
                await client.account.deleteSession();
            } catch {
                // ...
            }
        }

        await cleanup();

        context.dispatcher.emit(StoreDispatcherEventName.LOGGED_OUT);
    };

    return {
        cookiesRead,
        setCookiesRead,

        permissionEvaluator,

        login,
        loginWithTokenGrant,
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
        acr,
    };
}
