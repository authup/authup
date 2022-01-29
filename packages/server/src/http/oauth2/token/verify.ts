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
} from '@typescript-auth/domains';
import { TokenVerifyContext, verifyToken } from '@typescript-auth/server-utils';
import { getRepository } from 'typeorm';
import { NotFoundError } from '@typescript-error/http';
import { Cache, Client } from 'redis-extension';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { useRedisClient } from '../../../utils';
import { CachePrefix } from '../../../config/constants';

export async function verifyOAuth2Token(
    token: string,
    context?: TokenVerifyContext & {
        redis?: Client | boolean | string
    },
) : Promise<OAuth2TokenVerification> {
    const tokenPayload : OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload = await verifyToken(
        token,
        context,
    );

    context ??= {};
    const redis = useRedisClient(context.redis);

    let result : OAuth2TokenVerification;

    if (!result) {
        switch (tokenPayload.kind) {
            case OAuth2TokenKind.ACCESS: {
                const repository = getRepository(OAuth2AccessTokenEntity);
                let entity : OAuth2AccessTokenEntity | undefined;

                const cache : Cache<string> = redis ?
                    new Cache<string>({ redis }, { prefix: CachePrefix.TOKEN_ACCESS }) :
                    undefined;
                let cacheHit = false;

                if (cache) {
                    entity = await cache.get(tokenPayload.access_token_id);
                }

                if (entity) {
                    cacheHit = true;
                    entity.expires = entity.expires instanceof Date ? entity.expires : new Date(entity.expires);
                } else {
                    entity = await repository.findOne(tokenPayload.access_token_id);

                    if (typeof entity === 'undefined') {
                        throw new NotFoundError();
                    }
                }

                if (entity.expires.getTime() < Date.now()) {
                    await repository.remove(entity);

                    throw TokenError.expired();
                }

                if (
                    cache &&
                    !cacheHit
                ) {
                    const seconds = Math.ceil((entity.expires.getTime() - Date.now()) / 1000);
                    await cache.set(tokenPayload.access_token_id, entity, { seconds });
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

                const cache : Cache<string> = redis ?
                    new Cache<string>({ redis }, { prefix: CachePrefix.TOKEN_REFRESH }) :
                    undefined;
                let cacheHit = false;

                if (cache) {
                    entity = await cache.get(tokenPayload.refresh_token_id);
                }

                if (entity) {
                    cacheHit = true;
                    entity.expires = entity.expires instanceof Date ? entity.expires : new Date(entity.expires);
                } else {
                    entity = await repository.findOne(tokenPayload.refresh_token_id);

                    if (typeof entity === 'undefined') {
                        throw new NotFoundError();
                    }
                }

                if (entity.expires.getTime() < Date.now()) {
                    await repository.remove(entity);

                    throw TokenError.expired();
                }

                if (
                    cache &&
                    !cacheHit
                ) {
                    const seconds = Math.ceil((entity.expires.getTime() - Date.now()) / 1000);
                    await cache.set(tokenPayload.refresh_token_id, entity, { seconds });
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
