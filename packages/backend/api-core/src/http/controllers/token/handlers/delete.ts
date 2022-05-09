/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    CookieName,
    OAuth2TokenKind,
} from '@authelion/common';
import { BadRequestError, NotFoundError } from '@typescript-error/http';
import { buildKeyPath } from 'redis-extension';
import { ExpressRequest, ExpressResponse } from '../../../type';
import { OAuth2AccessTokenEntity } from '../../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../../domains/oauth2-refresh-token';
import { validateOAuth2Token } from '../../../oauth2';
import { useDataSource } from '../../../../database';
import { CachePrefix } from '../../../../redis';

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

    if (req.token === id) {
        res.cookie(CookieName.ACCESS_TOKEN, null, { maxAge: 0 });
        res.cookie(CookieName.REFRESH_TOKEN, null, { maxAge: 0 });
    }

    const token = await validateOAuth2Token(id);
    const dataSource = await useDataSource();

    if (dataSource.queryResultCache) {
        await dataSource.queryResultCache.remove([
            buildKeyPath({
                prefix: CachePrefix.TOKEN_ACCESS,
                id: token.payload.access_token_id,
            }),
        ]);

        if (token.payload.kind === OAuth2TokenKind.REFRESH) {
            await dataSource.queryResultCache.remove([
                buildKeyPath({
                    prefix: CachePrefix.TOKEN_REFRESH,
                    id: token.payload.refresh_token_id,
                }),
            ]);
        }
    }

    switch (token.kind) {
        case OAuth2TokenKind.ACCESS: {
            const repository = dataSource.getRepository(OAuth2AccessTokenEntity);

            const { id: entityId } = token.entity;

            await repository.remove(token.entity as OAuth2AccessTokenEntity);

            token.entity.id = entityId;

            return res.respondDeleted({
                data: token.entity,
            });
        }
        case OAuth2TokenKind.REFRESH: {
            const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);

            const { id: entityId } = token.entity;

            await repository.remove(token.entity as OAuth2RefreshTokenEntity);

            token.entity.id = entityId;

            return res.respondDeleted({
                data: token.entity,
            });
        }
    }

    throw new BadRequestError();
}
