/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import type { ClientCreatePayload } from '@authup/core-http-kit';
import {
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { ClientCredentialsService } from '../../../../../src/core';
import { createFakeClient, expectPropertiesEqualToSrc, httpRequest } from '../../../../utils';
import { createFakeTimePolicy } from '../../../../utils/domains/policy';
import { createTestApplication } from '../../../../app';

describe('http/controllers/client', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    let entity : Client;

    it('should create resource', async () => {
        const input = createFakeClient();
        const { data: response } = await suite.client
            .client
            .create(input);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(input, response);

        entity = response;
    });

    it('should create resource (generate secret)', async () => {
        const {
            name,
            displayName,
            redirectUri,
        } = createFakeClient();

        const input: ClientCreatePayload = {
            name,
            displayName,
            redirectUri,
            authMethod: 'none',
            tokenBindingMethod: 'none',
            secretHashed: false,
            secretEncrypted: false,
        };

        const { data: response } = await suite.client
            .client
            .create(input);

        expect(response).toBeDefined();
        expect(response.secret).toBeDefined();

        expectPropertiesEqualToSrc(input, response, ['secret']);
    });

    it('should create resource (hash secret)', async () => {
        const {
            name,
            displayName,
            redirectUri,
        } = createFakeClient();

        const input: ClientCreatePayload = {
            name,
            displayName,
            redirectUri,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret: 'foo',
            secretHashed: true,
            secretEncrypted: false,
        };

        const { data: response } = await suite.client
            .client
            .create(input);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(input, response, ['secret']);

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
        const { data: response } = await suite.client
            .client
            .getOne(entity.id);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(entity, response, ['secret']);
    });

    it('should read resource by name', async () => {
        const { data: response } = await suite.client
            .client
            .getOne(entity.name);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(entity, response, ['secret']);
    });

    it('should update resource', async () => {
        entity.name = 'baz';
        entity.description = 'bar';

        const { data: response } = await suite.client
            .client
            .update(entity.id, entity);

        expect(response).toBeDefined();
        expectPropertiesEqualToSrc(entity, response, [
            'createdAt',
            'updatedAt',
        ]);
    });

    it('should delete resource', async () => {
        const { data: response } = await suite.client
            .client
            .delete(entity.id);

        expect(response.id).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const { name } = createFakeClient();

        let { data: response } = await suite.client
            .client.create({
                name,
                secret: 'start123',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual(name);

        const { id } = response;

        const { name: nextName } = createFakeClient();

        response = (await suite.client
            .client
            .createOrUpdate(name, { name: nextName })).data;

        expect(response).toBeDefined();
        expect(response.name).toEqual(nextName);
        expect(response.id).toEqual(id);
    });

    it('should round-trip accessPolicyId through create, update and read', async () => {
        const { data: policy } = await suite.client.policy.create(createFakeTimePolicy());
        const { data: nextPolicy } = await suite.client.policy.create(createFakeTimePolicy());

        const { data: created } = await suite.client
            .client
            .create(createFakeClient({ accessPolicyId: policy.id }));

        expect(created.accessPolicyId).toEqual(policy.id);

        let { data: read } = await suite.client.client.getOne(created.id);
        expect(read.accessPolicyId).toEqual(policy.id);

        let { data: updated } = await suite.client
            .client.update(created.id, { accessPolicyId: nextPolicy.id });
        expect(updated.accessPolicyId).toEqual(nextPolicy.id);

        // clearing detaches the policy (null = default allow)
        updated = (await suite.client
            .client
            .update(created.id, { accessPolicyId: null })).data;
        expect(updated.accessPolicyId).toBeNull();

        read = (await suite.client.client.getOne(created.id)).data;
        expect(read.accessPolicyId).toBeNull();
    });

    // `scope` and `rootUrl` were dropped (issue #3355): the validator strips
    // them like any unmounted key, so a payload still carrying them is
    // accepted and answered without them. `baseUrl` stays and round-trips.
    it('should ignore the retired scope and rootUrl keys and round-trip baseUrl', async () => {
        const response = await httpRequest(suite, 'POST', '/clients', {
            headers: {
                Authorization: `Basic ${Buffer.from('admin:start123').toString('base64')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...createFakeClient(),
                baseUrl: 'https://app.example.com',
                scope: 'openid profile',
                rootUrl: 'https://app.example.com/root',
            }),
        });

        expect(response.status).toEqual(201);

        const { data: created } = await response.json();
        expect(created.baseUrl).toEqual('https://app.example.com');
        expect(created).not.toHaveProperty('scope');
        expect(created).not.toHaveProperty('rootUrl');

        const { data: read } = await suite.client.client.getOne(created.id);
        expect(read.baseUrl).toEqual('https://app.example.com');
        expect(read).not.toHaveProperty('scope');
        expect(read).not.toHaveProperty('rootUrl');
    });
});
