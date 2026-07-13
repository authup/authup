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
    pinia?: Pinia
};
