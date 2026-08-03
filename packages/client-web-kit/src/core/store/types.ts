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
    pinia?: Pinia
};
