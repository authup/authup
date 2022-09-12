/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Scope, OAuth2SubKind, OAuth2TokenGrantResponse, TokenError, UserError,
} from '@authelion/common';
import { AuthorizationHeaderType, parseAuthorizationHeader } from 'hapic';
import { useDataSource } from 'typeorm-extension';
import { AbstractGrant } from './abstract';
import { Grant } from './type';
import { ExpressRequest } from '../../http/type';
import { OAuth2BearerTokenResponse } from '../response';
import { OAuth2ClientEntity } from '../../domains';

export class ClientCredentialsGrant extends AbstractGrant implements Grant {
    async run(request: ExpressRequest) : Promise<OAuth2TokenGrantResponse> {
        const client = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            remoteAddress: request.ip,
            scope: OAuth2Scope.GLOBAL,
            sub: client.id,
            subKind: OAuth2SubKind.CLIENT,
            realmId: client.realm_id,
            clientId: client.id,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.tokenMaxAgeAccessToken,
            refreshToken,
        });

        return response.build();
    }

    async validate(request: ExpressRequest) : Promise<OAuth2ClientEntity> {
        const [id, secret] = this.getClientCredentials(request);

        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2ClientEntity);

        const entity = await repository.findOneBy({
            id,
            secret,
        });

        if (!entity) {
            throw UserError.credentialsInvalid();
        }

        return entity;
    }

    protected getClientCredentials(request: ExpressRequest) : [string, string] {
        let clientId = request.body.client_id || request.query.client_id;
        let clientSecret = request.body.client_secret || request.query.client_secret;

        if (!clientId && !clientSecret) {
            const { authorization: headerValue } = request.headers;

            const header = parseAuthorizationHeader(headerValue);

            if (header.type !== AuthorizationHeaderType.BASIC) {
                throw TokenError.requestInvalid();
            }

            clientId = header.username;
            clientSecret = header.password;
        }

        return [clientId, clientSecret];
    }
}
