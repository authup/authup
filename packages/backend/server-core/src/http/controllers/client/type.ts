/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ExpressValidationResult } from '../../express-validation';
import { OAuth2ClientEntity, RealmEntity } from '../../../domains';

export type OAuth2ClientValidationResult = ExpressValidationResult<OAuth2ClientEntity, {
    realm?: RealmEntity
}>;
