/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeRealm, createTestSuite, expectPropertiesEqualToSrc } from '../../../utils';

describe('src/http/controllers/realm', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    const details = createFakeRealm();

    it('should create resource', async () => {
        const response = await suite.client
            .realm
            .create(details);

        expectPropertiesEqualToSrc(details, response);

        details.id = response.id;
    });

    it('should read collection', async () => {
        const response = await suite.client
            .realm
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toEqual(2);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .realm
            .getOne(details.id);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response);
    });

    it('should read resource by name', async () => {
        const response = await suite.client
            .realm
            .getOne(details.name);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response);
    });

    it('should update resource', async () => {
        const response = await suite.client
            .realm
            .update(details.id, details);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .realm
            .delete(details.id);

        expect(response.id).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const name : string = 'PutA';
        let response = await suite.client
            .realm
            .createOrUpdate(name, { name });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutA');

        const { id } = response;

        response = await suite.client
            .realm
            .createOrUpdate(name, { name: 'PutB' });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutB');
        expect(response.id).toEqual(id);
    });
});
