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
import type { UserPermission } from '@authup/core-kit';
import {
    createFakePermission,
    createFakeUser,
    expectPropertiesEqualToSrc,
} from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/user-permission', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    let details : UserPermission | undefined;

    it('should create resource', async () => {
        const { data: user } = await suite.client.user.create(createFakeUser());
        const { data: permission } = await suite.client.permission.create(createFakePermission());

        details = (await suite.client
            .userPermission
            .create({
                userId: user.id,
                permissionId: permission.id,
            })).data;

        expect(details.userId).toEqual(user.id);
        expect(details.permissionId).toEqual(permission.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .userPermission
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const { data: response } = await suite.client
            .userPermission
            .getOne(details!.id);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details!, response, ['user', 'permission']);
    });

    it('should delete resource', async () => {
        const { data: response } = await suite.client
            .userPermission
            .delete(details!.id);

        expect(response.id).toBeDefined();
    });
});
