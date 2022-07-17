/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Scope, OAuth2TokenResponse, OAuth2TokenSubKind, TokenError, UserError,
} from '@authelion/common';
import { AuthorizationHeaderType, parseAuthorizationHeader } from '@trapi/client';
import { AbstractGrant } from './abstract';
import { Grant } from './type';
import { ExpressRequest } from '../../http';
import { OAuth2BearerTokenResponse } from '../response';
import { OAuth2ClientEntity } from '../../domains';
import { useDataSource } from '../../database';

export class ClientCredentialsGrant extends AbstractGrant implements Grant {
    async run(request: ExpressRequest) : Promise<OAuth2TokenResponse> {
        const client = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            request,
            scope: OAuth2Scope.GLOBAL,
            entity: {
                kind: OAuth2TokenSubKind.CLIENT,
                data: client,
            },
            realm: client.realm_id,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        const response = new OAuth2BearerTokenResponse({
            accessToken,
            refreshToken,
            keyPairOptions: {
                directory: this.config.writableDirectoryPath,
            },
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
