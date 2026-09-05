/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource, DatabaseType } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { withProvisioningLock } from '../../../../src/adapters/database/helpers/index.ts';

type QueryAnswer = unknown | ((sql: string) => unknown);

type FakeDataSourceState = {
    statements: string[],
    runnersCreated: number,
    runnersReleased: number
};

function isReleaseStatement(sql: string): boolean {
    return sql.includes('pg_advisory_unlock') || sql.includes('RELEASE_LOCK');
}

/**
 * A DataSource whose query runner records every statement and answers from a
 * queue, so an interleaving can be written out exactly. A queued function is
 * invoked (to make a statement throw); anything else is returned verbatim.
 */
function createFakeDataSource(
    type: DatabaseType,
    answers: QueryAnswer[] = [],
): { dataSource: DataSource, state: FakeDataSourceState } {
    const state: FakeDataSourceState = {
        statements: [],
        runnersCreated: 0,
        runnersReleased: 0,
    };

    const queue = [...answers];

    const dataSource = {
        options: { type },
        createQueryRunner() {
            state.runnersCreated += 1;

            return {
                connect: async () => undefined,
                release: async () => {
                    state.runnersReleased += 1;
                },
                query: async (sql: string) => {
                    state.statements.push(sql);

                    if (queue.length > 0) {
                        const answer = queue.shift();
                        if (typeof answer === 'function') {
                            return (answer as (input: string) => unknown)(sql);
                        }

                        return answer;
                    }

                    return isReleaseStatement(sql) ? [{}] : [{ acquired: true }];
                },
            };
        },
    } as unknown as DataSource;

    return { dataSource, state };
}

const noWait = async () => undefined;

describe('adapters/database/helpers/advisory-lock', () => {
    it('should pass through without a query runner on better-sqlite3', async () => {
        const fake = createFakeDataSource('better-sqlite3');

        const output = await withProvisioningLock(fake.dataSource, async () => 'done');

        expect(output).toEqual('done');
        // One database file per container, so there is nothing to serialize,
        // and the driver hands out ONE shared runner that must not be held.
        expect(fake.state.runnersCreated).toEqual(0);
        expect(fake.state.statements).toEqual([]);
    });

    it('should acquire and release around the callback on postgres', async () => {
        const fake = createFakeDataSource('postgres', [[{ acquired: true }]]);
        const order: string[] = [];

        await withProvisioningLock(fake.dataSource, async () => {
            order.push(`callback after ${fake.state.statements.length} statement(s)`);
        });

        expect(fake.state.statements).toHaveLength(2);
        expect(fake.state.statements[0]).toContain('pg_try_advisory_lock');
        expect(fake.state.statements[1]).toContain('pg_advisory_unlock');
        expect(order).toEqual(['callback after 1 statement(s)']);
        expect(fake.state.runnersReleased).toEqual(1);
    });

    it('should acquire and release around the callback on mysql', async () => {
        const fake = createFakeDataSource('mysql', [[{ acquired: 1 }]]);

        await withProvisioningLock(fake.dataSource, async () => undefined);

        expect(fake.state.statements[0]).toContain('GET_LOCK');
        expect(fake.state.statements[1]).toContain('RELEASE_LOCK');
        expect(fake.state.runnersReleased).toEqual(1);
    });

    // mysql2 answers the string '1', pg a JS boolean. A truthiness check would
    // read mysql's '0' as acquired and run the pass unserialized.
    it.each([
        ['mysql string', 'mysql' as DatabaseType, '1'],
        ['mysql number', 'mysql' as DatabaseType, 1],
        ['postgres boolean', 'postgres' as DatabaseType, true],
    ])('should treat a %s answer as acquired', async (_label, type, value) => {
        const fake = createFakeDataSource(type, [[{ acquired: value }]]);

        let ran = false;
        await withProvisioningLock(fake.dataSource, async () => {
            ran = true;
        });

        expect(ran).toBeTruthy();
        expect(fake.state.statements).toHaveLength(2);
    });

    it.each([
        ['mysql zero string', 'mysql' as DatabaseType, '0'],
        ['mysql zero number', 'mysql' as DatabaseType, 0],
        ['mysql null (error)', 'mysql' as DatabaseType, null],
        ['postgres false', 'postgres' as DatabaseType, false],
    ])('should not treat a %s answer as acquired', async (_label, type, value) => {
        const fake = createFakeDataSource(type, [[{ acquired: value }]]);

        let ran = false;
        await expect(withProvisioningLock(fake.dataSource, async () => {
            ran = true;
        }, { waitTimeout: 0, wait: noWait })).rejects.toThrow(/provisioning lock/);

        expect(ran).toBeFalsy();
    });

    it('should poll until the lock frees up', async () => {
        const fake = createFakeDataSource('postgres', [
            [{ acquired: false }],
            [{ acquired: false }],
            [{ acquired: true }],
        ]);

        const waits: number[] = [];
        let ran = false;

        await withProvisioningLock(fake.dataSource, async () => {
            ran = true;
        }, {
            waitTimeout: 1_000,
            pollInterval: 100,
            wait: async (ms) => {
                waits.push(ms);
            },
        });

        expect(ran).toBeTruthy();
        expect(waits).toEqual([100, 100]);
        expect(fake.state.statements).toHaveLength(4);
    });

    it('should fail the boot rather than provision unserialized when the wait runs out', async () => {
        const fake = createFakeDataSource('postgres', [
            [{ acquired: false }],
            [{ acquired: false }],
            [{ acquired: false }],
        ]);

        let ran = false;

        await expect(withProvisioningLock(fake.dataSource, async () => {
            ran = true;
        }, {
            waitTimeout: 200, 
            pollInterval: 100, 
            wait: noWait, 
        }))
            .rejects.toThrow(/Timed out after 200ms waiting for the provisioning lock/);

        expect(ran).toBeFalsy();
        // Nothing was acquired, so nothing is unlocked, but the runner is
        // handed back either way.
        expect(fake.state.statements.every((statement) => statement.includes('pg_try_advisory_lock'))).toBeTruthy();
        expect(fake.state.runnersReleased).toEqual(1);
    });

    it('should release the lock and rethrow untouched when the callback fails', async () => {
        const fake = createFakeDataSource('postgres', [[{ acquired: true }]]);
        const error = new Error('provisioning blew up');

        await expect(withProvisioningLock(fake.dataSource, async () => {
            throw error;
        })).rejects.toBe(error);

        expect(fake.state.statements[1]).toContain('pg_advisory_unlock');
        expect(fake.state.runnersReleased).toEqual(1);
    });

    it('should not let a failing release displace the callback error', async () => {
        const fake = createFakeDataSource('postgres', [
            [{ acquired: true }],
            () => {
                throw new Error('connection reset');
            },
        ]);
        const error = new Error('provisioning blew up');

        await expect(withProvisioningLock(fake.dataSource, async () => {
            throw error;
        })).rejects.toBe(error);

        expect(fake.state.runnersReleased).toEqual(1);
    });
});
