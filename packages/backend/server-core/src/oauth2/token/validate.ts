/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AccessTokenPayload,
    OAuth2RefreshTokenPayload,
    OAuth2TokenKind,
    OAuth2TokenVerification,
    TokenError,
} from '@authelion/common';
import { verifyToken } from '@authelion/server-utils';
import { useConfig } from '../../config';
import { buildKeyPairOptionsFromConfig } from '../../utils';
import { OAuth2AccessTokenCache, OAuth2RefreshTokenCache } from '../cache';

export async function validateOAuth2Token(
    token: string,
) : Promise<OAuth2TokenVerification> {
    const config = await useConfig();
    const keyPairOptions = buildKeyPairOptionsFromConfig(config);

    const tokenPayload = await verifyToken(
        token,
        {
            keyPair: keyPairOptions,
        },
    ) as OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload;

    let result : OAuth2TokenVerification;

    switch (tokenPayload.kind) {
        case OAuth2TokenKind.ACCESS: {
            const cache = new OAuth2AccessTokenCache();

            const entity = await cache.get(tokenPayload.access_token_id);

            result = {
                kind: OAuth2TokenKind.ACCESS,
                entity,
            };
            break;
        }
        case OAuth2TokenKind.REFRESH: {
            const cache = new OAuth2RefreshTokenCache();

            const entity = await cache.get(tokenPayload.refresh_token_id);

            result = {
                kind: OAuth2TokenKind.REFRESH,
                entity,
            };
            break;
        }
    }

    if (!result) {
        throw new TokenError();
    }

    return result;
}
