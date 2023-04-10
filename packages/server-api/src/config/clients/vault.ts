/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigInput } from '@hapic/vault';
import { Client, setClient } from '@hapic/vault';

export function setupVault(data: string | boolean) {
    let config : ConfigInput | undefined;

    if (
        typeof data === 'boolean' ||
        typeof data === 'undefined'
    ) {
        if (data) {
            config = {
                // todo: this should maybe the default address of the vault client
                connectionString: 'start123@http://127.0.0.1:8090/v1/',
            };
        }
    }

    if (typeof data === 'string') {
        config = {
            connectionString: data,
        };
    }

    if (config) {
        const client = new Client(config);

        setClient(client);
    }
}
