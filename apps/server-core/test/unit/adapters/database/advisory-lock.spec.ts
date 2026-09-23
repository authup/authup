/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource, DatabaseType } from 'typeorm';
import { DatabaseLockError } from 'typeorm-extension';
import { describe, expect, it } from 'vitest';
import { withDatabaseLock } from '../../../../src/adapters/database/helpers/index.ts';

const NAME = 'authup:test';

type FakeDataSourceState = {
    statements: string[],
    parameters: unknown[][],
    runnersCreated: number,
    runnersReleased: number
};

function isReleaseStatement(sql: string): boolean {
    return sql.includes('pg_advisory_unlock') || sql.includes('RELEASE_LOCK');
}

/**
 * A DataSource whose query runner records every statement. `acquired` is what
 * the try-lock answers, in the driver's own shape (postgres: a boolean,
 * mysql2: the string '1' / '0').
 */
function createFakeDataSource(
    type: DatabaseType,
    acquired: unknown,
): { dataSource: DataSource, state: FakeDataSourceState } {
    const state: FakeDataSourceState = {
        statements: [],
        parameters: [],
        runnersCreated: 0,
        runnersReleased: 0,
    };

    const dataSource = {
        options: { type },
        createQueryRunner() {
            state.runnersCreated += 1;

            return {
                dataSource,
                isTransactionActive: false,
                release: async () => {
                    state.runnersReleased += 1;
                },
                query: async (sql: string, parameters: unknown[] = []) => {
                    state.statements.push(sql);
                    state.parameters.push(parameters);

                    return isReleaseStatement(sql) ? [{ released: true }] : [{ acquired }];
                },
            };
        },
    } as unknown as DataSource;

    return { dataSource, state };
}

describe('adapters/database/helpers/advisory-lock', () => {
    it('should run the callback under the lock on postgres and release the runner', async () => {
        const fake = createFakeDataSource('postgres', true);

        const output = await withDatabaseLock(fake.dataSource, NAME, async () => 'done');

        expect(output).toEqual('done');
        expect(fake.state.statements).toHaveLength(2);
        expect(fake.state.statements[0]).toContain('pg_try_advisory_lock');
        expect(fake.state.statements[1]).toContain('pg_advisory_unlock');
        expect(fake.state.parameters).toEqual([[NAME], [NAME]]);
        expect(fake.state.runnersCreated).toEqual(1);
        expect(fake.state.runnersReleased).toEqual(1);
    });

    it('should bind the name rather than interpolate it', async () => {
        const fake = createFakeDataSource('mysql', '1');

        await withDatabaseLock(fake.dataSource, NAME, async () => undefined);

        for (const statement of fake.state.statements) {
            expect(statement).not.toContain(NAME);
        }
    });

    it('should not read mysql\'s string \'0\' as acquired', async () => {
        const fake = createFakeDataSource('mysql', '0');
        let ran = false;

        await expect(withDatabaseLock(fake.dataSource, NAME, async () => {
            ran = true;
        }, { timeout: 0 })).rejects.toBeInstanceOf(DatabaseLockError);

        expect(ran).toBe(false);
        expect(fake.state.statements.some(isReleaseStatement)).toBe(false);
        expect(fake.state.runnersReleased).toEqual(1);
    });

    it('should release the lock and the runner when the callback throws', async () => {
        const fake = createFakeDataSource('postgres', true);

        await expect(withDatabaseLock(fake.dataSource, NAME, async () => {
            throw new Error('boom');
        })).rejects.toThrow('boom');

        expect(fake.state.statements.filter(isReleaseStatement)).toHaveLength(1);
        expect(fake.state.runnersReleased).toEqual(1);
    });

    it('should run better-sqlite3 unlocked without creating a runner', async () => {
        const fake = createFakeDataSource('better-sqlite3', true);

        const output = await withDatabaseLock(fake.dataSource, NAME, async () => 'done');

        expect(output).toEqual('done');
        expect(fake.state.runnersCreated).toEqual(0);
        expect(fake.state.statements).toHaveLength(0);
    });
});
