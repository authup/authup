/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthorizationHeaderType } from 'hapic';
import { ErrorCode } from '../constants';
import { AuthupError } from '../module';

export class HTTPError extends AuthupError {
    static unsupportedHeaderType(type: `${AuthorizationHeaderType}`) {
        return new HTTPError({
            code: ErrorCode.HTTP_HEADER_AUTH_TYPE_UNSUPPORTED,
            message: `The authorization header type ${type} is not supported.`,
        });
    }
}
