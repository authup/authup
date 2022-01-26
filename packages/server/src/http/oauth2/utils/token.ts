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
    TokenError,
} from '@typescript-auth/domains';
import { TokenVerifyContext, verifyToken } from '@typescript-auth/server-utils';
import { getRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { Cache } from 'redis-extension';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { OAuth2TokenVerifyResult } from './type';

export async function verifyOAuth2Token(
    token: string,
    context?: TokenVerifyContext & {
        tokenCache?: Cache<string>
    },
) : Promise<OAuth2TokenVerifyResult> {
    const tokenPayload : OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload = await verifyToken(
        token,
        context,
    );

    context ??= {};

    let result : OAuth2TokenVerifyResult | undefined;

    if (context.tokenCache) {
        result = await context.tokenCache.get(token);
    }

    if (!result) {
        switch (tokenPayload.kind) {
            case OAuth2TokenKind.ACCESS: {
                const repository = getRepository(OAuth2AccessTokenEntity);
                const entity = await repository.findOne(tokenPayload.access_token_id);

                if (typeof entity === 'undefined') {
                    throw new NotFoundError();
                }

                if (entity.expires.getTime() < Date.now()) {
                    await repository.remove(entity);

                    throw TokenError.expired();
                }

                result = {
                    kind: OAuth2TokenKind.ACCESS,
                    entity,
                    payload: tokenPayload,
                };
                break;
            }
            case OAuth2TokenKind.REFRESH: {
                const repository = getRepository(OAuth2RefreshTokenEntity);
                const entity = await repository.findOne(tokenPayload.refresh_token_id);

                if (typeof entity === 'undefined') {
                    throw new NotFoundError();
                }

                if (entity.expires.getTime() < Date.now()) {
                    await repository.remove(entity);

                    throw TokenError.expired();
                }

                result = {
                    kind: OAuth2TokenKind.REFRESH,
                    entity,
                    payload: tokenPayload,
                };
                break;
            }
        }

        if (context.tokenCache) {
            await context.tokenCache.set(token, result);
        }
    }

    if (!result) {
        throw new TokenError();
    }

    return result;
}
