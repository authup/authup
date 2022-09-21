/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from 'typeorm-extension';
import {
    ClientError,
    ConflictError,
    InsufficientStorageError,
    InternalServerError,
    InternalServerErrorOptions,
    ServerError,
    extendsBaseError,
} from '@ebec/http';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../type';

export function errorMiddleware(
    error: Error,
    request: ExpressRequest,
    response: ExpressResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: ExpressNextFunction,
) {
    const code : string | undefined = hasOwnProperty(error, 'code') && typeof error.code === 'string' ?
        error.code :
        undefined;

    // catch and decorate some mysql errors :)
    // eslint-disable-next-line default-case
    switch (code) {
        case 'ER_DUP_ENTRY':
        case 'SQLITE_CONSTRAINT_UNIQUE':
            error = new ConflictError('An entry with some unique attributes already exist.', { previous: error });
            break;
        case 'ER_DISK_FULL':
            error = new InsufficientStorageError('No database operation possible, due the leak of free disk space.', { previous: error });
            break;
    }

    const baseError = extendsBaseError(error) ?
        error :
        new InternalServerError(error, { decorateMessage: true });

    const statusCode : number = baseError.getOption('statusCode') ?? InternalServerErrorOptions.statusCode;

    if (baseError.getOption('logMessage')) {
        const isInspected = error instanceof ClientError || error instanceof ServerError;
        console.error(`${!isInspected ? error.message : (baseError.message || baseError)}`);
    }

    if (process.env.NODE_ENV === 'test') {
        console.error(error);
    }

    if (baseError.getOption('decorateMessage')) {
        baseError.message = 'An error occurred.';
    }

    const extra = baseError.getOption('extra');

    return response
        .status(statusCode)
        .json({
            code: baseError.getOption('code') ?? InternalServerErrorOptions.code,
            message: baseError.message ?? InternalServerErrorOptions.message,
            statusCode,
            ...(extra ? { extra } : {}),
        })
        .end();
}
