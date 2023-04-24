/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider } from '@authup/core';
import type { ConfigInput } from '@hapic/oauth2';
import { useRequestQuery } from '@routup/query';
import type { Request } from 'routup';
import { merge } from 'smob';
import { OAuth2IdentityProviderFlow } from './oauth2';
import type { IdentityProviderFlowIdentity } from './types';

export class PaypalIdentityProviderFlow extends OAuth2IdentityProviderFlow {
    constructor(provider: OAuth2IdentityProvider, config?: ConfigInput) {
        super(provider, merge(config || {}, {
            options: {
                scope: 'openid profile email',
                authorizationEndpoint: 'https://www.paypal.com/signin/authorize',
                tokenEndpoint: 'https://api.paypal.com/v1/identity/openidconnect/tokenservice',
                userinfoEndpoint: 'https://api.paypal.com/v1/oauth2/token/userinfo?schema=openid',
            },
        }));
    }

    async getIdentityForRequest(request: Request): Promise<IdentityProviderFlowIdentity> {
        const { code, state } = useRequestQuery(request);

        const token = await this.client.token.createWithAuthorizeGrant({
            code: code as string,
            state: state as string,
        });

        const userInfo = await this.client.userInfo.get({
            type: 'Bearer',
            token: token.access_token,
        });

        return {
            id: userInfo.user_id,
            name: userInfo.name,
            email: userInfo.email,
        };
    }
}
