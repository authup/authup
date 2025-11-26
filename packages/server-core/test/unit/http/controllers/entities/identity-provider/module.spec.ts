/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import type { IdentityProvider } from '@authup/core-kit';
import {
    buildIdentityProviderAuthorizePath,
} from '@authup/core-kit';
import { createOAuth2IdentityProviderFlow } from '../../../../../../src';
import {
    createFakeOAuth2IdentityProvider,
    createTestSuite,
    expectPropertiesEqualToSrc,
} from '../../../../../utils';

describe('src/http/controllers/identity-provider', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    const details = createFakeOAuth2IdentityProvider();

    it('should create resource', async () => {
        const response = await suite.client
            .identityProvider
            .create(details);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);

        details.id = response.id;
    });

    it('should read collection', async () => {
        const response = await suite.client
            .identityProvider
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const response = await suite.client
            .identityProvider
            .getOne(details.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);
    });

    it('should read resource by name', async () => {
        const response = await suite.client
            .identityProvider
            .getOne(details.name);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);
    });

    it('should update resource', async () => {
        details.name = 'TestA';
        details.client_secret = 'start1234';

        const response = await suite.client
            .identityProvider
            .update(details.id, details);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);
    });

    it('should build authorize url', async () => {
        const response = await suite.client
            .get(
                buildIdentityProviderAuthorizePath(details.id),
                {
                    redirect: 'manual',
                },
            );

        expect(response.status).toEqual(302);
        expect(response.headers.get('location')).toBeDefined();

        const flow = createOAuth2IdentityProviderFlow(details as IdentityProvider);

        const responseURL = new URL(response.headers.get('location') as string);
        const flowURL = new URL(flow.buildRedirectURL());

        expect(responseURL.searchParams.get('response_type'))
            .toEqual(flowURL.searchParams.get('response_type'));

        expect(responseURL.searchParams.get('client_id'))
            .toEqual(flowURL.searchParams.get('client_id'));

        expect(responseURL.searchParams.get('redirect_uri'))
            .toEqual(flowURL.searchParams.get('redirect_uri'));

        expect(responseURL.searchParams.get('state')).toBeDefined();
    });

    it('should delete resource', async () => {
        const response = await suite.client
            .identityProvider
            .delete(details.id);

        expect(response.id).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const entity = createFakeOAuth2IdentityProvider();
        let response = await suite.client
            .identityProvider
            .createOrUpdate(entity.name, entity);

        expect(response.name).toEqual(entity.name);

        const { id } = response;

        const { name } = createFakeOAuth2IdentityProvider();

        response = await suite.client
            .identityProvider
            .createOrUpdate(entity.name, {
                ...entity,
                name,
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual(name);
        expect(response.id).toEqual(id);
    });
});
