/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { Role } from '../role';
import { User } from '../user';

export interface UserRole {
    id: string;

    user_id: string;

    role_id: string;

    // ------------------------------------------------------------------

    role: Role;

    user: User;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}
