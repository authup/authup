/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AccessToken } from '../oauth2-access-token';
import { Oauth2Client } from '../oauth2-client';
import { OAuth2TokenKind } from '../oauth2';
import { JWTPayload } from '../json-web-token';
import { Realm } from '../realm';

export interface Oauth2RefreshToken {
    id: string;

    expires: Date;

    scope: string | null;

    // ------------------------------------------------------------------

    client_id: Oauth2Client['id'] | null;

    client: Oauth2Client | null;

    access_token_id: OAuth2AccessToken['id'];

    access_token: OAuth2AccessToken;

    realm_id: Realm['id'];

    realm: Realm;
}

export type OAuth2RefreshTokenPayload = JWTPayload & {
    kind: `${OAuth2TokenKind.REFRESH}`,

    access_token_id: OAuth2AccessToken['id'],

    refresh_token_id: OAuth2AccessToken['id'],
};
