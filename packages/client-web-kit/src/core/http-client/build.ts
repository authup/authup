/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import type { IClient } from '@authup/core-http-kit';
import type { HTTPClientBuildOptions } from './types';

/**
 * A client for one kit consumer (the store, the provided client, the hook's
 * refresh and revoke): the result of `httpClient` when it is a function, the
 * instance itself otherwise, else one built from `baseURL`.
 */
export function buildHTTPClient(options: HTTPClientBuildOptions) : IClient {
    if (typeof options.httpClient === 'function') {
        return options.httpClient();
    }

    if (options.httpClient) {
        return options.httpClient;
    }

    return new Client({ baseURL: options.baseURL });
}
