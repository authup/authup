/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RobotPermission } from '@authelion/common';
import { ExpressValidationResult } from '../../express-validation';
import { PermissionEntity, RobotEntity } from '../../../domains';

export type RobotPermissionValidationResult = ExpressValidationResult<RobotPermission, {
    robot?: RobotEntity,
    permission?: PermissionEntity
}>;
