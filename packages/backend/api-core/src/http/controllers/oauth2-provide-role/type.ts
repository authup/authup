/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2ProviderRole } from '@authelion/common';
import { ExpressValidationResult } from '../../express-validation';
import { OAuth2ProviderEntity, RoleEntity } from '../../../domains';

export type OAuth2ProviderRoleValidationResult = ExpressValidationResult<OAuth2ProviderRole, {
    provider?: OAuth2ProviderEntity,
    role?: RoleEntity
}>;
