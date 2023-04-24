/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider, User } from '@authup/core';
import type { ConfigInput } from '@hapic/oauth2';
import { useRequestQuery } from '@routup/query';
import type { Request } from 'routup';
import { merge } from 'smob';
import { OAuth2IdentityProviderFlow } from './oauth2';
import type { IdentityProviderFlowIdentity } from './types';

export class GoogleIdentityProviderFlow extends OAuth2IdentityProviderFlow {
    constructor(provider: OAuth2IdentityProvider, config?: ConfigInput) {
        super(provider, merge(config || {}, {
            options: {
                scope: 'openid profile email',
                authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenEndpoint: 'https://oauth2.googleapis.com/token',
                userinfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
            },
        }));
    }

    async getIdentityForRequest(request: Request): Promise<IdentityProviderFlowIdentity> {
        const { code, state } = useRequestQuery(request);

        // todo additional parameter like hd required
        // read: https://developers.google.com/identity/openid-connect/openid-connect?hl=de#createxsrftoken
        const token = await this.client.token.createWithAuthorizeGrant({
            code: code as string,
            state: state as string,
        });

        const userInfo = await this.client.userInfo.get({
            type: 'Bearer',
            token: token.access_token,
        });

        // todo: extract open id credentials
        throw new Error('Not implemented yet.');
    }
}
