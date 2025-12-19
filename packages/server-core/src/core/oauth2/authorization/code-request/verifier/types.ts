/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, OAuth2AuthorizationCodeRequest, Scope,
} from '@authup/core-kit';
import type { IOAuth2ClientRepository } from '../../../client';
import type { IOAuth2ScopeRepository } from '../../../scope';

export type OAuth2AuthorizationCodeRequestVerifierContext = {
    clientRepository: IOAuth2ClientRepository,
    scopeRepository: IOAuth2ScopeRepository
};

export type OAuth2AuthorizationCodeRequestVerificationResult = {
    data: OAuth2AuthorizationCodeRequest,

    client: Client,
    scopes: Scope[]
};

export interface IOAuth2AuthorizationCodeRequestVerifier {
    verify(
        data: OAuth2AuthorizationCodeRequest,
    ) : Promise<OAuth2AuthorizationCodeRequestVerificationResult>;
}
