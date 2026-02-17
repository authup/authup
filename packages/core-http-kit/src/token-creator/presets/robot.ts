/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientOptions } from '../../client';
import { Client } from '../../client';
import type { TokenCreator } from '../type';

export type RobotTokenCreatorOptions = {
    client?: ClientOptions,
};

export type RobotTokenCreatorCredentials = {
    id: string,
    secret: string,
};

/**
 * Create token creator based on robot credentials flow.
 *
 * @param credentials
 * @param options
 */
export function createRobotTokenCreator(
    credentials: RobotTokenCreatorCredentials,
    options: RobotTokenCreatorOptions = {},
): TokenCreator {
    const client = new Client(options.client);

    return async () => client.token.createWithRobotCredentials({
        id: credentials.id,
        secret: credentials.secret,
    });
}
