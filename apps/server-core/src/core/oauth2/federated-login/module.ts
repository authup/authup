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
    ScopeName,
    SessionAuthMethod,
} from '@authup/core-kit';
import { BadRequestError, InternalError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import type { OAuth2TokenGrantResponse, OAuth2TokenPayload } from '@authup/specs';
import {
    OAuth2ErrorCode,
    OAuth2MfaRequiredError,
    OAuth2RequestError,
    OAuth2SubKind,
    isOAuth2Error,
} from '@authup/specs';
import type { IEventService, IRealmRepository } from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';
import type { ISessionManager } from '../../authentication/index.ts';
import type { IUserAuthenticatorChallengeProvider } from '../../entities/user-authenticator/index.ts';
// Deep imports, never the `core/identity` barrel: it reaches back into
// this module through the core barrel, and the cycle would TDZ-crash.
import type { IIdentityProviderAccountManager } from '../../identity/provider/account/types.ts';
import { createIdentityProviderOAuth2Authenticator } from '../../identity/provider/authentication/factory.ts';
import { toIdentityPolicyData } from '../../identity/permission/identity-policy-data.ts';
import type { IOAuth2AccessPolicyEvaluator } from '../access-policy/index.ts';
import type {
    IOAuth2AuthorizationCodeRequestVerifier,
    OAuth2AuthorizationCodeRequestVerificationResult,
} from '../authorization/index.ts';
import { deriveAmrAcr } from '../authorization/helpers.ts';
import { buildOAuth2BearerTokenResponse } from '../response/index.ts';
import type { IOAuth2TokenIssuer } from '../token/index.ts';
import { OAUTH2_FEDERATED_LOGIN_HANDLE_TTL } from './constants.ts';
import type {
    IOAuth2FederatedLoginHandleStore,
    IOAuth2FederatedLoginService,
    OAuth2FederatedLoginAuthenticatorFactory,
    OAuth2FederatedLoginCompleteInput,
    OAuth2FederatedLoginCompleteResult,
    OAuth2FederatedLoginRedeemInput,
    OAuth2FederatedLoginServiceContext,
    OAuth2FederatedLoginServiceOptions,
} from './types.ts';
import { OAuth2FederatedLoginRefusal } from './types.ts';

export class OAuth2FederatedLoginService implements IOAuth2FederatedLoginService {
    protected options : OAuth2FederatedLoginServiceOptions;

    protected accountManager : IIdentityProviderAccountManager;

    protected realmRepository : IRealmRepository;

    protected codeRequestVerifier : IOAuth2AuthorizationCodeRequestVerifier;

    protected sessionManager : ISessionManager;

    protected handleStore : IOAuth2FederatedLoginHandleStore;

    protected accessTokenIssuer : IOAuth2TokenIssuer;

    protected refreshTokenIssuer : IOAuth2TokenIssuer;

    protected mfaTicketIssuer? : IOAuth2TokenIssuer;

    protected mfaChallengeProvider? : IUserAuthenticatorChallengeProvider;

    protected accessPolicyEvaluator? : IOAuth2AccessPolicyEvaluator;

    protected eventService? : IEventService;

    protected metrics? : IAuthFlowMetrics;

    protected logger? : Logger;

    protected authenticatorFactory : OAuth2FederatedLoginAuthenticatorFactory;

    constructor(ctx: OAuth2FederatedLoginServiceContext) {
        this.options = ctx.options;
        this.accountManager = ctx.accountManager;
        this.realmRepository = ctx.realmRepository;
        this.codeRequestVerifier = ctx.codeRequestVerifier;
        this.sessionManager = ctx.sessionManager;
        this.handleStore = ctx.handleStore;
        this.accessTokenIssuer = ctx.accessTokenIssuer;
        this.refreshTokenIssuer = ctx.refreshTokenIssuer;
        this.mfaTicketIssuer = ctx.mfaTicketIssuer;
        this.mfaChallengeProvider = ctx.mfaChallengeProvider;
        this.accessPolicyEvaluator = ctx.accessPolicyEvaluator;
        this.eventService = ctx.eventService;
        this.metrics = ctx.metrics;
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

        // The provider and the client must share a realm, the completion-side
        // half of the plan-041 binding. It rests on the client the
        // verification just resolved rather than the `realm_id` carried on
        // the state blob: that value is only there because `authorize-out`
        // stores the VERIFIED request, so a guard reading it would disappear
        // silently for any state that reached here without the stamp. A
        // realm-less (global) provider matches every client by design.
        if (provider.realmId && verified.client.realmId !== provider.realmId) {
            throw OAuth2RequestError.malformed('The provider and client realm do not match.');
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
        // A login whose state carries no challenge can only end in a handle
        // nobody may redeem, so it is refused here rather than after the
        // provider's single-use code is spent and a user provisioned. Reached
        // by a state minted before this shipped; the hosted page re-renders
        // the request and the next attempt carries one.
        if (!input.loginChallenge) {
            return {
                kind: 'refused',
                refusal: OAuth2FederatedLoginRefusal.CODE_REQUEST,
                codeRequest: verified.data,
            };
        }

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

        // Application access policy (plan 052), federated leg. A policy id
        // with no wired evaluator denies (fail closed).
        if (verified.client.accessPolicyId) {
            const realm = await this.realmRepository.resolve(provider.realmId, true);
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

        // The callback establishes the session and stops there. The RP's
        // code is issued at the end of the hosted authorize ladder, so a
        // federated login passes the same gates a password login does: the
        // second factor, inline enrollment, prompt/max_age freshness,
        // acr_values step-up and consent (plan 094).
        //
        // The session has to outlive the handle: a factor-holding user
        // answers the redemption with a challenge, and the emailed code alone
        // is valid for ten minutes. So it is sized for the MFA ticket window
        // when one can be issued (the shape `OAuth2MfaLoginService.issueTicket`
        // keeps: one instant for the ticket and its pending session, so the
        // two cannot drift), and for the handle otherwise. An abandoned login
        // still self-expires and is swept; redemption extends it to the
        // regular lifetime.
        const expiresAt = Math.max(
            Math.floor((Date.now() + OAUTH2_FEDERATED_LOGIN_HANDLE_TTL) / 1000),
            this.mfaTicketIssuer ? this.mfaTicketIssuer.buildExp() : 0,
        );

        const session = await this.sessionManager.create({
            userAgent: input.request?.userAgent ?? undefined,
            ipAddress: input.request?.ipAddress ?? undefined,
            realmId: user.realmId,
            // no `clientId`: a USER-subject session, and the column is the
            // client-SUBJECT foreign key. The application lands on the
            // token rows at the /token exchange.
            sub: user.id,
            subKind: IdentityType.USER,
            mfaAt: null,
            authMethod: SessionAuthMethod.EXTERNAL,
            expiresAt: new Date(expiresAt * 1000).toISOString(),
        });

        const loginHandle = await this.handleStore.save({
            sessionId: session.id,
            loginChallenge: input.loginChallenge,
            providerId: provider.id,
            userName: user.name,
        });

        return {
            kind: 'issued',
            loginHandle,
            codeRequest: verified.data,
        };
    }

    async redeem(input: OAuth2FederatedLoginRedeemInput): Promise<OAuth2TokenGrantResponse> {
        // One message for every refusal: the caller is anonymous, so an
        // unknown handle, an expired one and a foreign one must not be
        // distinguishable.
        const refuse = () => new BadRequestError('The login request is unknown or expired.');

        const stash = await this.handleStore.consume(input.handle);
        if (!stash) {
            throw refuse();
        }

        // What makes a handed-out handle URL inert: it may only be redeemed
        // against the provider it was minted for, and only by the browser
        // that STARTED the login, which is what the challenge proves. That
        // challenge was minted by the login form and lives in the hosted
        // origin's session storage, where no other origin can read or write
        // it. Without it an attacker could run a federated login for their
        // own external account and hand the resulting URL to someone else,
        // whose browser would adopt that session and then consent the
        // application into it (login CSRF).
        //
        // The callback request's address and agent are deliberately NOT
        // compared. They cannot carry that weight, since both are chosen by
        // whoever makes that request (under the shipped `trustProxy: true`
        // the address is the client-supplied left-most `X-Forwarded-For`
        // entry), and comparing them across a top-level navigation and the
        // page's own XHR is the shape issue #3439 rejected: a proxy pool or
        // a re-homed mobile connection would break a legitimate login for no
        // security gain.
        //
        // A plain comparison is enough: the handle is consumed above, so a
        // wrong challenge costs the whole handle and there is no repeated
        // guess to time.
        if (
            stash.providerId !== input.providerId ||
            !stash.loginChallenge ||
            stash.loginChallenge !== input.challenge
        ) {
            throw refuse();
        }

        const existing = await this.sessionManager.findOneById(stash.sessionId);
        if (!existing) {
            throw refuse();
        }

        const realm = await this.realmRepository.resolve(existing.realmId, true);

        // The second factor comes BEFORE any bearer, the same order the
        // password grant keeps: an upstream credential must not be enough to
        // reach the API for a user who enrolled a factor on their authup
        // account (issue #3454). The answer is the restricted MFA-pending
        // ticket (issue #3242) — accepted only by the challenge routes, which
        // complete the login and mint the pair once the factor verifies.
        // Unlike the password grant this covers EVERY kind: the handle is
        // consumed, so there are no credentials left to resubmit with an
        // `otp`.
        if (!existing.mfaAt && this.mfaChallengeProvider) {
            const status = await this.mfaChallengeProvider.challenge(
                existing.sub,
                { issueMaterial: false },
            );

            if (status.required) {
                // The gate never depends on the ticket issuer being wired: a
                // missing one refuses the login rather than falling through
                // to the bearer below, which is the whole point of the gate.
                // The person can still complete a fresh login elsewhere.
                if (!this.mfaTicketIssuer) {
                    throw new OAuth2MfaRequiredError({
                        message: 'Complete a second-factor challenge to continue.',
                        data: { kinds: status.kinds },
                    });
                }

                // The pending session was created with room for this window,
                // so the ticket takes its own full one. It is never extended:
                // an unfinished challenge expires with the login.
                const [token, payload] = await this.mfaTicketIssuer.issue({
                    exp: this.mfaTicketIssuer.buildExp(),
                    session_id: existing.id,
                    user_agent: existing.userAgent,
                    remote_address: existing.ipAddress,
                    sub: existing.sub,
                    sub_kind: OAuth2SubKind.USER,
                    realm_id: existing.realmId,
                    realm_name: realm.name,
                });

                throw new OAuth2MfaRequiredError({
                    message: 'Complete a second-factor challenge to continue.',
                    data: {
                        kinds: status.kinds,
                        mfa_token: token,
                        mfa_token_expires_in: payload.exp ?
                            payload.exp - Math.floor(Date.now() / 1000) :
                            0,
                    },
                });
            }
        }

        // The login is complete now, so the pending session becomes a
        // regular one.
        const session = await this.sessionManager.refresh(existing);

        const payload : Partial<OAuth2TokenPayload> = {
            session_id: session.id,
            user_agent: session.userAgent,
            remote_address: session.ipAddress,
            scope: ScopeName.GLOBAL,
            sub: session.sub,
            sub_kind: OAuth2SubKind.USER,
            realm_id: session.realmId,
            realm_name: realm.name,
            ...deriveAmrAcr(session),
        };

        const [accessToken, accessTokenPayload] = await this.accessTokenIssuer.issue(payload);
        const [refreshToken, refreshTokenPayload] = await this.refreshTokenIssuer.issue(payload);

        await this.eventService?.record({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            refType: EventRefType.SESSION,
            refId: session.id,
            clientId: null,
            sessionId: session.id,
            actorType: IdentityType.USER,
            actorId: session.sub,
            actorName: stash.userName ?? null,
            realmId: session.realmId,
            requestIpAddress: session.ipAddress ?? null,
            requestUserAgent: session.userAgent ?? null,
            data: { reason: 'federated', providerId: stash.providerId },
        });
        this.metrics?.recordLogin('success');

        return buildOAuth2BearerTokenResponse({
            accessToken,
            accessTokenPayload,
            refreshToken,
            refreshTokenPayload,
        });
    }
}
