/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import {
    OAuth2Error,
    OAuth2SubKind,
} from '@authup/specs';
import {
    ClientError,
    ScopeName,
} from '@authup/core-kit';
import { useRequestBody } from '@routup/basic/body';
import { AuthorizationHeaderType, parseAuthorizationHeader } from 'hapic';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import type { ClientEntity } from '../../../database/domains';
import { ClientAuthenticationService } from '../../../services';
import { AbstractGrant } from './abstract';
import type { Grant } from './type';
import { buildOAuth2BearerTokenResponse } from '../response';

export class ClientCredentialsGrant extends AbstractGrant implements Grant {
    async run(request: Request) : Promise<OAuth2TokenGrantResponse> {
        const client = await this.validate(request);

        const {
            token: accessToken,
            payload: accessTokenPayload,
        } = await this.issueAccessToken({
            remoteAddress: getRequestIP(request, { trustProxy: true }),
            scope: ScopeName.GLOBAL,
            sub: client.id,
            subKind: OAuth2SubKind.CLIENT,
            realmId: client.realm.id,
            realmName: client.realm.id,
            clientId: client.id,
        });

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
        });
    }

    async validate(request: Request) : Promise<ClientEntity> {
        const [id, secret, realmId] = this.getClientCredentials(request);

        const authenticationService = new ClientAuthenticationService();

        return authenticationService.authenticate(id, secret, realmId);
    }

    protected getClientCredentials(request: Request) : [string, string, string | undefined] {
        let clientId = useRequestBody(request, 'client_id');
        let clientSecret = useRequestBody(request, 'client_secret');
        const realmId = useRequestBody(request, 'realm_id');

        if (!clientId && !clientSecret) {
            const { authorization: headerValue } = request.headers;

            if (typeof headerValue !== 'string') {
                throw ClientError.credentialsInvalid();
            }

            const header = parseAuthorizationHeader(headerValue);

            if (header.type !== AuthorizationHeaderType.BASIC) {
                throw OAuth2Error.requestInvalid();
            }

            clientId = header.username;
            clientSecret = header.password;
        }

        return [clientId, clientSecret, realmId];
    }
}
