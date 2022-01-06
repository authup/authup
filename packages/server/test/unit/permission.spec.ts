/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Permission, PermissionID } from '@typescript-auth/common';
import { useSuperTest } from '../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../utils/database/connection';

describe('src/controllers/auth/permission', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<Permission> = {
        id: 'test_add',
    };

    it('should read collection', async () => {
        const response = await superTest
            .get('/permissions')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(Object.values(PermissionID).length);
    });

    it('should create, read resource', async () => {
        let response = await superTest
            .post('/permissions')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        const keys : string[] = Object.keys(details);
        for (let i = 0; i < keys.length; i++) {
            expect(response.body[keys[i]]).toEqual(details[keys[i]]);
        }

        // ---------------------------------------------------------

        response = await superTest
            .get(`/permissions/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
    });
});
