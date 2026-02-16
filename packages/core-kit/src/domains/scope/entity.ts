/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '../realm';

export interface Scope {
    id: string;

    built_in: boolean;

    name: string;

    display_name: string | null;

    description: string | null;

    realm_id: Realm['id'] | null;

    realm: Realm | null;

    created_at: string;

    updated_at: string;
}
