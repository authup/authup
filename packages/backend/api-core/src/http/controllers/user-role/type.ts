/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserRole } from '@authelion/common';
import { ExpressValidationResult } from '../../express-validation';
import { RoleEntity, UserEntity } from '../../../domains';

export type UserRoleValidationResult = ExpressValidationResult<UserRole, {
    user?: UserEntity,
    role?: RoleEntity
}>;
