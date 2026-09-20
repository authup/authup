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
import {
    PathEntity,
    RealmEntity,
    UserEntity,
} from '../../../../src/adapters/database/domains/index.ts';
import { isUniqueConstraintDatabaseError } from '../../../../src/adapters/database/errors/driver.ts';
import { createFakeUser } from '../../../utils/index.ts';

describe('adapters/database/domains/path', () => {
    let dataSource : DataSource;

    // isolated in-memory database, the key-repository shape: the cascade
    // assertions delete rows, which must never reach the suite-shared sqlite
    // file. typeorm's better-sqlite3 driver enables `PRAGMA foreign_keys`
    // itself, so the CASCADE / SET NULL rules are live here.
    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'better-sqlite3',
            database: ':memory:',
            entities: [RealmEntity, PathEntity, UserEntity],
            synchronize: true,
        });
        await dataSource.initialize();
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    it('should cascade a folder delete to its descendants and unfile their users', async () => {
        const realm = await dataSource.getRepository(RealmEntity).save({ name: 'r1' });
        const sales = await dataSource.getRepository(PathEntity).save({
            name: 'sales', 
            path: 'sales', 
            parentId: null, 
            realmId: realm.id,
        });
        const berlin = await dataSource.getRepository(PathEntity).save({
            name: 'berlin', 
            path: 'sales/berlin', 
            parentId: sales.id, 
            realmId: realm.id,
        });
        const user = await dataSource.getRepository(UserEntity).save({
            ...createFakeUser(), 
            realmId: realm.id, 
            pathId: berlin.id,
        });

        await dataSource.getRepository(PathEntity).delete({ id: sales.id });

        expect(await dataSource.getRepository(PathEntity).findOneBy({ id: berlin.id })).toBeNull();
        expect((await dataSource.getRepository(UserEntity).findOneByOrFail({ id: user.id })).pathId).toBeNull();
    });

    it('should refuse two folders with one path in one realm', async () => {
        const realm = await dataSource.getRepository(RealmEntity).save({ name: 'r2' });
        await dataSource.getRepository(PathEntity).save({
            name: 'sales', 
            path: 'sales', 
            parentId: null, 
            realmId: realm.id,
        });

        let error : unknown;
        try {
            await dataSource.getRepository(PathEntity).save({
                name: 'sales', 
                path: 'sales', 
                parentId: null, 
                realmId: realm.id,
            });
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(isUniqueConstraintDatabaseError(error)).toBeTruthy();
    });

    it('should allow one path in two realms', async () => {
        const first = await dataSource.getRepository(RealmEntity).save({ name: 'r3' });
        const second = await dataSource.getRepository(RealmEntity).save({ name: 'r4' });

        await dataSource.getRepository(PathEntity).save({
            name: 'sales', 
            path: 'sales', 
            parentId: null, 
            realmId: first.id,
        });
        await dataSource.getRepository(PathEntity).save({
            name: 'sales', 
            path: 'sales', 
            parentId: null, 
            realmId: second.id,
        });

        expect(await dataSource.getRepository(PathEntity).countBy([
            { path: 'sales', realmId: first.id },
            { path: 'sales', realmId: second.id },
        ])).toEqual(2);
    });
});
