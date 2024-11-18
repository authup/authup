/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isClientError } from 'hapic';
import { createFakeRole, createTestSuite, expectPropertiesEqualToSrc } from '../../../utils';

describe('src/http/controllers/role', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    const details = createFakeRole();

    it('should create resource', async () => {
        const response = await suite.client
            .role
            .create(details);

        expect(response).toBeDefined();

        details.id = response.id;
    });

    it('should not create same resource', async () => {
        expect.assertions(1);

        try {
            await suite.client
                .role
                .create({
                    name: details.name,
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.statusCode).toEqual(409);
            }
        }
    });

    it('should read collection', async () => {
        const response = await suite.client
            .role
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toEqual(2);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .role
            .getOne(details.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);
    });

    it('should read resource by name', async () => {
        const response = await suite.client
            .role
            .getOne(details.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);
    });

    it('should update resource', async () => {
        const response = await suite.client
            .role
            .update(details.id, {
                ...details,
                name: 'TestA',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('TestA');

        details.name = 'TestA';
        expectPropertiesEqualToSrc(details, response);
    });

    it('should update resource by name', async () => {
        const response = await suite.client
            .role
            .update(details.name, {
                ...details,
                name: 'TestB',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('TestB');

        details.name = 'TestB';
        expectPropertiesEqualToSrc(details, response);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .role
            .delete(details.id);

        expect(response.id).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const name : string = 'PutA';

        let response = await suite.client
            .role
            .createOrUpdate(name, {
                name,
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutA');

        const { id } = response;

        response = await suite.client
            .role
            .createOrUpdate(name, {
                name: 'PutB',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutB');
        expect(response.id).toEqual(id);
    });
});
