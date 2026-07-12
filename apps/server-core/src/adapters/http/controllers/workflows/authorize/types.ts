/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { StatusResponseFeatures } from '@authup/core-http-kit';
import type {
    IAuthFlowMetrics,
    IEventService,
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    ISessionManager,
    IUserAuthenticatorChallengeProvider,
} from '../../../../../core/index.ts';

export type AuthorizeControllerOptions = {
    baseURL: string;
    features: StatusResponseFeatures;
    /**
     * Max age (seconds) a `prompt=login` request accepts before forcing re-auth
     * (config `promptLoginMaxAge`).
     */
    promptLoginMaxAge?: number;
    /**
     * Max age (seconds) of the session's mfa_at an acr_values step-up request
     * accepts before forcing a fresh challenge (config `mfaFreshnessMaxAge`).
     */
    mfaFreshnessMaxAge?: number;
};

export type AuthorizeControllerContext = {
    options: AuthorizeControllerOptions,

    codeIssuer: IOAuth2AuthorizationCodeIssuer,
    codeRequestVerifier: IOAuth2AuthorizationCodeRequestVerifier,

    sessionManager: ISessionManager,

    eventService?: IEventService,
    metrics?: IAuthFlowMetrics,

    mfaChallengeProvider?: IUserAuthenticatorChallengeProvider,
};
