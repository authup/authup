/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    MASTER_REALM_ID, Role, User, UserRole,
} from '@authup/common';
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

    const user : Partial<User> = {
        name: 'Test',
        realm_id: MASTER_REALM_ID,
    };

    const role : Partial<Role> = {
        name: 'Test',
    };

    it('should get collection', async () => {
        const response = await superTest
            .get('/user-roles')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(1);
    });

    it('should create, read, update, delete resource', async () => {
        const userResponse = await superTest
            .post('/users')
            .send(user)
            .auth('admin', 'start123');

        expect(userResponse.status).toEqual(201);
        expect(userResponse.body).toBeDefined();

        const roleResponse = await superTest
            .post('/roles')
            .send(role)
            .auth('admin', 'start123');

        expect(roleResponse.status).toEqual(201);
        expect(roleResponse.body).toBeDefined();

        // ---------------------------------------------------------

        const userRole : Partial<UserRole> = {
            user_id: userResponse.body.id,
            role_id: roleResponse.body.id,
        };

        let response = await superTest
            .post('/user-roles')
            .send(userRole)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        const keys = ['user_id', 'role_id'];
        for (let i = 0; i < keys.length; i++) {
            expect(response.body[keys[i]]).toEqual(userRole[keys[i]]);
        }

        response = await superTest
            .get(`/user-roles/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        // ---------------------------------------------------------

        response = await superTest
            .delete(`/user-roles/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });
});
