/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isSafeRedirectURLScheme } from '@authup/kit';
import {
    EventName,
    EventRefType,
    EventScope,
    IdentityType,
    SessionAuthMethod,
} from '@authup/core-kit';
import { InternalError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import { OAuth2ErrorCode, OAuth2RequestError, isOAuth2Error } from '@authup/specs';
import type { IEventService, IRealmRepository } from '../../entities/index.ts';
// Deep imports, never the `core/identity` barrel: it reaches back into
// this module through the core barrel, and the cycle would TDZ-crash.
import type { IIdentityProviderAccountManager } from '../../identity/provider/account/types.ts';
import { createIdentityProviderOAuth2Authenticator } from '../../identity/provider/authentication/factory.ts';
import { toIdentityPolicyData } from '../../identity/permission/identity-policy-data.ts';
import type { IOAuth2AccessPolicyEvaluator } from '../access-policy/index.ts';
import type {
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    OAuth2AuthorizationCodeRequestVerificationResult,
} from '../authorization/index.ts';
import type {
    IOAuth2FederatedLoginService,
    OAuth2FederatedLoginAuthenticatorFactory,
    OAuth2FederatedLoginCompleteInput,
    OAuth2FederatedLoginCompleteResult,
    OAuth2FederatedLoginServiceContext,
    OAuth2FederatedLoginServiceOptions,
} from './types.ts';
import { OAuth2FederatedLoginRefusal } from './types.ts';

export class OAuth2FederatedLoginService implements IOAuth2FederatedLoginService {
    protected options : OAuth2FederatedLoginServiceOptions;

    protected accountManager : IIdentityProviderAccountManager;

    protected realmRepository : IRealmRepository;

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected codeIssuer : IOAuth2AuthorizationCodeIssuer;

    protected accessPolicyEvaluator? : IOAuth2AccessPolicyEvaluator;

    protected eventService? : IEventService;

    protected logger? : Logger;

    protected authenticatorFactory : OAuth2FederatedLoginAuthenticatorFactory;

    constructor(ctx: OAuth2FederatedLoginServiceContext) {
        this.options = ctx.options;
        this.accountManager = ctx.accountManager;
        this.realmRepository = ctx.realmRepository;
        this.codeRequestVerifier = ctx.codeRequestVerifier;
        this.codeIssuer = ctx.codeIssuer;
        this.accessPolicyEvaluator = ctx.accessPolicyEvaluator;
        this.eventService = ctx.eventService;
        this.logger = ctx.logger;
        this.authenticatorFactory = ctx.authenticatorFactory ??
            ((provider, options) => createIdentityProviderOAuth2Authenticator({
                accountManager: this.accountManager,
                provider,
                logger: options.logger,
                options: {
                    baseURL: options.baseURL,
                    clientId: options.clientId,
                },
            }));
    }

    async complete(input: OAuth2FederatedLoginCompleteInput): Promise<OAuth2FederatedLoginCompleteResult> {
        const {
            code, 
            codeRequest, 
            provider, 
        } = input;

        if (
            provider.realmId &&
            codeRequest.realm_id &&
            codeRequest.realm_id !== provider.realmId
        ) {
            throw OAuth2RequestError.malformed('The provider and client realm do not match.');
        }

        // Re-verify the request BEFORE the provider's single-use code is
        // spent. It re-resolves the client (active, grant allowlist, scopes)
        // and re-matches the redirect_uri against the client's registered
        // patterns, so a client deactivated (or a pattern removed) while the
        // person was away at the provider cannot still receive a code, and a
        // refused completion provisions no user.
        //
        // Only a refusal is reported as one; a server failure keeps throwing.
        let verified : OAuth2AuthorizationCodeRequestVerificationResult;
        try {
            verified = await this.codeRequestVerifier.verify(codeRequest);
        } catch (e) {
            if (!isOAuth2Error(e)) {
                throw e;
            }

            return {
                kind: 'refused',
                refusal: OAuth2FederatedLoginRefusal.CODE_REQUEST,
                codeRequest,
            };
        }

        // A stored code request always carries a redirect_uri (that mount is
        // required in OAuth2AuthorizationCodeRequestValidator, unlike
        // `state`), so a verified request is a verified redirect target. The
        // guard keeps the redirect decision resting on the match itself,
        // which is the only thing here that knows the uri was ever matched.
        const redirectUri = verified.data.redirect_uri;
        if (!verified.redirectUriVerified || !redirectUri) {
            throw OAuth2RequestError.malformed('The redirect_uri was not verified.');
        }

        // A non-http(s) target is navigated from the interstitial page, which
        // `location.assign`s it and renders it as an href, so a
        // script-capable scheme would execute on the IdP origin. The client
        // validator and the code-request verifier both refuse such a scheme;
        // this fails closed should either gap, and it runs before the
        // provider's single-use code is spent, a user provisioned or a code
        // minted.
        if (!isSafeRedirectURLScheme(redirectUri)) {
            throw new InternalError('The redirect_uri scheme is not allowed.');
        }

        // The provider must still be enabled, the rule the link path already
        // applies. Disabling a provider has to stop logins in flight too,
        // otherwise it only stops new ones. Checked before the exchange, so
        // the refusal contacts the provider not at all.
        if (!provider.enabled) {
            return {
                kind: 'refused',
                refusal: OAuth2FederatedLoginRefusal.PROVIDER_DISABLED,
                error: OAuth2ErrorCode.LOGIN_REQUIRED,
                codeRequest: verified.data,
            };
        }

        const authenticator = this.authenticatorFactory(provider, {
            baseURL: this.options.baseURL,
            clientId: verified.data.client_id,
            logger: this.logger,
        });

        const user = await authenticator.authenticate({ code });

        // The local login path refuses an inactive user (EntityInactiveError),
        // and a federated login must not be the way around that. Only
        // reachable for an already-linked user: a first login provisions an
        // active one.
        if (!user.active) {
            return {
                kind: 'refused',
                refusal: OAuth2FederatedLoginRefusal.USER_INACTIVE,
                error: OAuth2ErrorCode.ACCESS_DENIED,
                codeRequest: verified.data,
            };
        }

        const realm = await this.realmRepository.resolve(provider.realmId, true);

        // Application access policy (plan 052), federated leg. A policy id
        // with no wired evaluator denies (fail closed).
        if (verified.client.accessPolicyId) {
            let allowed = false;

            const subject = toIdentityPolicyData({
                type: IdentityType.USER,
                data: {
                    ...user,
                    realm,
                },
            });
            if (this.accessPolicyEvaluator && subject) {
                allowed = await this.accessPolicyEvaluator.evaluate(
                    verified.client.accessPolicyId,
                    subject,
                );
            }

            if (!allowed) {
                return {
                    kind: 'refused',
                    refusal: OAuth2FederatedLoginRefusal.ACCESS_DENIED,
                    error: OAuth2ErrorCode.ACCESS_DENIED,
                    codeRequest: verified.data,
                };
            }
        }

        // The WHOLE verified request reaches the issuer, never a hand-picked
        // subset: it carries code_challenge / code_challenge_method and nonce
        // (plus acr_values, which no redemption path reads yet). A code that
        // lost its PKCE challenge cannot be redeemed by a public client at
        // all (`PKCE is required for public clients`), which is every console
        // client.
        const authorizationCode = await this.codeIssuer.issue(
            verified.data,
            {
                type: IdentityType.USER,
                data: {
                    ...user,
                    realm,
                },
            },
            { authMethod: SessionAuthMethod.EXTERNAL },
        );

        // The interactive path records this in OAuth2Authorization.authorize();
        // this leg issues its code directly, so without an emit here a
        // federated authorization leaves no trace in auth_events while every
        // other one does. `reason: federated` is what tells the two apart:
        // there was no consent step to report. No session exists yet (the
        // /token exchange creates it), hence a null sessionId. Metrics stay
        // uninstrumented on this leg, as they already are.
        await this.eventService?.record({
            scope: EventScope.OAUTH2,
            name: EventName.AUTHORIZE,
            refType: EventRefType.CLIENT,
            refId: verified.data.client_id ?? null,
            clientId: verified.data.client_id ?? null,
            sessionId: null,
            actorType: IdentityType.USER,
            actorId: user.id,
            actorName: user.name,
            realmId: verified.data.realm_id ?? realm.id,
            requestIpAddress: input.request?.ipAddress ?? null,
            requestUserAgent: input.request?.userAgent ?? null,
            data: {
                reason: 'federated',
                providerId: provider.id,
                providerName: provider.name,
                ...(verified.data.scope ? { scope: verified.data.scope } : {}),
            },
        });

        return {
            kind: 'issued',
            redirectUri,
            code: authorizationCode.id,
            state: verified.data.state,
            codeRequest: verified.data,
            client: {
                id: verified.client.id,
                name: verified.client.name,
                displayName: verified.client.displayName ?? null,
            },
        };
    }
}
