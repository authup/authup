/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

let client : AxiosInstance | undefined;

export function useHTTPClient(config?: AxiosRequestConfig) : AxiosInstance {
    if (typeof client !== 'undefined') {
        return client;
    }

    client = axios.create({
        ...(config || {}),
    });

    return client;
}
