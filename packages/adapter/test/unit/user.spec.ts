/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MASTER_REALM_ID, User } from '@typescript-auth/domains';
import { expectPropertiesEqualToSrc } from '../utils/properties';
import { useSuperTest } from '../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../utils/database/connection';

describe('src/http/controllers/user', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<User> = {
        name: 'Test',
        name_locked: false,
        realm_id: MASTER_REALM_ID,
    };

    it('should get collection', async () => {
        const response = await superTest
            .get('/users')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(1);
    });

    it('should create, read, update, delete resource', async () => {
        let response = await superTest
            .post('/users')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);

        // ---------------------------------------------------------

        response = await superTest
            .get(`/users/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        // ---------------------------------------------------------

        details.name = 'TestA';

        response = await superTest
            .post(`/users/${response.body.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);

        // ---------------------------------------------------------

        response = await superTest
            .delete(`/users/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
    });
});
