/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiRequestConfig extends AxiosRequestConfig {
    token?: string | null,
    alias?: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ApiResponse<T = any> extends AxiosResponse {

}

export type SingleResourceResponse<R> = R;
export type CollectionResourceResponse<R> = {
    data: R[],
    meta: {
        limit: number,
        offset: number,
        total: number
    }
};
