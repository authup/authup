/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createClient, isClient } from 'hapic';
import type { Client, RequestOptions } from 'hapic';
import type { BaseAPIContext } from './types-base';

export class BaseAPI {
    protected client! : Client;

    // -----------------------------------------------------------------------------------

    constructor(context?: BaseAPIContext) {
        context = context || {};

        this.setClient(context.client);
    }

    // -----------------------------------------------------------------------------------

    setClient(input?: Client | RequestOptions) {
        this.client = isClient(input) ?
            input :
            createClient(input);
    }
}
