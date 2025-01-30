/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType } from '@authup/access';
import { createTestSuite } from '../../../../../utils';
import { createFakeTimePolicy } from '../../../../../utils/domains/policy';

describe('src/http/controllers/policy', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    const ids : string[] = [];

    it('should create time policy', async () => {
        const response = await suite.client
            .policy
            .create(createFakeTimePolicy());

        expect(response).toBeDefined();

        ids.push(response.id);
    });

    it('should create custom policy', async () => {
        const response = await suite.client
            .policy
            .create({
                name: 'foo',
                type: 'foo',
                bar: 'baz',
            });

        expect(response).toBeDefined();
        expect(response.bar).toEqual('baz');
        ids.push(response.id);
    });

    it('should create group policy', async () => {
        const response = await suite.client
            .policy
            .createBuiltIn({
                name: 'group',
                type: BuiltInPolicyType.COMPOSITE,
                invert: false,
                children: [
                    createFakeTimePolicy(),
                ],
            });

        expect(response).toBeDefined();
        expect(response.children).toHaveLength(1);

        ids.push(response.id);
    });

    it('should read child policies', async () => {
        const response = await suite.client
            .policy
            .getMany({
                filters: {
                    parent_id: ids[2],
                },
            });

        expect(response.data).toBeDefined();
        expect(response.data.length).toEqual(1);
    });

    it('should read collection', async () => {
        let response = await suite.client
            .policy
            .getMany();

        const prevCount = response.data.length;

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(2);

        response = await suite.client
            .policy
            .getMany({
                filters: {
                    parent_id: null,
                },
            });

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(2);
        expect(response.data.length).toBeLessThan(prevCount);
    });

    it('should read time policy', async () => {
        const response = await suite.client
            .policy
            .getOne(ids[0]);

        expect(response).toBeDefined();
    });

    it('should update resource', async () => {
        const response = await suite.client
            .policy
            .updateBuiltIn(ids[0], {
                name: 'time',
                type: BuiltInPolicyType.TIME,
                start: Date.now(),
                end: Date.now(),
                invert: false,
            });

        expect(response).toBeDefined();
    });

    it('should delete resource', async () => {
        for (let i = ids.length - 1; i >= 0; i--) {
            const response = await suite.client
                .policy
                .delete(ids[i]);

            expect(response)
                .toBeDefined();
        }
    });

    it('should create and update resource with put', async () => {
        const entity = createFakeTimePolicy();

        let response = await suite.client
            .policy
            .createOrUpdate(entity.name, entity);

        expect(response).toBeDefined();
        expect(response.name).toEqual(entity.name);

        const { id } = response;

        const { name } = createFakeTimePolicy();

        response = await suite.client
            .policy
            .createOrUpdate(entity.name, {
                ...entity,
                name,
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual(name);
        expect(response.id).toEqual(id);
    });
});
