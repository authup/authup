/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, Realm, Robot, User,
} from '@authup/core-kit';
import type { PermissionManager } from '@authup/permitus';

export type RequestEnv = {
    user?: User,
    userId?: User['id'],

    robot?: Robot,
    robotId?: Robot['id'],

    client?: Client,
    clientId?: Client['id']

    realm?: Realm,
    realmId?: string,
    realmName?: string,

    token?: string,
    scopes?: string[],

    abilities: PermissionManager
};
