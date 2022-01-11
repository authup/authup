/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Realm } from '../realm';

export interface User {
    id: string;

    name: string;

    name_locked: boolean;

    first_name: string | null;

    last_name: string | null;

    display_name: string;

    email: string | null;

    password: string | null;

    // ------------------------------------------------------------------

    reset_hash: string | null;

    reset_at: Date | null;

    reset_expires: Date | null;

    // ------------------------------------------------------------------

    status: string | null;

    status_message: string | null;

    // ------------------------------------------------------------------

    active: boolean;

    activate_hash: string | null;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    realm_id: string;

    realm: Realm;
}
