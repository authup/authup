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
    EventAggregateEntity,
    RealmEntity,
} from '../../../../src/adapters/database/domains/index.ts';

describe('adapters/database/domains/event-aggregate', () => {
    let dataSource : DataSource;

    // isolated in-memory database: the cascade assertion deletes a realm,
    // which must never reach the suite-shared sqlite file.
    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'better-sqlite3',
            database: ':memory:',
            entities: [RealmEntity, EventAggregateEntity],
            synchronize: true,
        });
        await dataSource.initialize();
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    it('should read a day back as a calendar date string', async () => {
        const repository = dataSource.getRepository(EventAggregateEntity);
        const saved = await repository.save({
            day: '2026-09-22',
            realmId: null,
            scope: 'oauth2',
            name: 'login',
            refType: null,
            count: 3,
        });

        const row = await repository.findOneByOrFail({ id: saved.id });
        expect(row.day).toEqual('2026-09-22');
        expect(row.realmId).toBeNull();
        expect(row.count).toEqual(3);
    });

    it('should cascade a realm delete to its rollups', async () => {
        const realm = await dataSource.getRepository(RealmEntity).save({ name: 'aggregate-realm' });
        const repository = dataSource.getRepository(EventAggregateEntity);
        const saved = await repository.save({
            day: '2026-09-21',
            realmId: realm.id,
            scope: 'entity',
            name: 'created',
            refType: 'user',
            count: 1,
        });

        await dataSource.getRepository(RealmEntity).delete({ id: realm.id });

        expect(await repository.findOneBy({ id: saved.id })).toBeNull();
    });
});
