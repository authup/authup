/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type StoreCreateContext = {
    baseURL: string
};

export type StoreResolveContext = {
    refresh?: boolean,
    attempts?: number
};

export type StoreLoginContext = {
    name: string,
    password: string,
    realmId?: string
};
