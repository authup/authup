/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type {
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationStateManager,
    IOAuth2TokenIssuer,
} from '../../../../../core';

export type IdentityProviderControllerOptions = {
    codeRequestVerifier: IOAuth2AuthorizationCodeRequestVerifier,
    stateManager: IOAuth2AuthorizationStateManager,

    accessTokenIssuer: IOAuth2TokenIssuer,
    refreshTokenIssuer: IOAuth2TokenIssuer,
};
