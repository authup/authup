/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isVaultClientUsable, useVaultClient } from '@authup/server-kit';
import { singa } from 'singa';
import { RobotSynchronizationService } from './module.ts';

const instance = singa<RobotSynchronizationService>({
    name: 'robotSynchronization',
    factory: () => {
        const vaultClient = useVaultClient();

        return new RobotSynchronizationService(vaultClient);
    },
});

export function isRobotSynchronizationServiceUsable() {
    if (!isVaultClientUsable()) {
        return false;
    }

    return instance.has() || instance.hasFactory();
}

export function useRobotSynchronizationService() {
    return instance.use();
}
