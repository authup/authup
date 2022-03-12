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
import { getRepository } from 'typeorm';
import { AbstractGrant } from './abstract-grant';
import { OAuth2BearerTokenResponse } from '../response';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { Grant } from './type';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { verifyOAuth2Token } from '../token';

export class RefreshTokenGrantType extends AbstractGrant implements Grant {
    async run() : Promise<OAuth2TokenResponse> {
        const token = await this.validate();

        const accessToken = await this.issueAccessToken({
            entity: {
                kind: token.payload.sub_kind,
                data: token.payload.sub,
            },
            realm: token.entity.realm_id,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            keyPairOptions: this.context.keyPairOptions,
            accessToken,
            refreshToken,
        });

        return response.build();
    }

    async validate() : Promise<OAuth2RefreshTokenVerification> {
        const { refresh_token: refreshToken } = this.context.request.body;

        const token = await verifyOAuth2Token(
            refreshToken,
            {
                keyPairOptions: this.context.keyPairOptions,
            },
        );

        if (token.kind !== OAuth2TokenKind.REFRESH) {
            throw TokenError.kindInvalid();
        }

        if (token.payload.expire_time < Date.now()) {
            throw TokenError.refreshTokenInvalid();
        }

        const repository = getRepository(OAuth2RefreshTokenEntity);
        const entity = await repository.findOne(token.payload.refresh_token_id);

        if (typeof entity === 'undefined') {
            throw TokenError.refreshTokenInvalid();
        } else {
            await repository.remove(entity);
        }

        // -------------------------------------------------

        const accessTokenRepository = getRepository(OAuth2AccessTokenEntity);
        const accessTokenEntity = await accessTokenRepository.findOne(token.payload.access_token_id);

        if (typeof accessTokenEntity !== 'undefined') {
            await accessTokenRepository.remove(accessTokenEntity);
        }

        return token;
    }
}
