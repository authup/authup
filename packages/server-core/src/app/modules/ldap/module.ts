/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LdapClientFactory } from '../../../adapters/shared/ldap';
import type { Module } from '../types';
import { LDAPInjectionKey } from './constants';
import type { IDIContainer } from '../../../core';

export class LdapModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        container.register(LDAPInjectionKey.ClientFactory, {
            useFactory: () => new LdapClientFactory(),
        });
    }
}
