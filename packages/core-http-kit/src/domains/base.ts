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
    if (!isObject(input)) {
        return false;
    }

    const record = input as Record<string, any>;

    return typeof record.getBaseURL === 'function' &&
        typeof record.get === 'function' &&
        typeof record.post === 'function' &&
        typeof record.put === 'function' &&
        typeof record.delete === 'function';
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
