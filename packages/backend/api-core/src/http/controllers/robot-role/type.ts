/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RobotRole } from '@authelion/common';
import { ExpressValidationResult } from '../../express-validation';
import { RobotEntity, RoleEntity } from '../../../domains';

export type RobotRoleValidationResult = ExpressValidationResult<RobotRole, {
    robot?: RobotEntity,
    role?: RoleEntity
}>;
