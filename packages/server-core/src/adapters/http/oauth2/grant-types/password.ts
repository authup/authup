/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import { useRequestBody } from '@routup/basic/body';
import type { Request } from 'routup';
import { getRequestIP } from 'routup';
import { IdentityType, UserError } from '@authup/core-kit';
import type { IIdentityResolver } from '../../../../core';
import { PasswordGrantType, UserAuthenticator } from '../../../../core';
import type { HTTPOAuth2PasswordGrantContext, IHTTPGrant } from './types';

export class HTTPPasswordGrant extends PasswordGrantType implements IHTTPGrant {
    protected authenticator : UserAuthenticator;

    protected identityResolver: IIdentityResolver;

    constructor(ctx: HTTPOAuth2PasswordGrantContext) {
        super(ctx);

        this.authenticator = new UserAuthenticator();
        this.identityResolver = ctx.identityResolver;
    }

    async runWithRequest(req: Request): Promise<OAuth2TokenGrantResponse> {
        const {
            username,
            password,
            realm_id: realmId,
        } = useRequestBody(req);

        // todo: alt lookup ldap service, grab and save account/user, set provider: LdapProvider
        const identity = await this.identityResolver.resolve(
            IdentityType.USER,
            username,
            realmId,
        );

        if (!identity || identity.type !== IdentityType.USER) {
            throw UserError.credentialsInvalid();
        }

        // todo: check in authenticator if authenticate is set.
        const data = await this.authenticator.authenticate(identity.data, password);

        return this.runWith(
            data,
            {
                remote_address: getRequestIP(req, { trustProxy: true }),
            },
        );
    }
}
