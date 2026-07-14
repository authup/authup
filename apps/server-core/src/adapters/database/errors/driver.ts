/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from '@authup/kit';

/**
 * Unwrap the vendor error code from a thrown database error. TypeORM wraps the
 * raw driver error in a `QueryFailedError`, exposing the vendor code on the
 * top-level `code` and/or the nested `driverError.code` depending on the
 * driver — this normalizes both shapes to the vendor code string.
 */
export function getDatabaseDriverErrorCode(input: unknown): string | undefined {
    if (!isObject(input)) {
        return undefined;
    }

    if (
        hasOwnProperty(input, 'code') &&
        typeof input.code === 'string'
    ) {
        return input.code;
    }

    if (
        hasOwnProperty(input, 'driverError') &&
        isObject(input.driverError) &&
        hasOwnProperty(input.driverError, 'code') &&
        typeof input.driverError.code === 'string'
    ) {
        return input.driverError.code;
    }

    return undefined;
}

const UNIQUE_CONSTRAINT_ERROR_CODES = [
    'ER_DUP_ENTRY', // mysql
    '23505', // postgres
    'SQLITE_CONSTRAINT_UNIQUE', // sqlite (better-sqlite3)
];

/**
 * True when the error is a unique-constraint (duplicate key) violation from any
 * supported driver — the benign race outcome when two writers insert the same
 * unique key concurrently.
 */
export function isUniqueConstraintDatabaseError(input: unknown): boolean {
    const code = getDatabaseDriverErrorCode(input);
    return typeof code === 'string' && UNIQUE_CONSTRAINT_ERROR_CODES.includes(code);
}
