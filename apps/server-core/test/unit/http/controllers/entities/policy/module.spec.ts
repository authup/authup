/*
 * Copyright (c) 2021-2024.
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
import { BuiltInPolicyType } from '@authup/access';
import type { DataSource } from 'typeorm';
import { PolicyRepository } from '../../../../../../src/adapters/database/domains/index.ts';
import { DatabaseInjectionKey } from '../../../../../../src/app/index.ts';
import { createTestApplication } from '../../../../../app';
import { expectClientError } from '../../../../../utils';
import { createFakeTimePolicy } from '../../../../../utils/domains/policy';

describe('src/http/controllers/policy', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const ids : string[] = [];

    it('should create time policy', async () => {
        const { data: response } = await suite.client
            .policy
            .create(createFakeTimePolicy());

        expect(response).toBeDefined();

        ids.push(response.id);
    });

    it('should create custom policy', async () => {
        const { data: response } = await suite.client
            .policy
            .create({
                name: 'foo',
                type: 'foo',
            });

        expect(response).toBeDefined();
        ids.push(response.id);
    });

    it('should refuse an option for a custom policy', async () => {
        await expectClientError(
            () => suite.client.policy.create({
                name: 'foo-options',
                type: 'foo',
                bar: 'baz',
            }),
            { status: 400 },
        );
    });

    it('should refuse an attributes policy whose query uses $regex', async () => {
        await expectClientError(
            () => suite.client.policy.create({
                name: 'attributes-regex',
                type: BuiltInPolicyType.ATTRIBUTES,
                query: { name: { $regex: '/^(a+)+$/' } },
            }),
            { status: 400 },
        );

        await expectClientError(
            () => suite.client.policy.create({
                name: 'attributes-regex-nested',
                type: BuiltInPolicyType.ATTRIBUTES,
                query: { $or: [{ name: { $not: { $regex: 'a+' } } }] },
            }),
            { status: 400 },
        );
    });

    it('should create group policy', async () => {
        const { data: response } = await suite.client
            .policy.createBuiltIn({
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

    it('should store the options of children created inline', async () => {
        const identityChild = {
            name: 'group-inline-identity',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            types: ['client'],
        };
        const nestedChild = {
            name: 'group-inline-nested',
            type: BuiltInPolicyType.COMPOSITE,
            invert: false,
            decisionStrategy: 'affirmative',
            children: [createFakeTimePolicy({ name: 'group-inline-time' })],
        };

        const { data: response } = await suite.client
            .policy.createBuiltIn({
                name: 'group-inline-options',
                type: BuiltInPolicyType.COMPOSITE,
                invert: false,
                children: [identityChild, nestedChild],
            });

        const { data: children } = await suite.client
            .policy
            .getMany({ filters: { parentId: response.id } });

        const identity = children.find((child) => child.name === 'group-inline-identity') as Record<string, any>;
        const nested = children.find((child) => child.name === 'group-inline-nested') as Record<string, any>;

        expect(identity.types).toEqual(['client']);
        expect(nested.decisionStrategy).toEqual('affirmative');

        const { data: [time] } = await suite.client
            .policy
            .getMany({ filters: { parentId: nested.id } });

        expect(time).toEqual(expect.objectContaining({ start: '08:00:00', end: '16:00:00' }));
    });

    it('should read the children of a tree in a stable order', async () => {
        const { data: response } = await suite.client
            .policy.createBuiltIn({
                name: 'group-ordered',
                type: BuiltInPolicyType.COMPOSITE,
                invert: false,
                children: ['c', 'a', 'b'].map((suffix) => createFakeTimePolicy({ name: `group-ordered-${suffix}` })),
            });

        const repository = new PolicyRepository(suite.container.resolve<DataSource>(DatabaseInjectionKey.DataSource));
        const tree = await repository.findDescendantsTreeById(response.id);

        expect((tree as { children: { name: string }[] }).children.map((child) => child.name))
            .toEqual(['group-ordered-a', 'group-ordered-b', 'group-ordered-c']);
    });

    it('should refuse an inverted identity policy naming no type', async () => {
        await expectClientError(
            () => suite.client.policy.create({
                name: 'identity-inverted-open',
                type: BuiltInPolicyType.IDENTITY,
                invert: true,
            }),
            { status: 400 },
        );

        const { data: response } = await suite.client.policy.create({
            name: 'identity-inverted',
            type: BuiltInPolicyType.IDENTITY,
            invert: true,
            types: ['client'],
        });

        // an update replaces the options, so one dropping `types` is refused too
        await expectClientError(
            () => suite.client.policy.update(response.id, { description: 'open' }),
            { status: 400 },
        );
    });

    it('should read child policies', async () => {
        const response = await suite.client
            .policy
            .getMany({ filters: { parentId: ids[2] } });

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read collection', async () => {
        let response = await suite.client
            .policy
            .getMany();

        // totals, not page lengths: on mysql and postgres every spec file
        // shares one database, so both lists can fill a whole page
        const prevCount = response.meta.total;

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(2);

        response = await suite.client
            .policy
            .getMany({ filters: { parentId: null } });

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(2);
        expect(response.meta.total).toBeLessThan(prevCount);
    });

    it('should read time policy', async () => {
        const { data: response } = await suite.client
            .policy
            .getOne(ids[0]);

        expect(response).toBeDefined();
    });

    it('should update resource', async () => {
        const { data: response } = await suite.client
            .policy.updateBuiltIn(ids[0], {
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
            const { data: response } = await suite.client
                .policy
                .delete(ids[i]);

            expect(response)
                .toBeDefined();
        }
    });

    it('should create and update resource with put', async () => {
        const entity = createFakeTimePolicy();

        let { data: response } = await suite.client
            .policy.createOrUpdate(entity.name, entity);

        expect(response).toBeDefined();
        expect(response.name).toEqual(entity.name);

        const { id } = response;

        const { name } = createFakeTimePolicy();

        response = (await suite.client
            .policy
            .createOrUpdate(entity.name, {
                ...entity,
                name,
            })).data;

        expect(response).toBeDefined();
        expect(response.name).toEqual(name);
        expect(response.id).toEqual(id);
    });
});
