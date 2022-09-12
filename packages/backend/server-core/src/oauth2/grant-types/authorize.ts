/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2SubKind, OAuth2TokenGrantResponse, TokenError } from '@authelion/common';
import { useDataSource } from 'typeorm-extension';
import { AbstractGrant } from './abstract';
import { Grant } from './type';
import { ExpressRequest } from '../../http/type';
import { OAuth2AuthorizationCodeEntity } from '../../domains';
import { OAuth2BearerTokenResponse } from '../response';

export class AuthorizeGrantType extends AbstractGrant implements Grant {
    async run(request: ExpressRequest) : Promise<OAuth2TokenGrantResponse> {
        const authorizationCode = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            remoteAddress: request.ip,
            sub: authorizationCode.user_id,
            subKind: OAuth2SubKind.USER,
            realmId: authorizationCode.realm_id,
            scope: authorizationCode.scope,
            clientId: authorizationCode.client_id,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.tokenMaxAgeAccessToken,
            refreshToken,
            idToken: authorizationCode.id_token,
        });

        return response.build();
    }

    async validate(request: ExpressRequest) : Promise<OAuth2AuthorizationCodeEntity> {
        const code = this.getAuthorizationCode(request);

        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);

        const entity = await repository.findOne({
            where: {
                content: code,
            },
            relations: ['user'],
        });

        if (!entity) {
            throw TokenError.grantInvalid();
        }

        if (entity.redirect_uri) {
            const redirectUri = this.getRedirectURI(request);

            if (!redirectUri || entity.redirect_uri !== redirectUri) {
                throw TokenError.redirectUriMismatch();
            }
        }

        if (!entity.content) {
            entity.content = code;
        }

        return entity;
    }

    protected getAuthorizationCode(request: ExpressRequest) : string {
        let { code } = request.body;

        if (!code) {
            code = request.query.code;
        }

        if (!code || typeof code !== 'string') {
            throw TokenError.requestInvalid();
        }

        return code;
    }

    protected getRedirectURI(request: ExpressRequest) : string {
        let { redirect_uri: redirectUri } = request.body;

        if (!redirectUri) {
            redirectUri = request.query.redirect_uri;
        }

        if (!redirectUri || typeof redirectUri !== 'string') {
            throw TokenError.requestInvalid();
        }

        return redirectUri;
    }
}
