/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError, ErrorOptions, mergeErrorOptions } from '@typescript-error/core';
import { ErrorCode } from '../constants';

export class AuthorizationHeaderError extends BaseError {
    constructor(options?: ErrorOptions) {
        super(mergeErrorOptions({
            code: ErrorCode.AUTHORIZATION_HEADER_INVALID,
            message: 'The authorization header is not valid.',
        }, (options || {})));
    }

    /* istanbul ignore next */
    static parse() {
        throw new AuthorizationHeaderError({
            code: ErrorCode.AUTHORIZATION_HEADER_PARSE,
            message: 'The authorization header value could not be parsed.',
        });
    }

    /* istanbul ignore next */
    static parseType() {
        throw new AuthorizationHeaderError({
            code: ErrorCode.AUTHORIZATION_HEADER_TYPE_PARSE,
            message: 'The authorization header value type must either be \'Bearer\' or \'Basic\'',
        });
    }
}
