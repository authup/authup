/*
 * Copyright (c) 2026.
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
import { BuiltInPolicyType, buildPermissionKey } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import { PermissionDatabaseProvider } from '../../../../../src/app/modules/database/repositories/permission-provider/module.ts';
import {
    ClientPermissionEntity,
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyEntity,
    RolePermissionEntity,
    UserEntity,
    UserPermissionEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import { createTestApplication } from '../../../../app';
import { createFakeClient, createFakeRole } from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';

describe('app/modules/database/repositories/permission-provider (definitions)', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('answers every definition with its policy trees in one pass', async () => {
        const provider = new PermissionDatabaseProvider(suite.dataSource);
        const permissions = suite.dataSource.getRepository(PermissionEntity);
        const junctions = suite.dataSource.getRepository(PermissionPolicyEntity);
        const policies = suite.dataSource.getRepository(PolicyEntity);

        const { data: realm } = await suite.client.realm.getOne('master');
        const binding = await policies.findOneByOrFail({ type: BuiltInPolicyType.PERMISSION_BINDING });
        const identity = await policies.findOneByOrFail({ type: BuiltInPolicyType.IDENTITY });

        const global = await permissions.save(permissions.create({ name: 'plan109_read' }));
        const scoped = await permissions.save(permissions.create({ name: 'plan109_read', realmId: realm.id }));
        await junctions.save(junctions.create({ permissionId: global.id, policyId: binding.id }));
        await junctions.save(junctions.create({ permissionId: global.id, policyId: identity.id }));

        const definitions = await provider.findDefinitions();

        expect(definitions.length).toBeGreaterThanOrEqual(Object.values(PermissionName).length + 2);
        const keys = definitions.map(([permission]) => buildPermissionKey(permission));
        expect(new Set(keys).size).toEqual(keys.length);

        const globalDefinition = definitions.find(([permission]) => permission.name === global.name && permission.realmId === null);
        expect(globalDefinition?.[0]).toEqual({
            name: 'plan109_read',
            realmId: null,
            clientId: null,
            decisionStrategy: null,
        });
        expect(globalDefinition?.[1].map((policy) => (policy as { id: string }).id).sort())
            .toEqual([binding.id, identity.id].sort());
        expect(globalDefinition?.[1].every((policy) => typeof policy.type === 'string')).toBe(true);

        const scopedDefinition = definitions.find(([permission]) => permission.name === scoped.name && permission.realmId === realm.id);
        expect(scopedDefinition?.[0].clientId).toBeNull();
        expect(scopedDefinition?.[1]).toEqual([]);

        // a provisioned permission carries the system default tree, loaded
        // with its children rather than as the bare junction row
        const userRead = definitions.find(([permission]) => permission.name === PermissionName.USER_READ && permission.realmId === null);
        expect(userRead?.[1]).toHaveLength(1);
        expect(userRead?.[1][0]).toMatchObject({
            type: BuiltInPolicyType.COMPOSITE,
            children: expect.arrayContaining([
                expect.objectContaining({ type: BuiltInPolicyType.PERMISSION_BINDING }),
            ]),
        });
    });

    it('answers every policy tree the role, user and client junction rows name, each once', async () => {
        const provider = new PermissionDatabaseProvider(suite.dataSource);
        const permissions = suite.dataSource.getRepository(PermissionEntity);

        const admin = await suite.dataSource.getRepository(UserEntity).findOneByOrFail({ name: 'admin' });
        const { data: role } = await suite.client.role.create(createFakeRole());
        const { data: client } = await suite.client.client.create(createFakeClient());
        const { data: shared } = await suite.client.policy.create(createFakeTimePolicy());
        const { data: clientOnly } = await suite.client.policy.create(createFakeTimePolicy());
        const { data: unbound } = await suite.client.policy.create(createFakeTimePolicy());
        const permission = await permissions.save(permissions.create({ name: 'plan109_grant' }));

        const rolePermissions = suite.dataSource.getRepository(RolePermissionEntity);
        await rolePermissions.save(rolePermissions.create({
            roleId: role.id,
            roleRealmId: role.realmId,
            permissionId: permission.id,
            policyId: shared.id,
        }));
        const userPermissions = suite.dataSource.getRepository(UserPermissionEntity);
        await userPermissions.save(userPermissions.create({
            userId: admin.id,
            userRealmId: admin.realmId,
            permissionId: permission.id,
            policyId: shared.id,
        }));
        const clientPermissions = suite.dataSource.getRepository(ClientPermissionEntity);
        await clientPermissions.save(clientPermissions.create({
            clientId: client.id,
            clientRealmId: client.realmId,
            permissionId: permission.id,
            policyId: clientOnly.id,
        }));

        const trees = await provider.findGrantPolicies();
        const ids = trees.map((tree) => (tree as { id: string }).id);

        expect(ids.filter((id) => id === shared.id)).toHaveLength(1);
        expect(ids.filter((id) => id === clientOnly.id)).toHaveLength(1);
        expect(ids).not.toContain(unbound.id);
        expect(new Set(ids).size).toEqual(ids.length);
        for (const tree of trees) {
            expect(typeof tree.type).toBe('string');
        }
        expect(trees.find((tree) => (tree as { id: string }).id === shared.id)).toMatchObject({
            type: BuiltInPolicyType.TIME,
            start: '08:00:00',
            end: '16:00:00',
        });
    });
});
