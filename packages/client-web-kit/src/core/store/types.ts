/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Store as BaseStore,
    StoreDefinition as BaseStoreDefinition,
    Pinia,
    _ExtractActionsFromSetupStore, 
    _ExtractGettersFromSetupStore, 
    _ExtractStateFromSetupStore,
} from 'pinia';
import type { Realm, User } from '@authup/core-kit';
import type { IClient } from '@authup/core-http-kit';
import type { CookieGetFn, CookieSetFn, CookieUnsetFn } from '../../types';
import type { createStore } from './create';
import type { StoreDispatcher } from './dispatcher';

export type RealmMinimal = Pick<Realm, 'id' | 'name'>;
export type UserMinimal = Pick<User, 'id' | 'name' | 'displayName' | 'email'>;

type StoreData = ReturnType<typeof createStore>;
export type Store = BaseStore<
    string,
    _ExtractStateFromSetupStore<StoreData>,
    _ExtractGettersFromSetupStore<StoreData>,
    _ExtractActionsFromSetupStore<StoreData>
>;

export type StoreDefinition = BaseStoreDefinition<
    string,
    _ExtractStateFromSetupStore<StoreData>,
    _ExtractGettersFromSetupStore<StoreData>,
    _ExtractActionsFromSetupStore<StoreData>
>;

export type StoreCreateContext = {
    baseURL?: string,
    httpClient?: IClient,
    dispatcher: StoreDispatcher,
    /**
     * Authenticate on the server-issued session cookie instead of a token
     * pair (plan 088). See the install option of the same name.
     */
    cookieSession?: boolean
};

export type StoreLoginContext = {
    name: string,
    password: string,
    realmId?: string,
    /**
     * A second-factor proof (TOTP or recovery code) submitted alongside the
     * credentials when the user holds a confirmed authenticator — otherwise
     * the password grant rejects the login with `mfa_required`.
     */
    otp?: string
};

export type StoreInstallOptions = {
    baseURL?: string,
    httpClient?: IClient,
    cookieSet?: CookieSetFn,
    cookieUnset?: CookieUnsetFn,
    cookieGet?: CookieGetFn,
    /**
     * Path the store cookies are written (and cleared) with, defaulting to
     * the root. It is the app's own mount point, not the API's: the cookies
     * are read back in JavaScript to rehydrate the store and are never sent
     * to the API as credentials, and a cookie can only be written for the
     * writing document's origin regardless.
     *
     * Every authup surface on one origin must pass the SAME value. They share
     * cookie names, so two paths mean two shadowing sets that expire
     * independently and can pair a `user` from one login with a token from
     * another. Note the path is hygiene, not isolation: same-origin code
     * reads any path through an iframe.
     */
    cookiePath?: string,
    /**
     * Authenticate on an opaque, `HttpOnly` session cookie the server issues
     * instead of on a token pair held in JavaScript (plan 088).
     *
     * Opt-in per consumer and only usable by a surface served from the API's
     * own origin: the credential is `SameSite=Strict`, so a cross-origin host
     * never carries it and must stay on the default bearer path. In this mode
     * the store neither reads nor writes the token cookies — the session is
     * resolved from `GET /sessions/@me/introspect` and ended through
     * `DELETE /sessions/@me`.
     */
    cookieSession?: boolean,
    pinia?: Pinia
};

/**
 * Options for {@see Store.logout}.
 */
export type StoreLogoutOptions = {
    /**
     * Whether to END the server-side session, not merely this instance.
     *
     * Defaults to true, which is what a real sign-out means. Pass false where
     * the teardown is a reaction to a failure rather than an intent: in cookie
     * mode the revoke deletes the `auth_sessions` row, so a transient error
     * would otherwise destroy a session that is still perfectly good.
     */
    revoke?: boolean
};
