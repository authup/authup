/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { VaultClient } from '@hapic/vault';
import { setVaultFactory } from '../../core';

export function setupVault(data: string | boolean) {
    if (
        typeof data === 'boolean' ||
        typeof data === 'undefined'
    ) {
        if (data) {
            setVaultFactory(() => new VaultClient({
                connectionString: 'start123@http://127.0.0.1:8090/v1/',
            }));
        }

        return;
    }

    if (typeof data === 'string') {
        setVaultFactory(() => new VaultClient({
            connectionString: data,
        }));
    }
}
