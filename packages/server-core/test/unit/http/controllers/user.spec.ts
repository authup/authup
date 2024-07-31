/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { expectPropertiesEqualToSrc } from '../../../utils/properties';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';
import { createFakeUser } from '../../../utils/domains';

describe('src/http/controllers/user', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<User> = createFakeUser();

    it('should create resource', async () => {
        const response = await superTest
            .post('/users')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);

        details.id = response.body.id;
    });

    it('should read collection', async () => {
        const collectionResponse = await superTest
            .get('/users')
            .auth('admin', 'start123');

        expect(collectionResponse.status).toEqual(200);
        expect(collectionResponse.body).toBeDefined();
        expect(collectionResponse.body.data).toBeDefined();
        expect(collectionResponse.body.data.length).toEqual(2);
    });

    it('should read resource', async () => {
        const response = await superTest
            .get(`/users/${details.id}?fields=%2Bemail`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body, ['password']);
    });

    it('should read resource by name', async () => {
        const response = await superTest
            .get(`/users/${details.name}?fields=%2Bemail`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body, ['password']);
    });

    it('should update resource', async () => {
        details.name = 'TestA';
        details.first_name = 'bar';
        details.last_name = 'baz';

        const response = await superTest
            .post(`/users/${details.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should delete resource', async () => {
        const response = await superTest
            .delete(`/users/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });

    it('should create and update resource with put', async () => {
        const entity = createFakeUser();
        let response = await superTest
            .put(`/users/${entity.name}`)
            .send(entity)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();
        expect(response.body.name).toEqual(entity.name);

        const { id } = response.body;

        const { name } = createFakeUser();

        response = await superTest
            .put(`/users/${entity.name}`)
            .send({
                ...entity,
                name,
            })
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();
        expect(response.body.name).toEqual(name);
        expect(response.body.id).toEqual(id);
    });
});
