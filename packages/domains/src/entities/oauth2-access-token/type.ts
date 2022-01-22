/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '../user';
import { Oauth2Client } from '../oauth2-client';
import { Robot } from '../robot';
import { OAuth2AccessTokenSubKind } from './constants';
import { OAuth2TokenKind, Oauth2TokenType } from '../oauth2';
import { JWTPayload } from '../jwt';

export interface OAuth2AccessToken {
    id: string,

    token: string,

    client_id: Oauth2Client['id'] | null,

    client: Oauth2Client | null,

    user_id: User['id'] | null,

    user: User | null,

    robot_id: Robot['id'] | null,

    robot: Robot | null,

    expires: Date,

    scope: string | null
}

export type OAuth2AccessTokenSubKindType = `${OAuth2AccessTokenSubKind}`;

export type OAuth2AccessTokenPayload = JWTPayload & {
    /**
     * Specify this token as access token.
     */
    kind: OAuth2TokenKind.ACCESS,

    access_token_id: OAuth2AccessToken['id'],
};
