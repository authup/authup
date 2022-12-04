/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OpenIDConnectIdentityProvider } from '@authup/common';
import { extractOAuth2IdentityProviderProtocolAttributes } from '../oauth2';

export function extractOidcConnectIdentityProviderProtocolAttributes(
    input: unknown,
) : Partial<OpenIDConnectIdentityProvider> {
    if (typeof input !== 'object' || input === null) {
        return {};
    }

    return extractOAuth2IdentityProviderProtocolAttributes(input);
}
