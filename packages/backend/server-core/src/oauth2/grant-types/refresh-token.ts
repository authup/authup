/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenGrantResponse,
    TokenError, getOAuth2SubByEntity, getOAuth2SubKindByEntity,
} from '@authelion/common';
import { useDataSource } from 'typeorm-extension';
import { AbstractGrant } from './abstract';
import { OAuth2BearerTokenResponse } from '../response';
import { OAuth2RefreshTokenEntity } from '../../domains';
import { Grant } from './type';
import { extractOAuth2TokenPayload } from '../token';
import { ExpressRequest } from '../../http/type';

export class RefreshTokenGrantType extends AbstractGrant implements Grant {
    async run(request: ExpressRequest) : Promise<OAuth2TokenGrantResponse> {
        const token = await this.validate(request);

        const subKind = getOAuth2SubKindByEntity(token);
        const sub = getOAuth2SubByEntity(token);

        const accessToken = await this.issueAccessToken({
            remoteAddress: request.ip,
            scope: token.scope,
            sub,
            subKind,
            realmId: token.realm_id,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.tokenMaxAgeAccessToken,
            refreshToken,
        });

        return response.build();
    }

    async validate(request: ExpressRequest) : Promise<OAuth2RefreshTokenEntity> {
        const { refresh_token: refreshToken } = request.body;

        const payload = await extractOAuth2TokenPayload(refreshToken);

        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        const entity = await repository.findOneBy({ id: payload.jti });

        if (!entity) {
            throw TokenError.refreshTokenInvalid();
        }

        let expires : number;
        if (typeof entity.expires === 'string') {
            expires = Date.parse(entity.expires);
        } else {
            expires = entity.expires.getTime();
        }

        if (expires < Date.now()) {
            throw TokenError.refreshTokenInvalid();
        }

        if (!entity) {
            throw TokenError.refreshTokenInvalid();
        } else {
            await repository.remove(entity);
        }

        return entity;
    }
}
