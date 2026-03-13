/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import type { OAuth2TokenIntrospectionResponse } from '@authup/specs';
import { JWTError } from '@authup/specs';
import type { TokenIntrospectParameters } from '@hapic/oauth2';
import { createResponseError } from '../utils';

export const TokenPayload : OAuth2TokenIntrospectionResponse = {
    active: true,
    permissions: [],
    kind: 'access_token',
    jti: '58b4ce4b-42bc-4ff2-9b55-32d9a14d77f0',
    sub: 'd4bd68d9-8600-4388-b083-7481901dd2fd',
    sub_kind: 'user',
    remote_address: '127.0.0.1',
    realm_id: 'e0aefc0c-3396-471e-ab81-f84779978223',
    realm_name: 'master',
    scope: 'global',
    name: 'admin',
    family_name: null,
    given_name: null,
    nickname: 'admin',
    preferred_username: 'admin',
    email: 'admin@example.com',
    email_verified: true,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
};

export async function introspectToken(data: TokenIntrospectParameters = {}) : Promise<OAuth2TokenIntrospectionResponse> {
    switch (data.token) {
        case ErrorCode.JWT_INVALID: {
            throw createResponseError(JWTError.payloadInvalid());
        }
        case ErrorCode.JWT_EXPIRED: {
            throw createResponseError(JWTError.expired());
        }
        default: {
            return TokenPayload;
        }
    }
}
