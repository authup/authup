/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BadRequestErrorOptions,
    ConflictErrorOptions,
    HTTPError,
    InsufficientStorageErrorOptions,
    InternalServerErrorOptions,
} from '@ebec/http';
import { AuthupError } from '@authup/errors';
import { EntityRelationLookupError } from 'typeorm-extension';
import { buildErrorMessageForAttributes, isValidupError, stringifyPath } from 'validup';
import { hasOwnProperty, isObject } from '@authup/kit';

export function sanitizeError(input: unknown) : AuthupError {
    if (input instanceof AuthupError) {
        return input;
    }

    if (input instanceof EntityRelationLookupError) {
        return new AuthupError({
            statusCode: BadRequestErrorOptions.statusCode,
            code: BadRequestErrorOptions.code,
            message: input.message,
            stack: input.stack,
        });
    }

    if (isValidupError(input)) {
        const paths = input.issues.map((issue) => stringifyPath(issue.path));
        const error = new AuthupError({
            statusCode: BadRequestErrorOptions.statusCode,
            code: BadRequestErrorOptions.code,
            stack: input.stack,
            message: input.message || buildErrorMessageForAttributes(paths),
        });

        error.issues.push(...input.issues);
        return error;
    }

    if (input instanceof HTTPError) {
        return new AuthupError({
            statusCode: input.statusCode,
            code: input.code,
            message: input.message,
            data: input.data,
            stack: input.stack,
        });
    }

    if (isObject(input)) {
        const code = hasOwnProperty(input, 'code') &&
        typeof input.code === 'string' ?
            input.code :
            undefined;

        /**
         * @see https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
         */
        switch (code) {
            case 'ER_DUP_ENTRY':
            case 'SQLITE_CONSTRAINT_UNIQUE': {
                return new AuthupError({
                    statusCode: ConflictErrorOptions.statusCode,
                    code: ConflictErrorOptions.code,
                    message: 'An entry with some unique attributes already exist.',
                    stack: input.stack,
                });
            }
            case 'ER_DISK_FULL':
                return new AuthupError({
                    statusCode: InsufficientStorageErrorOptions.statusCode,
                    code: InsufficientStorageErrorOptions.code,
                    message: 'No database operation possible, due the leak of free disk space.',
                    stack: input.stack,
                });
        }

        return new AuthupError({
            statusCode: InternalServerErrorOptions.statusCode,
            code: InternalServerErrorOptions.code,
            message: input.message,
            stack: input.stack,
        });
    }

    return new AuthupError({
        statusCode: InternalServerErrorOptions.statusCode,
        code: InternalServerErrorOptions.code,
    });
}
