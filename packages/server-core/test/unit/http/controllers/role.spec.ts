/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import { expectPropertiesEqualToSrc } from '../../../utils/properties';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';

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

    it('should create resource', async () => {
        const response = await superTest
            .post('/roles')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        details.id = response.body.id;
    });

    it('should not create same resource', async () => {
        const response = await superTest
            .post('/roles')
            .send({
                name: details.name,
            } satisfies Partial<Role>)
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(409);
    });

    it('should read collection', async () => {
        const response = await superTest
            .get('/roles')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(2);
    });

    it('should read resource', async () => {
        const response = await superTest
            .get(`/roles/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should read resource by name', async () => {
        const response = await superTest
            .get(`/roles/${details.name}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should update resource', async () => {
        details.name = 'TestA';

        const response = await superTest
            .post(`/roles/${details.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should delete resource', async () => {
        const response = await superTest
            .delete(`/roles/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });
});
