/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, OAuth2AuthorizationCodeRequest, Scope } from '@authup/core-kit';
import type { IOAuth2ClientRepository } from '../../../client/index.ts';
import type { IOAuth2ScopeRepository } from '../../../scope/index.ts';

export type OAuth2AuthorizationCodeRequestVerifierContext = {
    clientRepository: IOAuth2ClientRepository,
    scopeRepository: IOAuth2ScopeRepository
};

export type OAuth2AuthorizationCodeRequestVerificationResult = {
    data: OAuth2AuthorizationCodeRequest,

    client: Client,
    scopes: Scope[],

    /**
     * True when the request `redirect_uri` was matched against a registered,
     * non-null client pattern. A pattern-less (null `redirect_uri`) client lets
     * any supplied `redirect_uri` through unverified — consumers must NOT
     * automatically redirect to it (open-redirect guard).
     */
    redirectUriVerified: boolean
};

export interface IOAuth2AuthorizationCodeRequestVerifier {
    verify(
        data: OAuth2AuthorizationCodeRequest,
    ) : Promise<OAuth2AuthorizationCodeRequestVerificationResult>;
}
