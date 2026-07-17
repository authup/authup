/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource } from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { DataSourceOptionsBuilder } from '../../../../src/adapters/database/index.ts';

// plan 073: DB columns stay snake_case, pinned per column by an explicit
// @Column({ name })/@JoinColumn({ name }). There is no naming strategy, so a
// forgotten explicit name makes TypeORM fall back to the DefaultNamingStrategy,
// which yields the camelCase PROPERTY as the column name (e.g. `realmId`). This
// guard fails the moment any column name carries an uppercase letter — catching a
// forgotten name before it diverges from the frozen snake_case migration column
// (a divergence the synchronize()-based suite would otherwise not surface, since
// write and read stay self-consistent).
describe('adapters/database (column naming)', () => {
    let dataSource : DataSource;

    beforeAll(async () => {
        const options = new DataSourceOptionsBuilder().buildWith({
            type: 'better-sqlite3',
            database: ':memory:',
        });
        // initialize builds entity metadata without touching a real database
        dataSource = new DataSource({ ...options, migrations: [] });
        await dataSource.initialize();
    });

    afterAll(async () => {
        if (dataSource && dataSource.isInitialized) {
            await dataSource.destroy();
        }
    });

    it('should expose only snake_case column names (no uppercase)', () => {
        const offenders: string[] = [];

        for (const metadata of dataSource.entityMetadatas) {
            for (const column of metadata.columns) {
                if (/[A-Z]/.test(column.databaseName)) {
                    offenders.push(`${metadata.tableName}.${column.databaseName} (property ${column.propertyName})`);
                }
            }
        }

        expect(offenders).toEqual([]);
    });

    it('should map every column onto snake_case(propertyName) unless an explicit name overrides it', () => {
        const snake = (input: string) => input.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

        for (const metadata of dataSource.entityMetadatas) {
            for (const column of metadata.columns) {
                // relation-owned FK columns carry an explicit @JoinColumn name whose
                // property (the relation) differs from the column — skip those; the
                // no-uppercase guard above still covers them.
                if (column.relationMetadata) {
                    continue;
                }

                expect(column.databaseName).toEqual(snake(column.propertyName));
            }
        }
    });
});
