/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '../user';
import { Robot } from '../robot';
import {
    OAuth2AccessToken,
    OAuth2AccessTokenGrant,
    OAuth2AccessTokenPayload,
    OAuth2TokenSubKind,
} from '../oauth2-access-token';
import { PermissionItem } from '../permission';
import { OAuth2RefreshToken, OAuth2RefreshTokenPayload } from '../oauth2-refresh-token';

type TokenTargetRobot = {
    type: `${OAuth2TokenSubKind.ROBOT}`,
    data: Partial<User> & {
        permissions: PermissionItem<any>[]
    }
};

type TokenTargetUser = {
    type: `${OAuth2TokenSubKind.USER}`,
    data: Partial<Robot> & {
        permissions: PermissionItem<any>[]
    }
};

export type TokenVerificationPayload = {
    payload: OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload,
    entity: OAuth2AccessToken | OAuth2RefreshToken,
    target: TokenTargetRobot | TokenTargetUser
};

export type TokenGrantPayload = {
    username: string,
    password: string
};

export type TokenGrantType = `${OAuth2AccessTokenGrant}`;
