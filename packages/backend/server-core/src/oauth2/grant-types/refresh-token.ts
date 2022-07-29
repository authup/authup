/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2TokenGrantResponse,
    OAuth2TokenKind,
    TokenError, getOAuth2SubByEntity, getOAuth2SubKindByEntity,
} from '@authelion/common';
import { AbstractGrant } from './abstract';
import { OAuth2BearerTokenResponse } from '../response';
import { OAuth2AccessTokenEntity, OAuth2RefreshTokenEntity } from '../../domains';
import { Grant } from './type';
import { extractOAuth2TokenPayload, loadOAuth2TokenEntity } from '../token';
import { useDataSource } from '../../database';
import { ExpressRequest } from '../../http';

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
            refreshToken,
        });

        return response.build();
    }

    async validate(request: ExpressRequest) : Promise<OAuth2RefreshTokenEntity> {
        const { refresh_token: refreshToken } = request.body;

        const payload = await extractOAuth2TokenPayload(refreshToken);
        const token = await loadOAuth2TokenEntity(OAuth2TokenKind.REFRESH, payload.jti);

        let expires : number;
        if (typeof token.expires === 'string') {
            expires = Date.parse(token.expires);
        } else {
            expires = token.expires.getTime();
        }

        if (expires < Date.now()) {
            throw TokenError.refreshTokenInvalid();
        }

        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        const entity = await repository.findOneBy({ id: token.id });

        if (!entity) {
            throw TokenError.refreshTokenInvalid();
        } else {
            await repository.remove(entity);
        }

        // -------------------------------------------------

        if (token.access_token_id) {
            const accessTokenRepository = dataSource.getRepository(OAuth2AccessTokenEntity);
            const accessTokenEntity = await accessTokenRepository.findOneBy({ id: token.access_token_id });

            if (accessTokenEntity) {
                await accessTokenRepository.remove(accessTokenEntity);
            }
        }

        return token;
    }
}
