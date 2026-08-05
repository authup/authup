/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 *
 * Asserts that the migrated schema matches what typeorm derives from
 * the entity metadata.
 *
 * The migration chain and the entity classes are two independent
 * descriptions of the same schema, and only the former is exercised
 * against mysql/postgres - the test suites build their schema with
 * synchronize(). Every divergence between them has therefore been found
 * by hand, twice as a foreign key pointing at the wrong table
 * (auth_permissions.client_id, auth_roles.client_id) and once as an
 * entire naming/column-type split (1783325495597, 1783769340000).
 *
 * This wraps typeorm-extension's `assertSchemaMatchesMetadata` rather
 * than calling the `typeorm-extension db drift` CLI, because the CLI
 * discovers a DataSource from a file while this application builds its
 * options programmatically (DataSourceOptionsBuilder injects the
 * entities, migrations and subscribers around the env-derived
 * connection).
 *
 * Run it against a database the migration chain has been applied to:
 *
 *   node dist/cli/index.mjs migration run
 *   node scripts/assert-schema-drift.mjs
 */

import process from 'node:process';
import { assertSchemaMatchesMetadata } from 'typeorm-extension';
import { DataSourceOptionsBuilder } from '../dist/adapters/database/index.mjs';

const options = new DataSourceOptionsBuilder().buildWithEnv();

try {
    // sqlite carries no migrations and synchronizes from the entities, so
    // there are never two descriptions to compare
    await assertSchemaMatchesMetadata(options, { skipWithoutMigrations: true });
} catch (error) {
    console.error(`[schema-drift] ${options.type}: the migrated schema and the entity metadata disagree.`);
    console.error('Either the entities changed without a migration, or a migration wrote');
    console.error('something the entities do not describe.\n');
    console.error(error.message);

    process.exit(1);
}

console.log(`[schema-drift] ${options.type}: schema matches the entity metadata`);
