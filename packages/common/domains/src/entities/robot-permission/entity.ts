/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Permission } from '../permission';
import { Robot } from '../robot';

export interface RobotPermission {
    id: string;

    power: number;

    condition: any | null;

    fields: string[] | null;

    negation: boolean;

    // ------------------------------------------------------------------

    created_at: Date;

    updated_at: Date;

    // ------------------------------------------------------------------

    robot_id: string;

    robot: Robot;

    permission_id: string;

    permission: Permission;
}
