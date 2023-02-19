/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/common';
import {
    OAuth2SubKind, ScopeName, TokenError, UserError,
} from '@authup/common';
import { useRequestBody } from '@routup/body';
import { useRequestQuery } from '@routup/query';
import { AuthorizationHeaderType, parseAuthorizationHeader } from 'hapic';
import type { Request } from 'routup';
import { getRequestIp } from 'routup';
import { useDataSource } from 'typeorm-extension';
import { ClientEntity } from '@authup/server-database';
import { AbstractGrant } from './abstract';
import type { Grant } from './type';
import { buildOAuth2BearerTokenResponse } from '../response';

export class ClientCredentialsGrant extends AbstractGrant implements Grant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const client = await this.validate(request);

        const accessToken = await this.issueAccessToken({
            remoteAddress: getRequestIp(request, { trustProxy: true }),
            scope: ScopeName.GLOBAL,
            sub: client.id,
            subKind: OAuth2SubKind.CLIENT,
            realmId: client.realm.id,
            realmName: client.realm.name,
            clientId: client.id,
        });

        const refreshToken = await this.issueRefreshToken(accessToken);

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenMaxAge: this.config.get('tokenMaxAgeAccessToken'),
            refreshToken,
        });
    }

    async validate(request: Request) : Promise<ClientEntity> {
        const [id, secret] = this.getClientCredentials(request);

        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(ClientEntity);

        const entity = await repository.findOne({
            where: {
                id,
                secret,
            },
            relations: ['realm'],
        });

        if (!entity) {
            throw UserError.credentialsInvalid();
        }

        return entity;
    }

    protected getClientCredentials(request: Request) : [string, string] {
        let clientId = useRequestBody(request, 'client_id') || useRequestQuery(request, 'client_id');
        let clientSecret = useRequestBody(request, 'client_secret') || useRequestQuery(request, 'client_secret');

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
