/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BadRequestError, Options, mergeOptions } from '@ebec/http';
import { AuthorizationHeaderType } from 'hapic';
import { ErrorCode } from '../constants';

export class HeaderError extends BadRequestError {
    constructor(options?: Options) {
        super(mergeOptions({
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
