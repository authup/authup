/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserPermission } from '@authelion/common';
import { ExpressValidationResult } from '../../express-validation';
import { PermissionEntity, UserEntity } from '../../../domains';

export type UserPermissionValidationResult = ExpressValidationResult<UserPermission, {
    user?: UserEntity,
    permission?: PermissionEntity
}>;
