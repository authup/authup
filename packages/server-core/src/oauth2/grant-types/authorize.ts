/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2SubKind, OAuth2TokenGrantResponse, TokenError } from '@authelion/common';
import { useRequestBody } from '@routup/body';
import { useRequestQuery } from '@routup/query';
import { useDataSource } from 'typeorm-extension';
import { Request } from 'routup';
import { AbstractGrant } from './abstract';
import { Grant } from './type';
import { OAuth2AuthorizationCodeEntity } from '../../domains';
import { OAuth2BearerTokenResponse } from '../response';

export class AuthorizeGrantType extends AbstractGrant implements Grant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const authorizationCode = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            remoteAddress: request.socket.remoteAddress, // todo: check if set
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

    async validate(request: Request) : Promise<OAuth2AuthorizationCodeEntity> {
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

    protected getAuthorizationCode(request: Request) : string {
        let code = useRequestBody(request, 'code');

        if (!code) {
            code = useRequestQuery(request, 'code');
        }

        if (!code || typeof code !== 'string') {
            throw TokenError.requestInvalid();
        }

        return code;
    }

    protected getRedirectURI(request: Request) : string {
        let redirectUri = useRequestBody(request, 'redirect_uri');

        if (!redirectUri) {
            redirectUri = useRequestQuery(request, 'redirect_uri');
        }

        if (!redirectUri || typeof redirectUri !== 'string') {
            throw TokenError.requestInvalid();
        }

        return redirectUri;
    }
}
