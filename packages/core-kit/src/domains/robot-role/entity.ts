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

    robotId: string;

    roleId: string;

    // ------------------------------------------------------------------

    role: Role;

    roleRealmId: Realm['id'] | null;

    roleRealm: Realm | null;

    robot: Robot;

    robotRealmId: Realm['id'] | null;

    robotRealm: Realm | null;

    // ------------------------------------------------------------------

    createdAt: string;

    updatedAt: string;
}
