/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import type { DataSource, Migration, QueryRunner } from 'typeorm';
import { MigrationExecutor } from 'typeorm';
import { synchronizeDatabaseSchema, withDatabaseLock } from 'typeorm-extension';
import { DATABASE_LOCK_OPTIONS, MIGRATION_DATABASE_LOCK } from './constants.ts';

/**
 * Run a schema change under the migration lock. The boot path and the
 * migration CLI both take it: a lock only one side takes serializes nothing,
 * so a `migration run` next to a booting replica would apply the same pending
 * migration twice (#3847).
 *
 * The callback gets the connection holding the lock and must run its
 * statements on it: one reaching for a second connection waits forever on a
 * pool of one. A transaction it opens must be closed before it returns.
 */
export async function withMigrationLock<T>(
    dataSource: DataSource,
    fn: (queryRunner: QueryRunner) => Promise<T>,
): Promise<T> {
    const queryRunner = dataSource.createQueryRunner();

    try {
        return await withDatabaseLock(
            queryRunner,
            MIGRATION_DATABASE_LOCK,
            () => fn(queryRunner),
            DATABASE_LOCK_OPTIONS,
        );
    } finally {
        await queryRunner.release();
    }
}

function hasConfiguredMigrations(dataSource: DataSource): boolean {
    const { migrations } = dataSource.options;

    return Array.isArray(migrations) ?
        migrations.length > 0 :
        !!migrations && Object.keys(migrations).length > 0;
}

/**
 * `DataSource.runMigrations()` on the given connection, with the same
 * transaction mode.
 */
export async function runPendingMigrations(
    dataSource: DataSource,
    queryRunner: QueryRunner,
): Promise<Migration[]> {
    const executor = new MigrationExecutor(dataSource, queryRunner);

    executor.transaction = dataSource.options.migrationsTransactionMode ?? 'all';

    return executor.executePendingMigrations();
}

/**
 * `DataSource.undoLastMigration()` on the given connection, which reverts in
 * one transaction whatever the data source's mode.
 */
export async function revertLastMigration(
    dataSource: DataSource,
    queryRunner: QueryRunner,
): Promise<void> {
    const executor = new MigrationExecutor(dataSource, queryRunner);

    executor.transaction = 'all';

    await executor.undoLastMigration();
}

/**
 * typeorm-extension's `synchronizeDatabaseSchema` on the given connection:
 * the pending migrations where any are configured, a schema synchronize
 * otherwise. The synchronize branch (sqlite only, where the lock is a
 * passthrough) still takes its own connection.
 */
export async function migrateDatabaseSchema(
    dataSource: DataSource,
    queryRunner: QueryRunner,
): Promise<void> {
    if (hasConfiguredMigrations(dataSource)) {
        await runPendingMigrations(dataSource, queryRunner);

        return;
    }

    await dataSource.synchronize(false);
}

/**
 * Verify the database schema is current without running any DDL.
 *
 * Resolves `false` when the resolved data-source options carry no
 * migrations at all. That is the sqlite shape: nothing can be pending, and
 * the schema still has to be created, so the caller falls through to a
 * schema synchronize. The predicate is the options, never a dialect
 * compare.
 *
 * Resolves `true` when migrations are configured and none of them are
 * pending. Throws when any are pending, so a process can never silently
 * serve against an older schema.
 */
export async function assertNoPendingMigrations(dataSource: DataSource) : Promise<boolean> {
    if (!hasConfiguredMigrations(dataSource)) {
        return false;
    }

    // typeorm: true means pending migrations exist.
    const pending = await dataSource.showMigrations();

    if (pending) {
        throw new AuthupError('The database has pending migrations, and this process applies no schema changes. Run the migration CLI command (authup migration run) and start again.');
    }

    return true;
}

/**
 * Bring a process up against a schema another process owns: verify it, and
 * create it only where there is nothing to verify.
 *
 * `assertNoPendingMigrations` throws when the chain is behind, so a verified
 * return is the only way past it. Its `false` return means the data source
 * carries no migrations at all (the sqlite shape), where nothing can be
 * pending and the schema still has to be created, so that branch falls
 * through to a synchronize. Dropping the fall-through would leave a sqlite
 * process with no schema.
 *
 * Both callers that must not migrate share this: `DatabaseModule.migrate`
 * under `migrationEnabled: false`, and the worker preset, which never
 * migrates whatever the flag says.
 */
export async function verifySchemaOrSynchronize(
    logger: Logger,
    dataSource: DataSource,
): Promise<void> {
    logger.debug('Verifying database schema...');

    const verified = await assertNoPendingMigrations(dataSource);

    if (verified) {
        logger.debug('Verified database schema.');

        return;
    }

    logger.debug('Migrating database...');
    await synchronizeDatabaseSchema(dataSource);
    logger.debug('Migrated database');
}
