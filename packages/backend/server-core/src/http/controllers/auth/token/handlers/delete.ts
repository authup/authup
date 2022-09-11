/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    CookieName,
    OAuth2TokenKind,
} from '@authelion/common';
import {
    buildKeyPath, hasClient, hasConfig, useClient,
} from 'redis-extension';
import { BadRequestError, NotFoundError } from '@typescript-error/http';
import { useDataSource } from 'typeorm-extension';
import { ExpressRequest, ExpressResponse } from '../../../../type';
import { OAuth2AccessTokenEntity, OAuth2RefreshTokenEntity } from '../../../../../domains';
import { extractOAuth2TokenPayload, loadOAuth2TokenEntity } from '../../../../../oauth2';
import { CachePrefix } from '../../../../../constants';

export async function deleteTokenRouteHandler(
    req: ExpressRequest,
    res: ExpressResponse,
) : Promise<any> {
    let { id } = req.params;

    if (
        !id &&
        req.token
    ) {
        id = req.token;
    }

    if (!id) {
        throw new NotFoundError();
    }

    const payload = await extractOAuth2TokenPayload(id);
    const entity = await loadOAuth2TokenEntity(payload.kind, payload.jti);
    const dataSource = await useDataSource();

    if (hasClient() || hasConfig()) {
        const redis = useClient();

        switch (payload.kind) {
            case OAuth2TokenKind.ACCESS: {
                await redis.del(buildKeyPath({
                    prefix: CachePrefix.OAUTH2_ACCESS_TOKEN,
                    id: entity.id,
                }));
                break;
            }
            case OAuth2TokenKind.REFRESH: {
                await redis.del(buildKeyPath({
                    prefix: CachePrefix.OAUTH2_REFRESH_TOKEN,
                    id: entity.id,
                }));
                break;
            }
        }
    }

    switch (payload.kind) {
        case OAuth2TokenKind.ACCESS: {
            const repository = dataSource.getRepository(OAuth2AccessTokenEntity);

            const { id: entityId } = entity;

            await repository.remove(entity as OAuth2AccessTokenEntity);

            if (req.token === id) {
                res.cookie(CookieName.ACCESS_TOKEN, null, { maxAge: 0 });
            }

            entity.id = entityId;

            return res.respondDeleted({
                data: entity,
            });
        }
        case OAuth2TokenKind.REFRESH: {
            const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);

            const { id: entityId } = entity;

            await repository.remove(entity as OAuth2RefreshTokenEntity);

            if (req.token === id) {
                res.cookie(CookieName.REFRESH_TOKEN, null, { maxAge: 0 });
            }

            entity.id = entityId;

            return res.respondDeleted({
                data: entity,
            });
        }
    }

    throw new BadRequestError();
}
