/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2RefreshTokenVerification,
    OAuth2TokenKind,
    OAuth2TokenResponse, TokenError,
} from '@authelion/common';
import path from 'path';
import { AbstractGrant } from './abstract';
import { OAuth2BearerTokenResponse } from '../response';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { Grant } from './type';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { validateOAuth2Token } from '../token';
import { useDataSource } from '../../../database';
import { ExpressRequest } from '../../type';

export class RefreshTokenGrantType extends AbstractGrant implements Grant {
    async run(request: ExpressRequest) : Promise<OAuth2TokenResponse> {
        const token = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            request,
            entity: {
                kind: token.payload.sub_kind,
                data: token.payload.sub,
            },
            realm: token.entity.realm_id,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            keyPairOptions: {
                directory: path.join(this.config.rootPath, this.config.writableDirectory),
            },
            accessToken,
            refreshToken,
        });

        return response.build();
    }

    async validate(request: ExpressRequest) : Promise<OAuth2RefreshTokenVerification> {
        const { refresh_token: refreshToken } = request.body;

        const token = await validateOAuth2Token(refreshToken);

        if (token.kind !== OAuth2TokenKind.REFRESH) {
            throw TokenError.kindInvalid();
        }

        if (token.payload.expire_time < Date.now()) {
            throw TokenError.refreshTokenInvalid();
        }

        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        const entity = await repository.findOneBy({ id: token.payload.refresh_token_id });

        if (!entity) {
            throw TokenError.refreshTokenInvalid();
        } else {
            await repository.remove(entity);
        }

        // -------------------------------------------------

        const accessTokenRepository = dataSource.getRepository(OAuth2AccessTokenEntity);
        const accessTokenEntity = await accessTokenRepository.findOneBy({ id: token.payload.access_token_id });

        if (accessTokenEntity) {
            await accessTokenRepository.remove(accessTokenEntity);
        }

        return token;
    }
}
