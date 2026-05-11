/*
 * Copyright (c) 2022-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '../constants.ts';
import { markInstanceof } from '@ebec/core';
import { UnauthorizedError } from './unauthorized.ts';

export const AUTH_HEADER_ERROR_INSTANCE = Symbol.for('@authup/errors/AuthHeaderError');

export class AuthHeaderError extends UnauthorizedError {
    constructor(message: string) {
        super({
            code: ErrorCode.HTTP_HEADER_AUTH_TYPE_UNSUPPORTED,
            message,
        });
        markInstanceof(this, AUTH_HEADER_ERROR_INSTANCE);
    }

    static unsupportedType(type: string) {
        return new AuthHeaderError(`The authorization header type ${type} is not supported.`);
    }
}
