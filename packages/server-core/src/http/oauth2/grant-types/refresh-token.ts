/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/core-kit';
import {
    OAuth2TokenKind, TokenError, getOAuth2SubByEntity, getOAuth2SubKindByEntity,
} from '@authup/core-kit';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { OAuth2RefreshTokenEntity } from '../../../domains';
import { AbstractGrant } from './abstract';
import { buildOAuth2BearerTokenResponse } from '../response';
import type { Grant } from './type';
import { readOAuth2TokenPayload } from '../token';

export class RefreshTokenGrantType extends AbstractGrant implements Grant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const token = await this.validate(request);

        const subKind = getOAuth2SubKindByEntity(token);
        const sub = getOAuth2SubByEntity(token);

        const accessToken = await this.issueAccessToken({
            remoteAddress: getRequestIP(request, { trustProxy: true }),
            scope: token.scope,
            sub,
            subKind,
            realmId: token.realm.id,
            realmName: token.realm.name,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.tokenAccessMaxAge,
            refreshToken,
            refreshTokenMaxAge: this.config.tokenRefreshMaxAge,
        });
    }

    async validate(request: Request) : Promise<OAuth2RefreshTokenEntity> {
        const refreshToken = useRequestBody(request, 'refresh_token');

        const payload = await readOAuth2TokenPayload(refreshToken);

        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        const entity = await repository.findOne({
            where: {
                id: payload.jti,
            },
            relations: ['realm'],
        });

        if (!entity) {
            throw TokenError.tokenNotFound(OAuth2TokenKind.REFRESH);
        }

        const expires = Date.parse(entity.expires);
        if (expires < Date.now()) {
            throw TokenError.expired(OAuth2TokenKind.REFRESH);
        }

        await repository.remove(entity);

        return entity;
    }
}
