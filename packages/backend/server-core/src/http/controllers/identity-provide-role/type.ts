/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { IdentityProviderRole } from '@authelion/common';
import { ExpressValidationResult } from '../../express-validation';
import { IdentityProviderEntity, RoleEntity } from '../../../domains';

export type OAuth2ProviderRoleValidationResult = ExpressValidationResult<IdentityProviderRole, {
    provider?: IdentityProviderEntity,
    role?: RoleEntity
}>;
