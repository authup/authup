/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { container } from 'tsyringe';
import type { IOAuth2AuthorizationCodeRequestVerifier } from '../../../../../core';
import {
    OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN,
} from '../../../../../core';
import { IdentityProviderController } from './module';

export function createIdentityProviderController() {
    const codeRequestVerifier = container.resolve<IOAuth2AuthorizationCodeRequestVerifier>(
        OAUTH2_AUTHORIZATION_CODE_REQUEST_VERIFIER_TOKEN,
    );

    return new IdentityProviderController({
        codeRequestVerifier,
    });
}
