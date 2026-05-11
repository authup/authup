/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import type { Client } from '@authup/core-kit';
import { EntityCredentialsInvalidError } from '@authup/errors';
import type { IRoutupEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type { ICredentialsAuthenticator } from '../../../../../core/index.ts';
import { ClientCredentialsGrant } from '../../../../../core/index.ts';
import type { HTTPOAuth2ClientCredentialsGrantContext, IHTTPOAuth2Grant } from './types.ts';
import { extractClientCredentialsFromRequest } from './utils/index.ts';

export class HTTPClientCredentialsGrant extends ClientCredentialsGrant implements IHTTPOAuth2Grant {
    protected authenticator : ICredentialsAuthenticator<Client>;

    constructor(ctx: HTTPOAuth2ClientCredentialsGrantContext) {
        super(ctx);

        this.authenticator = ctx.authenticator;
    }

    async runWithRequest(event: IRoutupEvent): Promise<OAuth2TokenGrantResponse> {
        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);
        const body = await readRequestBody(event);
        const realmId = body?.realm_id;

        if (!clientId) {
            throw new EntityCredentialsInvalidError('The client credentials are invalid.');
        }

        const client = await this.authenticator.authenticate(clientId, clientSecret ?? '', realmId);

        return this.runWith(client, {
            ipAddress: getRequestIP(event, { trustProxy: true }) ?? undefined,
            userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
        });
    }
}
