/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserPermission } from '@authup/core-kit';
import { createSuperTestPermission, createSuperTestUser } from '../../../utils/domains';
import { expectPropertiesEqualToSrc } from '../../../utils/properties';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';

describe('src/http/controllers/user-permission', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<UserPermission> = {};

    it('should create resource', async () => {
        const { body: user } = await createSuperTestUser(superTest);
        const { body: permission } = await createSuperTestPermission(superTest);

        const response = await superTest
            .post('/user-permissions')
            .send({
                user_id: user.id,
                permission_id: permission.id,
            })
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        details.id = response.body.id;
        details.user_id = response.body.user_id;
        details.permission_id = response.body.permission_id;
    });

    it('should read collection', async () => {
        const response = await superTest
            .get('/user-permissions')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await superTest
            .get(`/user-permissions/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should delete resource', async () => {
        const response = await superTest
            .delete(`/user-permissions/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });
});
