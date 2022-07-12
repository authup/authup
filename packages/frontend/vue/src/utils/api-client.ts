/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { APIlient } from '@authelion/common';

let instance : undefined | APIlient;

export function setAPIClient(client: APIlient) {
    instance = client;
}

export function useAPIClient() {
    if (typeof instance === 'undefined') {
        throw new Error();
    }

    return instance;
}
