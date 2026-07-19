/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';
import type { User } from '../user';

export interface Robot {
    id: string;

    secret: string;

    name: string;

    displayName: string | null;

    description: string;

    active: boolean;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;

    // ------------------------------------------------------------------

    userId: User['id'] | null;

    user: User | null;

    // ------------------------------------------------------------------

    clientId: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realmId: Realm['id'];

    realm: Realm;
}
