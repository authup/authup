/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ApiRequestConfig } from '../type';

export type APIServiceHarborConfig = {
    host: string,
    user: string,
    password: string
};

export type APIServiceVaultConfig = {
    host: string,
    token: string
};

export enum APIType {
    DEFAULT = 'default',
    HARBOR = 'harbor',
    VAULT = 'vault',
}

export type APIConnectionType<T extends APIType> = T extends APIType.VAULT ?
    APIServiceVaultConfig :
    T extends APIType.HARBOR ? APIServiceHarborConfig : never;

export type APIConfigType = APIType.DEFAULT | APIType.VAULT | APIType.HARBOR;
export type APIConfig<T extends APIConfigType> = {
    type?: T,
    driver?: ApiRequestConfig,
    connection?: APIConnectionType<T>,
    connectionString?: string
};
