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
import { TokenVerifyContext, verifyToken } from '@authelion/api-utils';
import { NotFoundError } from '@typescript-error/http';
import { Cache, Client } from 'redis-extension';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { useRedisClient } from '../../../utils';
import { CachePrefix } from '../../../config/constants';
import { useDataSource } from '../../../database';

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

    const dataSource = await useDataSource();

    switch (tokenPayload.kind) {
        case OAuth2TokenKind.ACCESS: {
            const repository = dataSource.getRepository(OAuth2AccessTokenEntity);
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
                entity = await repository.findOneBy({ id: tokenPayload.access_token_id });

                if (!entity) {
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
            const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
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
                entity = await repository.findOneBy({ id: tokenPayload.refresh_token_id });

                if (!entity) {
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

    if (!result) {
        throw new TokenError();
    }

    return result;
}
