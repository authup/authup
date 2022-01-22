/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AccessToken, OAuth2AccessTokenSubKind } from '../oauth2-access-token';
import { Oauth2Client } from '../oauth2-client';
import { Robot } from '../robot';
import { User } from '../user';

export interface Oauth2RefreshToken {
    id: string;

    expires: Date;

    scope: string | null;

    // ------------------------------------------------------------------

    client_id: Oauth2Client['id'] | null;

    client: Oauth2Client | null;

    access_token_id: OAuth2AccessToken['id'];

    access_token: OAuth2AccessToken;
}

export type OAuth2RefreshTokenPayload = {
    client_id?: Oauth2Client['id'],

    refresh_token_id: Oauth2RefreshToken['id'],

    access_token_id: OAuth2AccessToken['id'],

    scope: OAuth2AccessToken['scope'],

    expire_time: number,

    sub_kind: OAuth2AccessTokenSubKind;

    sub: User['id'] | Robot['id']
};
