/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DataSource } from 'typeorm';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { MIGRATION_DATABASE_LOCK } from '../../../src/app/modules/database/index.ts';
import {
    MigrationOperation,
    executeMigrationOperation,
    removePublicSchemaQualifier,
} from '../../../src/cli/commands/migration.ts';

const lock = vi.hoisted(() => ({
    held: false,
    names: [] as string[],
}));

// better-sqlite3 has no lock (the lock options run it as a passthrough), so
// the lock is observed here; the mysql/postgres spec next to this one holds a
// real one.
vi.mock('typeorm-extension', async (importOriginal) => ({
    ...await importOriginal<Record<string, unknown>>(),
    withDatabaseLock: async (_queryRunner: unknown, name: string, fn: () => Promise<unknown>) => {
        lock.names.push(name);
        lock.held = true;

        try {
            return await fn();
        } finally {
            lock.held = false;
        }
    },
}));

describe('src/cli/commands/migration', () => {
    let dataSource: DataSource;
    let calls: { operation: string, locked: boolean }[];

    beforeEach(async () => {
        lock.names = [];
        calls = [];

        dataSource = new DataSource({
            type: 'better-sqlite3',
            database: ':memory:',
            migrations: [],
        });
        await dataSource.initialize();

        vi.spyOn(dataSource, 'runMigrations').mockImplementation(async () => {
            calls.push({ operation: 'run', locked: lock.held });

            return [];
        });
        vi.spyOn(dataSource, 'undoLastMigration').mockImplementation(async () => {
            calls.push({ operation: 'revert', locked: lock.held });
        });
        vi.spyOn(dataSource, 'showMigrations').mockImplementation(async () => {
            calls.push({ operation: 'status', locked: lock.held });

            return false;
        });
    });

    afterEach(async () => {
        await dataSource.destroy();
    });

    it('should apply the migrations under the migration lock', async () => {
        await executeMigrationOperation(dataSource, MigrationOperation.RUN);

        expect(lock.names).toEqual([MIGRATION_DATABASE_LOCK]);
        expect(calls).toEqual([{ operation: 'run', locked: true }]);
    });

    it('should revert under the migration lock', async () => {
        await executeMigrationOperation(dataSource, MigrationOperation.REVERT);

        expect(lock.names).toEqual([MIGRATION_DATABASE_LOCK]);
        expect(calls).toEqual([{ operation: 'revert', locked: true }]);
    });

    it('should report the status without the lock', async () => {
        await executeMigrationOperation(dataSource, MigrationOperation.STATUS);

        expect(lock.names).toEqual([]);
        expect(calls).toEqual([{ operation: 'status', locked: false }]);
    });

    it('should refuse an operation it has no branch for', async () => {
        await expect(executeMigrationOperation(dataSource, MigrationOperation.GENERATE)).rejects.toThrow();

        expect(lock.names).toEqual([]);
        expect(calls).toEqual([]);
    });
});

describe('removePublicSchemaQualifier', () => {
    it('should strip the public schema qualifier the postgres generator emits', () => {
        const content = 'await queryRunner.query(`DROP INDEX "public"."IDX_abc"`);\n' +
            'await queryRunner.query(`CREATE INDEX "IDX_abc" ON "auth_users" ("name") `);';

        expect(removePublicSchemaQualifier(content)).toEqual(
            'await queryRunner.query(`DROP INDEX "IDX_abc"`);\n' +
            'await queryRunner.query(`CREATE INDEX "IDX_abc" ON "auth_users" ("name") `);',
        );
    });
});
