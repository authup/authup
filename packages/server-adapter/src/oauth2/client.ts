/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientOptions } from '@hapic/oauth2';
import { Client } from '@hapic/oauth2';

let instance : Client | undefined;

export async function useOAuth2Client(value : string | ClientOptions) {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = new Client();
    if (typeof value === 'string') {
        await instance.useOpenIDDiscovery(value);
    } else {
        instance.setOptions(value);
    }

    return instance;
}
