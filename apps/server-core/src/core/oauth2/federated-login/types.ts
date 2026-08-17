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
import type { OAuth2ErrorCode } from '@authup/specs';
import type { Logger } from '@authup/server-kit';
import type { IIdentityProviderAccountManager } from '../../identity/provider/account/types.ts';
import type { IOAuth2Authenticator } from '../../identity/provider/authentication/protocols/index.ts';
import type { IEventService, IRealmRepository } from '../../entities/index.ts';
import type { IOAuth2AccessPolicyEvaluator } from '../access-policy/index.ts';
import type {
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
} from '../authorization/index.ts';

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
     * The verified redirect target of the RP. Its scheme passed
     * `isSafeRedirectURLScheme`, so a caller may navigate it.
     */
    redirectUri: string,
    /**
     * The authorization code id the RP redeems at `/token`.
     */
    code: string,
    state?: string,
    /**
     * The verified request, for a caller that has to re-render the hosted
     * page alongside the redirect (the custom-scheme interstitial).
     */
    codeRequest: OAuth2AuthorizationCodeRequest,
    client: {
        id: string,
        name: string,
        displayName: string | null,
    },
};

export type OAuth2FederatedLoginCompleteResult =    OAuth2FederatedLoginRefusedResult |
    OAuth2FederatedLoginIssuedResult;

/**
 * Completes the RP's original authorization request after an external
 * provider sent the browser back (issue #3446). It owns the refusal ladder
 * — realm match, code-request re-verification, redirect-scheme gate,
 * provider and user state, access policy — and mints the authup code.
 *
 * Deliberately transport-free: it decides WHAT the answer is, and returns
 * it as a discriminated result. The adapter decides how that answer
 * reaches the browser (a redirect, or the interstitial page a custom
 * scheme needs), because only the adapter knows the difference.
 */
export interface IOAuth2FederatedLoginService {
    complete(input: OAuth2FederatedLoginCompleteInput) : Promise<OAuth2FederatedLoginCompleteResult>;
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
    codeIssuer: IOAuth2AuthorizationCodeIssuer,

    accessPolicyEvaluator?: IOAuth2AccessPolicyEvaluator,
    eventService?: IEventService,
    logger?: Logger,
    authenticatorFactory?: OAuth2FederatedLoginAuthenticatorFactory,
};
