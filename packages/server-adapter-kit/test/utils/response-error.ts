/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { JWTError, isJWTError } from '@authup/specs';
import { ErrorCode, httpStatusFromCode } from '@authup/errors';

type Context = {
    code?: `${ErrorCode}`,
    status?: number,
    message?: string
};
export function createResponseError(input: Context | JWTError) : Error {
    let context : Context;
    if (isJWTError(input)) {
        context = {
            code: input.code as `${ErrorCode}`,
            status: httpStatusFromCode(input.code),
            message: input.message,
        };
    } else {
        context = input;
    }

    const error = new JWTError();
    Object.assign(error, {
        response: {
            data: {
                code: context.code || ErrorCode.JWT_INVALID,
                message: context.message || 'foo',
            },
            status: context.status || 400,
        },
    });

    return error;
}
