/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@authup/errors';
import type { OAuth2TokenIntrospectionResponse } from '@authup/specs';
import { JWTError } from '@authup/specs';

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
    nickname: 'admin',
    preferred_username: 'admin',
    email: 'admin@example.com',
    email_verified: true,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
};

export const TokenCertificateThumbprint = 'expected-thumbprint';

export const BoundTokenPayload : OAuth2TokenIntrospectionResponse = {
    ...TokenPayload,
    cnf: { 'x5t#S256': TokenCertificateThumbprint },
};

export const BoundTokenID = 'bound-token';

export const INTROSPECTION_ENDPOINT = 'http://localhost:3001/token/introspect';

function respond(status: number, body: unknown) : Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

/**
 * Answers authup's introspection endpoint the way the server does: an unknown
 * token string is reported with the payload above, a malformed one with 400.
 */
export async function introspectToken(input: RequestInfo | URL, init?: RequestInit) : Promise<Response> {
    const url = input instanceof Request ? input.url : String(input);

    if (url !== INTROSPECTION_ENDPOINT) {
        return respond(404, { code: ErrorCode.JWT_INVALID });
    }

    const token = new URLSearchParams(String(init?.body ?? '')).get('token');

    switch (token) {
        case ErrorCode.JWT_INVALID: {
            const error = JWTError.payloadInvalid();

            return respond(400, { code: error.code, message: error.message });
        }
        case BoundTokenID: {
            return respond(200, BoundTokenPayload);
        }
        default: {
            return respond(200, TokenPayload);
        }
    }
}
