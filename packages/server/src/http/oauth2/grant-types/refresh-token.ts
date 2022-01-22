/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2RefreshTokenPayload,
    OAuth2ServerError,
    Oauth2TokenResponse,
} from '@typescript-auth/domains';
import { getRepository } from 'typeorm';
import { AbstractGrant } from './abstract-grant';
import { OAuth2BearerTokenResponse } from '../response';
import { verifyToken } from '../../../utils';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { Grant } from './type';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';

export class RefreshTokenGrantType extends AbstractGrant implements Grant {
    async run() : Promise<Oauth2TokenResponse> {
        const refreshTokenPayload = await this.validate();

        const accessToken = await this.issueAccessToken({
            entity: {
                type: refreshTokenPayload.sub_kind,
                data: refreshTokenPayload.sub,
            },
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            keyPairOptions: this.context.keyPairOptions,
            accessToken,
            refreshToken,
        });

        return response.build();
    }

    async validate() : Promise<OAuth2RefreshTokenPayload> {
        const { refresh_token: refreshToken } = this.context.request.body;

        const refreshTokenPayload : OAuth2RefreshTokenPayload = await verifyToken(refreshToken, this.context.keyPairOptions);

        if (refreshTokenPayload.expire_time < Date.now()) {
            throw OAuth2ServerError.invalidRefreshToken();
        }

        const repository = getRepository(OAuth2RefreshTokenEntity);

        const entity = await repository.findOne(refreshTokenPayload.refresh_token_id);
        if (typeof entity === 'undefined') {
            throw OAuth2ServerError.invalidRefreshToken();
        } else {
            await repository.remove(entity);
        }

        // -------------------------------------------------

        const accessTokenRepository = getRepository(OAuth2AccessTokenEntity);
        const accessTokenEntity = await accessTokenRepository.findOne(refreshTokenPayload.access_token_id);

        if (typeof accessTokenEntity !== 'undefined') {
            await accessTokenRepository.remove(accessTokenEntity);
        }

        return refreshTokenPayload;
    }
}
