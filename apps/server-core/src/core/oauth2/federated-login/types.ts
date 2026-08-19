/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    OAuth2AuthorizationCodeRequest,
    OAuth2IdentityProvider,
    OpenIDIdentityProvider, 
    User, 
} from '@authup/core-kit';
import type { OAuth2ErrorCode, OAuth2TokenGrantResponse } from '@authup/specs';
import type { Logger } from '@authup/server-kit';
import type { IIdentityProviderAccountManager } from '../../identity/provider/account/types.ts';
import type { IOAuth2Authenticator } from '../../identity/provider/authentication/protocols/index.ts';
import type { IEventService, IRealmRepository } from '../../entities/index.ts';
import type { ISessionManager } from '../../authentication/index.ts';
import type { IAuthFlowMetrics } from '../../metrics/index.ts';
import type { IOAuth2TokenIssuer } from '../token/index.ts';
import type { IOAuth2AccessPolicyEvaluator } from '../access-policy/index.ts';
import type { IOAuth2AuthorizationCodeRequestVerifier } from '../authorization/index.ts';

export type OAuth2FederatedLoginCompleteInput = {
    /**
     * The provider the callback belongs to, already resolved and
     * protocol-checked by the caller.
     */
    provider: OAuth2IdentityProvider | OpenIDIdentityProvider,
    /**
     * The RP's original authorization request, as `authorize-out` stored
     * it on the state blob. It is re-verified here rather than trusted.
     */
    codeRequest: OAuth2AuthorizationCodeRequest,
    /**
     * The provider's single-use authorization code.
     */
    code: string,
    request?: {
        ipAddress?: string | null,
        userAgent?: string | null,
    },
};

/**
 * Why a completion was refused. Every value is a REFUSAL — a decision the
 * person at the browser has to be told about on the hosted login page —
 * never a server failure, which keeps throwing.
 */
export enum OAuth2FederatedLoginRefusal {
    /**
     * The stored code request no longer verifies (client deactivated or
     * unknown, grant allowlist, scopes, redirect_uri mismatch). The hosted
     * page re-runs the same verifier and renders the same refusal, so
     * nothing is echoed and the bounce carries no marker.
     */
    CODE_REQUEST = 'codeRequest',
    /**
     * The provider was disabled while the person was away at it.
     */
    PROVIDER_DISABLED = 'providerDisabled',
    /**
     * The linked local user is inactive. The local login path refuses one
     * too, and a federated login must not be the way around that.
     */
    USER_INACTIVE = 'userInactive',
    /**
     * The client's access policy denied the identity (plan 052).
     */
    ACCESS_DENIED = 'accessDenied',
}

export type OAuth2FederatedLoginRefusedResult = {
    kind: 'refused',
    refusal: OAuth2FederatedLoginRefusal,
    /**
     * The marker the hosted authorize page maps onto its own copy, when
     * the refusal has one. Absent means "render the request again", which
     * re-runs the verifier and states the reason itself.
     */
    error?: `${OAuth2ErrorCode}`,
    /**
     * The request to re-render. The verified copy when re-verification got
     * that far, else the stored one.
     */
    codeRequest: OAuth2AuthorizationCodeRequest,
};

export type OAuth2FederatedLoginIssuedResult = {
    kind: 'issued',
    /**
     * Identifies the pending login the hosted authorize page completes. The
     * caller puts it in a cookie; it is never a URL parameter. No token and no
     * authorization code: the application's code is issued at the end of the
     * hosted ladder, once the prompt gates and consent have run.
     */
    pendingLoginId: string,
    /**
     * The verified request, which the caller re-renders on the hosted
     * page alongside it.
     */
    codeRequest: OAuth2AuthorizationCodeRequest,
};

/**
 * What a pending login holds. Three scalars, never the identity object (which
 * carries the provider entity incl. its EA-loaded clientSecret and the raw
 * external token payload) and never a token.
 */
