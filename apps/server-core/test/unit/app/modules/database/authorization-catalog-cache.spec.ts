/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { BasePolicy } from '@authup/access';
import { BuiltInPolicyType } from '@authup/access';
import { EntityType } from '@authup/core-kit';
import type { ITaggedCache } from '@rapiq/cache';
import { PermissionDatabaseProvider } from '../../../../../src/app/modules/database/repositories/permission-provider/module.ts';
import {
    ClientPermissionEntity,
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyAttributeEntity,
    PolicyEntity,
    RolePermissionEntity,
    UserEntity,
    UserPermissionEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import { DatabaseInjectionKey, TaggedCacheInjectionKey } from '../../../../../src/app/index.ts';
import { createTestApplication } from '../../../../app';
import { createFakeClient, createFakeRealm, createFakeRole } from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';

const DEFINITIONS_KEY = 'authorization/definitions';

function readId(policy: BasePolicy) : string {
    return (policy as { id: string }).id;
}

describe('app/modules/database/repositories/permission-provider (cache, #3599, #3688)', () => {
    const suite = createTestApplication();
    let provider : PermissionDatabaseProvider;
    let tagged : ITaggedCache;

    beforeAll(async () => {
        await suite.setup();
        provider = new PermissionDatabaseProvider(
            suite.dataSource,
            suite.container.resolve(DatabaseInjectionKey.QueryCache),
        );
        tagged = suite.container.resolve(TaggedCacheInjectionKey);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function findDefinition(name: string) {
        const definitions = await provider.findDefinitions();

        return definitions.find(([permission]) => permission.name === name && permission.realmId === null);
    }

    async function findGrantTree(id: string) {
        const trees = await provider.findGrantPolicies();

        return trees.find((tree) => readId(tree) === id);
    }

    it('serves a second read from the cache', async () => {
        await provider.findDefinitions();
        await provider.findGrantPolicies();

        const find = vi.spyOn(suite.dataSource.manager.getRepository(PermissionEntity), 'find');
        const junctionFind = vi.spyOn(suite.dataSource.manager.getRepository(PermissionPolicyEntity), 'find');
        const grantRead = vi.spyOn(suite.dataSource.manager.getRepository(RolePermissionEntity), 'createQueryBuilder');

        const definitions = await provider.findDefinitions();
        const trees = await provider.findGrantPolicies();

        expect(definitions.length).toBeGreaterThan(0);
        expect(Array.isArray(trees)).toBe(true);
        expect(find).not.toHaveBeenCalled();
        expect(junctionFind).not.toHaveBeenCalled();
        expect(grantRead).not.toHaveBeenCalled();
    });

    it('hands out a copy, so a caller cannot write into the cached value', async () => {
        const first = await provider.findDefinitions();
        const [permission, trees] = first.find(([, policies]) => policies.length > 0)!;
        const { name } = permission;
        const { type } = (trees[0]!);

        permission.name = 'mutated';
        trees[0]!.type = 'mutated';

        const second = await provider.findDefinitions();
        const [, secondTrees] = second.find(([entry]) => entry.name === name)!;

        expect(second.some(([entry]) => entry.name === 'mutated')).toBe(false);
        expect(secondTrees[0]!.type).toEqual(type);
    });

    it('hands out a copy on a cache miss too', async () => {
        await tagged.invalidate([EntityType.PERMISSION]);

        const first = await provider.findDefinitions();
        const [permission] = first[0]!;
        const { name } = permission;

        permission.name = 'mutated';

        const second = await provider.findDefinitions();

        expect(second.some(([entry]) => entry.name === 'mutated')).toBe(false);
        expect(second.some(([entry]) => entry.name === name)).toBe(true);
    });

    it('drops an entry stored during the writing transaction once it commits', async () => {
        const stale = { permissions: [], trees: {} };

        await tagged.invalidate([EntityType.PERMISSION]);

        await suite.dataSource.transaction(async (manager) => {
            const permissions = manager.getRepository(PermissionEntity);

            await permissions.save(permissions.create({ name: 'issue3599_committed' }));

            // a concurrent reader repopulating the key with pre-commit rows
            await tagged.remember(
                DEFINITIONS_KEY,
                async () => stale,
                { tags: () => [EntityType.PERMISSION] },
            );

            const stored = await tagged.remember(
                DEFINITIONS_KEY,
                async () => {
                    throw new Error('The stale entry was not stored.');
                },
                { tags: () => [] },
            );

            expect(stored).toEqual(stale);
        });

        expect(await findDefinition('issue3599_committed')).toBeDefined();
    });

    it('never serves a read that an invalidation overtook', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);

        await provider.findDefinitions();

        // A read takes its rows, a write commits and invalidates, a second
        // reader stores fresh rows, and only then does the first read try to
        // store its stale rows over them.
        type Reader = { readDefinitions: () => Promise<unknown> };
        const original = (provider as unknown as Reader).readDefinitions.bind(provider);
        const spy = vi.spyOn(provider as unknown as Reader, 'readDefinitions')
            .mockImplementationOnce(async () => {
                const rows = await original();

                await permissions.save(permissions.create({ name: 'issue3599_overtaken' }));
                await provider.findDefinitions();

                return rows;
            });

        await tagged.invalidate([EntityType.PERMISSION]);
        await provider.findDefinitions();

        expect(await findDefinition('issue3599_overtaken')).toBeDefined();
        // the overtaken store was refused, so the fresh entry is the one served
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('sees a subtree moved under a bound policy', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const junctions = suite.dataSource.getRepository(PermissionPolicyEntity);
        const { data: moved } = await suite.client.policy.createBuiltIn({
            name: 'issue3599_moved',
            type: BuiltInPolicyType.COMPOSITE,
            invert: false,
            children: [createFakeTimePolicy()],
        });
        const { data: to } = await suite.client.policy.createBuiltIn({
            name: 'issue3599_to',
            type: BuiltInPolicyType.COMPOSITE,
            invert: false,
            children: [createFakeTimePolicy()],
        });

        const permission = await permissions.save(permissions.create({ name: 'issue3599_subtree' }));

        await junctions.save(junctions.create({ permissionId: permission.id, policyId: to.id }));

        type Tree = { id: string, children?: Tree[] };
        const shape = (tree: Tree) : unknown => ({ id: tree.id, children: (tree.children ?? []).map(shape) });
        const read = async () => shape((await findDefinition(permission.name))?.[1][0] as Tree);

        expect(await read()).toEqual({ id: to.id, children: [{ id: to.children![0]!.id, children: [] }] });

        await suite.client.policy.update(moved.id, { parentId: to.id });

        expect(await read()).toEqual({
            id: to.id,
            children: expect.arrayContaining([
                { id: moved.id, children: [{ id: moved.children![0]!.id, children: [] }] },
            ]),
        });
    });

    it('sees a child policy created under a bound policy', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const junctions = suite.dataSource.getRepository(PermissionPolicyEntity);
        const { data: parent } = await suite.client.policy.createBuiltIn({
            name: 'issue3599_parent',
            type: BuiltInPolicyType.COMPOSITE,
            invert: false,
            children: [createFakeTimePolicy()],
        });
        const permission = await permissions.save(permissions.create({ name: 'issue3599_child' }));

        await junctions.save(junctions.create({ permissionId: permission.id, policyId: parent.id }));

        const children = async () => ((await findDefinition(permission.name))?.[1][0] as { children?: BasePolicy[] })
            .children ?? [];

        expect(await children()).toHaveLength(1);

        // a bare save carries no attribute rows, so only the policy's own
        // insert hook can report it
        const policies = suite.dataSource.getRepository(PolicyEntity);

        await policies.save(policies.create({
            name: 'issue3599_bare_child',
            type: BuiltInPolicyType.IDENTITY,
            parentId: parent.id,
            parent: { id: parent.id } as PolicyEntity,
        }));

        expect(await children()).toHaveLength(2);
    });

    it('keeps every policy tree once', async () => {
        await tagged.invalidate([EntityType.PERMISSION]);
        await provider.findDefinitions();

        type Stored = { permissions: [unknown, string[]][], trees: Record<string, unknown> };
        const value = await tagged.remember<Stored>(
            DEFINITIONS_KEY,
            async () => {
                throw new Error('The definitions were not stored.');
            },
            { tags: () => [] },
        );
        const bound = new Set(value.permissions.flatMap(([, ids]) => ids));

        expect(Object.keys(value.trees).sort()).toEqual([...bound].sort());
    });

    it('sees a permission unowned by deleting its client', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const { data: client } = await suite.client.client.create(createFakeClient());

        await permissions.save(permissions.create({ name: 'issue3599_owned', clientId: client.id }));

        const find = async () => (await provider.findDefinitions())
            .find(([permission]) => permission.name === 'issue3599_owned');

        expect((await find())?.[0].clientId).toEqual(client.id);

        await suite.client.client.delete(client.id);

        expect((await find())?.[0].clientId).toBeNull();
    });

    it('sees the permissions of a deleted realm disappear', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const { data: realm } = await suite.client.realm.create(createFakeRealm());

        await permissions.save(permissions.create({ name: 'issue3599_realm', realmId: realm.id }));

        const find = async () => (await provider.findDefinitions())
            .find(([permission]) => permission.name === 'issue3599_realm');

        expect(await find()).toBeDefined();

        await suite.client.realm.delete(realm.id);

        expect(await find()).toBeUndefined();
    });

    it('sees a created permission', async () => {
        await provider.findDefinitions();

        const permissions = suite.dataSource.getRepository(PermissionEntity);

        await permissions.save(permissions.create({ name: 'issue3599_created' }));

        expect(await findDefinition('issue3599_created')).toBeDefined();
    });

    it('sees a permission-policy bound and unbound', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const junctions = suite.dataSource.getRepository(PermissionPolicyEntity);
        const permission = await permissions.save(permissions.create({ name: 'issue3599_bound' }));
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy());

        expect((await findDefinition(permission.name))?.[1]).toEqual([]);

        const junction = await junctions.save(junctions.create({ permissionId: permission.id, policyId: policy.id }));

        expect((await findDefinition(permission.name))?.[1].map(readId)).toEqual([policy.id]);

        await junctions.remove(junction);
        expect((await findDefinition(permission.name))?.[1]).toEqual([]);
    });

    it('sees an updated policy', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const junctions = suite.dataSource.getRepository(PermissionPolicyEntity);
        const policies = suite.dataSource.getRepository(PolicyEntity);
        const permission = await permissions.save(permissions.create({ name: 'issue3599_policy' }));
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy());

        await junctions.save(junctions.create({ permissionId: permission.id, policyId: policy.id }));

        expect((await findDefinition(permission.name))?.[1][0]).toMatchObject({ invert: false });

        const entity = await policies.findOneByOrFail({ id: policy.id });

        entity.invert = true;
        await policies.save(entity);

        expect((await findDefinition(permission.name))?.[1][0]).toMatchObject({ invert: true });
    });

    it('sees a changed policy attribute', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const junctions = suite.dataSource.getRepository(PermissionPolicyEntity);
        const attributes = suite.dataSource.getRepository(PolicyAttributeEntity);
        const permission = await permissions.save(permissions.create({ name: 'issue3599_attribute' }));
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy());

        await junctions.save(junctions.create({ permissionId: permission.id, policyId: policy.id }));

        expect((await findDefinition(permission.name))?.[1][0]).toMatchObject({
            type: BuiltInPolicyType.TIME,
            start: '08:00:00',
        });

        const attribute = await attributes.findOneByOrFail({ policyId: policy.id, name: 'start' });

        attribute.value = '09:00:00';
        await attributes.save(attribute);

        expect((await findDefinition(permission.name))?.[1][0]).toMatchObject({ start: '09:00:00' });
    });

    it('sees a role-permission grant policy', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const junctions = suite.dataSource.getRepository(RolePermissionEntity);
        const permission = await permissions.save(permissions.create({ name: 'issue3599_role' }));
        const { data: role } = await suite.client.role.create(createFakeRole());
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy());

        expect(await findGrantTree(policy.id)).toBeUndefined();

        await junctions.save(junctions.create({
            roleId: role.id,
            roleRealmId: role.realmId,
            permissionId: permission.id,
            policyId: policy.id,
        }));

        expect(await findGrantTree(policy.id)).toBeDefined();
    });

    it('sees a user-permission grant policy', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const junctions = suite.dataSource.getRepository(UserPermissionEntity);
        const permission = await permissions.save(permissions.create({ name: 'issue3599_user' }));
        const admin = await suite.dataSource.getRepository(UserEntity).findOneByOrFail({ name: 'admin' });
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy());

        expect(await findGrantTree(policy.id)).toBeUndefined();

        await junctions.save(junctions.create({
            userId: admin.id,
            userRealmId: admin.realmId,
            permissionId: permission.id,
            policyId: policy.id,
        }));

        expect(await findGrantTree(policy.id)).toBeDefined();
    });

    it('sees a client-permission grant policy', async () => {
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const junctions = suite.dataSource.getRepository(ClientPermissionEntity);
        const permission = await permissions.save(permissions.create({ name: 'issue3599_client' }));
        const { data: client } = await suite.client.client.create(createFakeClient());
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy());

        expect(await findGrantTree(policy.id)).toBeUndefined();

        await junctions.save(junctions.create({
            clientId: client.id,
            clientRealmId: client.realmId,
            permissionId: permission.id,
            policyId: policy.id,
        }));

        expect(await findGrantTree(policy.id)).toBeDefined();
    });
});
