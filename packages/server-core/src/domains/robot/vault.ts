/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Robot } from '@authup/core-kit';
import {
    isClientErrorWithStatusCode,
} from 'hapic';
import { isVaultClientUsable, useVaultClient } from '@authup/server-kit';

export async function createRobotVaultEngine() {
    if (!isVaultClientUsable()) {
        return;
    }

    const client = useVaultClient();

    await client.mount.create(
        'robots',
        {
            type: 'kv',
            options: {
                version: 1,
            },
        },
    );
}

export async function saveRobotCredentialsToVault(entity: Pick<Robot, 'id' | 'secret' | 'name'>) {
    if (!isVaultClientUsable()) {
        return;
    }

    const client = useVaultClient();

    try {
        await client.keyValueV1.create(
            'robots',
            entity.name.toLowerCase(),
            {
                id: entity.id,
                secret: entity.secret,
            },
        );
    } catch (e) {
        if (isClientErrorWithStatusCode(e, 404)) {
            await createRobotVaultEngine();
            await saveRobotCredentialsToVault(entity);
            return;
        }

        throw e;
    }
}

export async function removeRobotCredentialsFromVault(entity: Pick<Robot, 'name'>) {
    if (!isVaultClientUsable()) {
        return;
    }

    const client = useVaultClient();

    try {
        await client.keyValueV1.delete(
            'robots',
            entity.name.toLowerCase(),
        );
    } catch (e) {
        if (isClientErrorWithStatusCode(e, 404)) {
            return;
        }

        throw e;
    }
}

export async function findRobotCredentialsInVault(
    entity: Pick<Robot, 'name'>,
) : Promise<Pick<Robot, 'id' | 'secret'> | undefined> {
    if (!isVaultClientUsable()) {
        return undefined;
    }

    const client = useVaultClient();

    try {
        const response = await client.keyValueV1.getOne(
            'robots',
            entity.name.toLowerCase(),
        );
        if (response && response.data) {
            return response.data as Robot;
        }

        return undefined;
    } catch (e) {
        if (isClientErrorWithStatusCode(e, 404)) {
            return undefined;
        }

        throw e;
    }
}
