/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientOptions } from '../../client';
import { Client } from '../../client';
import type { TokenCreator } from '../type';

export type UserTokenCreatorOptions = {
    client?: ClientOptions,
};

export type UserTokenCreatorCredentials = {
    name: string,
    password: string,
    realmId?: string,
    realmName?: string,
};

/**
 * Create token creator based on password flow.
 *
 * @param credentials
 * @param options
 */
export function createUserTokenCreator(
    credentials: UserTokenCreatorCredentials,
    options: UserTokenCreatorOptions = {},
) : TokenCreator {
    const client = new Client(options.client);

    return async () => client.token.createWithPassword({
        username: credentials.name,
        password: credentials.password,
        ...(credentials.realmId ? { realm_id: credentials.realmId } : {}),
        ...(credentials.realmName ? { realm_name: credentials.realmName } : {}),
    });
}
