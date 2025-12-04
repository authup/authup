/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2Error } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import { ClientError, IdentityType } from '@authup/core-kit';
import { AuthorizationHeaderType, parseAuthorizationHeader } from 'hapic';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import type { IIdentityResolver } from '../../../../../core';
import {
    ClientAuthenticator,
    ClientCredentialsGrant,
} from '../../../../../core';
import type { HTTPOAuth2ClientCredentialsGrantContext, IHTTPGrant } from './types';

export class HTTPClientCredentialsGrant extends ClientCredentialsGrant implements IHTTPGrant {
    protected authenticator : ClientAuthenticator;

    protected identityResolver: IIdentityResolver;

    constructor(ctx: HTTPOAuth2ClientCredentialsGrantContext) {
        super(ctx);

        this.authenticator = new ClientAuthenticator();
        this.identityResolver = ctx.identityResolver;
    }

    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        let clientId = useRequestBody(req, 'client_id');
        let clientSecret = useRequestBody(req, 'client_secret');
        const realmId = useRequestBody(req, 'realm_id');

        if (!clientId && !clientSecret) {
            const { authorization: headerValue } = req.headers;

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

        const identity = await this.identityResolver.resolve(
            IdentityType.CLIENT,
            clientId,
            realmId,
        );

        if (!identity || identity.type !== IdentityType.CLIENT) {
            throw ClientError.credentialsInvalid();
        }

        const client = await this.authenticator.authenticate(identity.data, clientSecret);

        return this.runWith(client, {
            remote_address: getRequestIP(req, { trustProxy: true }),
        });
    }
}
