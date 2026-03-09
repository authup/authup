/*
 * Copyright (c) 2021-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import type { User } from '@authup/core-kit';
import { createTestApplication } from '../../../../app';
import { createFakeUser, expectPropertiesEqualToSrc } from '../../../../utils';

describe('src/http/controllers/user', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    const details : Partial<User> = createFakeUser();

    it('should create resource', async () => {
        const response = await suite.client
            .user
            .create(details);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);

        details.id = response.id;
    });

    it('should read collection', async () => {
        const response = await suite.client
            .user
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .user
            .getOne(details.id, {
                fields: ['+email'],
            });

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response, ['password']);
    });

    it('should read resource by name', async () => {
        const response = await suite.client
            .user
            .getOne(details.name, {
                fields: ['+email'],
            });

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response, ['password']);
    });

    it('should update resource', async () => {
        details.name = 'TestA';
        details.first_name = 'bar';
        details.last_name = 'baz';

        const response = await suite.client
            .user
            .update(details.id, details);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(details, response, ['realm']);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .user
            .delete(details.id);

        expect(response.id).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const entity = createFakeUser();
        let response = await suite.client
            .user
            .createOrUpdate(entity.name, entity);

        expect(response).toBeDefined();
        expect(response.name).toEqual(entity.name);

        const { id } = response;

        const { name } = createFakeUser();

        response = await suite.client
            .user
            .createOrUpdate(entity.name, {
                ...entity,
                name,
            });

        expect(response.name).toEqual(name);
        expect(response.id).toEqual(id);
    });
});
