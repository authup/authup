/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { APIClient, ROBOT_SYSTEM_NAME, isObject } from '@authup/core';
import { Client } from '@hapic/vault';
import type { TokenCreator, TokenCreatorRobotInVaultOptions } from '../type';
import { createTokenCreatorWithRobot } from './robot';

export function createTokenCreatorWithRobotInVault(
    options: Omit<TokenCreatorRobotInVaultOptions, 'type'>,
) : TokenCreator {
    let client : Client;
    if (typeof options.vault === 'string') {
        client = new Client({ extra: { connectionString: options.vault } });
    } else {
        client = options.vault;
    }

    const apiClient : APIClient = new APIClient({ driver: { baseURL: options.baseUrl } });

    const robotName = options.name || ROBOT_SYSTEM_NAME;

    return async () => {
        if (apiClient) {
            await apiClient.robot.integrity(robotName);
        }

        const response = await client.keyValue.find('robots', robotName);
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

        return creator();
    };
}
