/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IEntityAPISlim } from '../../types-base';

import type { RobotRole } from '@authup/core-kit';

// Mirrors `RobotRoleValidator` mounts in @authup/core-kit.
export type RobotRoleCreatePayload = Pick<RobotRole, 'robotId' | 'roleId'>;

export interface IRobotRoleAPI extends IEntityAPISlim<RobotRole, RobotRoleCreatePayload> {}
