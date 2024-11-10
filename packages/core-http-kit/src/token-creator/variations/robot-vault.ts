/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { VaultClient } from '@hapic/vault';
import { isObject } from '@authup/kit';
import type { Robot } from '@authup/core-kit';
import { Client } from '../../client';
import type { TokenCreator, TokenCreatorRobotInVaultOptions } from '../type';
import { createTokenCreatorWithRobot } from './robot';

export function createTokenCreatorWithRobotInVault(
    options: Omit<TokenCreatorRobotInVaultOptions, 'type'>,
) : TokenCreator {
    let client : VaultClient;
    if (typeof options.vault === 'string') {
        client = new VaultClient({ connectionString: options.vault });
    } else {
        client = options.vault;
    }

    const apiClient = new Client({ baseURL: options.baseURL });

    const robotName = options.name.toLowerCase();

    return async () => {
        if (apiClient) {
            await apiClient.robot.integrity(robotName);
        }

        const response = await client.keyValueV1.getOne<Partial<Robot>>(
            'robots',
            robotName,
        );

        if (
            !isObject(response) ||
            !isObject(response.data) ||
            typeof response.data.id !== 'string' ||
            typeof response.data.secret !== 'string'
        ) {
            throw new Error('The vault robot credentials response is malformed.');
        }

        const creator = createTokenCreatorWithRobot({
            id: response.data.id,
            secret: response.data.secret,
        }, apiClient);

        return creator().then((response) => {
            if (options.created) {
                options.created(response);
            }

            return response;
        });
    };
}
