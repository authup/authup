/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, ClientScope, OAuth2AuthorizationCodeRequest } from '@authup/core-kit';
import type { IOAuth2ClientRepository } from '../../../client';
import type { IOAuth2ClientScopeRepository } from '../../../client-scope';

export type OAuth2AuthorizationCodeRequestVerifierContext = {
    clientRepository: IOAuth2ClientRepository,
    clientScopeRepository: IOAuth2ClientScopeRepository
};

export type OAuth2AuthorizationCodeRequestVerificationResult = {
    data: OAuth2AuthorizationCodeRequest,

    client: Client,
    clientScopes: ClientScope[]
};

export interface IOAuth2AuthorizationCodeRequestVerifier {
    verify(
        data: OAuth2AuthorizationCodeRequest,
    ) : Promise<OAuth2AuthorizationCodeRequestVerificationResult>;
}
