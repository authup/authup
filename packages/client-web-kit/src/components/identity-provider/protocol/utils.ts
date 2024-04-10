/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderProtocol } from '@authup/core-kit';
import type { IdentityProviderProtocolElement } from './type';

const elements = {
    [IdentityProviderProtocol.OAUTH2]: {
        name: 'OAuth2', icon: 'fa fa-lock',
    },
    [IdentityProviderProtocol.OIDC]: {
        name: 'OpenID Connect', icon: 'fas fa-id-card',
    },
    [IdentityProviderProtocol.LDAP]: {
        name: 'LDAP', icon: 'fas fa-sitemap',
    },
};

export function getIdentityProviderProtocolElement(
    id: `${IdentityProviderProtocol}`,
) : IdentityProviderProtocolElement | undefined {
    return elements[id];
}
