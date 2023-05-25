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
    const api = client || new APIClient({ baseURL: options.baseUrl });

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
