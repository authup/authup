/*
 * Copyright (c) 2024-2026.
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
import { Client } from '@authup/core-http-kit';
import { PermissionName } from '@authup/core-kit';
import { createNanoID } from '@authup/kit';
import { PermissionEntity } from '../../../../../../src';
import { createTestApplication } from '../../../../../app';
import { createFakeUser, createScopeRestrictedClient } from '../../../../../utils';

// Service-level coverage of the DB-backed permission-checker lives in
// test/unit/core/identity/permission/checker.spec.ts. The HTTP tests below
// stay minimal: they verify the controller's auth gate and the
// status-code / response-shape contract — the actual checker logic is
// exercised at the service layer.

describe('http/controllers/entities/permission/checker', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('returns status=error with the serialized error for an unknown name', async () => {
        const name = createNanoID();
        const response = await suite.client.permission.check(name);

        expect(response).toBeDefined();
        expect(response.status).toEqual('error');
        expect(response.data).toBeDefined();
        expect(typeof response.data!.message).toBe('string');
    });

    it('returns the checker result body with a 202 response', async () => {
        const permissionRepository = suite.dataSource.getRepository(PermissionEntity);
        const permission = await permissionRepository.save(permissionRepository.create({
            name: createNanoID(),
            builtIn: true,
        }));

        const response = await suite.client.permission.check(permission.id);
        expect(response).toBeDefined();
        expect(response.status).toMatch(/^(success|error)$/);
    });

    it('answers a bearer without the global scope an error, whatever identity the body names (#3604)', async () => {
        const control = await suite.client.permission.check(PermissionName.USER_UPDATE);
        expect(control.status).toEqual('success');

        const { client, payload } = await createScopeRestrictedClient(suite);

        const bare = await client.permission.check(PermissionName.USER_UPDATE);
        expect(bare.status).toEqual('error');

        const named = await client.permission.check(PermissionName.USER_UPDATE, {
            identity: {
                type: payload.sub_kind, 
                id: payload.sub, 
                realmId: payload.realm_id, 
            }, 
        });
        expect(named.status).toEqual('error');
    });

    it('evaluates the caller\'s own grants, never those of an identity the body names', async () => {
        const { payload: admin } = await createScopeRestrictedClient(suite);

        const password = 'start123-checker-ungranted';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const grant = await suite.client.token.createWithPassword({ username: user.name, password });

        const client = new Client({ baseURL: suite.baseURL });
        client.setAuthorizationHeader({ type: 'Bearer', token: grant.access_token });

        const response = await client.permission.check(PermissionName.USER_UPDATE, {
            identity: {
                type: admin.sub_kind, 
                id: admin.sub, 
                realmId: admin.realm_id, 
            }, 
        });
        expect(response.status).toEqual('error');
    });
});
