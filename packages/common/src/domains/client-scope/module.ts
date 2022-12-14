/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '../client';
import { Scope } from '../scope';

export interface ClientScope {
    id: string;

    default: boolean;

    client_id: Client['id'];
    client: Client;

    scope_id: Scope['id'];
    scope: Scope;
}
