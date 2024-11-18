/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    RolePermission,
} from '@authup/core-kit';
import {
    createFakePermission, createFakeRole, createTestSuite,
    expectPropertiesEqualToSrc,
} from '../../../utils';

describe('src/http/controllers/role-permission', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    let entity : RolePermission | undefined;

    it('should create resource', async () => {
        const role = await suite.client.role.create(createFakeRole());
        const permission = await suite.client.permission.create(createFakePermission());

        entity = await suite.client
            .rolePermission
            .create({
                role_id: role.id,
                permission_id: permission.id,
            });

        expect(entity.role_id).toEqual(role.id);
        expect(entity.permission_id).toEqual(permission.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .rolePermission
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .rolePermission
            .getOne(entity.id);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(entity, response, ['role', 'permission']);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .rolePermission
            .delete(entity.id);

        expect(response.id).toBeDefined();
    });
});
