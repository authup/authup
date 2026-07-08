/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { StatusResponseFeatures } from '@authup/core-http-kit';
import type {
    IIdentityResolver,
    IOAuth2AuthorizationCodeIssuer,
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2OpenIDTokenIssuer,
    ISessionManager,
} from '../../../../../core/index.ts';

export type AuthorizeControllerOptions = {
    baseURL: string;
    features: StatusResponseFeatures;
    /**
     * Max age (seconds) a `prompt=login` request accepts before forcing re-auth
     * (config `promptLoginMaxAge`).
     */
    promptLoginMaxAge?: number;
};

export type AuthorizeControllerContext = {
    options: AuthorizeControllerOptions,

    openIdTokenIssuer: IOAuth2OpenIDTokenIssuer,

    codeIssuer: IOAuth2AuthorizationCodeIssuer,
    codeRequestVerifier: IOAuth2AuthorizationCodeRequestVerifier,

    identityResolver: IIdentityResolver,
    sessionManager: ISessionManager
};
