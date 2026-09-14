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
    PermissionEntity,
    PermissionPolicyEntity,
    PolicyEntity,
} from '../../../../../src/adapters/database/domains/index.ts';
import { createTestApplication } from '../../../../app';

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

        const definitions = await provider.findAll();

        expect(definitions.length).toBeGreaterThanOrEqual(Object.values(PermissionName).length + 2);
        const keys = definitions.map((item) => buildPermissionKey(item.permission));
        expect(new Set(keys).size).toEqual(keys.length);

        const globalDefinition = definitions.find((item) => item.permission.name === global.name && item.permission.realmId === null);
        expect(globalDefinition?.permission).toEqual({
            name: 'plan109_read',
            realmId: null,
            clientId: null,
            decisionStrategy: null,
        });
        expect(globalDefinition?.policies.map((policy) => (policy as { id: string }).id).sort())
            .toEqual([binding.id, identity.id].sort());
        expect(globalDefinition?.policies.every((policy) => typeof policy.type === 'string')).toBe(true);

        const scopedDefinition = definitions.find((item) => item.permission.name === scoped.name && item.permission.realmId === realm.id);
        expect(scopedDefinition?.permission.clientId).toBeNull();
        expect(scopedDefinition?.policies).toEqual([]);

        // a provisioned permission carries the system default tree, loaded
        // with its children rather than as the bare junction row
        const userRead = definitions.find((item) => item.permission.name === PermissionName.USER_READ && item.permission.realmId === null);
        expect(userRead?.policies).toHaveLength(1);
        expect(userRead?.policies[0]).toMatchObject({
            type: BuiltInPolicyType.COMPOSITE,
            children: expect.arrayContaining([
                expect.objectContaining({ type: BuiltInPolicyType.PERMISSION_BINDING }),
            ]),
        });
    });
});
