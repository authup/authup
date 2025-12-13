/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { createFakeRobot, expectPropertiesEqualToSrc } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/robot', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    const details = createFakeRobot();

    it('should create resource', async () => {
        const response = await suite.client
            .robot
            .create(details);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);

        details.id = response.id;
    });

    it('should create resource with no initial secret', async () => {
        const data = createFakeRobot();
        delete data.secret;

        const response = await suite.client
            .robot
            .create(data);

        expect(response).toBeDefined();
        expect(response.secret).toBeDefined();

        expectPropertiesEqualToSrc(data, response, ['secret']);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .robot
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .robot
            .getOne(details.id);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response, ['secret']);
    });

    it('should read resource by name', async () => {
        const response = await suite.client
            .robot
            .getOne(details.name);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response, ['secret']);
    });

    it('should update resource', async () => {
        details.name = 'baz';
        details.description = 'bar';

        const response = await suite.client
            .robot
            .update(details.id, details);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .robot
            .delete(details.id);

        expect(response.id).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const name : string = 'PutA';
        let response = await suite.client
            .robot
            .create({
                name,
                secret: 'start123',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutA');

        const { id } = response;

        response = await suite.client
            .robot
            .createOrUpdate(name, {
                name: 'PutB',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutB');
        expect(response.id).toEqual(id);
    });
});
