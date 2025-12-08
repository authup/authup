/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderProtocol } from '../constants';
import { IdentityProviderPreset } from './constants';

export function getIdentityProviderProtocolForPreset(
    id: string,
) : `${IdentityProviderProtocol}` | null {
    switch (id) {
        case IdentityProviderPreset.GITHUB:
        case IdentityProviderPreset.GITLAB:
        case IdentityProviderPreset.GOOGLE:
        case IdentityProviderPreset.FACEBOOK:
        case IdentityProviderPreset.INSTAGRAM:
        case IdentityProviderPreset.PAYPAL:
        case IdentityProviderPreset.STACKOVERFLOW:
        case IdentityProviderPreset.TWITTER:
            return IdentityProviderProtocol.OIDC;
    }

    return null;
}