export type OAuth2FederatedLoginPending = {
    sessionId: string,
    /**
     * The provider the login was started at. The completion endpoint is
     * provider-scoped, so a pending login cannot be completed at another.
     */
    providerId: string,
    /**
     * Actor name for the LOGIN security event.
     */
    userName?: string | null,
};

export interface IOAuth2FederatedLoginStore {
    /**
     * @returns the id of the pending login
     */
    save(data: OAuth2FederatedLoginPending) : Promise<string>;

    /**
     * Reads and DROPS it. Single use: one pending login completes once.
     */
    consume(id: string) : Promise<OAuth2FederatedLoginPending | null>;
}

export type OAuth2FederatedLoginCompleteHandoffInput = {
    /**
     * From the cookie the callback set on this browser.
     */
    pendingLoginId: string,
    /**
     * The provider the completion endpoint was addressed at.
     */
    providerId: string,
};

export type OAuth2FederatedLoginCompleteResult =    OAuth2FederatedLoginRefusedResult |
    OAuth2FederatedLoginIssuedResult;

/**
 * Completes the external leg of a federated login after a provider sent
 * the browser back (issue #3446). It owns the refusal ladder: realm match,
 * code-request re-verification, redirect-scheme gate, provider and user
 * state, access policy.
 *
 * It does NOT mint the RP's authorization code. It establishes the authup
 * session and hands the browser a cookie naming it; the hosted authorize
 * page completes it and runs the same ladder a password login runs before
 * any code is issued (plan 094).
 *
 * Deliberately transport-free: it decides WHAT the answer is, and returns
 * it as a discriminated result. The adapter decides how that answer
 * reaches the browser.
 */
export interface IOAuth2FederatedLoginService {
    complete(input: OAuth2FederatedLoginCompleteInput) : Promise<OAuth2FederatedLoginCompleteResult>;

    /**
     * Exchange the pending login for the grant of the session the callback
     * established. Refuses without detail: the caller is anonymous.
     *
     * The local second factor is deliberately NOT gated here: an external
     * provider authenticated this login and is where MFA is enforced for it.
     * An application that asks for one explicitly (`acr_values`) still steps
     * up at `POST /authorize`.
     *
     * @throws BadRequestError
     */
    completeHandoff(input: OAuth2FederatedLoginCompleteHandoffInput) : Promise<OAuth2TokenGrantResponse>;
}

export type OAuth2FederatedLoginServiceOptions = {
    /**
     * The public base URL. Reaches the provider authenticator, which
     * builds the callback URL the external token exchange must repeat.
     */
    baseURL: string,
};

/**
 * Builds the authenticator that exchanges the provider's code. Injected
 * rather than constructed inline so the refusal ladder can be exercised
 * without an external provider; it defaults to the real preset/protocol
 * factory.
 */
export type OAuth2FederatedLoginAuthenticatorFactory = (
    provider: OAuth2IdentityProvider | OpenIDIdentityProvider,
    options: {
        baseURL: string, 
        clientId?: string, 
        logger?: Logger 
    },
) => IOAuth2Authenticator<User>;

export type OAuth2FederatedLoginServiceContext = {
    options: OAuth2FederatedLoginServiceOptions,

    accountManager: IIdentityProviderAccountManager,
    realmRepository: IRealmRepository,
    codeRequestVerifier: IOAuth2AuthorizationCodeRequestVerifier,

    sessionManager: ISessionManager,
    pendingLoginStore: IOAuth2FederatedLoginStore,
    accessTokenIssuer: IOAuth2TokenIssuer,
    refreshTokenIssuer: IOAuth2TokenIssuer,

    accessPolicyEvaluator?: IOAuth2AccessPolicyEvaluator,
    eventService?: IEventService,
    metrics?: IAuthFlowMetrics,
    logger?: Logger,
    authenticatorFactory?: OAuth2FederatedLoginAuthenticatorFactory,
};
