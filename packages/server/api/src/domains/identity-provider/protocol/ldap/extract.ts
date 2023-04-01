/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LdapIdentityProvider } from '@authup/common';
import { OpenIDConnectIdentityProvider } from '@authup/common';

export function extractLdapIdentityProviderProtocolAttributes(
    input: unknown,
) : Partial<LdapIdentityProvider> {
    if (typeof input !== 'object' || input === null) {
        return {};
    }

    return {};
}
