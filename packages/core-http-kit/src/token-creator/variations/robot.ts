/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '../../client';
import type { TokenCreator, TokenCreatorRobotOptions } from '../type';

export function createTokenCreatorWithRobot(
    options: Omit<TokenCreatorRobotOptions, 'type'>,
    client?: Client,
): TokenCreator {
    const api = client || new Client({ baseURL: options.baseURL });

    return async () => api.token.createWithRobotCredentials({
        id: options.id,
        secret: options.secret,
    }).then((response) => {
        if (options.created) {
            options.created(response);
        }

        return response;
    });
}
