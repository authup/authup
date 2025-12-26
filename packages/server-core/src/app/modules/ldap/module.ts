/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LdapClientFactory } from '../../../adapters/shared/ldap/index.ts';
import type { Module } from '../types.ts';
import { LDAPInjectionKey } from './constants.ts';
import type { IDIContainer } from '../../../core/index.ts';

export class LdapModule implements Module {
    async start(container: IDIContainer): Promise<void> {
        container.register(LDAPInjectionKey.ClientFactory, {
            useFactory: () => new LdapClientFactory(),
        });
    }
}
