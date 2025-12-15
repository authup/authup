/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LdapClientFactory } from '../../../adapters/ldap';
import type { DependencyContainer } from '../../../core';
import type { ApplicationModule } from '../types';
import { LDAPInjectionKey } from './constants';

export class LdapModule implements ApplicationModule {
    protected container : DependencyContainer;

    // ----------------------------------------------------

    constructor(container: DependencyContainer) {
        this.container = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        this.container.register(LDAPInjectionKey.ClientFactory, {
            useFactory: () => new LdapClientFactory(),
        });
    }
}
