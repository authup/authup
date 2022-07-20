/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ClientError,
    Config,
} from '@trapi/client';
import { HTTPClient, hasOwnProperty } from '@authelion/common';

const interceptor = (error: ClientError) => {
    if (
        typeof error?.response?.data === 'object' &&
        hasOwnProperty(error.response.data, 'message') &&
        typeof error.response.data.message === 'string'
    ) {
        error.message = error.response.data.message;
        throw error;
    }

    throw new Error('A network error occurred.');
};

const apiConfig : Config = {
    driver: {
        baseURL: 'http://localhost:3010/',
        withCredentials: true,
    },
};

export function useAPI() {
    const api = new HTTPClient(apiConfig);

    api.mountResponseInterceptor((r) => r, interceptor);
    return api;
}
