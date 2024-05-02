/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, TokenError } from '@authup/kit';
import type { OAuth2TokenIntrospectionResponse } from '@authup/kit';
import { createResponseError } from '../utils';

export const TokenPayload : Omit<OAuth2TokenIntrospectionResponse, 'exp'> = {
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
    email: 'peter.placzek1996@gmail.com',
    email_verified: true,
};

export async function introspectToken(data: { token: string }) : Promise<OAuth2TokenIntrospectionResponse> {
    switch (data.token) {
        case ErrorCode.TOKEN_INVALID: {
            throw createResponseError(TokenError.payloadInvalid());
        }
        case ErrorCode.TOKEN_EXPIRED: {
            throw createResponseError(TokenError.expired());
        }
        default: {
            return TokenPayload as OAuth2TokenIntrospectionResponse;
        }
    }
}
