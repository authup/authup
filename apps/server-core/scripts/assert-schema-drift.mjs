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
 * against mysql/postgres — the test suites build their schema with
 * synchronize(). Every divergence between them has therefore been found
 * by hand, twice as a foreign key pointing at the wrong table
 * (auth_permissions.client_id, auth_roles.client_id) and once as an
 * entire naming/column-type split (1783325495597, 1783769340000).
 *
 * Run it against a database the migration chain has been applied to:
 *
 *   node dist/cli/index.mjs migration run
 *   node scripts/assert-schema-drift.mjs
 */

import process from 'node:process';
import { DataSource } from 'typeorm';
import { DataSourceOptionsBuilder } from '../dist/adapters/database/index.mjs';

const options = new DataSourceOptionsBuilder().buildWithEnv();

if (options.type !== 'mysql' && options.type !== 'postgres') {
    console.log(`[schema-drift] ${options.type} does not run migrations, nothing to compare`);
    process.exit(0);
}

const dataSource = new DataSource({ ...options, logging: false });
await dataSource.initialize();

const executed = await dataSource.query(
    `SELECT COUNT(*) AS c FROM ${options.type === 'postgres' ? '"migrations"' : '`migrations`'}`,
).catch(() => [{ c: 0 }]);

if (Number(executed[0].c) === 0) {
    console.error('[schema-drift] no migration has been executed against this database');
    await dataSource.destroy();
    process.exit(1);
}

const { upQueries } = await dataSource.driver.createSchemaBuilder().log();
await dataSource.destroy();

if (upQueries.length === 0) {
    console.log(`[schema-drift] ${options.type}: schema matches the entity metadata`);
    process.exit(0);
}

console.error(`[schema-drift] ${options.type}: ${upQueries.length} statement(s) would be needed to reconcile`);
console.error('the migrated schema with the entity metadata. Either the entities changed');
console.error('without a migration, or a migration wrote something the entities do not describe.\n');

for (const upQuery of upQueries) {
    console.error(`  ${upQuery.query}`);
}

process.exit(1);
