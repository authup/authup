/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Container } from 'eldin';
import type { IContainer } from 'eldin';
import type {
    DataSource,
    EntityTarget,
    MigrationInterface,
    ObjectLiteral,
    QueryRunner,
} from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    CacheModule,
    ConfigModule,
    LoggerModule,
} from '../../../../src/index.ts';
import {
    PermissionEntity,
    PolicyEntity,
    RealmEntity,
    RoleEntity,
    ScopeEntity,
} from '../../../../src/adapters/database/domains/index.ts';
import { isUniqueConstraintDatabaseError } from '../../../../src/adapters/database/errors/driver.ts';
import { DatabaseInjectionKey } from '../../../../src/app/modules/database/index.ts';
import { createTestDatabaseModuleForSecondaryInstance } from '../../../app/index.ts';

// The expression index is hand-written DDL that only the migration creates,
// and sqlite never runs migrations: one database file per container, so the
// replica race it guards against cannot exist there.
const dialect = process.env.DB_TYPE ?? '';
const migrated = ['mysql', 'postgres'].includes(dialect);

// A schema synchronize before the first assertion runs.
const HOOK_TIMEOUT = 120_000;

type Target = {
    entity: EntityTarget<ObjectLiteral>,
    table: string,
    index: string,
    row: (name: string, realmId: string | null) => Record<string, unknown>,
};

// One entry per table the migration touches. The index name is the one the
// migration spells, and the first assertion holds it against the name the
// entity gives, so the two cannot drift apart unnoticed.
const TARGETS: Target[] = [
    {
        entity: PermissionEntity,
        table: 'auth_permissions',
        index: 'IDX_auth_permissions_global_name',
        row: (name, realmId) => ({
            name, 
            realmId, 
            clientId: null, 
        }),
    },
    {
        entity: RoleEntity,
        table: 'auth_roles',
        index: 'IDX_auth_roles_global_name',
        row: (name, realmId) => ({
            name, 
            realmId, 
            clientId: null, 
        }),
    },
    {
        entity: ScopeEntity,
        table: 'auth_scopes',
        index: 'IDX_auth_scopes_global_name',
        row: (name, realmId) => ({ name, realmId }),
    },
    {
        entity: PolicyEntity,
        table: 'auth_policies',
        index: 'IDX_auth_policies_global_name',
        row: (name, realmId) => ({
            name, 
            realmId, 
            type: 'identity', 
        }),
    },
];

async function loadMigration(): Promise<MigrationInterface> {
    if (dialect === 'mysql') {
        const { WidenClientSecretAndGlobalUniqueness1788782400000 } = await import(
            '../../../../src/adapters/database/migrations/mysql/1788782400000-WidenClientSecretAndGlobalUniqueness.ts',
        );
        return new WidenClientSecretAndGlobalUniqueness1788782400000();
    }

    const { WidenClientSecretAndGlobalUniqueness1788782400000 } = await import(
        '../../../../src/adapters/database/migrations/postgres/1788782400000-WidenClientSecretAndGlobalUniqueness.ts',
    );
    return new WidenClientSecretAndGlobalUniqueness1788782400000();
}

describe.skipIf(!migrated)('adapters/database (global entity uniqueness)', () => {
    let di: IContainer;
    let dataSource: DataSource;
    let migration: MigrationInterface;

    // An EMPTY database synchronized from the entities: exactly the schema a
    // deployment carries before this migration runs, minus the migration.
    const database = createTestDatabaseModuleForSecondaryInstance('global-uniqueness');

    beforeAll(async () => {
        di = new Container();

        await new ConfigModule().setup(di);
        await new LoggerModule().setup(di);
        await new CacheModule().setup(di);
        await database.setup(di);

        dataSource = di.resolve(DatabaseInjectionKey.DataSource);
        migration = await loadMigration();
    }, HOOK_TIMEOUT);

    afterAll(async () => {
        await database.teardown(di);
    });

    async function withRunner<T>(fn: (runner: QueryRunner) => Promise<T>): Promise<T> {
        const runner = dataSource.createQueryRunner();
        try {
            return await fn(runner);
        } finally {
            await runner.release();
        }
    }

    async function schemaDrift(): Promise<string[]> {
        const { upQueries } = await dataSource.driver.createSchemaBuilder().log();
        return upQueries.map((query) => query.query);
    }

    async function insert(target: Target, name: string, realmId: string | null) {
        const repository = dataSource.getRepository(target.entity);
        return repository.save(repository.create(target.row(name, realmId)));
    }

    it('declares each index on its entity as one the schema builder leaves alone', () => {
        for (const target of TARGETS) {
            const declared = dataSource.getMetadata(target.entity).indices
                .filter((index) => index.synchronize === false);

            expect(declared, target.table).toHaveLength(1);
            expect(declared[0].name, target.table).toEqual(target.index);
        }
    });

    it('creates the declared indexes without introducing schema drift', async () => {
        const before = await schemaDrift();

        await withRunner((runner) => migration.up(runner));

        // The drift gate compares the migrated schema against the entities;
        // an index the builder wanted to drop would show up here.
        expect(await schemaDrift()).toEqual(before);

        for (const target of TARGETS) {
            const table = await withRunner((runner) => runner.getTable(target.table));
            const index = table?.indices.find((candidate) => candidate.name === target.index);

            expect(index, target.table).toBeDefined();
            expect(index?.isUnique, target.table).toBe(true);
        }
    });

    it('refuses a second global row with one name', async () => {
        for (const target of TARGETS) {
            await insert(target, 'global-probe', null);

            await expect(insert(target, 'global-probe', null), target.table)
                .rejects.toSatisfy(isUniqueConstraintDatabaseError);
        }
    });

    it('keeps one name allowed per realm, and once globally', async () => {
        const realms = dataSource.getRepository(RealmEntity);
        const first = await realms.save(realms.create({ name: 'global-probe-a' }));
        const second = await realms.save(realms.create({ name: 'global-probe-b' }));

        for (const target of TARGETS) {
            await insert(target, 'scoped-probe', first.id);
            await insert(target, 'scoped-probe', second.id);
            await insert(target, 'scoped-probe', null);

            await expect(insert(target, 'scoped-probe', first.id), target.table)
                .rejects.toSatisfy(isUniqueConstraintDatabaseError);
        }
    });

    it('reverts, and refuses to re-apply while duplicates exist, naming their tables', async () => {
        await withRunner((runner) => migration.down(runner));

        // The revert is real: what the index refused is accepted again.
        const [permission, , scope] = TARGETS;
        const duplicates = [
            await insert(permission, 'global-probe', null),
            await insert(scope, 'global-probe', null),
        ];

        await expect(withRunner((runner) => migration.up(runner)))
            .rejects.toThrow(/"auth_permissions".*"auth_scopes".*upgrading\.md/s);

        // The abort runs before any DDL, so nothing is half-applied.
        const table = await withRunner((runner) => runner.getTable(permission.table));
        expect(table?.indices.find((candidate) => candidate.name === permission.index)).toBeUndefined();

        await dataSource.getRepository(permission.entity).delete({ id: duplicates[0].id });
        await dataSource.getRepository(scope.entity).delete({ id: duplicates[1].id });

        await withRunner((runner) => migration.up(runner));

        await expect(insert(permission, 'global-probe', null))
            .rejects.toSatisfy(isUniqueConstraintDatabaseError);
    });
});
