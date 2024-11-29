/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TokenError } from '@authup/security';
import { ErrorCode } from '@authup/errors';

type Context = {
    code?: `${ErrorCode}`,
    status?: number,
    message?: string
};
export function createResponseError(context: Context) : Error {
    const error = new TokenError();

    Object.assign(error, {
        response: {
            data: {
                code: context.code || ErrorCode.TOKEN_INVALID,
                message: context.message || 'foo',
            },
            status: context.status || 400,
        },
    });

    return error;
}
