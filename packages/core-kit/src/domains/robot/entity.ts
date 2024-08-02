/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EventPayload } from '@authup/kit';
import type { Client } from '../client';
import type { DomainType } from '../contstants';
import type { Realm } from '../realm';
import type { User } from '../user';

export interface Robot {
    id: string;

    secret: string;

    name: string;

    display_name: string | null;

    description: string;

    active: boolean;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    user_id: User['id'] | null;

    user: User | null;

    // ------------------------------------------------------------------

    client_id: Client['id'] | null;

    client: Client | null;

    // ------------------------------------------------------------------

    realm_id: Realm['id'];

    realm: Realm;
}

export type RobotEventContext = EventPayload & {
    type: `${DomainType.ROBOT}`,
    data: Robot
};
