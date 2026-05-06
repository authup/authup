/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { readRequestBody } from '@routup/basic/body';
import type { IRoutupEvent } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type { ICredentialsAuthenticator, OAuth2ClientAuthenticator } from '../../../../../core/index.ts';
import { PasswordGrantType } from '../../../../../core/index.ts';
import type { HTTPOAuth2PasswordGrantContext, IHTTPOAuth2Grant } from './types.ts';
import { extractClientCredentialsFromRequest } from './utils/index.ts';

export class HTTPPasswordGrant extends PasswordGrantType implements IHTTPOAuth2Grant {
    protected authenticator : ICredentialsAuthenticator<User>;

    protected clientAuthenticator : OAuth2ClientAuthenticator;

    constructor(ctx: HTTPOAuth2PasswordGrantContext) {
        super(ctx);

        this.authenticator = ctx.authenticator;
        this.clientAuthenticator = ctx.clientAuthenticator;
    }

    async runWithRequest(event: IRoutupEvent): Promise<OAuth2TokenGrantResponse> {
        const body = await readRequestBody(event);
        const {
            username,
            password,
            realm_id: realmId,
        } = body || {};

        const { clientId, clientSecret } = await extractClientCredentialsFromRequest(event);

        const client = clientId ?
            await this.clientAuthenticator.authenticate(
                clientId,
                clientSecret,
                typeof realmId === 'string' ? realmId : undefined,
            ) :
            undefined;

        const user = await this.authenticator.authenticate(username, password, realmId);

        return this.runWith(
            { user, client },
            {
                ipAddress: getRequestIP(event, { trustProxy: true }) ?? undefined,
                userAgent: getRequestHeader(event, 'user-agent') ?? undefined,
            },
        );
    }
}
