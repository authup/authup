/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '../user';
import type { Realm } from '../realm';

export interface UserAttribute {
    id: string;

    name: string;

    value: string | null;

    // ------------------------------------------------------------------

    userId: User['id'];

    user: User;

    realmId: Realm['id'];

    realm: Realm;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
