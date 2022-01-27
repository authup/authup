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
import { Cache, Client } from 'redis-extension';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { OAuth2TokenVerifyResult } from './type';
import { useRedisClient } from '../../../utils';

export async function verifyOAuth2Token(
    token: string,
    context?: TokenVerifyContext & {
        redis?: Client | boolean | string
    },
) : Promise<OAuth2TokenVerifyResult> {
    const tokenPayload : OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload = await verifyToken(
        token,
        context,
    );

    context ??= {};
    const redis = useRedisClient(context.redis);

    let result : OAuth2TokenVerifyResult;

    if (!result) {
        switch (tokenPayload.kind) {
            case OAuth2TokenKind.ACCESS: {
                const repository = getRepository(OAuth2AccessTokenEntity);
                let entity : OAuth2AccessTokenEntity | undefined;

                if (redis) {
                    const cache = new Cache<string>({ redis }, { prefix: OAuth2TokenKind.ACCESS });
                    entity = await cache.get(tokenPayload.access_token_id);
                    if (entity) {
                        entity.expires = entity.expires instanceof Date ? entity.expires : new Date(entity.expires);
                    }
                }

                if (!entity) {
                    entity = await repository.findOne(tokenPayload.access_token_id);

                    if (typeof entity === 'undefined') {
                        throw new NotFoundError();
                    }
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
                let entity : OAuth2RefreshTokenEntity | undefined;

                if (redis) {
                    const cache = new Cache<string>({ redis }, { prefix: OAuth2TokenKind.REFRESH });
                    entity = await cache.get(tokenPayload.refresh_token_id);
                    if (entity) {
                        entity.expires = entity.expires instanceof Date ? entity.expires : new Date(entity.expires);
                    }
                }

                if (!entity) {
                    entity = await repository.findOne(tokenPayload.refresh_token_id);

                    if (typeof entity === 'undefined') {
                        throw new NotFoundError();
                    }
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
    }

    if (!result) {
        throw new TokenError();
    }

    return result;
}
