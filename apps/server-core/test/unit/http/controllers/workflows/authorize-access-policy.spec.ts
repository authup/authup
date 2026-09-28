/*
 * Copyright (c) 2026.
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
import { BuiltInPolicyType } from '@authup/access';
import type { Policy, Realm, Scope } from '@authup/core-kit';
import { IdentityType, ScopeName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { OAuth2AuthorizationResponseType, OAuth2ErrorCode } from '@authup/specs';
import { ClientEntity } from '../../../../../src/adapters/database/domains/client/entity.ts';
import { generateOAuth2CodeVerifier } from '../../../../../src/core';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    expectClientError,
} from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('http/controllers/workflows/authorize (access policy, plan 052)', () => {
    const suite = createTestApplication();

    let realm: Realm;
    let scope: Scope;
    let denyPolicy: Policy;
    let allowPolicy: Policy;
    let userClient: HTTPClient;

    beforeAll(async () => {
        await suite.setup();

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        scope = (await suite.client.scope.getOne(ScopeName.GLOBAL)).data;

        // an identity policy restricted to clients denies every user; without
        // a type restriction it permits every identity
        denyPolicy = (await suite.client.policy.createBuiltIn({
            name: 'authorize-access-deny',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            types: [IdentityType.CLIENT],
            realmId: null,
        })).data;
        allowPolicy = (await suite.client.policy.createBuiltIn({
            name: 'authorize-access-allow',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            realmId: null,
        })).data;

        // non-admin bearer: a plain user in the client's realm
        const password = generateOAuth2CodeVerifier();
        const { data: user } = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password,
        }));
        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realm.id,
        });

        userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const createGatedClient = async (accessPolicyId: string | null) => {
        const { data: client } = await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
            accessPolicyId,
        }));
        await suite.client.clientScope.create({
            scopeId: scope.id,
            clientId: client.id,
        });
        return client;
    };

    const confirm = (clientId: string, state: string) => userClient.authorize.confirm({
        response_type: OAuth2AuthorizationResponseType.CODE,
        client_id: clientId,
        redirect_uri: 'https://example.com/redirect',
        scope: `${ScopeName.GLOBAL}`,
        state,
    });

    it('should answer a policy denial as an error redirect when the redirect_uri is verified', async () => {
        const client = await createGatedClient(denyPolicy.id);
        const state = generateOAuth2CodeVerifier();

        // NOT a thrown 400 — the verified case comes back 200 { url } and the
        // kit navigates it like any success (RFC 6749 §4.1.2.1)
        const response = await confirm(client.id, state);

        expect(response.url).toBeDefined();

        const url = new URL(response.url);
        expect(url.origin).toEqual('https://example.com');
        expect(url.searchParams.get('error')).toEqual(OAuth2ErrorCode.ACCESS_DENIED);
        expect(url.searchParams.get('state')).toEqual(state);
        expect(url.searchParams.get('code')).toBeNull();
    });

    it('should issue a code when the access policy permits the identity', async () => {
        const client = await createGatedClient(allowPolicy.id);
        const state = generateOAuth2CodeVerifier();

        const response = await confirm(client.id, state);

        const url = new URL(response.url);
        expect(url.searchParams.get('error')).toBeNull();
        expect(url.searchParams.get('code')).toBeTruthy();
        expect(url.searchParams.get('state')).toEqual(state);
    });

    it('should issue a code for a policy-less client (default allow)', async () => {
        const client = await createGatedClient(null);

        const response = await confirm(client.id, generateOAuth2CodeVerifier());

        const url = new URL(response.url);
        expect(url.searchParams.get('error')).toBeNull();
        expect(url.searchParams.get('code')).toBeTruthy();
    });

    describe('a policy of another realm', () => {
        let foreignPolicy: Policy;

        beforeAll(async () => {
            const { data: master } = await suite.client.realm.getOne('master');
            foreignPolicy = (await suite.client.policy.createBuiltIn({
                name: 'authorize-access-allow-foreign',
                type: BuiltInPolicyType.IDENTITY,
                invert: false,
                realmId: master.id,
            })).data;
        });

        // a binding the API refuses, written the way an older release stored it
        const bindForeign = async () => {
            const client = await createGatedClient(null);
            await suite.dataSource
                .getRepository(ClientEntity)
                .save({ id: client.id, accessPolicyId: foreignPolicy.id });
            return client;
        };

        it('should deny when the bound policy belongs to another realm', async () => {
            const client = await bindForeign();

            const response = await confirm(client.id, generateOAuth2CodeVerifier());

            const url = new URL(response.url);
            expect(url.searchParams.get('error')).toEqual(OAuth2ErrorCode.ACCESS_DENIED);
            expect(url.searchParams.get('code')).toBeNull();
        });

        it('should update a client carrying such a binding when the binding is unchanged', async () => {
            const client = await bindForeign();

            const { data: updated } = await suite.client.client.update(client.id, {
                displayName: 'renamed',
                accessPolicyId: foreignPolicy.id,
            });

            expect(updated.displayName).toEqual('renamed');
        });

        it('should refuse binding it on create and on update', async () => {
            await expectClientError(
                () => createGatedClient(foreignPolicy.id),
                { status: 400 },
            );

            const client = await createGatedClient(null);
            await expectClientError(
                () => suite.client.client.update(client.id, { accessPolicyId: foreignPolicy.id }),
                { status: 400 },
            );
        });
    });
});
