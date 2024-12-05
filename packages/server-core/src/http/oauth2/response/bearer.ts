/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/security';
import type { OAuth2BearerResponseBuildContext } from './type';

export function buildOAuth2BearerTokenResponse(
    context: OAuth2BearerResponseBuildContext,
) : OAuth2TokenGrantResponse {
    let accessTokenMaxAge : number;
    if (
        context.accessTokenPayload &&
        context.accessTokenPayload.exp
    ) {
        accessTokenMaxAge = Math.max(3600, context.accessTokenPayload.exp - Math.floor(new Date().getTime() / 1000));
    } else {
        accessTokenMaxAge = 3600;
    }

    const response : OAuth2TokenGrantResponse = {
        access_token: context.accessToken,
        expires_in: accessTokenMaxAge,
        token_type: 'Bearer',
    };

    if (context.accessTokenPayload) {
        response.scope = context.accessTokenPayload.scope;
    } else if (context.scope) {
        response.scope = context.scope;
    }

    if (context.refreshToken) {
        response.refresh_token = context.refreshToken;
    }

    if (context.idToken) {
        response.id_token = context.idToken;
    }

    return response;
}
