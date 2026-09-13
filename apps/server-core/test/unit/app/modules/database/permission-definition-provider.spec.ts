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
import { BuiltInPolicyType } from '@authup/access';
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

    it('loads the definition policies of every requested namespace in one pass', async () => {
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

        const definitions = await provider.findDefinitions([
            {
                name: 'plan109_read', 
                realmId: null, 
                clientId: null, 
            },
            {
                name: 'plan109_read', 
                realmId: realm.id, 
                clientId: null, 
            },
            {
                name: 'plan109_missing', 
                realmId: null, 
                clientId: null, 
            },
        ]);

        expect(definitions).toHaveLength(2);

        const globalDefinition = definitions.find((item) => item.permission.realmId === null);
        expect(globalDefinition?.policies.map((policy) => (policy as { id: string }).id).sort())
            .toEqual([binding.id, identity.id].sort());
        expect(globalDefinition?.policies.every((policy) => typeof policy.type === 'string')).toBe(true);

        const scopedDefinition = definitions.find((item) => item.permission.realmId === realm.id);
        expect(scopedDefinition?.permission.name).toEqual(scoped.name);
        expect(scopedDefinition?.policies).toEqual([]);

        // The name is what the query binds, so a same-named row in another
        // namespace must be dropped by the key match rather than answered.
        const globalOnly = await provider.findDefinitions([
            {
                name: 'plan109_read', 
                realmId: null, 
                clientId: null, 
            },
        ]);
        expect(globalOnly.map((item) => item.permission.realmId)).toEqual([null]);
    });

    it('answers an empty list for no keys', async () => {
        const provider = new PermissionDatabaseProvider(suite.dataSource);
        expect(await provider.findDefinitions([])).toEqual([]);
    });
});
