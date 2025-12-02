/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2AuthorizeCodeRequest } from '@authup/core-kit';
import type { IOAuth2ClientRepository } from '../../../client';
import type { IOAuth2ClientScopeRepository } from '../../../client-scope';
import type { OAuth2AuthorizationCodeRequestContainer } from '../../types';

export type OAuth2AuthorizationCodeRequestVerifierContext = {
    clientRepository: IOAuth2ClientRepository,
    clientScopeRepository: IOAuth2ClientScopeRepository
};

export interface IOAuth2AuthorizationCodeRequestVerifier {
    verify(
        data: OAuth2AuthorizeCodeRequest,
    ) : Promise<OAuth2AuthorizationCodeRequestContainer>;
}
