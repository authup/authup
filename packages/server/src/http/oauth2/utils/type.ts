/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AccessTokenPayload, OAuth2RefreshTokenPayload, OAuth2TokenKind } from '@typescript-auth/domains';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';

export type OAuth2AccessTokenVerifyResult = {
    kind: OAuth2TokenKind.ACCESS,
    entity: OAuth2AccessTokenEntity,
    payload: OAuth2AccessTokenPayload
};

export type OAuth2RefreshTokenVerifyResult = {
    kind: OAuth2TokenKind.REFRESH,
    entity: OAuth2RefreshTokenEntity,
    payload: OAuth2RefreshTokenPayload
};

export type OAuth2TokenVerifyResult = OAuth2AccessTokenVerifyResult | OAuth2RefreshTokenVerifyResult;
