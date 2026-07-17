/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionRelation } from '../permission';
import type { Robot } from '../robot';
import type { Realm } from '../realm';

export interface RobotPermission extends PermissionRelation {
    id: string;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;

    // ------------------------------------------------------------------

    robotId: string;

    robot: Robot;

    robotRealmId: Realm['id'] | null;

    robotRealm: Realm | null;
}
