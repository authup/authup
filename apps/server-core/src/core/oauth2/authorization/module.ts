/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Identity, 
    OAuth2AuthorizationCode, 
    OAuth2AuthorizationCodeRequest, 
    Session,
} from '@authup/core-kit';
import {
    EventName, 
    EventRefType, 
    EventScope, 
    IdentityType,
} from '@authup/core-kit';
import { hasInstanceof } from '@authup/errors';
import {
    OAUTH2_LOGIN_REQUIRED_ERROR_INSTANCE,
    OAUTH2_MFA_REQUIRED_ERROR_INSTANCE,
    OAuth2AuthenticationContextClass,
    OAuth2AuthorizationPrompt,
    OAuth2AuthorizationResponseType,
    OAuth2GrantError,
    OAuth2LoginRequiredError,
    OAuth2MfaRequiredError,
    OAuth2RequestError,
    OAuth2ResponseTypeError,
} from '@authup/specs';
import type { IOAuth2AuthorizationCodeIssuer } from './code/index.ts';
import type {
    OAuth2AuthorizationManagerContext,
    OAuth2AuthorizationOptions,
    OAuth2AuthorizationResult,
} from './types.ts';
import type { ISessionManager } from '../../authentication/index.ts';
import type { IEventService, IUserAuthenticatorChallengeProvider } from '../../entities/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';

const DEFAULT_PROMPT_LOGIN_MAX_AGE = 60;

// Deliberately 60 (not 0, deviating from the plan-050 sketch): the hosted
// challenge round-trip (stamp mfa_at → retry POST /authorize) takes seconds,
// so a 0-window step-up could never be satisfied and would loop the ladder.
const DEFAULT_MFA_FRESHNESS_MAX_AGE = 60;

export class OAuth2Authorization {
    protected codeIssuer : IOAuth2AuthorizationCodeIssuer;

    protected sessionManager : ISessionManager;

    protected eventService? : IEventService;

    protected metrics? : IAuthFlowMetrics;

    protected promptLoginMaxAge : number;

    protected mfaFreshnessMaxAge : number;

    protected mfaChallengeProvider? : IUserAuthenticatorChallengeProvider;

    constructor(ctx: OAuth2AuthorizationManagerContext) {
        this.codeIssuer = ctx.codeIssuer;
        this.sessionManager = ctx.sessionManager;
        this.eventService = ctx.eventService;
        this.metrics = ctx.metrics;
        this.promptLoginMaxAge = ctx.promptLoginMaxAge ?? DEFAULT_PROMPT_LOGIN_MAX_AGE;
        this.mfaFreshnessMaxAge = ctx.mfaFreshnessMaxAge ?? DEFAULT_MFA_FRESHNESS_MAX_AGE;
        this.mfaChallengeProvider = ctx.mfaChallengeProvider;
    }

    /**
     * Authorize with validated codeRequest.
     *
     * @param data
     * @param identity
     * @param options
     */
    async authorize(
        data: OAuth2AuthorizationCodeRequest,
        identity: Identity,
        options: OAuth2AuthorizationOptions = {},
    ) : Promise<OAuth2AuthorizationResult> {
        try {
            const result = await this.authorizeInner(data, identity, options);

            await this.eventService?.record({
                scope: EventScope.OAUTH2,
                name: EventName.AUTHORIZE,
                refType: EventRefType.CLIENT,
                refId: options.client?.id ?? data.client_id ?? null,
                clientId: options.client?.id ?? data.client_id ?? null,
                actorType: identity.type,
                actorId: identity.data.id,
                actorName: identity.data.name,
                realmId: data.realm_id ?? null,
                data: {
                    reason: options.client?.built_in ? 'autoConsent' : 'consent',
                    ...(data.scope ? { scope: data.scope } : {}),
                },
            });
            this.metrics?.recordAuthorize('issued');

            return result;
        } catch (e) {
            if (hasInstanceof(e, OAUTH2_LOGIN_REQUIRED_ERROR_INSTANCE)) {
                this.metrics?.recordAuthorize('login_required');
            } else if (hasInstanceof(e, OAUTH2_MFA_REQUIRED_ERROR_INSTANCE)) {
                this.metrics?.recordAuthorize('mfa_required');
            } else {
                this.metrics?.recordAuthorize('error');
            }

            throw e;
        }
    }

