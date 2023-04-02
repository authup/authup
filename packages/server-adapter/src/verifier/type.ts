/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    APIClient,
    AbilityManager, Client, Realm, Robot, User,
} from '@authup/core';
import type { TokenCreator, TokenCreatorOptions } from '../creator';
import type { TokenVerifierCacheOptions } from './cache';

export type TokenVerifierOptions = {
    baseUrl: string,
    creator?: TokenCreator | TokenCreatorOptions,
    cache?: TokenVerifierCacheOptions
};

export type TokenVerifierOutput = {
    user?: Pick<User, 'id' | 'name'>,
    userName?: User['id'],
    userId?: User['id'],

    robot?: Pick<Robot, 'id' | 'name'>,
    robotName?: Robot['name'],
    robotId?: Robot['id'],

    client?: Pick<Client, 'id' | 'name'>,
    clientName?: Client['name'],
    clientId?: Client['id']

    realm?: Pick<Realm, 'id' | 'name'>,
    realmId?: Realm['id'],
    realmName?: Realm['name'],

    token?: string,

    ability: AbilityManager
};
