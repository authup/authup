/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';
import { withDatabaseLock } from 'typeorm-extension';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { MIGRATION_DATABASE_LOCK } from '../../../src/app/modules/database/index.ts';
import { MigrationOperation, executeMigrationOperation } from '../../../src/cli/commands/migration.ts';
import { readTestServerDataSourceOptions } from '../../app/index.ts';

// The migration lock is a passthrough on better-sqlite3: one database file per
// container means a second replica cannot reach it.
const lockable = ['mysql', 'postgres'].includes(process.env.DB_TYPE ?? '');

// Long enough for an operation over an empty migration list to finish unlocked.
const PENDING_WINDOW = 500;

function wait(ms: number) {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

describe.skipIf(!lockable)('migration CLI against a held migration lock', () => {
    let holder: DataSource;
    let cli: DataSource;

    beforeAll(async () => {
        const options = readTestServerDataSourceOptions();

        if (!options) {
            throw new Error('A mysql/postgres run must name its database.');
        }

        // No migrations: the operation itself is instant, so any wait is the lock.
        const isolated = {
            ...options,
            entities: [],
            migrations: [],
            subscribers: [],
        } as DataSourceOptions;

        holder = new DataSource(isolated);
        cli = new DataSource(isolated);

        await holder.initialize();
        await cli.initialize();
    });

    afterAll(async () => {
        await cli?.destroy();
        await holder?.destroy();
    });

    // Runs fn while another connection holds the migration lock, then lets go.
    async function whileLockHeld<T>(fn: () => Promise<T>): Promise<T> {
        const runner = holder.createQueryRunner();

        const released = Promise.withResolvers<void>();
        const acquired = Promise.withResolvers<void>();

        const held = withDatabaseLock(runner, MIGRATION_DATABASE_LOCK, async () => {
            acquired.resolve();
            await released.promise;
        });

        try {
            await acquired.promise;

            return await fn();
        } finally {
            released.resolve();
            await held;
            await runner.release();
        }
    }

    async function expectWaitsForLock(operation: MigrationOperation) {
        let settled = false;

        // Wrapped, so the operation is awaited only after the lock is let go.
        const { pending } = await whileLockHeld(async () => {
            const promise = executeMigrationOperation(cli, operation).then(() => {
                settled = true;
            });

            await wait(PENDING_WINDOW);
            expect(settled).toBe(false);

            return { pending: promise };
        });

        await pending;
        expect(settled).toBe(true);
    }

    it('should wait for the lock before applying migrations', async () => {
        await expectWaitsForLock(MigrationOperation.RUN);
    });

    it('should wait for the lock before reverting', async () => {
        await expectWaitsForLock(MigrationOperation.REVERT);
    });

    it('should report the status while the lock is held', async () => {
        await whileLockHeld(() => executeMigrationOperation(cli, MigrationOperation.STATUS));
    });
});
