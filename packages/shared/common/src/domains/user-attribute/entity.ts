/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '../user';
import { Realm } from '../realm';

export interface UserAttribute {
    id: string;

    key: string;

    value: string | null;

    // ------------------------------------------------------------------

    user_id: User['id'];

    user: User;

    realm_id: Realm['id'];

    realm: Realm;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}
