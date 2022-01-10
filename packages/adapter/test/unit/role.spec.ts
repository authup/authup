/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Role } from '@typescript-auth/domains';
import * as console from 'console';
import { useSuperTest } from '../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../utils/database/connection';

describe('src/http/controllers/role', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<Role> = {
        name: 'Test',
    };

    it('should read collection', async () => {
        const response = await superTest
            .get('/roles')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(1);
    });

    it('should create, read, update, delete resource', async () => {
        let response = await superTest
            .post('/roles')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        let keys : string[] = Object.keys(details);
        for (let i = 0; i < keys.length; i++) {
            expect(response.body[keys[i]]).toEqual(details[keys[i]]);
        }

        // ---------------------------------------------------------

        response = await superTest
            .get(`/roles/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        // ---------------------------------------------------------

        details.name = 'TestA';

        response = await superTest
            .post(`/roles/${response.body.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        keys = Object.keys(details);
        for (let i = 0; i < keys.length; i++) {
            expect(response.body[keys[i]]).toEqual(details[keys[i]]);
        }

        // ---------------------------------------------------------

        response = await superTest
            .delete(`/roles/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
    });
});
