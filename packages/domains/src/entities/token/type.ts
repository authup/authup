/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '../user';
import { Robot } from '../robot';
import { OAuth2AccessTokenGrant, OAuth2AccessTokenPayload, OAuth2AccessTokenSubKind } from '../oauth2-access-token';
import { PermissionItem } from '../permission';

type TokeEntityUser = {
    type: `${OAuth2AccessTokenSubKind.ROBOT}`,
    data: Partial<User> & {
        permissions: PermissionItem<any>[]
    }
};

type TokenEntityClient = {
    type: `${OAuth2AccessTokenSubKind.USER}`,
    data: Partial<Robot> & {
        permissions: PermissionItem<any>[]
    }
};

export type TokenVerificationPayload = {
    token: OAuth2AccessTokenPayload,
    entity: TokeEntityUser | TokenEntityClient
};

export type TokenGrantPayload = {
    username: string,
    password: string
};

export type TokenGrantType = `${OAuth2AccessTokenGrant}`;
