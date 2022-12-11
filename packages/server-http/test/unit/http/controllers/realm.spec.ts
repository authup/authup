/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';

describe('src/http/controllers/realm', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    it('should read collection', async () => {
        const response = await superTest
            .get('/realms');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(1);
    });

    it('should create, read, update, delete resource', async () => {
        const details = {
            name: 'Test',
        };

        let response = await superTest
            .post('/realms')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        let keys : string[] = Object.keys(details);
        for (let i = 0; i < keys.length; i++) {
            expect(response.body[keys[i]]).toEqual(details[keys[i]]);
        }

        // ---------------------------------------------------------

        response = await superTest
            .get(`/realms/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        // ---------------------------------------------------------

        details.name = 'TestA';

        response = await superTest
            .post(`/realms/${response.body.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();

        keys = Object.keys(details);
        for (let i = 0; i < keys.length; i++) {
            expect(response.body[keys[i]]).toEqual(details[keys[i]]);
        }

        // ---------------------------------------------------------

        response = await superTest
            .delete(`/realms/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });
});
