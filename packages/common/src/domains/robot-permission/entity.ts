/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionRelation } from '../permission';
import { Robot } from '../robot';
import { Realm } from '../realm';

export interface RobotPermission extends PermissionRelation {
    id: string;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    robot_id: string;

    robot: Robot;

    robot_realm_id: Realm['id'] | null;

    robot_realm: Realm | null;
}
