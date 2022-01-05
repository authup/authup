/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { VaultKVVersion } from './type';

export function buildVaultKeyValueURLPath(version: VaultKVVersion, engine: string, key: string) : string {
    switch (version) {
        case VaultKVVersion.ONE:
            return `${engine}/${key}`;
        case VaultKVVersion.TWO:
            return `${engine}/data/${key}`;
        default:
            return '';
    }
}
