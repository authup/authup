/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AccessTokenVerification, OAuth2TokenGrant } from '../oauth2-access-token';
import { OAuth2RefreshTokenVerification } from '../oauth2-refresh-token';
import { AbilityDescriptor } from '../../ability-manager';
import { OAuth2Client } from '../oauth2-client';
import { User } from '../user';
import { Robot } from '../robot';
import { OAuth2SubKind } from './constants';

export type OAuth2TokenResponse = {
    access_token: string,

    refresh_token?: string,

    expires_in: number,

    token_type: string,

    id_token?: string,

    mac_key?: string,

    mac_algorithm?: string,

    scope?: string
};

// -----------------------------------------------------------------

export type TokenClientMeta = {
    kind: `${OAuth2SubKind.CLIENT}`,
    entity: OAuth2Client,
    permissions: AbilityDescriptor[]
};

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

export type OAuth2SubMeta = TokenClientMeta | TokenUserMeta | TokenRobotMeta;

export type OAuth2TokenVerification = (
    OAuth2AccessTokenVerification |
    OAuth2RefreshTokenVerification
) & {
    sub: OAuth2SubMeta
};

// ------------------------------------------------------

export type OAuth2PasswordGrantPayload = {
    grant_type?: OAuth2TokenGrant.PASSWORD,
    username: string,
    password: string
};

export type OAuth2RefreshTokenGrantPayload = {
    grant_type?: OAuth2TokenGrant.REFRESH_TOKEN,
    refresh_token: string
};

export type OAuth2RobotCredentialsGrantPayload = {
    grant_type?: OAuth2TokenGrant.ROBOT_CREDENTIALS,
    id: string,
    secret: string
};

export type OAuth2GrantPayload = OAuth2PasswordGrantPayload |
OAuth2RefreshTokenGrantPayload |
OAuth2RobotCredentialsGrantPayload;
