/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { stripClientError } from 'hapic';
import type { ClientOptions } from '../../client/index.ts';
import { Client } from '../../client/index.ts';
import type { TokenCreator } from '../type.ts';

export type ClientTokenCreatorOptions = {
    client?: ClientOptions
};

export type ClientTokenCreatorCredentials = {
    id: string,
    secret: string,
    realmId?: string,
    realmName?: string,
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
    // A failed request keeps the method and url only: the form carries the
    // secret, and the error travels on as a cause into logs.
    const client = new Client({
        errorTransform: stripClientError,
        ...options.client,
    });

    return async () => client.token.createWithClientCredentials({
        client_id: credentials.id,
        client_secret: credentials.secret,
        ...(credentials.realmId ? { realm_id: credentials.realmId } : {}),
        ...(credentials.realmName ? { realm_name: credentials.realmName } : {}),
    });
}
