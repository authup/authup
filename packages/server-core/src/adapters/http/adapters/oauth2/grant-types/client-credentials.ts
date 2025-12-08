/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { OAuth2Error } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import type { Client } from '@authup/core-kit';
import { ClientError } from '@authup/core-kit';
import { AuthorizationHeaderType, parseAuthorizationHeader } from 'hapic';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import type { ICredentialsAuthenticator } from '../../../../../core';
import {
    ClientCredentialsGrant,
} from '../../../../../core';
import type { HTTPOAuth2ClientCredentialsGrantContext, IHTTPGrant } from './types';

export class HTTPClientCredentialsGrant extends ClientCredentialsGrant implements IHTTPGrant {
    protected authenticator : ICredentialsAuthenticator<Client>;

    constructor(ctx: HTTPOAuth2ClientCredentialsGrantContext) {
        super(ctx);

        this.authenticator = ctx.authenticator;
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

        const client = await this.authenticator.authenticate(clientId, clientSecret, realmId);

        return this.runWith(client, {
            remote_address: getRequestIP(req, { trustProxy: true }),
        });
    }
}
