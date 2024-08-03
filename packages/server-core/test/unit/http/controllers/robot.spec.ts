/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeRobot } from '../../../utils/domains';
import { expectPropertiesEqualToSrc } from '../../../utils/properties';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';

describe('src/http/controllers/robot', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details = createFakeRobot();

    it('should create resource', async () => {
        const response = await superTest
            .post('/robots')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);

        details.id = response.body.id;
    });

    it('should read collection', async () => {
        const response = await superTest
            .get('/robots')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(2);
    });

    it('should read resource', async () => {
        const response = await superTest
            .get(`/robots/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body, ['secret']);
    });

    it('should read resource by name', async () => {
        const response = await superTest
            .get(`/robots/${details.name}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body, ['secret']);
    });

    it('should update resource', async () => {
        details.name = 'baz';
        details.description = 'bar';

        const response = await superTest
            .post(`/robots/${details.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should delete resource', async () => {
        const response = await superTest
            .delete(`/robots/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });

    it('should create and update resource with put', async () => {
        const name : string = 'PutA';
        let response = await superTest
            .put(`/robots/${name}`)
            .send({
                name,
                secret: 'start123',
            })
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();
        expect(response.body.name).toEqual('PutA');

        const { id } = response.body;

        response = await superTest
            .put(`/robots/${name}`)
            .send({
                name: 'PutB',
            })
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();
        expect(response.body.name).toEqual('PutB');
        expect(response.body.id).toEqual(id);
    });
});
