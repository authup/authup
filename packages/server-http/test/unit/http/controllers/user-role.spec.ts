/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    UserRole,
} from '@authup/common';
import * as console from 'console';
import { createSuperTestRole, createSuperTestUser } from '../../../utils/domains';
import { expectPropertiesEqualToSrc } from '../../../utils/properties';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';

describe('src/http/controllers/user-role', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<UserRole> = {};

    it('should create resource', async () => {
        const { body: user } = await createSuperTestUser(superTest);
        const { body: role } = await createSuperTestRole(superTest);

        const response = await superTest
            .post('/user-roles')
            .send({
                user_id: user.id,
                role_id: role.id,
            })
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        details.id = response.body.id;
        details.user_id = response.body.user_id;
        details.role_id = response.body.role_id;
    });

    it('should read collection', async () => {
        const response = await superTest
            .get('/user-roles')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(2);
    });

    it('should read resource', async () => {
        const response = await superTest
            .get(`/user-roles/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should delete resource', async () => {
        const response = await superTest
            .delete(`/user-roles/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });
});
