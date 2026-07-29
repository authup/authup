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
 * Run it against a database the migration chain has been applied to:
 *
 *   node dist/cli/index.mjs migration run
 *   node scripts/assert-schema-drift.mjs
 */

import process from 'node:process';
import { getSchemaDrift } from 'typeorm-extension';
import { DataSourceOptionsBuilder } from '../dist/adapters/database/index.mjs';

const options = new DataSourceOptionsBuilder().buildWithEnv();

// sqlite carries no migrations and synchronizes from the entities, so
// there are never two descriptions to compare
const drift = await getSchemaDrift(options, { skipWithoutMigrations: true });

if (!drift.exists) {
    console.log(`[schema-drift] ${options.type}: schema matches the entity metadata`);
    process.exit(0);
}

console.error(`[schema-drift] ${options.type}: ${drift.up.length} statement(s) would be needed to reconcile`);
console.error('the migrated schema with the entity metadata. Either the entities changed');
console.error('without a migration, or a migration wrote something the entities do not describe.\n');

for (const statement of drift.up) {
    console.error(`  ${statement.query}`);
}

process.exit(1);
