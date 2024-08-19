/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationHeaderType } from 'hapic';
import { ErrorCode } from '../constants';
import { AuthupError } from '../module';
import type { AuthupErrorOptionsInput } from '../types';

export class HeaderError extends AuthupError {
    constructor(...input: AuthupErrorOptionsInput[]) {
        super({ code: ErrorCode.HEADER_INVALID }, ...input);
    }

    static unsupportedHeaderType(type: `${AuthorizationHeaderType}`) {
        return new HeaderError({
            code: ErrorCode.HEADER_AUTH_TYPE_UNSUPPORTED,
            message: `The authorization header type ${type} is not supported.`,
        });
    }
}
