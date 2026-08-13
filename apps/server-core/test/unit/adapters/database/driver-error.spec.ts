/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    getDatabaseDriverErrorCode,
    isForeignKeyConstraintDatabaseError,
    isUniqueConstraintDatabaseError,
} from '../../../../src/adapters/database/errors/index.ts';

describe('adapters/database/errors/driver', () => {
    describe('getDatabaseDriverErrorCode', () => {
        it('reads a top-level string code', () => {
            expect(getDatabaseDriverErrorCode({ code: '23505' })).toBe('23505');
        });

        it('unwraps a nested driverError.code (TypeORM QueryFailedError shape)', () => {
            expect(getDatabaseDriverErrorCode({ driverError: { code: 'ER_DUP_ENTRY' } })).toBe('ER_DUP_ENTRY');
        });

        it('returns undefined for non-objects and objects without a code', () => {
            expect(getDatabaseDriverErrorCode(undefined)).toBeUndefined();
            expect(getDatabaseDriverErrorCode('boom')).toBeUndefined();
            expect(getDatabaseDriverErrorCode({})).toBeUndefined();
            expect(getDatabaseDriverErrorCode({ code: 500 })).toBeUndefined();
        });
    });

    describe('isUniqueConstraintDatabaseError', () => {
        it('matches every supported driver code, top-level or nested', () => {
            expect(isUniqueConstraintDatabaseError({ code: 'ER_DUP_ENTRY' })).toBe(true);
            expect(isUniqueConstraintDatabaseError({ code: '23505' })).toBe(true);
            expect(isUniqueConstraintDatabaseError({ code: 'SQLITE_CONSTRAINT_UNIQUE' })).toBe(true);
            expect(isUniqueConstraintDatabaseError({ driverError: { code: '23505' } })).toBe(true);
        });

        it('is false for a different constraint / arbitrary errors', () => {
            expect(isUniqueConstraintDatabaseError({ code: '23503' })).toBe(false);
            expect(isUniqueConstraintDatabaseError(new Error('nope'))).toBe(false);
            expect(isUniqueConstraintDatabaseError(null)).toBe(false);
        });
    });

    describe('isForeignKeyConstraintDatabaseError', () => {
        it('matches every supported driver code, top-level or nested', () => {
            expect(isForeignKeyConstraintDatabaseError({ code: 'ER_NO_REFERENCED_ROW' })).toBe(true);
            expect(isForeignKeyConstraintDatabaseError({ code: 'ER_NO_REFERENCED_ROW_2' })).toBe(true);
            expect(isForeignKeyConstraintDatabaseError({ code: 'ER_ROW_IS_REFERENCED' })).toBe(true);
            expect(isForeignKeyConstraintDatabaseError({ code: 'ER_ROW_IS_REFERENCED_2' })).toBe(true);
            expect(isForeignKeyConstraintDatabaseError({ code: '23503' })).toBe(true);
            expect(isForeignKeyConstraintDatabaseError({ code: 'SQLITE_CONSTRAINT_FOREIGNKEY' })).toBe(true);
            expect(isForeignKeyConstraintDatabaseError({ driverError: { code: '23503' } })).toBe(true);
        });

        it('is false for a different constraint / arbitrary errors', () => {
            expect(isForeignKeyConstraintDatabaseError({ code: '23505' })).toBe(false);
            expect(isForeignKeyConstraintDatabaseError({ code: 'ER_DUP_ENTRY' })).toBe(false);
            expect(isForeignKeyConstraintDatabaseError(new Error('nope'))).toBe(false);
            expect(isForeignKeyConstraintDatabaseError(null)).toBe(false);
        });
    });
});
