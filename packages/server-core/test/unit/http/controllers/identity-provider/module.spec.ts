/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider } from '@authup/core-kit';
import {
    buildIdentityProviderAuthorizePath,
} from '@authup/core-kit';
import { createOAuth2IdentityProviderFlow } from '../../../../../src';
import { createFakeOAuth2IdentityProvider } from '../../../../utils/domains';
import { expectPropertiesEqualToSrc } from '../../../../utils/properties';
import { useSuperTest } from '../../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';

describe('src/http/controllers/identity-provider', () => {
    let superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    const details = createFakeOAuth2IdentityProvider();

    it('should create resource', async () => {
        const response = await superTest
            .post('/identity-providers')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);

        details.id = response.body.id;
    });

    it('should read collection', async () => {
        const response = await superTest
            .get('/identity-providers')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await superTest
            .get(`/identity-providers/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should read resource by slug', async () => {
        const response = await superTest
            .get(`/identity-providers/${details.slug}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should update resource', async () => {
        details.name = 'TestA';
        details.client_secret = 'start1234';

        const response = await superTest
            .post(`/identity-providers/${details.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should build authorize url', async () => {
        const response = await superTest
            .get(buildIdentityProviderAuthorizePath(details.id))
            .auth('admin', 'start123');

        expect(response.status).toEqual(302);
        expect(response.header.location).toBeDefined();

        const flow = createOAuth2IdentityProviderFlow(details as IdentityProvider);

        expect(response.header.location).toEqual(flow.buildAuthorizeURL());
    });

    it('should delete resource', async () => {
        const response = await superTest
            .delete(`/identity-providers/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });

    it('should create and update resource with put', async () => {
        const entity = createFakeOAuth2IdentityProvider();
        let response = await superTest
            .put(`/identity-providers/${entity.name}`)
            .send(entity)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();
        expect(response.body.name).toEqual(entity.name);

        const { id } = response.body;

        const { name } = createFakeOAuth2IdentityProvider();

        response = await superTest
            .put(`/identity-providers/${entity.name}`)
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
