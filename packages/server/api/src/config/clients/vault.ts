/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { setVaultConfig } from '@authup/server-core';

export function setupVault(data: string | boolean) {
    if (
        typeof data === 'boolean' ||
        typeof data === 'undefined'
    ) {
        if (data) {
            setVaultConfig({
                extra: {
                    // todo: this should maybe the default address of the vault client
                    connectionString: 'start123@http://127.0.0.1:8090/v1/',
                },
            });
        }
    }

    if (typeof data === 'string') {
        setVaultConfig({
            extra: {
                connectionString: data,
            },
        });
    }
}
