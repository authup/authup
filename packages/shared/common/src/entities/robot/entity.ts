/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Realm } from '../realm';
import { User } from '../user';

export interface Robot {
    id: string;

    secret: string;

    name: string;

    description: string;

    active: boolean;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    user_id: User['id'] | null;

    user: User | null;

    realm_id: Realm['id'];

    realm: Realm;
}
