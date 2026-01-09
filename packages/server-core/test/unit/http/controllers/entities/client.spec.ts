/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { ClientCredentialsService } from '../../../../../src/core';
import { createFakeClient, expectPropertiesEqualToSrc } from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('http/controllers/client', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    let entity : Client;

    it('should create resource', async () => {
        const input = createFakeClient();
        const response = await suite.client
            .client
            .create(input);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(input, response);

        entity = response;
    });

    it('should create resource (generate secret)', async () => {
        const {
            name,
            display_name: displayName,
            redirect_uri: redirectUri,
        } = createFakeClient();

        const input : Partial<Client> = {
            name,
            display_name: displayName,
            redirect_uri: redirectUri,
            is_confidential: false,
            secret_hashed: false,
            secret_encrypted: false,
        };

        const response = await suite.client
            .client
            .create(input);

        expect(response).toBeDefined();
        expect(response.secret).toBeDefined();

        expectPropertiesEqualToSrc(input, response, ['secret']);
    });

    it('should create resource (hash secret)', async () => {
        const {
            name,
            display_name: displayName,
            redirect_uri: redirectUri,
        } = createFakeClient();

        const input : Partial<Client> = {
            name,
            display_name: displayName,
            redirect_uri: redirectUri,
            is_confidential: true,
            secret: 'foo',
            secret_hashed: true,
            secret_encrypted: false,
        };

        let response = await suite.client
            .client
            .create(input);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(input, response, [
            'created_at',
            'updated_at',
        ]);

        response = await suite.client
            .client
            .getOne(response.id, {
                fields: ['+secret'],
            });

        const credentialsService = new ClientCredentialsService();
        const verified = await credentialsService.verify(input.secret!, response);

        expect(verified).toBeTruthy();
    });

    it('should read collection', async () => {
        const response = await suite.client
            .client
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .client
            .getOne(entity.id);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(entity, response, ['secret']);
    });

    it('should read resource by name', async () => {
        const response = await suite.client
            .client
            .getOne(entity.name);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(entity, response, ['secret']);
    });

    it('should update resource', async () => {
        entity.name = 'baz';
        entity.description = 'bar';

        const response = await suite.client
            .client
            .update(entity.id, entity);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(entity, response, [
            'created_at',
            'updated_at',
        ]);
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .client
            .delete(entity.id);

        expect(response.id).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const name : string = 'PutA';
        let response = await suite.client
            .client
            .create({
                name,
                secret: 'start123',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutA');

        const { id } = response;

        response = await suite.client
            .client
            .createOrUpdate(name, {
                name: 'PutB',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('PutB');
        expect(response.id).toEqual(id);
    });
});
