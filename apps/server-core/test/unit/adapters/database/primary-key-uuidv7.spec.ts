/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import { DataSource } from 'typeorm';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { DataSourceOptionsBuilder, RealmEntity } from '../../../../src/adapters/database/index.ts';

function expectUUIDv7(id: string | undefined) {
    expect(typeof id).toBe('string');
    expect(isUUID(id as string)).toBe(true);
    expect((id as string)[14]).toBe('7');
}

describe('adapters/database (uuidv7 primary keys)', () => {
    let dataSource : DataSource;

    beforeAll(async () => {
        const options = new DataSourceOptionsBuilder().buildWith({
            type: 'better-sqlite3',
            database: ':memory:',
        });

        dataSource = new DataSource({
            ...options,
            migrations: [],
            synchronize: true,
        });
        await dataSource.initialize();
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    it('mints a v7 id on save()', async () => {
        const repository = dataSource.getRepository(RealmEntity);
        const entity = await repository.save(repository.create({ name: 'uuidv7-save' }));

        expectUUIDv7(entity.id);

        const stored = await repository.findOneBy({ name: 'uuidv7-save' });

        expect(stored?.id).toEqual(entity.id);
    });

    it('mints a v7 id on insert() of a plain object', async () => {
        const repository = dataSource.getRepository(RealmEntity);

        await repository.insert({ name: 'uuidv7-insert' });

        const stored = await repository.findOneBy({ name: 'uuidv7-insert' });

        expectUUIDv7(stored?.id);
    });

    it('mints a distinct v7 id per row on a bulk insert', async () => {
        await dataSource.manager.insert(RealmEntity, [
            { name: 'uuidv7-bulk-a' },
            { name: 'uuidv7-bulk-b' },
        ]);

        const repository = dataSource.getRepository(RealmEntity);
        const a = await repository.findOneBy({ name: 'uuidv7-bulk-a' });
        const b = await repository.findOneBy({ name: 'uuidv7-bulk-b' });

        expectUUIDv7(a?.id);
        expectUUIDv7(b?.id);
        expect(a?.id).not.toEqual(b?.id);
    });

    it('keeps an id the caller provides', async () => {
        const id = '4c1e6f0e-7c8b-4a4e-9b0e-1f2a3b4c5d6e';
        const repository = dataSource.getRepository(RealmEntity);

        await repository.insert({ id, name: 'uuidv7-given' });

        const stored = await repository.findOneBy({ name: 'uuidv7-given' });

        expect(stored?.id).toEqual(id);
    });
});
