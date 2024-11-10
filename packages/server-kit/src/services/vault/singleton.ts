/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Factory } from 'singa';
import { singa } from 'singa';
import type { VaultClient } from '@hapic/vault';

const instance = singa<VaultClient>({
    name: 'vault',
});

export function setVaultFactory(factory: Factory<VaultClient>) {
    instance.setFactory(factory);
}

export function isVaultClientUsable() {
    return instance.has() || instance.hasFactory();
}

export function useVaultClient() {
    return instance.use();
}
