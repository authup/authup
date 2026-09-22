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

const FOREIGN_KEY_CONSTRAINT_ERROR_CODES = [
    'ER_NO_REFERENCED_ROW', // mysql: insert/update references a missing parent
    'ER_NO_REFERENCED_ROW_2', // mysql: same, reported with the constraint name
    'ER_ROW_IS_REFERENCED', // mysql: delete/update of a still-referenced parent
    'ER_ROW_IS_REFERENCED_2', // mysql: same, reported with the constraint name
    '23503', // postgres: foreign_key_violation, both directions
    'SQLITE_CONSTRAINT_FOREIGNKEY', // sqlite (better-sqlite3), both directions
];

/**
 * True when the error is a foreign-key violation from any supported driver.
 *
 * Postgres and sqlite report one code for both directions, so the mysql
 * counterparts of both are listed too and the helper stays direction-agnostic.
 * The direction follows from the statement instead: an INSERT can only ever
 * fail because the row it references is gone.
 */
export function isForeignKeyConstraintDatabaseError(input: unknown): boolean {
    const code = getDatabaseDriverErrorCode(input);
    return typeof code === 'string' && FOREIGN_KEY_CONSTRAINT_ERROR_CODES.includes(code);
}

const TRANSIENT_LOCK_ERROR_CODES = [
    'ER_LOCK_DEADLOCK', // mysql: the server detected a lock cycle and chose a victim
    'ER_LOCK_WAIT_TIMEOUT', // mysql: the same contention, reported after the wait
    '40P01', // postgres: deadlock_detected
    '40001', // postgres: serialization_failure
];

/**
 * True when the error is a transient lock conflict: the server aborted THIS
 * transaction to break a cycle (or to end a wait), rolling back everything it
 * had written.
 *
 * The caller decides whether a retry is sound, and it only is when the
 * transaction body derives its writes from its own reads inside the
 * transaction. No sqlite code is listed: `isDatabaseTypeRowLockable` refuses
 * that driver a transaction here at all, so it takes none of these locks.
 */
export function isTransientLockDatabaseError(input: unknown): boolean {
    const code = getDatabaseDriverErrorCode(input);
    return typeof code === 'string' && TRANSIENT_LOCK_ERROR_CODES.includes(code);
}
