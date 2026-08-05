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
import type { IClient } from '@authup/core-http-kit';
import type { CookieGetFn, CookieSetFn, CookieUnsetFn } from '../../types';
import type { createStore } from './create';
import type { StoreDispatcher } from './dispatcher';

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
    dispatcher: StoreDispatcher
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
     * Namespace the store cookies under an application, as
     * `<prefix>.<name>` (`account-console.access_token`).
     *
     * Cookies are per ORIGIN, not per application, and the hosted auth pages
     * live on the same origin as anything server-core serves. Without a
     * prefix every surface there shares one session: an application adopts
     * whatever login came before it, and its own tokens are readable by the
     * next one. Locally it is broader still, since cookies ignore the port,
     * so an app on `localhost:3000` shares the jar with the IdP on `:3001`.
     *
     * The prefix is what makes the tiers distinguishable. BARE names belong
     * to the IdP's own SSO session, owned by the hosted auth pages; a
     * PREFIXED set belongs to one application. Every relying party embedding
     * the kit should set it to its OAuth2 client name. The auth pages must
     * not: they are the IdP surface rather than a client, and their session
     * is what the `prompt=none` / `select_account` ladder reads.
     *
     * Use the client NAME, which an application knows before it has any
     * session, never the client id, which it cannot know until it has one.
     * Names are unique per realm, so two realms' same-named clients still
     * collide on one origin and switching realms replaces the session. That
     * matches the single-cookie-set behaviour this replaces.
     *
     * Unset keeps the bare names, so an existing consumer is unchanged.
     */
    cookiePrefix?: string,
    pinia?: Pinia
};
