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
import { verifyToken } from '@authelion/api-utils';
import { NotFoundError } from '@typescript-error/http';

import { Cache, useClient } from 'redis-extension';
import {
    OAuth2AccessTokenEntity,
    OAuth2RefreshTokenEntity,
} from '../../../domains';
import { useDataSource } from '../../../database';
import { useConfig } from '../../../config';
import { CachePrefix } from '../../../constants';
import { isRedisEnabled } from '../../../utils';

export async function validateOAuth2Token(
    token: string,
) : Promise<OAuth2TokenVerification> {
    const config = await useConfig();

    const tokenPayload = await verifyToken(
        token,
        {
            keyPair: config.keyPair,
        },
    ) as OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload;

    const dataSource = await useDataSource();
    const redis = isRedisEnabled(config.redis) ?
        useClient() :
        undefined;

    let result : OAuth2TokenVerification;

    switch (tokenPayload.kind) {
        case OAuth2TokenKind.ACCESS: {
            const repository = dataSource.getRepository(OAuth2AccessTokenEntity);
            const cache : Cache<string> = redis ?
                new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_ACCESS_TOKEN }) :
                undefined;

            let entity : OAuth2AccessTokenEntity | undefined;

            if (cache) {
                entity = await cache.get(tokenPayload.access_token_id);
            }

            if (entity) {
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

            if (cache) {
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
            const cache : Cache<string> = redis ?
                new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_REFRESH_TOKEN }) :
                undefined;

            let entity : OAuth2RefreshTokenEntity | undefined;

            if (cache) {
                entity = await cache.get(tokenPayload.refresh_token_id);
            }

            if (entity) {
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

            if (cache) {
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
