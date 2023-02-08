/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ConflictError,
    InsufficientStorageError,
    InternalServerError,
    InternalServerErrorOptions,
    extendsBaseError,
} from '@ebec/http';
import { isObject } from 'smob';
import { ResponseErrorPayload } from './type';

export function buildResponseErrorPayload(input: Partial<ResponseErrorPayload>) : ResponseErrorPayload {
    return {
        ...input,
        statusCode: input.statusCode || InternalServerErrorOptions.statusCode,
        code: input.code || InternalServerErrorOptions.code,
        message: input.message || InternalServerErrorOptions.message,
    };
}

export function buildResponseErrorPayloadFromError(error: Error) {
    let code : string | undefined;

    if (
        isObject(error) &&
        typeof (error as Record<string, any>).code === 'string'
    ) {
        code = (error as Record<string, any>).code;
    }

    // catch and decorate some mysql errors :)
    switch (code) {
        case 'ER_DUP_ENTRY':
        case 'SQLITE_CONSTRAINT_UNIQUE':
            error = new ConflictError(
                'An entry with some unique attributes already exist.',
                {
                    previous: error,
                },
            );
            break;
        case 'ER_DISK_FULL':
            error = new InsufficientStorageError(
                'No database operation possible, due the leak of free disk space.',
                {
                    previous: error,
                },
            );
            break;
    }

    const baseError = extendsBaseError(error) ?
        error :
        new InternalServerError(error, { decorateMessage: true });

    if (baseError.getOption('decorateMessage')) {
        baseError.message = 'An error occurred.';
    }

    const extra = baseError.getOption('extra');

    return buildResponseErrorPayload({
        statusCode: baseError.getOption('statusCode'),
        code: `${baseError.getOption('code')}`,
        message: baseError.message,
        ...(isObject(extra) ? { extra } : {}),
    });
}
