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
import type { RolePermission } from '@authup/core-kit';
import {
    createFakePermission,
    createFakeRole,
    expectPropertiesEqualToSrc,
} from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/role-permission', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    let entity : RolePermission | undefined;

    it('should create resource', async () => {
        const { data: role } = await suite.client.role.create(createFakeRole());
        const { data: permission } = await suite.client.permission.create(createFakePermission());

        entity = (await suite.client
            .rolePermission
            .create({
                roleId: role.id,
                permissionId: permission.id,
            })).data;

        expect(entity.roleId).toEqual(role.id);
        expect(entity.permissionId).toEqual(permission.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .rolePermission
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const { data: response } = await suite.client
            .rolePermission
            .getOne(entity!.id);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(entity!, response, ['role', 'permission']);
    });

    it('should delete resource', async () => {
        const { data: response } = await suite.client
            .rolePermission
            .delete(entity!.id);

        expect(response.id).toBeDefined();
    });
});
