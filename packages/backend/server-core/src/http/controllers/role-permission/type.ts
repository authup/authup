/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { RolePermission } from '@authelion/common';
import { ExpressValidationResult } from '../../express-validation';
import { PermissionEntity, RoleEntity } from '../../../domains';

export type RolePermissionValidationResult = ExpressValidationResult<RolePermission, {
    role?: RoleEntity,
    permission?: PermissionEntity
}>;
