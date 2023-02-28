/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AbilityDescriptor, AbilityManager, Client, Realm, Robot, User,
} from '@authup/common';
import type { TokenVerifyContext } from '../../oauth2';

export type HTTPMiddlewareContext = TokenVerifyContext & {
    cookieHandler?: (cookies: any) => string | undefined
};
export type RequestEnv = {
    userId?: User['id'],
    robotId?: Robot['id'],
    clientId?: Client['id']

    realmId?: Realm['id'],
    realmName?: Realm['name'],

    token?: string,

    ability: AbilityManager,
    permissions: AbilityDescriptor[],
};
