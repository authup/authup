/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DN, SearchOptions } from 'ldapjs';

export interface ILdapClient {
    connected : boolean;

    connect() : Promise<void>;

    bind(user?: string, password?: string) : Promise<void>;

    unbind() : Promise<void>;

    add(name: string, data: Record<string, any>) : Promise<void>;

    del(name: string) : Promise<void>;

    modify(name: string, data: Record<string, any>) : Promise<void>;

    search(options: SearchOptions, dn?: string) : Promise<Record<string, any>[]>;

    resolveDn(...input: (string | undefined)[]) : string | undefined;

    isDn(input: string | DN) : boolean;
}
