/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Permission } from '../permission';
import { User } from '../user';

export interface UserPermission {
    id: string;

    power: number;

    condition: any | null;

    fields: string[] | null;

    negation: boolean;

    target: string | null;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    user_id: User['id'];

    user: User;

    permission_id: Permission['id'];

    permission: Permission;
}
