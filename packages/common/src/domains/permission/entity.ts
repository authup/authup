/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Realm } from '../realm';

export interface Permission {
    id: string;

    built_in: boolean;

    name: string;

    description: string | null;

    target: string | null;

    // ------------------------------------------------------------------

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;
}
