/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OpenIDConnectIdentityProvider } from '@authelion/common';
import { validateOAuth2IdentityProviderProtocol } from '../oauth2';

export function validateOidcIdentityProviderProtocol(
    entity: Partial<OpenIDConnectIdentityProvider>,
) : Partial<OpenIDConnectIdentityProvider> {
    validateOAuth2IdentityProviderProtocol(entity);

    return entity;
}
