/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    PolicyAttributeEntity,
    PolicyEntity,
    PolicyRepository,
    UserAttributeEntity,
    UserEntity,
    UserRepository,
} from '../../../../src/adapters/database/domains/index.ts';
import { createTestApplication } from '../../../app/index.ts';
import { createFakeUser } from '../../../utils/index.ts';

// An attribute row named like a column or relation of its parent (written
// before the services refused such a name, or by anything bypassing them)
// must never replace that column on the read that flattens the attributes
// onto the entity: the identity read serves the result as claims.
describe('adapters/database/extra-attribute-repository (column shadowing)', () => {
    const suite = createTestApplication();

    let repository: UserRepository;
    let user: User;

    beforeAll(async () => {
        await suite.setup();
        repository = new UserRepository(suite.dataSource);

        const { data } = await suite.client.user.create({
            ...createFakeUser(),
            email: 'owner@example.com',
        });

        user = data;

        const attributes = suite.dataSource.getRepository(UserAttributeEntity);

        for (const [name, value] of Object.entries({
            email: 'attacker@example.com',
            name: 'shadowed',
            realm: 'shadowed',
            theme: 'dark',
        })) {
            await attributes.save(attributes.create({
                name,
                value,
                userId: user.id,
                realmId: user.realmId,
            }));
        }
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function load() {
        return suite.dataSource.getRepository(UserEntity)
            .createQueryBuilder('user')
            .addSelect('user.email')
            .where('user.id = :id', { id: user.id })
            .getOneOrFail();
    }

    it('should keep the columns and relations of a single entity', async () => {
        const entity = await repository.extendOneWithEA<Record<string, any>>(await load());

        expect(entity.email).toEqual('owner@example.com');
        expect(entity.name).toEqual(user.name);
        expect(entity.realm).toBeUndefined();
        expect(entity.theme).toEqual('dark');
    });

    it('should keep the columns and relations of every entity', async () => {
        const [entity] = await repository.extendManyWithEA<Record<string, any>>([await load()]);

        expect(entity.email).toEqual('owner@example.com');
        expect(entity.name).toEqual(user.name);
        expect(entity.realm).toBeUndefined();
        expect(entity.theme).toEqual('dark');
    });

    it('should keep the columns of a policy read through the tree', async () => {
        const policies = suite.dataSource.getRepository(PolicyEntity);
        const policy = await policies.save(policies.create({
            name: `shadow_policy_${Date.now()}`,
            type: 'composite',
            invert: false,
            builtIn: false,
            realmId: null,
        }));

        const attributes = suite.dataSource.getRepository(PolicyAttributeEntity);

        for (const [name, value] of Object.entries({
            invert: 'true',
            name: 'shadowed',
            decisionStrategy: 'affirmative',
        })) {
            await attributes.save(attributes.create({
                name,
                value,
                policyId: policy.id,
                realmId: null,
            }));
        }

        const tree = new PolicyRepository(suite.dataSource);
        const [entity] = await tree.extendManyWithEA<Record<string, any>>([await policies.findOneByOrFail({ id: policy.id })]);

        expect(entity.invert).toEqual(false);
        expect(entity.name).toEqual(policy.name);
        expect(entity.decisionStrategy).toEqual('affirmative');
    });
});
