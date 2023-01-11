/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '../client';
import { Realm } from '../realm';
import { User } from '../user';
import { Robot } from '../robot';

export interface OAuth2RefreshToken {
    id: string;

    expires: string;

    scope: string | null;

    // ------------------------------------------------------------------

    client_id: Client['id'] | null;

    client: Client | null;

    user_id: User['id'] | null,

    user: User | null,

    robot_id: Robot['id'] | null,

    robot: Robot | null,

    access_token: string | null;

    realm_id: Realm['id'];

    realm: Realm;
}
