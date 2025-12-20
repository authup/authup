/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Realm } from '../realm';
import type { User } from '../user';
import type { Robot } from '../robot';

export interface OAuth2RefreshToken {
    /**
     * JTI
     */
    id: string;

    expires: string;

    scope: string | null;

    access_token: string | null;

    // ------------------------------------------------------------------

    client_id: Client['id'] | null;

    client: Client | null;

    user_id: User['id'] | null,

    user: User | null,

    robot_id: Robot['id'] | null,

    robot: Robot | null,

    realm_id: Realm['id'];

    realm: Realm;
}
