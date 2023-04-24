/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider, User } from '@authup/core';
import type { ConfigInput, OAuth2Client } from '@hapic/oauth2';
import { useRequestQuery } from '@routup/query';
import type { Request } from 'routup';
import { merge } from 'smob';
import { useConfig } from '../../../config';
import { OAuth2IdentityProviderFlow } from './oauth2';
import type { IdentityProviderFlowIdentity } from './types';

export class GithubIdentityProviderFlow extends OAuth2IdentityProviderFlow {
    constructor(provider: OAuth2IdentityProvider, config?: ConfigInput) {
        super(provider, merge(config || {}, {
            options: {
                scope: 'user:email',
                authorizationEndpoint: 'https://github.com/login/oauth/authorize',
                tokenEndpoint: 'https://github.com/login/oauth/access_token',
                userinfoEndpoint: 'https://github.com/user',
            },
        }));
    }

    async getIdentityForRequest(request: Request): Promise<IdentityProviderFlowIdentity> {
        const config = useConfig();
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
            id: userInfo.id,
            name: userInfo.login,
            email: userInfo.email,
        };
    }
}
