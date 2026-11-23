/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { DataSourceOptions, MigrationInterface } from 'typeorm';
import { DataSource } from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { SRC_PATH } from '../../../../src/path.ts';
import { readTestServerDataSourceOptions } from '../../../app/index.ts';

const MIGRATIONS_PATH = path.join(SRC_PATH, 'adapters', 'database', 'migrations');

// A migration run takes a while on a loaded server.
const MIGRATION_TIMEOUT = 300_000;

type MigrationClass = new () => MigrationInterface;

async function loadPostgresMigrations(): Promise<MigrationClass[]> {
    const directory = path.join(MIGRATIONS_PATH, 'postgres');
    const files = (await fs.promises.readdir(directory))
        .filter((file) => file.endsWith('.ts'))
        .sort();

    const migrations: MigrationClass[] = [];

    for (const file of files) {
        const exports: Record<string, MigrationClass> = await import(path.join(directory, file));

        migrations.push(...Object.values(exports));
    }

    return migrations;
}

describe('postgres migrations name no schema', () => {
    // The generator qualifies statements with "public", while the CREATE
    // statements it emits land in the search_path. A qualified statement
    // misses every object of a deployment in another schema (#3849).
    it('should not qualify a statement with the public schema', async () => {
        const directory = path.join(MIGRATIONS_PATH, 'postgres');
        const offending: string[] = [];

        const files = await fs.promises.readdir(directory);

        for (const file of files) {
            const content = await fs.promises.readFile(path.join(directory, file), { encoding: 'utf8' });

            if (content.includes('"public".')) {
                offending.push(file);
            }
        }

        expect(offending).toEqual([]);
    });
});

describe.skipIf(process.env.DB_TYPE !== 'postgres')('postgres migrations in a schema of their own', () => {
    const schema = `migrations_${process.env.VITEST_POOL_ID || '0'}`;

    let admin: DataSource;
    let dataSource: DataSource;
    let migrations: MigrationClass[];

    beforeAll(async () => {
        const options = readTestServerDataSourceOptions();

        if (!options) {
            throw new Error('A postgres run must name its database.');
        }

        admin = new DataSource({
            ...options,
            entities: [],
            migrations: [],
            subscribers: [],
        } as DataSourceOptions);
        await admin.initialize();

        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.query(`CREATE SCHEMA "${schema}"`);
        await admin.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        migrations = await loadPostgresMigrations();

        // DB_SCHEMA names the schema typeorm qualifies its own tables with;
        // the search_path is where the unqualified migration statements land.
        dataSource = new DataSource({
            ...options,
            schema,
            entities: [],
            subscribers: [],
            migrations,
            migrationsTransactionMode: 'all',
            extra: { options: `-c search_path="${schema}",public` },
        } as DataSourceOptions);
        await dataSource.initialize();
    }, MIGRATION_TIMEOUT);

    afterAll(async () => {
        await dataSource?.destroy();

        if (!admin?.isInitialized) {
            return;
        }

        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.destroy();
    });

    async function listTables(name: string): Promise<string[]> {
        const rows: { table_name: string }[] = await admin.query(
            'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name',
            [name],
        );

        return rows.map((row) => row.table_name);
    }

    it('should apply every migration inside the schema', async () => {
        const publicTables = await listTables('public');

        const executed = await dataSource.runMigrations();

        expect(executed).toHaveLength(migrations.length);
        expect(await listTables(schema)).toContain('auth_realms');
        expect(await listTables('public')).toEqual(publicTables);
    }, MIGRATION_TIMEOUT);

    it('should revert every migration inside the schema', async () => {
        const [{ count }]: { count: string }[] = await admin.query(`SELECT COUNT(*) AS count FROM "${schema}"."migrations"`);

        expect(Number(count)).toEqual(migrations.length);

        for (let i = 0; i < migrations.length; i++) {
            await dataSource.undoLastMigration();
        }

        expect(await listTables(schema)).toEqual(['migrations']);
    }, MIGRATION_TIMEOUT);
});
