/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError, ErrorCode, isAuthupError } from '@authup/errors';
import { isHTTPError } from '@ebec/http';
import { EntityRelationLookupError } from 'typeorm-extension';
import { buildErrorMessageForAttributes, isValidupError, stringifyPath } from 'validup';
import { hasOwnProperty, isObject } from '@authup/kit';

/**
 * Normalize an unknown error to an AuthupError. Recognised shapes:
 *
 * 1. AuthupError instance              → returned as-is
 * 2. EntityRelationLookupError         → BAD_REQUEST AuthupError
 * 3. validup Issue error               → BAD_REQUEST AuthupError carrying issues
 * 4. foreign @ebec/http HTTPError      → AuthupError with the closest semantic code
 * 5. driver error w/ a recognised code → ENTITY_CONFLICT or STORAGE_INSUFFICIENT
 * 6. anything else                     → INTERNAL_ERROR AuthupError
 *
 * The HTTP-status concern is handled separately by `httpStatusFromCode` in
 * the adapter — this function only assigns a semantic `code`.
 */
export function sanitizeError(input: unknown): AuthupError {
    if (isAuthupError(input)) {
        return input;
    }

    if (input instanceof EntityRelationLookupError) {
        return new AuthupError({
            code: ErrorCode.ENTITY_RELATION_INVALID,
            message: input.message,
            stack: input.stack,
        });
    }

    if (isValidupError(input)) {
        const paths = input.issues.map((issue) => stringifyPath(issue.path));
        const error = new AuthupError({
            code: ErrorCode.BAD_REQUEST,
            stack: input.stack,
            message: input.message || buildErrorMessageForAttributes(paths),
        });

        error.issues.push(...input.issues);
        return error;
    }

    if (isHTTPError(input)) {
        return new AuthupError({
            code: codeForForeignHTTPStatus(input.status),
            message: input.message,
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
            case '23505':
            case 'ER_DUP_ENTRY':
            case 'SQLITE_CONSTRAINT_UNIQUE': {
                return new AuthupError({
                    code: ErrorCode.ENTITY_CONFLICT,
                    message: 'An entry with some unique attributes already exists.',
                    stack: input.stack as string | undefined,
                });
            }
            case 'ER_DISK_FULL':
                return new AuthupError({
                    code: ErrorCode.STORAGE_INSUFFICIENT,
                    message: 'No database operation possible, due to the lack of free disk space.',
                    stack: input.stack as string | undefined,
                });
        }

        return new AuthupError({
            code: ErrorCode.INTERNAL_ERROR,
            message: input.message as string | undefined,
            stack: input.stack as string | undefined,
        });
    }

    return new AuthupError({ code: ErrorCode.INTERNAL_ERROR });
}

function codeForForeignHTTPStatus(status: number): ErrorCode {
    if (status === 404) return ErrorCode.ENTITY_NOT_FOUND;
    if (status === 409) return ErrorCode.ENTITY_CONFLICT;
    if (status === 401) return ErrorCode.IDENTITY_UNAUTHORIZED;
    if (status === 403) return ErrorCode.PERMISSION_DENIED;
    if (status >= 500) return ErrorCode.INTERNAL_ERROR;
    return ErrorCode.BAD_REQUEST;
}
