/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, ErrorOptions, mergeErrorOptions } from '@typescript-error/http';
import { ErrorCode } from '../constants';

export class TokenInvalidError extends BadRequestError {
    constructor(options?: ErrorOptions) {
        super(mergeErrorOptions({
            code: ErrorCode.TOKEN_INVALID,
            message: 'The Token is invalid.',
        }, (options || {})));
    }
}
