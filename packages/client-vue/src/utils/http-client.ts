/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { APIClient } from '@authup/core';

let instance : undefined | APIClient;

export function setHTTPClient(client: APIClient) {
    instance = client;
}

export function useHTTPClient() {
    if (typeof instance === 'undefined') {
        throw new Error();
    }

    return instance;
}