    protected async authorizeInner(
        data: OAuth2AuthorizationCodeRequest,
        identity: Identity,
        options: OAuth2AuthorizationOptions = {},
    ) : Promise<OAuth2AuthorizationResult> {
        // OAuth 2.1 posture: only the authorization-code response type is
        // supported — implicit/hybrid (token, id_token, none) were dropped
        // (plan 042 item 3). Defense in depth behind the request validator.
        let responseTypes : string[] = [];
        if (data.response_type) {
            responseTypes = Array.isArray(data.response_type) ?
                data.response_type :
                data.response_type.split(' ');
        }

        for (const responseType of responseTypes) {
            if (responseType !== OAuth2AuthorizationResponseType.CODE) {
                throw OAuth2ResponseTypeError.unsupported();
            }
        }

        if (!responseTypes.includes(OAuth2AuthorizationResponseType.CODE)) {
            throw OAuth2ResponseTypeError.unsupported();
        }

        if (!data.redirect_uri) {
            throw OAuth2GrantError.redirectUriMismatch();
        }

        const output : OAuth2AuthorizationResult = {
            redirectUri: data.redirect_uri,
            ...(data.state ? { state: data.state } : {}),
        };

        if (!identity) {
            throw OAuth2RequestError.identityInvalid();
        }

        // Realm binding: the code-request verifier stamped data.realm_id with the
        // resolved client's realm. The authenticated identity must belong to that
        // same realm — otherwise a lingering session for realm A could silently
        // mint a code/token for realm B's client (confused deputy). The error body
        // deliberately carries no identity data (no realm-enumeration oracle).
        // The comparison reads the scalar realm_id column, NOT the realm
        // relation — the relation may simply not be loaded on the resolved
        // identity. An identity without a realm_id fails closed the same way —
        // clean login_required, never a TypeError.
        if (
            data.realm_id &&
            identity.data.realm_id !== data.realm_id
        ) {
            throw OAuth2LoginRequiredError.realmMismatch();
        }

        // Authentication time = the backing session's creation instant (NOT
        // refreshed_at — a token refresh must not reset it). Session-less flows
        // (e.g. HTTP Basic authorize) present live credentials on this request,
        // so the authentication time is "now".
        const nowSeconds = Math.floor(Date.now() / 1000);
        let authTime = nowSeconds;
        let session : Session | null = null;
        if (options.sessionId) {
            session = await this.sessionManager.findOneById(options.sessionId);
            if (session && session.created_at) {
                authTime = Math.floor(new Date(session.created_at).getTime() / 1000);
            }
        }

        // MFA backstop (plan 049) — the authoritative server-side gate; the
        // hosted UI's challenge step is convenience. The proof is session-bound
        // (mfa_at — stamped by the challenge endpoint or the password grant's
        // otp param), so a session-less flow (HTTP Basic) cannot carry one and
        // fails closed while the user holds a confirmed device. A user without
        // a device under mfaRequired is routed to inline enrollment.
        if (this.mfaChallengeProvider && identity.type === IdentityType.USER) {
            const challenge = await this.mfaChallengeProvider.challenge(identity.data.id);
            if (challenge.required && !session?.mfa_at) {
                throw OAuth2MfaRequiredError.challengeRequired();
            }

            if (challenge.enrollmentRequired) {
                throw OAuth2MfaRequiredError.enrollmentRequired();
            }

            // Step-up (plan 050 stage 3): a requested `acr_values` containing
            // urn:authup:mfa is a TRIGGER (Auth0/Keycloak stance) — the proof
            // must additionally be FRESH (mfaFreshnessMaxAge window, mirroring
            // promptLoginMaxAge's absorb-the-round-trip semantics). Enforced
            // only while the user actually holds a factor — per OIDC Core
            // §5.5.1.1 acr is voluntary, so an unsatisfiable request degrades
            // to the achieved acr instead of bricking the RP.
            if (challenge.required && data.acr_values) {
                const acrValues = data.acr_values.split(' ');
                if (acrValues.includes(OAuth2AuthenticationContextClass.MFA)) {
                    const mfaAtSeconds = session?.mfa_at ?
                        Math.floor(new Date(session.mfa_at).getTime() / 1000) :
                        null;
                    if (mfaAtSeconds === null || nowSeconds - mfaAtSeconds > this.mfaFreshnessMaxAge) {
                        throw OAuth2MfaRequiredError.stepUpRequired();
                    }
                }
            }
        }

        // OIDC §3.1.2.1 prompt=login / max_age freshness (enforced only when
        // requested — a plain authorize never throws here). The hosted page
        // renders the login form for prompt=login; this is the server backstop.
        const prompts = data.prompt ? data.prompt.split(' ') : [];
        if (
            prompts.includes(OAuth2AuthorizationPrompt.LOGIN) &&
            nowSeconds - authTime > this.promptLoginMaxAge
        ) {
            throw OAuth2LoginRequiredError.reauthenticationRequired();
        }

        if (
            typeof data.max_age !== 'undefined' &&
            data.max_age !== null
        ) {
            const maxAge = Number(data.max_age);
            if (
                Number.isFinite(maxAge) &&
                nowSeconds - authTime > maxAge
            ) {
                throw OAuth2LoginRequiredError.reauthenticationRequired();
            }
        }

        // The id_token is NOT minted here — the /token exchange mints it after
        // resolving the real backing session, so its `sid` is authoritative
        // (plan 042 item 6). The code carries the authentication instant.
        const codeEntity : OAuth2AuthorizationCode = await this.codeIssuer.issue(
            data,
            identity,
            {
                sessionId: options.sessionId,
                authTime,
                authMethod: session?.auth_method ?? null,
            },
        );

        output.authorizationCode = codeEntity.id;

        return output;
    }
}
