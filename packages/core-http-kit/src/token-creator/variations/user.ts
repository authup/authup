/*
 * Copyright (c) 2023-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '../../client';
import type { TokenCreator, TokenCreatorUserOptions } from '../type';

export function createTokenCreatorWithUser(options: Omit<TokenCreatorUserOptions, 'type'>) : TokenCreator {
    const client = new Client({ baseURL: options.baseURL });

    return async () => client.token.createWithPasswordGrant({
        username: options.name,
        password: options.password,
        ...(options.realmId ? { realm_id: options.realmId } : {}),
        ...(options.realmName ? { realm_name: options.realmName } : {}),
    }).then((response) => {
        if (options.created) {
            options.created(response);
        }

        return response;
    });
}
