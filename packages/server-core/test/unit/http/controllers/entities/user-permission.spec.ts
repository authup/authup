/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import type { UserPermission } from '@authup/core-kit';
import {
    createFakePermission,
    createFakeUser,
    createTestSuite,
    expectPropertiesEqualToSrc,
} from '../../../../utils';

describe('src/http/controllers/user-permission', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    let details : UserPermission | undefined;

    it('should create resource', async () => {
        const user = await suite.client.user.create(createFakeUser());
        const permission = await suite.client.permission.create(createFakePermission());

        details = await suite.client
            .userPermission
            .create({
                user_id: user.id,
                permission_id: permission.id,
            });

        expect(details.user_id).toEqual(user.id);
        expect(details.permission_id).toEqual(permission.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .userPermission
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .userPermission
            .getOne(details.id);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response, ['user', 'permission']);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .userPermission
            .delete(details.id);

        expect(response.id).toBeDefined();
    });
});
