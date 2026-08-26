/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { Logger } from '@authup/server-kit';
import type { DataSource } from 'typeorm';
import { synchronizeDatabaseSchema } from 'typeorm-extension';

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
    const { migrations } = dataSource.options;

    const configured = Array.isArray(migrations) ?
        migrations.length > 0 :
        !!migrations && Object.keys(migrations).length > 0;

    if (!configured) {
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
