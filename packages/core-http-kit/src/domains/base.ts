/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createClient } from 'hapic';
import { isObject } from '@authup/kit';
import type { ApiTransport, BaseAPIContext } from './types-base';

function isApiTransport(input: unknown) : input is ApiTransport {
    return isObject(input) &&
        typeof (input as Record<string, any>).get === 'function' &&
        typeof (input as Record<string, any>).post === 'function';
}

export class BaseAPI {
    protected readonly client : ApiTransport;

    // -----------------------------------------------------------------------------------

    constructor(context: BaseAPIContext = {}) {
        this.client = isApiTransport(context.client) ?
            context.client :
            createClient(context.client);
    }
}
