/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RobotRole } from '@authup/core-kit';

// Mirrors `RobotRoleValidator` mounts in @authup/core-kit.
export type RobotRoleCreatePayload = Pick<RobotRole, 'robot_id' | 'role_id'>;
