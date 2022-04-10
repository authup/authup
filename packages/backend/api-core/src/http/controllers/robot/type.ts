/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Robot } from '@authelion/common';
import { ExpressValidationResult } from '../../express-validation';
import { RealmEntity } from '../../../domains';

export type RobotValidationResult = ExpressValidationResult<Robot, {
    realm?: RealmEntity
}>;
