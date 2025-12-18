/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ILdapClient, ILdapClientFactory } from '../../../core';
import { LdapClient } from './module';
import type { LdapClientOptions } from './types';

export class LdapClientFactory implements ILdapClientFactory {
    create(options: LdapClientOptions): ILdapClient {
        return new LdapClient(options);
    }
}
