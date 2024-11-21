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

export class FacebookIdentityProviderFlow extends OAuth2IdentityProviderFlow implements IOAuth2IdentityProviderFlow {
    constructor(options: OAuth2IdentityProviderFlowOptions) {
        options.scope = 'email';
        options.authorize_url = 'https://graph.facebook.com/oauth/authorize';
        options.token_url = 'https://graph.facebook.com/oauth/access_token';
        options.user_info_url = 'https://graph.facebook.com/me?fields=id,name,email,first_name,last_name';

        super(options);
    }

    async getIdentityForRequest(request: Request): Promise<IdentityProviderIdentity> {
        const { code } = useRequestQuery(request);

        const token = await this.client.token.createWithAuthorizationCode({
            code: code as string,
        });

        const userInfo = await this.client.userInfo.get({
            type: 'Bearer',
            token: token.access_token,
        });

        const payload = extractTokenPayload(token.access_token);

        return {
            id: userInfo.id,
            name: userInfo.username,
            email: userInfo.email,
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            data: payload,
        };
    }
}
