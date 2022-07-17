/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AccessToken, OAuth2Client, Realm, User,
} from '@authelion/common';
import { KeyPairContext } from '@authelion/server-utils';
import { ExpressRequest } from '../../../http/type';

export type TokenBuilderContext = {
    maxAge?: number,
};

export type AccessTokenBuilderContext = TokenBuilderContext & {
    keyPairOptions?: Partial<KeyPairContext>
    request: ExpressRequest,
    selfUrl: string,
};

export type OpenIdTokenBuilderContext = AccessTokenBuilderContext & {
    userId: User['id'],
    realmId: Realm['id'],
    clientId: OAuth2Client['id']
};

export type RefreshTokenBuilderContext = TokenBuilderContext & {
    accessToken: OAuth2AccessToken
};
