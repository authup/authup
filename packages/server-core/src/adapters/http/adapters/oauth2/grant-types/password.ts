/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestHeader, getRequestIP } from 'routup';
import type { ICredentialsAuthenticator } from '../../../../../core';
import { PasswordGrantType } from '../../../../../core';
import type { HTTPOAuth2PasswordGrantContext, IHTTPGrant } from './types';

export class HTTPPasswordGrant extends PasswordGrantType implements IHTTPGrant {
    // todo: alt lookup ldap service, grab and save account/user, set provider: LdapProvider
    // todo: use composite authenticator (UserAuthenticator + IdentityProviderLdapAuthenticator)
    protected authenticator : ICredentialsAuthenticator<User>;

    constructor(ctx: HTTPOAuth2PasswordGrantContext) {
        super(ctx);

        this.authenticator = ctx.authenticator;
    }

    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const {
            username,
            password,
            realm_id: realmId,
        } = useRequestBody(req);

        const data = await this.authenticator.authenticate(username, password, realmId);

        return this.runWith(
            data,
            {
                ipAddress: getRequestIP(req, { trustProxy: true }),
                userAgent: getRequestHeader(req, 'user-agent'),
            },
        );
    }
}
