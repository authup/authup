/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import {
    buildIdentityProviderAuthorizeCallbackPath,
    buildIdentityProviderAuthorizePath,
} from '@authup/core-kit';
import {
    createFakeLdapIdentityProvider,
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

    const oAuth2IdentityProvider = createFakeOAuth2IdentityProvider();
    const ldapIdentityProvider = createFakeLdapIdentityProvider();

    it('should create resource (oauth2)', async () => {
        const response = await suite.client
            .identityProvider
            .create(oAuth2IdentityProvider);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(oAuth2IdentityProvider, response);

        oAuth2IdentityProvider.id = response.id;
    });

    it('should create resource (ldap)', async () => {
        const response = await suite.client
            .identityProvider
            .create(ldapIdentityProvider);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(ldapIdentityProvider, response);

        ldapIdentityProvider.id = response.id;
    });

    it('should read collection', async () => {
        const response = await suite.client
            .identityProvider
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should read resource (oauth2)', async () => {
        const response = await suite.client
            .identityProvider
            .getOne(oAuth2IdentityProvider.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(oAuth2IdentityProvider, response);
    });

    it('should read resource (ldap)', async () => {
        const response = await suite.client
            .identityProvider
            .getOne(ldapIdentityProvider.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(ldapIdentityProvider, response);
    });

    it('should read resource by name', async () => {
        const response = await suite.client
            .identityProvider
            .getOne(oAuth2IdentityProvider.name);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(oAuth2IdentityProvider, response);
    });

    it('should update resource', async () => {
        oAuth2IdentityProvider.name = 'TestA';
        oAuth2IdentityProvider.client_secret = 'start1234';

        const response = await suite.client
            .identityProvider
            .update(oAuth2IdentityProvider.id, oAuth2IdentityProvider);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(oAuth2IdentityProvider, response);
    });

    it('should build authorize url', async () => {
        const response = await suite.client
            .get(
                buildIdentityProviderAuthorizePath(oAuth2IdentityProvider.id),
                {
                    redirect: 'manual',
                },
            );

        expect(response.status).toEqual(302);
        expect(response.headers.get('location')).toBeDefined();

        const responseURL = new URL(response.headers.get('location') as string);

        expect(responseURL.searchParams.get('response_type'))
            .toEqual('code');

        expect(responseURL.searchParams.get('client_id'))
            .toEqual(oAuth2IdentityProvider.client_id);

        expect(
            responseURL.searchParams.get('redirect_uri').endsWith(buildIdentityProviderAuthorizeCallbackPath(oAuth2IdentityProvider.id)),
        ).toBeTruthy();

        expect(responseURL.searchParams.get('state')).toBeDefined();
    });

    it('should delete resource (oauth2)', async () => {
        const response = await suite.client
            .identityProvider
            .delete(oAuth2IdentityProvider.id);

        expect(response.id).toBeDefined();
    });

    it('should delete resource (ldap)', async () => {
        const response = await suite.client
            .identityProvider
            .delete(ldapIdentityProvider.id);

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
