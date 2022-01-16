/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@typescript-error/http';
import { ErrorCode } from '../constants';

export class TokenSubKindInvalidError extends BadRequestError {
    constructor() {
        super({
            code: ErrorCode.TOKEN_SUB_KIND_INVALID,
            message: 'The token sub kind is not valid.',
        });
    }
}
