/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2IdentityProvider, OpenIDIdentityProvider, User } from '@authup/core-kit';
import { buildIdentityProviderAuthorizeCallbackPath } from '@authup/core-kit';
import { resolveURL } from '../../../../../../utils/index.ts';
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

/**
 * Bound on the optional userinfo enrichment. Short by design: the caller is
 * a browser sitting on a redirect, and the login proceeds without it.
 */
const USERINFO_TIMEOUT = 5000;

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
                // resolveURL, never a template literal: a publicUrl with a
                // trailing slash produced `//identity-providers/...`, which
                // the router does not match, so the provider sent the person
                // back to a 404 and every federated login died there.
                redirectUri: resolveURL(
                    ctx.options.baseURL,
                    buildIdentityProviderAuthorizeCallbackPath(ctx.provider.id),
                ),
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
            } catch (e) {
                // an encrypted (five-segment JWE) id_token is not decodable
                // here, and was ignored outright before it was read at all.
                // Logged rather than swallowed silently: every other reason
                // to land here leaves the user provisioned under the remote
                // subject, which is the defect this method exists to fix.
                this.logger?.warn(
                    `The identity provider (${this.provider.id}) id_token could not be read: ${(e as Error).message}`,
                );
            }
        }

        if (this.provider.userInfoUrl) {
            // the guard is load-bearing: the client carries no baseURL, so
            // hapic's `/userinfo` default would be a relative fetch URL
            try {
                const userInfo = await this.withTimeout(this.client.userInfo.get({
                    type: 'Bearer',
                    token: input.access_token,
                }));

                // OIDC Core 5.3.2: a userinfo response whose `sub` does not
                // match the token's MUST NOT be used. Without this a
                // mis-routed response (a multi-tenant gateway, a token
                // mix-up) would name and, worse, EMAIL the local user after
                // somebody else.
                if (
                    typeof userInfo.sub === 'string' &&
                    typeof payload.sub === 'string' &&
                    userInfo.sub !== payload.sub
                ) {
                    this.logger?.warn(
                        `The identity provider (${this.provider.id}) userinfo subject does not match the token subject.`,
                    );
                } else {
                    claims = { ...claims, ...userInfo };
                }
            } catch (e) {
                // enrichment, never a login blocker
                this.logger?.warn(
                    `The identity provider (${this.provider.id}) userinfo request failed: ${(e as Error).message}`,
                );
            }
        }

        return claims;
    }

    /**
     * hapic passes no `signal` to `fetch`, so an endpoint that accepts the
     * connection and never answers would hold the login for undici's 300s
     * headers timeout. Enrichment must not outlast the request it enriches.
     */
    protected withTimeout<T>(promise: Promise<T>) : Promise<T> {
        return Promise.race([
            promise,
            new Promise<T>((_resolve, reject) => {
                setTimeout(
                    () => reject(new Error(`the request exceeded ${USERINFO_TIMEOUT}ms`)),
                    USERINFO_TIMEOUT,
                ).unref();
            }),
        ]);
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
