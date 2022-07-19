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

} from '../oauth2-access-token';
import { OAuth2SubKind, OAuth2TokenVerification } from '../oauth2';
import { AbilityDescriptor } from '../../ability-manager';

export type TokenRobotMeta = {
    kind: `${OAuth2SubKind.ROBOT}`,
    entity: Robot,
    permissions: AbilityDescriptor[]
};

export type TokenUserMeta = {
    kind: `${OAuth2SubKind.USER}`,
    entity: User,
    permissions: AbilityDescriptor[]
};

export type TokenSubMeta = TokenUserMeta | TokenRobotMeta;

export type TokenVerificationPayload = OAuth2TokenVerification & {
    sub: TokenSubMeta
};

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
