/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientOptions } from '../../client';
import { Client } from '../../client';
import type { TokenCreator } from '../type';

export type ClientTokenCreatorOptions = {
    client?: ClientOptions
};

export type ClientTokenCreatorCredentials = {
    id: string,
    secret: string,
};

/**
 * Create token creator based on client credentials flow.
 *
 * @param credentials
 * @param options
 */
export function createClientTokenCreator(
    credentials: ClientTokenCreatorCredentials,
    options: ClientTokenCreatorOptions = {},
): TokenCreator {
    const client = new Client(options.client);

    return async () => client.token.createWithClientCredentials({
        client_id: credentials.id,
        client_secret: credentials.secret,
    });
}
