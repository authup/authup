/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import type { OAuth2BearerResponseBuildContext } from './type.ts';

function resolveExpiresIn(payload?: OAuth2TokenPayload, fallbackValue?: number) : number {
    if (payload && payload.exp) {
        return payload.exp - Math.floor(new Date().getTime() / 1000);
    }

    return fallbackValue || 3_600;
}

export function buildOAuth2BearerTokenResponse(
    context: OAuth2BearerResponseBuildContext,
) : OAuth2TokenGrantResponse {
    const response : OAuth2TokenGrantResponse = {
        access_token: context.accessToken,
        expires_in: resolveExpiresIn(context.accessTokenPayload),
        token_type: 'Bearer',
    };

    if (context.accessTokenPayload) {
        response.scope = context.accessTokenPayload.scope;
    } else if (context.scope) {
        response.scope = context.scope;
    }

    if (context.refreshToken) {
        response.refresh_token = context.refreshToken;
        response.refresh_token_expires_in = resolveExpiresIn(context.refreshTokenPayload);
    }

    if (context.idToken) {
        response.id_token = context.idToken;
    }

    return response;
}
