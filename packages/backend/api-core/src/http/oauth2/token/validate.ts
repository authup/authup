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
import { buildKeyPath } from 'redis-extension';

import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { useDataSource } from '../../../database';
import { useConfig } from '../../../config';
import { CachePrefix } from '../../../redis';

export async function validateOAuth2Token(
    token: string,
) : Promise<OAuth2TokenVerification> {
    const config = await useConfig();

    const tokenPayload : OAuth2AccessTokenPayload | OAuth2RefreshTokenPayload = await verifyToken(
        token,
        {
            keyPair: config.keyPair,
        },
    );

    let result : OAuth2TokenVerification;

    const dataSource = await useDataSource();

    switch (tokenPayload.kind) {
        case OAuth2TokenKind.ACCESS: {
            const repository = dataSource.getRepository(OAuth2AccessTokenEntity);
            const entity = await repository.findOne({
                where: {
                    id: tokenPayload.access_token_id,
                },
                cache: {
                    id: buildKeyPath({
                        prefix: CachePrefix.TOKEN_ACCESS,
                        id: tokenPayload.access_token_id,
                    }),
                    milliseconds: 60.000,
                },
            });

            if (!entity) {
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
            const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
            const entity = await repository.findOne({
                where: {
                    id: tokenPayload.refresh_token_id,
                },
                cache: {
                    id: buildKeyPath({
                        prefix: CachePrefix.TOKEN_REFRESH,
                        id: tokenPayload.refresh_token_id,
                    }),
                    milliseconds: 60.000,
                },
            });

            if (!entity) {
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

    if (!result) {
        throw new TokenError();
    }

    return result;
}
