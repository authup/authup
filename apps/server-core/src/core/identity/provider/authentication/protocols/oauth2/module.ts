/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider, OpenIDIdentityProvider, User } from '@authup/core-kit';
import { buildIdentityProviderAuthorizeCallbackPath } from '@authup/core-kit';
import { ValidationError } from '@authup/errors';
import type { Result } from '@authup/kit';
import type { JWTClaims } from '@authup/specs';
import type { Logger } from '@authup/server-kit';
import { extractTokenPayload } from '@authup/server-kit';
import type { AuthorizeParameters, TokenGrantResponse } from '@hapic/oauth2';
import { OAuth2Client } from '@hapic/oauth2';
import type { IIdentityProviderAccountManager } from '../../../account/index.ts';
import type { IdentityProviderIdentity } from '../../../types.ts';
import type {
    IOAuth2Authenticator,
    IdentityProviderOAuth2AuthenticatorContext,
    IdentityProviderOAuth2AuthenticatorOptions,
    OAuth2AuthorizationCodeGrantPayload,
} from './types.ts';

export class IdentityProviderOAuth2Authenticator implements IOAuth2Authenticator<User> {
    protected client : OAuth2Client;

    protected options : IdentityProviderOAuth2AuthenticatorOptions;

    protected accountManager: IIdentityProviderAccountManager;

    protected provider : OAuth2IdentityProvider | OpenIDIdentityProvider;

    protected logger? : Logger;

    //----------------------------------------------------------------------

    constructor(ctx: IdentityProviderOAuth2AuthenticatorContext) {
        this.options = ctx.options;
        this.accountManager = ctx.accountManager;
        this.provider = ctx.provider;
        this.logger = ctx.logger;

        this.client = new OAuth2Client({
            options: {
                clientId: ctx.provider.clientId,
                clientSecret: ctx.provider.clientSecret,
                redirectUri: `${ctx.options.baseURL}${buildIdentityProviderAuthorizeCallbackPath(ctx.provider.id)}`,
                scope: ctx.provider.scope || undefined,
                authorizationEndpoint: ctx.provider.authorizeUrl,
                tokenEndpoint: ctx.provider.tokenUrl,
                userinfoEndpoint: ctx.provider.userInfoUrl || undefined,
            },
        });
    }

    //----------------------------------------------------------------------

    buildRedirectURL(parameters: Partial<AuthorizeParameters> = {}) : string {
        try {
            return this.client.authorize.buildURL(parameters);
        } catch {
            throw new ValidationError(
                'The identity provider is misconfigured and has an invalid or missing authorize URL.',
            );
        }
    }

    //----------------------------------------------------------------------

    async resolveIdentity(params: OAuth2AuthorizationCodeGrantPayload): Promise<IdentityProviderIdentity> {
        const token = await this.client.token.createWithAuthorizationCode(params);

        const identity = await this.buildIdentityWithTokenGrantResponse(token);
        if (this.options.clientId) {
            identity.clientId = this.options.clientId;
        }

        return identity;
    }

    async authenticate(params: OAuth2AuthorizationCodeGrantPayload): Promise<User> {
        const identity = await this.resolveIdentity(params);

        const account = await this.accountManager.save(identity);

        return account.user;
    }

    async safeAuthenticate(params: OAuth2AuthorizationCodeGrantPayload): Promise<Result<User>> {
        try {
            const data = await this.authenticate(params);
            return {
                success: true,
                data, 
            };
        } catch (e) {
            return {
                success: false,
                error: e as Error, 
            };
        }
    }

    //----------------------------------------------------------------------

    /**
     * The claims an external identity is described by, richest source last.
     *
     * The access token is opaque by contract (OIDC Core §2), so it is only
     * the floor: authup's own carries `sub`, `kind` and `realm_name` and no
     * username at all, which is why a federated user used to be provisioned
     * under the remote subject UUID.
     */
    protected async resolveClaims(input: TokenGrantResponse, payload: JWTClaims) : Promise<JWTClaims> {
        let claims = payload;

        if (typeof input.id_token === 'string') {
            try {
                claims = {
                    ...claims,
                    ...extractTokenPayload(input.id_token),
                };
            } catch {
                // an encrypted (five-segment JWE) id_token is not decodable
                // here, and was ignored outright before it was read at all
            }
        }

        if (this.provider.userInfoUrl) {
            // the guard is load-bearing: the client carries no baseURL, so
            // hapic's `/userinfo` default would be a relative fetch URL
            try {
                const userInfo = await this.client.userInfo.get({
                    type: 'Bearer',
                    token: input.access_token,
                });

                claims = { ...claims, ...userInfo };
            } catch (e) {
                // enrichment, never a login blocker
                this.logger?.warn(
                    `The identity provider (${this.provider.id}) userinfo request failed: ${(e as Error).message}`,
                );
            }
        }

        return claims;
    }

    protected async buildIdentityWithTokenGrantResponse(input: TokenGrantResponse) : Promise<IdentityProviderIdentity> {
        const payload = extractTokenPayload(input.access_token);
        const claims = await this.resolveClaims(input, payload);

        return {
            // the account key: sourcing it from a richer claim set would
            // orphan every existing auth_identity_provider_accounts row
            id: payload.sub!,
            attributeCandidates: {
                name: [
                    // keycloak/authentik put the username here, authup its
                    // (nullable) display name; a candidate failing name
                    // validation shifts to the next one
                    claims.preferred_username,
                    claims.nickname,
                    // authup's own id_token: the real user name
                    claims.name,
                    claims.sub,
                ],
                email: [
                    claims.email,
                ],
            },
            data: payload,
            provider: this.provider,
        };
    }
}
