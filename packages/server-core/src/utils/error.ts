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
import { arrayToPath } from 'pathtrace';
import { distinctArray } from 'smob';
import { AuthupError } from '@authup/errors';
import { EntityRelationLookupError } from 'typeorm-extension';
import { ValidupError } from 'validup';
import { hasOwnProperty, isObject } from '@authup/kit';

export function buildErrorMessageForAttribute(name: string) {
    return buildErrorMessageForAttributes([name]);
}

export function buildErrorMessageForAttributes(input: string[] | Record<string, any>) {
    let names: string[];
    if (Array.isArray(input)) {
        names = distinctArray(input);
    } else {
        names = Object.keys(input);
    }

    if (names.length === 0) {
        return 'An unexpected error occurred.';
    }

    if (names.length > 1) {
        return `The attributes ${names.join(', ')} are invalid.`;
    }

    return `The attribute ${String(names[0])} is invalid.`;
}

export function sanitizeError(error: unknown) : AuthupError {
    if (error instanceof AuthupError) {
        return error;
    }

    if (error instanceof EntityRelationLookupError) {
        return new AuthupError({
            statusCode: BadRequestErrorOptions.statusCode,
            code: BadRequestErrorOptions.code,
            message: error.message,
            stack: error.stack,
        });
    }

    if (error instanceof ValidupError) {
        const paths = error.issues.map((issue) => arrayToPath(issue.path));
        return new AuthupError({
            statusCode: BadRequestErrorOptions.statusCode,
            code: BadRequestErrorOptions.code,
            data: {
                issues: error.issues,
                paths,
            },
            stack: error.stack,
            message: error.message || buildErrorMessageForAttributes(paths),
        });
    }

    if (error instanceof HTTPError) {
        return new AuthupError({
            statusCode: error.statusCode,
            code: error.code,
            message: error.message,
            data: error.data,
            stack: error.stack,
        });
    }

    if (isObject(error)) {
        const code = hasOwnProperty(error, 'code') &&
        typeof error.code === 'string' ?
            error.code :
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
                    stack: error.stack,
                });
            }
            case 'ER_DISK_FULL':
                return new AuthupError({
                    statusCode: InsufficientStorageErrorOptions.statusCode,
                    code: InsufficientStorageErrorOptions.code,
                    message: 'No database operation possible, due the leak of free disk space.',
                    stack: error.stack,
                });
        }

        return new AuthupError({
            statusCode: InternalServerErrorOptions.statusCode,
            code: InternalServerErrorOptions.code,
            message: error.message,
            stack: error.stack,
        });
    }

    return new AuthupError({
        statusCode: InternalServerErrorOptions.statusCode,
        code: InternalServerErrorOptions.code,
    });
}
