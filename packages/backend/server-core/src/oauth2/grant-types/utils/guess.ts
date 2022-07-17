/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenGrant, OAuth2TokenGrantType } from '@authelion/common';
import { AuthorizationHeaderType, parseAuthorizationHeader } from '@trapi/client';
import { ExpressRequest } from '../../../http';

export function guessOauth2GrantTypeByRequest(
    request: ExpressRequest,
) : OAuth2TokenGrantType | undefined {
    const grantType = request.body.grant_type || request.query.grant_type;

    const validGrantTypes = Object.values(OAuth2TokenGrant);
    if (validGrantTypes.indexOf(grantType) !== -1) {
        return grantType;
    }

    const username = request.body.username || request.query.username;
    const password = request.body.password || request.query.password;

    if (username && password) {
        return OAuth2TokenGrant.PASSWORD;
    }

    // ------------------------------------------------------------------

    const robotId = request.body.id || request.query.id;
    const robotSecret = request.body.secret || request.query.secret;

    if (robotId && robotSecret) {
        return OAuth2TokenGrant.ROBOT_CREDENTIALS;
    }

    // ------------------------------------------------------------------

    const refreshToken = request.body.refresh_token || request.query.refresh_token;
    if (refreshToken) {
        return OAuth2TokenGrant.REFRESH_TOKEN;
    }

    // ------------------------------------------------------------------

    const code = request.body.code || request.query.code;
    if (code) {
        return OAuth2TokenGrant.AUTHORIZATION_CODE;
    }

    // ------------------------------------------------------------------

    let clientId = request.body.client_id || request.query.client_id;
    let clientSecret = request.body.client_id || request.query.client_secret;

    if (!clientId && !clientSecret) {
        const { authorization: headerValue } = request.headers;

        const header = parseAuthorizationHeader(headerValue);

        if (header.type === AuthorizationHeaderType.BASIC) {
            clientId = header.username;
            clientSecret = header.password;
        }
    }

    if (clientId && clientSecret) {
        return OAuth2TokenGrant.CLIENT_CREDENTIALS;
    }

    return undefined;
}
