/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventPayload } from '@authup/kit';
import type { Client } from '../client';
import type { DomainType } from '../contstants';
import type { Scope } from '../scope';

export interface ClientScope {
    id: string;

    default: boolean;

    client_id: Client['id'];
    client: Client;

    scope_id: Scope['id'];
    scope: Scope;
}

export type ClientScopeEventContext = EventPayload & {
    type: `${DomainType.CLIENT_SCOPE}`,
    data: ClientScope
};
