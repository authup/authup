/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { isClientError } from 'hapic';
import {
    createFakePermission,
    expectPropertiesEqualToSrc,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('src/http/controllers/permission', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    const details = createFakePermission();

    it('should create collection', async () => {
        const response = await suite.client
            .permission
            .create(details);

        expect(response).toBeDefined();

        details.id = response.id;
    });

    it('should not create same resource', async () => {
        expect.assertions(1);

        try {
            await suite.client
                .permission
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
            .permission
            .getMany();

        expect(response).toBeDefined();
        expect(response.data).toBeDefined();

        expect(response.data.length).toBeLessThanOrEqual(50);
        expect(response.data.length).toBeGreaterThan(0);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .permission
            .getOne(details.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);
    });

    it('should read resource by name', async () => {
        const response = await suite.client
            .permission
            .getOne(details.name);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);
    });

    it('should update resource', async () => {
        const response = await suite.client
            .permission
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
            .permission
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
            .permission
            .delete(details.id);

        expect(response).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const name : string = 'PutA';

        let response = await suite.client
            .permission
            .createOrUpdate(name, {
                name,
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutA');

        const { id } = response;

        response = await suite.client
            .permission
            .createOrUpdate(name, {
                name: 'PutB',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutB');
        expect(response.id).toEqual(id);
    });
});
