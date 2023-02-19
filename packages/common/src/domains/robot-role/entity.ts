/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '../role';
import type { Robot } from '../robot';
import type { Realm } from '../realm';

export interface RobotRole {
    id: string;

    robot_id: string;

    role_id: string;

    // ------------------------------------------------------------------

    role: Role;

    role_realm_id: Realm['id'] | null;

    role_realm: Realm | null;

    robot: Robot;

    robot_realm_id: Realm['id'] | null;

    robot_realm: Realm | null;

    // ------------------------------------------------------------------

    created_at: string;

    updated_at: string;
}
