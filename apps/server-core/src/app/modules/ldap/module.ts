/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LdapClientFactory } from '../../../adapters/shared/ldap/index.ts';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import { LDAPInjectionKey } from './constants.ts';
import type { IContainer } from 'eldin';

export class LdapModule implements IModule {
    readonly name: string;

    constructor() {
        this.name = ModuleName.LDAP;
    }

    async setup(container: IContainer): Promise<void> {
        container.register(LDAPInjectionKey.ClientFactory, { useFactory: () => new LdapClientFactory() });
    }
}
