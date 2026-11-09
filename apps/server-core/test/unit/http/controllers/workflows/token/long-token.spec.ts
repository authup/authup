/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { PermissionName, REALM_MASTER_NAME } from '@authup/core-kit';
import { OAuth2TokenKind } from '@authup/specs';
import { TokenRequestValidator } from '../../../../../../src/adapters/http/controllers/workflows/token/utils/index.ts';
import { OAuth2InjectionToken } from '../../../../../../src/app/modules/oauth2/constants';
import { createTestApplication } from '../../../../../app';
import {
    createFakeClient,
    createFakeRole,
    createFakeUser,
    httpRequest,
} from '../../../../../utils';

const TOKEN_MAX_LENGTH = 16384;
const LEGACY_TOKEN_MAX_LENGTH = 2048;

describe('token-size-contract', () => {
    const suite = createTestApplication();

    const roleNames = Array.from(
        { length: 30 },
        (_, index) => `long-token-role-${index}-`.padEnd(64, 'x'),
    );

    let masterRealmId: string;
    let adminToken: string;
    let userName: string;

    const userPassword = 'long-token-password-1';

    const issueLongToken = async () => {
        const grant = await suite.client.token.createWithPassword({
            username: userName,
            password: userPassword,
        });

        expect(grant.access_token.length).toBeGreaterThan(LEGACY_TOKEN_MAX_LENGTH);

        return grant.access_token;
    };

    const asBearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

    const introspect = async (token: string, caller: string, path = '/token/introspect') => {
        const response = await httpRequest(suite, 'POST', path, {
            ...asBearer(caller),
            form: { token },
        });

        expect(response.status).toEqual(200);

        return response.json();
    };

    const selfIntrospect = async (token: string) => {
        const response = await httpRequest(suite, 'GET', '/token/introspect', asBearer(token));

        expect(response.status).toEqual(200);

        return response.json();
    };

    const readOwnUser = async (token: string) => {
        const response = await httpRequest(suite, 'GET', '/users/@me', asBearer(token));

        return response.status;
    };

    const signOversizedToken = async () => {
        const grant = await suite.client.token.createWithPassword({
            username: 'admin',
            password: 'start123',
        });
        const payload = await introspect(grant.access_token, grant.access_token);
        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
        const token = await signer.sign({
            jti: randomUUID(),
            sub: payload.sub,
            sub_kind: payload.sub_kind,
            realm_id: payload.realm_id,
            client_id: payload.client_id,
            session_id: payload.session_id,
            iat: payload.iat,
            exp: payload.exp,
            scope: payload.scope,
            kind: OAuth2TokenKind.ACCESS,
            realm_access: { roles: Array.from({ length: 200 }, () => 'x'.repeat(128)) },
        });

        expect(token.length).toBeGreaterThan(TOKEN_MAX_LENGTH);

        return { token, callerToken: grant.access_token };
    };

    beforeAll(async () => {
        await suite.setup();

        masterRealmId = (await suite.client.realm.getOne(REALM_MASTER_NAME)).data.id;
        adminToken = (await suite.client.token.createWithPassword({
            username: 'admin',
            password: 'start123',
        })).access_token;

        const fakeUser = createFakeUser({ password: userPassword });
        const { data: user } = await suite.client.user.create(fakeUser);

        userName = fakeUser.name;

        for (const name of roleNames) {
            const { data: role } = await suite.client.role.create(createFakeRole({
                name,
                realmId: masterRealmId,
            }));

            await suite.client.userRole.create({ userId: user.id, roleId: role.id });
        }
    }, 60_000);

    afterAll(async () => {
        await suite.teardown();
    });

    it('should report a genuine long token exactly as its self-introspection does', async () => {
        const token = await issueLongToken();

        const reference = await selfIntrospect(token);
        const report = await introspect(token, adminToken);

        expect(reference.active).toBe(true);
        expect(report.active).toBe(true);
        expect(report.sub).toEqual(reference.sub);
        expect(report.sub_kind).toEqual('user');
        expect(report.client_id).toEqual(reference.client_id);
        expect(report.realm_id).toEqual(masterRealmId);
        expect(report.realm_access.roles).toEqual(expect.arrayContaining(roleNames));
        expect(report.permissions).toEqual(reference.permissions);
    });

    it('should report a genuine long token on the realm-scoped route', async () => {
        const token = await issueLongToken();

        const report = await introspect(token, adminToken, `/realms/${masterRealmId}/token/introspect`);

        expect(report.active).toBe(true);
        expect(report.realm_id).toEqual(masterRealmId);
    });

    it.each([
        ['root', () => '/token/revoke'],
        ['realm-scoped', () => `/realms/${masterRealmId}/token/revoke`],
    ])('should end a genuine long token on the %s revocation route', async (_, path) => {
        const token = await issueLongToken();

        expect(await readOwnUser(token)).toEqual(200);

        const response = await httpRequest(suite, 'POST', path(), { form: { token } });

        expect(response.status).toEqual(200);
        expect((await introspect(token, adminToken)).active).toBe(false);
        expect(await readOwnUser(token)).toEqual(401);
    });

    it('should report a long token bare to a caller without the grant', async () => {
        const token = await issueLongToken();
        const { data: bystander } = await suite.client.client.create({
            ...createFakeClient(),
            active: true,
            secret: 'long-token-bystander-1',
            secretHashed: false,
            secretEncrypted: false,
        });

        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            form: {
                token,
                client_id: bystander.id,
                client_secret: 'long-token-bystander-1',
            },
        });

        expect(response.status).toEqual(200);
        expect(await response.json()).toEqual({ active: false });
    });

    it('should report a long token bare to a grant of another realm', async () => {
        const token = await issueLongToken();
        const { data: realm } = await suite.client.realm.create({ name: 'long-token-reach' });
        const { data: foreign } = await suite.client.client.create({
            ...createFakeClient(),
            active: true,
            realmId: realm.id,
            secret: 'long-token-foreign-1',
            secretHashed: false,
            secretEncrypted: false,
        });
        const { data: permission } = await suite.client.permission.getOne(PermissionName.TOKEN_INTROSPECT);

        await suite.client.clientPermission.create({
            clientId: foreign.id,
            permissionId: permission.id,
        });

        const response = await httpRequest(suite, 'POST', '/token/introspect', {
            form: {
                token,
                client_id: foreign.id,
                client_secret: 'long-token-foreign-1',
            },
        });

        expect(response.status).toEqual(200);
        expect(await response.json()).toEqual({ active: false });
    });

    it('should challenge an anonymous caller introspecting a long token', async () => {
        const token = await issueLongToken();

        const response = await httpRequest(suite, 'POST', '/token/introspect', { form: { token } });

        expect(response.status).toEqual(401);
        expect((await response.json()).sub).toBeUndefined();
    });

    it('should report an oversized genuine token bare and leave the caller alone', async () => {
        const { token, callerToken } = await signOversizedToken();

        expect(await introspect(token, callerToken)).toEqual({ active: false });
        expect(await readOwnUser(callerToken)).toEqual(200);
    });

    it('should not fall back to revoking the caller for an oversized token', async () => {
        const { token, callerToken } = await signOversizedToken();

        const response = await httpRequest(suite, 'POST', '/token/revoke', {
            ...asBearer(callerToken),
            form: { token },
        });

        expect(response.status).toEqual(200);
        expect(await readOwnUser(callerToken)).toEqual(200);
    });

    it('should report a malformed value above the former limit bare, never the caller', async () => {
        expect(await introspect('x'.repeat(3000), adminToken)).toEqual({ active: false });
    });

    it('should not revoke the caller for a malformed value above the former limit', async () => {
        const { access_token: callerToken } = await suite.client.token.createWithPassword({
            username: 'admin',
            password: 'start123',
        });

        const response = await httpRequest(suite, 'POST', '/token/revoke', {
            ...asBearer(callerToken),
            form: { token: 'x'.repeat(3000) },
        });

        expect(response.status).toEqual(200);
        expect(await readOwnUser(callerToken)).toEqual(200);
    });

    it('should accept a value at the limit and refuse one past it', async () => {
        const validator = new TokenRequestValidator();

        await expect(validator.run({ token: 'x'.repeat(TOKEN_MAX_LENGTH) })).resolves.toBeDefined();
        await expect(validator.run({ token: 'x'.repeat(TOKEN_MAX_LENGTH + 1) })).rejects.toThrow();
    });
});
