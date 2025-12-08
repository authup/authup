/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { container } from 'tsyringe';
import { LdapClientFactory } from '../../adapters/ldap';
import { LDAP_CLIENT_FACTORY_TOKEN } from '../../core';

export function registerLdapDependencyInjections() {
    container.register(LDAP_CLIENT_FACTORY_TOKEN, {
        useFactory: () => new LdapClientFactory(),
    });
}
