/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserAttribute } from '@authelion/common';
import { ExpressValidationResult } from '../../express-validation';
import { RealmEntity, UserEntity } from '../../../domains';

export type UserAttributeValidationResult = ExpressValidationResult<UserAttribute, {
    realm?: RealmEntity,
    user?: UserEntity
}>;
