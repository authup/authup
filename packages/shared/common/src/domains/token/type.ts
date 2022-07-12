/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '../user';
import { Robot } from '../robot';
import {
    OAuth2TokenGrant,
    OAuth2TokenSubKind,
} from '../oauth2-access-token';
import { OAuth2TokenVerificationExtended } from '../oauth2';
import { AbilityConfig } from '../ability';

type TokenTargetRobot = {
    kind: `${OAuth2TokenSubKind.ROBOT}`,
    entity: Robot,
    permissions: AbilityConfig[]
};

type TokenTargetUser = {
    kind: `${OAuth2TokenSubKind.USER}`,
    entity: User,
    permissions: AbilityConfig[]
};

export type TokenVerificationPayload = OAuth2TokenVerificationExtended<TokenTargetRobot | TokenTargetUser>;

// ------------------------------------------------------

export type TokenPasswordGrantPayload = {
    grant_type?: OAuth2TokenGrant.PASSWORD,
    username: string,
    password: string
};

export type TokenRefreshTokenGrantPayload = {
    grant_type?: OAuth2TokenGrant.REFRESH_TOKEN,
    refresh_token: string
};

export type TokenRobotCredentialsGrantPayload = {
    grant_type?: OAuth2TokenGrant.ROBOT_CREDENTIALS,
    id: string,
    secret: string
};

export type TokenGrantPayload = TokenPasswordGrantPayload |
TokenRefreshTokenGrantPayload |
TokenRobotCredentialsGrantPayload;

// ------------------------------------------------------

export type TokenMaxAgeType = number | {
    accessToken?: number,
    refreshToken?: number
};
