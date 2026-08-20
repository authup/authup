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
import { Client as HTTPClient } from '@authup/core-http-kit';
import type { OAuth2IdentityProvider } from '@authup/core-kit';
import {
    IdentityProviderPreset,
    IdentityProviderProtocol,
    PermissionName,
    ScopeName,
    buildIdentityProviderAuthorizeCallbackPath,
    buildIdentityProviderAuthorizePath,
} from '@authup/core-kit';
import { base64URLEncode } from '@authup/kit';
import {
    createFakeClient,
    createFakeLdapIdentityProvider,
    createFakeOAuth2IdentityProvider,
    createFakeRealm,
    expectClientError,
    expectPropertiesEqualToSrc,
    httpRequest,
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

    const createIdentity = async (options: {
        realmId?: string,
        permissionNames?: PermissionName[],
    } = {}) => {
        const secret = 'identity-provider-gate-secret';

        const { data: client } = await suite.client.client.create({
            ...createFakeClient(),
            ...(options.realmId ? { realmId: options.realmId } : {}),
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            secret,
            secretHashed: false,
            secretEncrypted: false,
        });

        for (const permissionName of options.permissionNames ?? []) {
            const { data: permission } = await suite.client.permission.getOne(permissionName);
            await suite.client.clientPermission.create({
                clientId: client.id,
                permissionId: permission.id,
            });
        }

        const token = await suite.client.token.createWithClientCredentials({
            client_id: client.id,
            client_secret: secret,
        });

        const httpClient = new HTTPClient({ baseURL: suite.baseURL });
        httpClient.setAuthorizationHeader({ type: 'Bearer', token: token.access_token });

        return httpClient;
    };

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

    it('should not read resource without authentication', async () => {
        const response = await httpRequest(suite, 'GET', `/identity-providers/${oAuth2IdentityProvider.id!}`);

        expect(response.status).toEqual(401);

        // the record read carries the EA-extended entity, so an ungated
        // response hands out the provider's client secret (issue #3480)
        expect(await response.text()).not.toContain(oAuth2IdentityProvider.clientSecret);
    });

    it('should not read resource without a provider permission', async () => {
        const client = await createIdentity();

        // the record read is the surface that carries the provider's extra
        // attributes, so the permission check must decide it - the middleware
        // alone only answers the anonymous case (issue #3480)
        await expectClientError(
            () => client.identityProvider.getOne(oAuth2IdentityProvider.id!),
            { status: 403 },
        );
    });

    it('should not read a resource of another realm', async () => {
        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        const client = await createIdentity({
            realmId: realm.id,
            permissionNames: [PermissionName.IDENTITY_PROVIDER_READ],
        });

        // holds the permission, but its default `own` realm reach cannot
        // reach the master-realm provider
        await expectClientError(
            () => client.identityProvider.getOne(oAuth2IdentityProvider.id!),
            { status: 403 },
        );
    });

    it('should not carry extra attributes on the anonymous collection', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            `/identity-providers?filter[id]=${oAuth2IdentityProvider.id!}`,
        );

        expect(response.status).toEqual(200);

        // the documented anonymous substitute for the gated record read: it
        // stays safe only while findMany does not extend with extra attributes
        const body = await response.text();
        expect(body).toContain(oAuth2IdentityProvider.id!);
        expect(body).not.toContain(oAuth2IdentityProvider.clientSecret);
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

    // The update payload is partial by contract, and the EA save replaces the
    // whole attribute set, so automation written before `requiredAmr` existed
    // silently turned the upstream assurance gate off by saying nothing about
    // it.
    it('should keep an assurance allow-list an update never mentioned', async () => {
        const entity = createFakeOAuth2IdentityProvider({ requiredAmr: 'mfa' });
        const { data: created } = await suite.client.identityProvider.create(entity);

        expect((created as OAuth2IdentityProvider).requiredAmr).toEqual('mfa');

        // exactly what automation predating the field sends: the whole OAuth2
        // configuration it knows about, and nothing about `requiredAmr`
        const unaware : Record<string, any> = { ...entity };
        delete unaware.requiredAmr;

        await suite.client.identityProvider.update(created.id, {
            ...unaware,
            protocol: entity.protocol,
            displayName: 'renamed',
        });

        const { data: read } = await suite.client.identityProvider.getOne(created.id);

        expect(read.displayName).toEqual('renamed');
        expect((read as OAuth2IdentityProvider).requiredAmr).toEqual('mfa');

        await suite.client.identityProvider.delete(created.id);
    });

    // The documented clear path, and what the console submits for a blank
    // field: `null` is not "optional", so it survives validation and reaches
    // the save as a present key.
    it('should clear an assurance allow-list sent as null', async () => {
        const entity = createFakeOAuth2IdentityProvider({ requiredAmr: 'mfa' });
        const { data: created } = await suite.client.identityProvider.create(entity);

        await suite.client.identityProvider.update(created.id, {
            ...entity,
            requiredAmr: null,
        });

        const { data: read } = await suite.client.identityProvider.getOne(created.id);

        expect((read as OAuth2IdentityProvider).requiredAmr).toBeFalsy();

        await suite.client.identityProvider.delete(created.id);
    });

    // The exception to keeping omitted attributes: the old protocol's rows are
    // dead configuration no code reads any more, and one of them is a secret.
    it('should replace the attributes when the protocol changes', async () => {
        const entity = createFakeLdapIdentityProvider();
        const { data: created } = await suite.client.identityProvider.create(entity);

        const oauth2 = createFakeOAuth2IdentityProvider();
        await suite.client.identityProvider.update(created.id, {
            protocol: IdentityProviderProtocol.OAUTH2,
            clientId: oauth2.clientId,
            clientSecret: oauth2.clientSecret,
            tokenUrl: oauth2.tokenUrl,
            authorizeUrl: oauth2.authorizeUrl,
        });

        const { data: read } = await suite.client.identityProvider.getOne(created.id);

        expect(read.protocol).toEqual(IdentityProviderProtocol.OAUTH2);
        expect((read as Record<string, any>).password).toBeUndefined();

        await suite.client.identityProvider.delete(created.id);
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
