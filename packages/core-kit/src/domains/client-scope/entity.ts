/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';
import type { Scope } from '../scope';

export interface ClientScope {
    id: string;

    default: boolean;

    client_id: Client['id'];
    client: Client;

    client_realm_id: Realm['id'] | null;
    client_realm: Realm | null;

    scope_id: Scope['id'];
    scope: Scope;

    scope_realm_id: Realm['id'] | null;
    scope_realm: Realm | null;
}
