/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AbilityManager, Client, Realm, Robot, User,
} from '@authelion/common';

export type RequestEnv = {
    user?: User,
    userId?: User['id'],

    robot?: Robot,
    robotId?: Robot['id'],

    client?: Client,
    clientId?: Client['id']

    realmId?: Realm['id'],

    token?: string,
    scopes?: string[],

    ability: AbilityManager
};
