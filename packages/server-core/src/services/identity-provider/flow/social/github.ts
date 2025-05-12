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

export class GithubIdentityProviderFlow extends OAuth2IdentityProviderFlow implements IOAuth2IdentityProviderFlow {
    constructor(options: OAuth2IdentityProviderFlowOptions) {
        options.scope = 'user:email';
        options.authorize_url = 'https://github.com/login/oauth/authorize';
        options.token_url = 'https://github.com/login/oauth/access_token';
        options.user_info_url = 'https://api.github.com/user';

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

        const claims = extractTokenPayload(token.access_token);

        return {
            id: userInfo.id,
            attributeCandidates: {
                name: [
                    userInfo.login,
                    userInfo.name,
                    userInfo.id,
                ],
                email: [
                    userInfo.email,
                ],
            },
            data: claims,
        };
    }
}
