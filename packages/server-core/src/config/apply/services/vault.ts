/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createVaultClient, setVaultFactory } from '@authup/server-kit';

export function applyConfigVault(data: string | boolean) {
    if (
        typeof data === 'boolean' ||
        typeof data === 'undefined'
    ) {
        if (data) {
            setVaultFactory(() => createVaultClient({
                connectionString: 'start123@http://127.0.0.1:8090/v1/',
            }));
        }

        return;
    }

    if (typeof data === 'string') {
        setVaultFactory(() => createVaultClient({
            connectionString: data,
        }));
    }
}
