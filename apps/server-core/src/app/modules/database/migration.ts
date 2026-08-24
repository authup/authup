/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { DataSource } from 'typeorm';

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
        throw new AuthupError('The database has pending migrations, and this process applies no schema changes. Run the migration CLI command (authup-server migration run) and start again.');
    }

    return true;
}
