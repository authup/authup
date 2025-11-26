/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import type { Scope } from '@authup/core-kit';
import { isClientError } from 'hapic';
import { createFakeScope, createTestSuite, expectPropertiesEqualToSrc } from '../../../../utils';

describe('src/http/controllers/scope', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    const details = createFakeScope();

    it('should create resource', async () => {
        const response = await suite.client
            .scope
            .create(details);

        expect(response).toBeDefined();

        details.id = response.id;
    });

    it('should not create same resource', async () => {
        expect.assertions(1);

        try {
            await suite.client
                .scope
                .create({
                    name: details.name,
                } satisfies Partial<Scope>);
        } catch (e) {
            if (isClientError(e)) {
                expect(e.statusCode).toEqual(409);
            }
        }
    });

    it('should read collection', async () => {
        const response = await suite.client
            .scope
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .scope
            .getOne(details.id);

        expectPropertiesEqualToSrc(details, response);
    });

    it('should read resource by name', async () => {
        const response = await suite.client
            .scope
            .getOne(details.name);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);
    });

    it('should update resource', async () => {
        const response = await suite.client
            .scope
            .update(details.id, {
                ...details,
                name: 'TestA',
            });

        expect(response.name).toEqual('TestA');

        details.name = 'TestA';
        expectPropertiesEqualToSrc(details, response);
    });

    it('should update resource by name', async () => {
        const response = await suite.client
            .scope
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
            .scope
            .delete(details.id);

        expect(response.id).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const name : string = 'PutA';
        let response = await suite.client
            .scope
            .createOrUpdate(name, {
                name,
            });

        expect(response.name).toEqual('PutA');

        const { id } = response;

        response = await suite.client
            .scope
            .createOrUpdate(name, {
                name: 'PutB',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutB');
        expect(response.id).toEqual(id);
    });
});
