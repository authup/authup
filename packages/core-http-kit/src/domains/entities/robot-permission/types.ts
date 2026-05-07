/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RobotPermission } from '@authup/core-kit';

// Mirrors `RobotPermissionValidator` mounts in @authup/core-kit.
export type RobotPermissionCreatePayload =    & Pick<RobotPermission, 'robot_id' | 'permission_id'> &
    Partial<Pick<RobotPermission, 'policy_id'>>;
export type RobotPermissionUpdatePayload = Partial<RobotPermissionCreatePayload>;
