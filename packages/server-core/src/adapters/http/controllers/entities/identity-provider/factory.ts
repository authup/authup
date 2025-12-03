/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { container } from 'tsyringe';
import type {
    IOAuth2AuthorizationCodeRequestVerifier,
    IOAuth2AuthorizationStateManager,
    IOAuth2TokenIssuer,
} from '../../../../../core';
import {
    OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN,
    OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN,

    OAUTH2_AUTHORIZATION_STATE_MANAGER_TOKEN,
    OAUTH2_REFRESH_TOKEN_ISSUER_TOKEN,
} from '../../../../../core';
import { IdentityProviderController } from './module';

export function createIdentityProviderController() {
    const codeRequestVerifier = container.resolve<IOAuth2AuthorizationCodeRequestVerifier>(
        OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN,
    );

    const stateManager = container.resolve<IOAuth2AuthorizationStateManager>(
        OAUTH2_AUTHORIZATION_STATE_MANAGER_TOKEN,
    );

    const accessTokenIssuer = container.resolve<IOAuth2TokenIssuer>(OAUTH2_ACCESS_TOKEN_ISSUER_TOKEN);
    const refreshTokenIssuer = container.resolve<IOAuth2TokenIssuer>(OAUTH2_REFRESH_TOKEN_ISSUER_TOKEN);

    return new IdentityProviderController({
        codeRequestVerifier,
        stateManager,

        accessTokenIssuer,
        refreshTokenIssuer,
    });
}
