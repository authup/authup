/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { APIClient } from '../../api-client';
import type { TokenCreator, TokenCreatorRobotOptions } from '../type';

export function createTokenCreatorWithRobot(
    options: Omit<TokenCreatorRobotOptions, 'type'>,
    client?: APIClient,
): TokenCreator {
    client = client || new APIClient({ driver: { baseURL: options.baseUrl } });

    return async () => client.token.createWithRobotCredentials({
        id: options.id,
        secret: options.secret,
    });
}
