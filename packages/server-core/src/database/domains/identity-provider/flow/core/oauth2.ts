/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildIdentityProviderAuthorizeCallbackPath } from '@authup/core-kit';
import type { Options } from '@hapic/oauth2';
import { OAuth2Client } from '@hapic/oauth2';
import type { Request } from 'routup';
import { useConfig } from '../../../../../config';
import type { IOAuth2IdentityProviderFlow, IdentityProviderIdentity, OAuth2IdentityProviderFlowOptions } from '../types';

export abstract class OAuth2IdentityProviderFlow implements IOAuth2IdentityProviderFlow {
    protected client : OAuth2Client;

    protected constructor(provider: OAuth2IdentityProviderFlowOptions) {
        const clientOptions : Options = {
            clientId: provider.client_id,
            clientSecret: provider.client_secret,
            redirectUri: `${useConfig().publicUrl}${buildIdentityProviderAuthorizeCallbackPath(provider.id)}`,
            scope: provider.scope,
            authorizationEndpoint: provider.authorize_url,
            tokenEndpoint: provider.token_url,
            userinfoEndpoint: provider.user_info_url,
        };

        this.client = new OAuth2Client({
            options: clientOptions,
        });
    }

    public buildAuthorizeURL() : string {
        return this.client.authorize.buildURL();
    }

    abstract getIdentityForRequest(request: Request) : Promise<IdentityProviderIdentity>;
}
