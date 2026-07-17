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
import { generateOAuth2CodeVerifier } from '../../../../../src/core';
import { createFakeClient, createFakeRealm, createFakeUser } from '../../../../utils';
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

        realm = await suite.client.realm.create(createFakeRealm());
        scope = await suite.client.scope.getOne(ScopeName.GLOBAL);

        // an identity policy restricted to robots denies every user; without
        // a type restriction it permits every identity
        denyPolicy = await suite.client.policy.createBuiltIn({
            name: 'authorize-access-deny',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            types: [IdentityType.ROBOT],
            realmId: null,
        });
        allowPolicy = await suite.client.policy.createBuiltIn({
            name: 'authorize-access-allow',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            realmId: null,
        });

        // non-admin bearer: a plain user in the client's realm
        const password = generateOAuth2CodeVerifier();
        const user = await suite.client.user.create(createFakeUser({
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
        const client = await suite.client.client.create(createFakeClient({
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
});
