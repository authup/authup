/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { RealmEntity, UserEntity } from '../../../../src';
import { createFakeRealm, createFakeUser } from '../../../utils/index.ts';
import { createTestApplication } from '../../../app/index.ts';

// Asserts the runtime matches the declared string type: @CreateDateColumn /
// @UpdateDateColumn values are normalized to ISO-8601 strings on the read path
// by dateToISOStringTransformer (in-process, before any JSON boundary).
describe('adapters/database/timestamp', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const expectISOString = (value: unknown) => {
        expect(typeof value).toBe('string');
        expect(Number.isNaN(Date.parse(value as string))).toBe(false);
        expect(new Date(value as string).toISOString()).toBe(value);
    };

    it('should hydrate realm timestamps as ISO strings', async () => {
        const { data: created } = await suite.client.realm.create(createFakeRealm());

        const entity = await suite.dataSource
            .getRepository(RealmEntity)
            .findOneByOrFail({ id: created.id });

        expectISOString(entity.createdAt);
        expectISOString(entity.updatedAt);
    });

    it('should hydrate user timestamps as ISO strings', async () => {
        const { data: created } = await suite.client.user.create(createFakeUser());

        const entity = await suite.dataSource
            .getRepository(UserEntity)
            .findOneByOrFail({ id: created.id });

        expectISOString(entity.createdAt);
        expectISOString(entity.updatedAt);
    });
});
