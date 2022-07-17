/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2Client } from '@authelion/common';
import { ExpressValidationResult } from '../../express-validation';
import { RealmEntity } from '../../../domains';

export type OAuth2ClientValidationResult = ExpressValidationResult<OAuth2Client, {
    realm?: RealmEntity
}>;
