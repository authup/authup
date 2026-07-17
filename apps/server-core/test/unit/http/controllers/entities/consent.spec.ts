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
import type { Client, Realm, User } from '@authup/core-kit';
import { CLIENT_WEB_NAME, IdentityType, ScopeName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import { generateOAuth2CodeVerifier } from '../../../../../src/core';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../utils';
import { createTestApplication } from '../../../../app';

describe('consent', () => {
    const suite = createTestApplication();

    let realm: Realm;
    let user: User;
    let userToken: string;
    let userClient: HTTPClient;

    beforeAll(async () => {
        await suite.setup();

        realm = await suite.client.realm.create(createFakeRealm());

        const password = generateOAuth2CodeVerifier();
        user = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password,
        }));

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realm.id,
        });

        userToken = login.access_token;
        userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: userToken });
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function createScopedClient(scopeNames: string[] = [ScopeName.GLOBAL]): Promise<Client> {
        const client = await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'secret',
            tokenBindingMethod: 'none',
        }));

        for (const name of scopeNames) {
            const scope = await suite.client.scope.getOne(name);
            await suite.client.clientScope.create({
                scopeId: scope.id,
                clientId: client.id,
            });
        }

        return client;
    }

    const confirm = (clientId: string, scope: string) => userClient.authorize.confirm({
        response_type: OAuth2AuthorizationResponseType.CODE,
        client_id: clientId,
        redirect_uri: 'https://example.com/redirect',
        scope,
        state: generateOAuth2CodeVerifier(),
    });

    it('persists one consent row per requested scope token on approval', async () => {
        const client = await createScopedClient([ScopeName.GLOBAL, ScopeName.OPEN_ID]);

        const response = await confirm(client.id, `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`);
        expect(new URL(response.url).searchParams.get('code')).toBeTruthy();

        const { data } = await userClient.consent.getMany({ filter: { clientId: client.id } });
        expect(data).toHaveLength(2);
        expect(data.map((row) => row.scope).sort()).toEqual([ScopeName.GLOBAL, ScopeName.OPEN_ID].sort());
        expect(data.every((row) => row.sub === user.id &&
            row.subKind === IdentityType.USER &&
            row.userId === user.id &&
            row.clientId === client.id &&
            row.realmId === realm.id &&
            row.expiresAt === null)).toBe(true);
    });

    it('cascade-drops a user\'s consent rows when the user is deleted', async () => {
        const password = generateOAuth2CodeVerifier();
        const victim = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password,
        }));
        const login = await suite.client.token.createWithPassword({
            username: victim.name,
            password,
            realm_id: realm.id,
        });
        const victimClient = new HTTPClient({ baseURL: suite.baseURL });
        victimClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const client = await createScopedClient([ScopeName.GLOBAL]);
        await victimClient.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: ScopeName.GLOBAL,
            state: generateOAuth2CodeVerifier(),
        });

        const before = await suite.client.consent.getMany({ filter: { sub: victim.id, subKind: IdentityType.USER } });
        expect(before.data.length).toBeGreaterThan(0);
        expect(before.data.every((row) => row.userId === victim.id)).toBe(true);

        await suite.client.user.delete(victim.id);

        const after = await suite.client.consent.getMany({ filter: { sub: victim.id, subKind: IdentityType.USER } });
        expect(after.data).toHaveLength(0);
    });

    it('never exposes full client config on the relation, even when requested', async () => {
        const client = await createScopedClient([ScopeName.GLOBAL]);
        await confirm(client.id, ScopeName.GLOBAL);

        // A self-service user (no CLIENT_READ) explicitly asks for the client
        // relation — the response must carry only a summary, never the
        // trusted-origin patterns / grant_types / secret-storage flags.
        const { data } = await userClient.consent.getMany({
            filter: { clientId: client.id },
            include: ['client'] as any,
        });

        expect(data.length).toBeGreaterThan(0);
        const joined = data[0].client as Record<string, any> | undefined;
        expect(joined).toBeTruthy();
        expect(joined!.id).toEqual(client.id);
        expect(joined!.redirectUri).toBeUndefined();
        expect(joined!.postLogoutRedirectUri).toBeUndefined();
        expect(joined!.grantTypes).toBeUndefined();
        expect(joined!.baseUrl).toBeUndefined();
        expect(joined!.rootUrl).toBeUndefined();
        expect(joined!.authMethod).toBeUndefined();
        expect(joined!.tokenBindingMethod).toBeUndefined();
        expect(joined!.accessPolicyId).toBeUndefined();
        expect(joined!.secretHashed).toBeUndefined();
        expect(joined!.secretEncrypted).toBeUndefined();
    });

    it('keeps a second identical authorize idempotent (no duplicate rows)', async () => {
        const client = await createScopedClient([ScopeName.GLOBAL, ScopeName.OPEN_ID]);

        await confirm(client.id, `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`);
        const before = await userClient.consent.getMany({ filter: { clientId: client.id } });

        await confirm(client.id, `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`);
        const after = await userClient.consent.getMany({ filter: { clientId: client.id } });

        expect(after.data).toHaveLength(before.data.length);
        expect(after.data.map((row) => row.id).sort()).toEqual(before.data.map((row) => row.id).sort());
    });

    it('unions in only the missing tokens when the scope widens', async () => {
        const client = await createScopedClient([ScopeName.GLOBAL, ScopeName.OPEN_ID]);

        await confirm(client.id, ScopeName.GLOBAL);
        const before = await userClient.consent.getMany({ filter: { clientId: client.id } });
        expect(before.data).toHaveLength(1);

        await confirm(client.id, `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`);
        const after = await userClient.consent.getMany({ filter: { clientId: client.id } });

        expect(after.data).toHaveLength(2);
        // the original row survives by identity (union/keep — never delete)
        expect(after.data.map((row) => row.id)).toContain(before.data[0].id);
    });

    it('normalizes mixed-case scope input to lowercase tokens', async () => {
        const client = await createScopedClient([ScopeName.GLOBAL, ScopeName.OPEN_ID]);

        await confirm(client.id, 'Global OpenID');

        const { data } = await userClient.consent.getMany({ filter: { clientId: client.id } });
        expect(data.map((row) => row.scope).sort()).toEqual(['global', 'openid']);
    });

    it('writes zero rows for a built_in client', async () => {
        const { data: webClients } = await suite.client.client.getMany({ filter: { name: CLIENT_WEB_NAME, realmId: realm.id } });
        expect(webClients).toHaveLength(1);
        const [webClient] = webClients;
        expect(webClient.builtIn).toBe(true);

        // the per-realm web client is public: PKCE + state are mandatory, and
        // its redirect patterns cover the trusted dev origin
        const response = await userClient.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: webClient.id,
            redirect_uri: 'http://localhost:3000/login/callback',
            scope: ScopeName.GLOBAL,
            state: generateOAuth2CodeVerifier(),
            code_challenge: generateOAuth2CodeVerifier(),
        });
        expect(new URL(response.url).searchParams.get('code')).toBeTruthy();

        const { data } = await userClient.consent.getMany({ filter: { clientId: webClient.id } });
        expect(data).toHaveLength(0);
    });

    it('scopes a non-privileged user to its own consent rows', async () => {
        const client = await createScopedClient();
        await confirm(client.id, ScopeName.GLOBAL);

        // a second non-admin user in the same realm sees none of the first user's rows
        const password = generateOAuth2CodeVerifier();
        const otherUser = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password,
        }));
        const otherLogin = await suite.client.token.createWithPassword({
            username: otherUser.name,
            password,
            realm_id: realm.id,
        });
        const otherClient = new HTTPClient({ baseURL: suite.baseURL });
        otherClient.setAuthorizationHeader({ type: 'Bearer', token: otherLogin.access_token });

        const foreignView = await otherClient.consent.getMany();
        expect(foreignView.data.every((row) => row.sub === otherUser.id)).toBe(true);
        expect(foreignView.data.some((row) => row.sub === user.id)).toBe(false);

        // the subject itself sees only its own rows
        const ownView = await userClient.consent.getMany();
        expect(ownView.data.length).toBeGreaterThanOrEqual(1);
        expect(ownView.data.every((row) => row.sub === user.id)).toBe(true);
    });

    it('lets the subject read and revoke its own consent row', async () => {
        const client = await createScopedClient();
        await confirm(client.id, ScopeName.GLOBAL);

        const { data } = await userClient.consent.getMany({ filter: { clientId: client.id } });
        expect(data).toHaveLength(1);
        const [row] = data;

        const single = await userClient.consent.getOne(row.id);
        expect(single.id).toEqual(row.id);

        // typed client hides the status code — assert 202 via raw fetch
        const response = await httpRequest(suite, 'DELETE', `/consents/${row.id}`, { headers: { Authorization: `Bearer ${userToken}` } });
        expect(response.status).toEqual(202);
        const body = await response.json();
        expect(body.id).toEqual(row.id);

        const after = await userClient.consent.getMany({ filter: { clientId: client.id } });
        expect(after.data).toHaveLength(0);
    });

    it("denies a non-privileged user access to another subject's row", async () => {
        const client = await createScopedClient();
        await confirm(client.id, ScopeName.GLOBAL);

        const { data } = await userClient.consent.getMany({ filter: { clientId: client.id } });
        const [row] = data;

        const password = generateOAuth2CodeVerifier();
        const intruder = await suite.client.user.create(createFakeUser({
            realmId: realm.id,
            password,
        }));
        const intruderLogin = await suite.client.token.createWithPassword({
            username: intruder.name,
            password,
            realm_id: realm.id,
        });
        const intruderClient = new HTTPClient({ baseURL: suite.baseURL });
        intruderClient.setAuthorizationHeader({ type: 'Bearer', token: intruderLogin.access_token });

        await expectClientError(
            () => intruderClient.consent.getOne(row.id),
            { status: 403 },
        );
        await expectClientError(
            () => intruderClient.consent.delete(row.id),
            { status: 403 },
        );

        // the row survives the denied delete
        const after = await userClient.consent.getMany({ filter: { clientId: client.id } });
        expect(after.data.some((r) => r.id === row.id)).toBe(true);
    });

    it('lets an admin read and revoke cross-realm consent rows', async () => {
        const client = await createScopedClient();
        await confirm(client.id, ScopeName.GLOBAL);

        // the suite admin lives in the master realm; the rows live in another
        // realm — its `any` reach covers them
        const { data } = await suite.client.consent.getMany({ filter: { clientId: client.id } });
        expect(data).toHaveLength(1);
        expect(data[0].sub).toEqual(user.id);

        const removed = await suite.client.consent.delete(data[0].id);
        expect(removed.id).toEqual(data[0].id);

        const after = await suite.client.consent.getMany({ filter: { clientId: client.id } });
        expect(after.data).toHaveLength(0);
    });
});
