/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it,
} from 'vitest';
import type { OAuth2IdentityProvider } from '@authup/core-kit';
import {
    IdentityProviderPreset,
    IdentityProviderProtocol,
    ScopeName,
    buildIdentityProviderAuthorizeCallbackPath,
    buildIdentityProviderAuthorizePath,
} from '@authup/core-kit';
import { base64URLEncode } from '@authup/kit';
import {
    createFakeClient,
    createFakeLdapIdentityProvider,
    createFakeOAuth2IdentityProvider,
    expectPropertiesEqualToSrc,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('src/http/controllers/identity-provider', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const oAuth2IdentityProvider = createFakeOAuth2IdentityProvider();
    const ldapIdentityProvider = createFakeLdapIdentityProvider();

    it('should create resource (oauth2)', async () => {
        const { data: response } = await suite.client
            .identityProvider
            .create(oAuth2IdentityProvider);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(oAuth2IdentityProvider, response);

        oAuth2IdentityProvider.id = response.id;
    });

    it('should create resource (ldap)', async () => {
        const { data: response } = await suite.client
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
        const { data: response } = await suite.client
            .identityProvider
            .getOne(oAuth2IdentityProvider.id!);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(oAuth2IdentityProvider, response);
    });

    it('should read resource (ldap)', async () => {
        const { data: response } = await suite.client
            .identityProvider
            .getOne(ldapIdentityProvider.id!);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(ldapIdentityProvider, response);
    });

    it('should read resource by name', async () => {
        const { data: response } = await suite.client
            .identityProvider
            .getOne(oAuth2IdentityProvider.name);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(oAuth2IdentityProvider, response);
    });

    it('should update resource', async () => {
        oAuth2IdentityProvider.name = 'testa';
        oAuth2IdentityProvider.clientSecret = 'start1234';
        oAuth2IdentityProvider.scope = 'openid profile';

        const { data: response } = await suite.client
            .identityProvider
            .update(oAuth2IdentityProvider.id!, oAuth2IdentityProvider);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(oAuth2IdentityProvider, response);
    });

    it('should build authorize url', async () => {
        // a federated login completes an RP's authorization request, so
        // authorize-out requires one (issue #3457), plus the challenge that
        // ties the resulting login handle to this browser (plan 094)
        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        const { data: client } = await suite.client.client.create(createFakeClient());
        await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });

        const codeRequest = base64URLEncode(JSON.stringify({
            response_type: 'code',
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: ScopeName.GLOBAL,
        }));

        const response = await suite.client
            .get(
                `${buildIdentityProviderAuthorizePath(oAuth2IdentityProvider.id!)}?codeRequest=${codeRequest}`,
                { redirect: 'manual' },
            );

        expect(response.status).toEqual(302);
        expect(response.headers.get('location')).toBeDefined();

        const responseURL = new URL(response.headers.get('location') as string);

        expect(responseURL.searchParams.get('response_type'))
            .toEqual('code');

        expect(responseURL.searchParams.get('client_id'))
            .toEqual(oAuth2IdentityProvider.clientId);

        expect(
            responseURL.searchParams.get('redirect_uri')!.endsWith(buildIdentityProviderAuthorizeCallbackPath(oAuth2IdentityProvider.id!)),
        ).toBeTruthy();

        expect(responseURL.searchParams.get('state')).toBeDefined();

        // this provider declares no requiredAcr, so nothing is asked for
        expect(responseURL.searchParams.get('acr_values')).toBeNull();
    });

    it('should persist the assurance allow-lists and ask the upstream for them', async () => {
        // the whole round-trip, because the attributes are EA rows and the
        // effective allow-list is the validator: a key nobody mounted is
        // stripped silently, which would leave the gate permanently inert
        const provider = createFakeOAuth2IdentityProvider({
            requiredAmr: 'mfa hwk',
            requiredAcr: 'urn:loa:silver, urn:loa:gold',
        });
        const { data: created } = await suite.client.identityProvider.create(provider);
        const { data: read } = await suite.client.identityProvider.getOne(created.id);

        // the typed client answers the base entity; the OAuth2 attributes ride
        // it as EA rows, which is what the narrower type describes
        const attributes = read as OAuth2IdentityProvider;
        expect(attributes.requiredAmr).toEqual('mfa hwk');
        expect(attributes.requiredAcr).toEqual('urn:loa:silver, urn:loa:gold');

        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        const { data: client } = await suite.client.client.create(createFakeClient());
        await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });

        const codeRequest = base64URLEncode(JSON.stringify({
            response_type: 'code',
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: ScopeName.GLOBAL,
        }));

        const response = await suite.client
            .get(
                `${buildIdentityProviderAuthorizePath(created.id)}?codeRequest=${codeRequest}`,
                { redirect: 'manual' },
            );

        const responseURL = new URL(response.headers.get('location') as string);

        // part 2: ask, rather than merely observe. Space-delimited per OIDC
        // Core 3.1.2.1, whichever separator the operator typed.
        expect(responseURL.searchParams.get('acr_values'))
            .toEqual('urn:loa:silver urn:loa:gold');

        await suite.client.identityProvider.delete(created.id);
    });

    it('should survive an acr value the extra-attribute column parses as a number', async () => {
        // "1" is the canonical PAPE / ISO-29115 level and the shortest value
        // the validator allows - and the EA value column round-trips through
        // destr, so it comes back as the NUMBER 1. Asserting the behaviour
        // rather than the read-back value, because the laundering is at the
        // persistence layer and the API response carries the number.
        const { data: created } = await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({ requiredAcr: '1' }));

        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        const { data: client } = await suite.client.client.create(createFakeClient());
        await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });

        const codeRequest = base64URLEncode(JSON.stringify({
            response_type: 'code',
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: ScopeName.GLOBAL,
        }));

        const response = await suite.client
            .get(
                `${buildIdentityProviderAuthorizePath(created.id)}?codeRequest=${codeRequest}`,
                { redirect: 'manual' },
            );

        // not a 400 blaming the authorize URL, which is what the raw
        // `.split()` on a number produced
        expect(response.status).toEqual(302);

        const responseURL = new URL(response.headers.get('location') as string);
        expect(responseURL.searchParams.get('acr_values')).toEqual('1');

        await suite.client.identityProvider.delete(created.id);
    });

    it('should persist the assurance allow-lists on a preset provider', async () => {
        // a preset is validated by its own attribute validator, so a key
        // mounted on only one of the two is stripped for half the providers
        const { data: created } = await suite.client.identityProvider.create({
            name: 'assurance-preset',
            protocol: IdentityProviderProtocol.OIDC,
            preset: IdentityProviderPreset.GOOGLE,
            enabled: true,
            clientId: 'preset-client-id',
            clientSecret: 'preset-client-secret',
            requiredAmr: 'mfa',
        } as any);
        const { data: read } = await suite.client.identityProvider.getOne(created.id);

        expect((read as OAuth2IdentityProvider).requiredAmr).toEqual('mfa');

        await suite.client.identityProvider.delete(created.id);
    });

    it('should delete resource (oauth2)', async () => {
        const { data: response } = await suite.client
            .identityProvider
            .delete(oAuth2IdentityProvider.id!);

        expect(response.id).toBeDefined();
    });

    it('should delete resource (ldap)', async () => {
        const { data: response } = await suite.client
            .identityProvider
            .delete(ldapIdentityProvider.id!);

        expect(response.id).toBeDefined();
    });

    it('should create and update resource with put', async () => {
        const entity = createFakeOAuth2IdentityProvider();
        let { data: response } = await suite.client
            .identityProvider.createOrUpdate(entity.name, entity);

        expect(response.name).toEqual(entity.name);

        const { id } = response;

        const { name } = createFakeOAuth2IdentityProvider();

        response = (await suite.client
            .identityProvider
            .createOrUpdate(entity.name, {
                ...entity,
                name,
            })).data;

        expect(response).toBeDefined();
        expect(response.name).toEqual(name);
        expect(response.id).toEqual(id);
    });
});
