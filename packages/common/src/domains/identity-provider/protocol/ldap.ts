/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '../entity';
import type { IdentityProviderProtocol } from '../constants';

export interface LdapIdentityProvider extends IdentityProvider {
    protocol: IdentityProviderProtocol.LDAP | `${IdentityProviderProtocol.LDAP}`;

    connection_url: string;

    dn: string;

    bind_type: string;
}
