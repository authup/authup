/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider, OpenIDIdentityProvider, User } from '@authup/core-kit';
import { buildIdentityProviderAuthorizeCallbackPath } from '@authup/core-kit';
import type { Result } from '@authup/kit';
import { extractTokenPayload } from '@authup/server-kit';
import type { AuthorizeParameters, TokenGrantResponse } from '@hapic/oauth2';
import { OAuth2Client } from '@hapic/oauth2';
import type { IIdentityProviderAccountManager } from '../../../account';
import type { IdentityProviderIdentity } from '../../../types';
import type {
    IOAuth2Authenticator,
    IdentityProviderOAuth2AuthenticatorContext,
    OAuth2AuthorizationCodeGrantPayload,
} from './types';

export class IdentityProviderOAuth2Authenticator implements IOAuth2Authenticator<User> {
    protected client : OAuth2Client;

    protected options : IdentityProviderOAuth2AuthenticatorOptions;

    protected accountManager: IIdentityProviderAccountManager;

    protected provider : OAuth2IdentityProvider | OpenIDIdentityProvider;

    //----------------------------------------------------------------------

    constructor(ctx: IdentityProviderOAuth2AuthenticatorContext) {
        this.options = ctx.options;
        this.accountManager = ctx.accountManager;
        this.provider = ctx.provider;

        this.client = new OAuth2Client({
            options: {
                clientId: ctx.provider.client_id,
                clientSecret: ctx.provider.client_secret,
                redirectUri: `${ctx.options.baseURL}${buildIdentityProviderAuthorizeCallbackPath(ctx.provider.id)}`,
                scope: ctx.provider.scope,
                authorizationEndpoint: ctx.provider.authorize_url,
                tokenEndpoint: ctx.provider.token_url,
                userinfoEndpoint: ctx.provider.user_info_url,
            },
        });
    }

    //----------------------------------------------------------------------

    buildRedirectURL(parameters: Partial<AuthorizeParameters> = {}) : string {
        return this.client.authorize.buildURL(parameters);
    }

    //----------------------------------------------------------------------

    async authenticate(params: OAuth2AuthorizationCodeGrantPayload): Promise<User> {
        const token = await this.client.token.createWithAuthorizationCode(params);

        const identity = await this.buildIdentityWithTokenGrantResponse(token);
        if (this.options.clientId) {
            identity.clientId = this.options.clientId;
        }

        const account = await this.accountManager.save(identity);

        return account.user;
    }

    async safeAuthenticate(params: OAuth2AuthorizationCodeGrantPayload): Promise<Result<User>> {
        try {
            const data = await this.authenticate(params);
            return { success: true, data };
        } catch (e) {
            return { success: false, error: e };
        }
    }

    //----------------------------------------------------------------------

    protected async buildIdentityWithTokenGrantResponse(input: TokenGrantResponse) : Promise<IdentityProviderIdentity> {
        const payload = extractTokenPayload(input.access_token);

        return {
            id: payload.sub,
            attributeCandidates: {
                name: [
                    payload.sub,
                ],
                email: [
                    payload.email,
                ],
            },
            data: payload,
            provider: this.provider,
        };
    }
}
