/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSourceOptions, MigrationInterface, QueryRunner } from 'typeorm';
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

class PoolProbeMigration1000000000000 implements MigrationInterface {
    name = 'PoolProbeMigration1000000000000';

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE TABLE migration_pool_probe (id int)');
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE migration_pool_probe');
    }
}

// A run or revert reaching for a second connection while the lock holds the
// only one would wait forever; the test timeout turns that into a failure.
const POOL_OF_ONE_TIMEOUT = 20_000;

describe.skipIf(!lockable)('migration CLI on a pool of one connection', () => {
    let dataSource: DataSource;

    async function hasProbeTable(): Promise<boolean> {
        const runner = dataSource.createQueryRunner();

        try {
            return await runner.hasTable('migration_pool_probe');
        } finally {
            await runner.release();
        }
    }

    beforeAll(async () => {
        const options = readTestServerDataSourceOptions();

        if (!options) {
            throw new Error('A mysql/postgres run must name its database.');
        }

        dataSource = new DataSource({
            ...options,
            poolSize: 1,
            entities: [],
            subscribers: [],
            migrations: [PoolProbeMigration1000000000000],
            migrationsTableName: 'migration_pool_probe_migrations',
        } as DataSourceOptions);
        await dataSource.initialize();

        await dataSource.query('DROP TABLE IF EXISTS migration_pool_probe');
        await dataSource.query('DROP TABLE IF EXISTS migration_pool_probe_migrations');
    });

    afterAll(async () => {
        if (!dataSource?.isInitialized) {
            return;
        }

        try {
            await dataSource.query('DROP TABLE IF EXISTS migration_pool_probe');
            await dataSource.query('DROP TABLE IF EXISTS migration_pool_probe_migrations');
        } finally {
            await dataSource.destroy();
        }
    });

    it('should apply the migrations', async () => {
        await executeMigrationOperation(dataSource, MigrationOperation.RUN);

        expect(await hasProbeTable()).toBe(true);
    }, POOL_OF_ONE_TIMEOUT);

    it('should revert', async () => {
        await executeMigrationOperation(dataSource, MigrationOperation.REVERT);

        expect(await hasProbeTable()).toBe(false);
    }, POOL_OF_ONE_TIMEOUT);
});
