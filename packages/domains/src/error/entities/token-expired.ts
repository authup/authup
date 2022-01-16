/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@typescript-error/http';
import { ErrorCode } from '../constants';

export class TokenExpiredError extends BadRequestError {
    constructor() {
        super({
            code: ErrorCode.TOKEN_EXPIRED,
            message: 'The token has been expired.',
        });
    }
}
