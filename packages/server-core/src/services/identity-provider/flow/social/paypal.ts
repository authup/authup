/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { extractTokenPayload } from '@authup/server-kit';
import { useRequestQuery } from '@routup/basic/query';
import type { Request } from 'routup';
import { OAuth2IdentityProviderFlow } from '../core';
import type { IOAuth2IdentityProviderFlow, IdentityProviderIdentity, OAuth2IdentityProviderFlowOptions } from '../types';

export class PaypalIdentityProviderFlow extends OAuth2IdentityProviderFlow implements IOAuth2IdentityProviderFlow {
    constructor(options: OAuth2IdentityProviderFlowOptions) {
        options.scope = 'openid profile email';
        options.authorize_url = 'https://www.paypal.com/signin/authorize';
        options.token_url = 'https://api.paypal.com/v1/identity/openidconnect/tokenservice';
        options.user_info_url = 'https://api.paypal.com/v1/oauth2/token/userinfo?schema=openid';

        super(options);
    }

    async getIdentityForRequest(request: Request): Promise<IdentityProviderIdentity> {
        const { code } = useRequestQuery(request);

        const token = await this.client.token.createWithAuthorizationCode({
            code: code as string,
        });

        const claims = extractTokenPayload(token.access_token);

        const userInfo = await this.client.userInfo.get({
            type: 'Bearer',
            token: token.access_token,
        });

        return {
            id: userInfo.user_id,
            attributeCandidates: {
                name: [
                    userInfo.name,
                    userInfo.user_id,
                ],
                email: [
                    userInfo.email,
                ],
            },
            data: claims,
        };
    }
}
