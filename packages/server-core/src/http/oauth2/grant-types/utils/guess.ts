/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenGrant } from '@authup/schema';
import { useRequestBody } from '@routup/basic/body';
import { useRequestQuery } from '@routup/basic/query';
import { AuthorizationHeaderType, parseAuthorizationHeader } from 'hapic';
import type { Request } from 'routup';

export function guessOauth2GrantTypeByRequest(
    request: Request,
) : `${OAuth2TokenGrant}` | undefined {
    const grantType = useRequestBody(request, 'grant_type') || useRequestQuery(request, 'grant_type');

    const validGrantTypes = Object.values(OAuth2TokenGrant);
    if (validGrantTypes.indexOf(grantType) !== -1) {
        return grantType;
    }

    const username = useRequestBody(request, 'username') || useRequestQuery(request, 'username');
    const password = useRequestBody(request, 'password') || useRequestQuery(request, 'password');

    if (username && password) {
        return OAuth2TokenGrant.PASSWORD;
    }

    // ------------------------------------------------------------------

    const robotId = useRequestBody(request, 'id') || useRequestQuery(request, 'id');
    const robotSecret = useRequestBody(request, 'secret') || useRequestQuery(request, 'secret');

    if (robotId && robotSecret) {
        return OAuth2TokenGrant.ROBOT_CREDENTIALS;
    }

    // ------------------------------------------------------------------

    const refreshToken = useRequestBody(request, 'refresh_token') || useRequestQuery(request, 'refresh_token');
    if (refreshToken) {
        return OAuth2TokenGrant.REFRESH_TOKEN;
    }

    // ------------------------------------------------------------------

    const code = useRequestBody(request, 'code') || useRequestQuery(request, 'code');
    if (code) {
        return OAuth2TokenGrant.AUTHORIZATION_CODE;
    }

    // ------------------------------------------------------------------

    let clientId = useRequestBody(request, 'client_id') || useRequestQuery(request, 'client_id');
    let clientSecret = useRequestBody(request, 'client_secret') || useRequestQuery(request, 'client_secret');

    if (!clientId && !clientSecret) {
        const { authorization: headerValue } = request.headers;

        if (headerValue) {
            const header = parseAuthorizationHeader(headerValue);

            if (header.type === AuthorizationHeaderType.BASIC) {
                clientId = header.username;
                clientSecret = header.password;
            }
        }
    }

    if (clientId && clientSecret) {
        return OAuth2TokenGrant.CLIENT_CREDENTIALS;
    }

    return undefined;
}
