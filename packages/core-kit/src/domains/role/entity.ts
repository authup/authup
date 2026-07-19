/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';

export interface Role {
    id: string;

    builtIn: boolean;

    name: string;

    displayName: string | null;

    target: string | null;

    description: string | null;

    // ------------------------------------------------------------------

    clientId: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------
    realmId: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
