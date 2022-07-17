/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2AuthorizationCodeRequest } from '@authelion/common';
import { ExpressValidationResult } from '../../../express-validation';
import { OAuth2ClientEntity } from '../../../../domains';

export type AuthorizeValidationResult = ExpressValidationResult<OAuth2AuthorizationCodeRequest, {
    client?: OAuth2ClientEntity
}>;
