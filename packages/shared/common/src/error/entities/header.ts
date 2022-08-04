/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError } from '@typescript-error/http';
import { AuthorizationHeaderType } from 'hapic';
import { ErrorOptions, mergeErrorOptions } from '@typescript-error/core';
import { ErrorCode } from '../constants';

export class HeaderError extends BadRequestError {
    constructor(options?: ErrorOptions) {
        super(mergeErrorOptions({
            code: ErrorCode.HEADER_INVALID,
        }, options));
    }

    static unsupportedHeaderType(type: `${AuthorizationHeaderType}`) {
        return new HeaderError({
            code: ErrorCode.HEADER_AUTH_TYPE_UNSUPPORTED,
            message: `The authorization header type ${type} is not supported.`,
        });
    }
}
