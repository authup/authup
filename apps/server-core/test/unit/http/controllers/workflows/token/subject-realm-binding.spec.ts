/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { generateKeyPairSync, randomUUID } from 'node:crypto';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { KeyStatus, ROLE_REALM_ADMIN_NAME } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import { signToken } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { JWKType, JWKUse, OAuth2TokenKind } from '@authup/specs';
import { createTestApplication } from '../../../../../app';
import {
    createFakeRealm,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../../utils';

/**
 * A token is only honoured for a subject of the realm it names, bound to a
 * session of that subject in that realm. A signing key vouches for its own
 * realm, so a token signed with one realm's key can never speak for a
 * subject, or a session, of another realm.
 */
describe('token verification: subject realm binding', () => {
    const suite = createTestApplication();

    let privateKey : string;
    let publicKey : string;
    let adminAccessToken : string;
    let admin : OAuth2TokenPayload;
    let member : OAuth2TokenPayload;
    let memberRefresh : OAuth2TokenPayload;
    let realmId : string;
    let realmKeyId : string;
    let masterKeyId : string;
    let realmAdmin : HTTPClient;

    beforeAll(async () => {
        await suite.setup();

        const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
        privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
        publicKey = pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

        const adminGrant = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        adminAccessToken = adminGrant.access_token;
        admin = await suite.client.token.introspect({ token: adminGrant.access_token }, { authorizationHeaderInherit: true });

        const { data: realm } = await suite.client.realm.create(createFakeRealm());
        realmId = realm.id;

        const password = 'subject-realm-binding-pw';
        const { data: user } = await suite.client.user.create(createFakeUser({ realmId, password }));
        const { data: role } = await suite.client.role.getOne(ROLE_REALM_ADMIN_NAME);
        await suite.client.userRole.create({ userId: user.id, roleId: role.id });

        const memberGrant = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realmId,
        });
        member = await suite.client.token.introspect({ token: memberGrant.access_token }, { authorizationHeaderInherit: true });
        memberRefresh = await suite.client.token.introspect({ token: memberGrant.refresh_token! }, { authorizationHeaderInherit: true });

        realmAdmin = new HTTPClient({ baseURL: suite.baseURL });
        realmAdmin.setAuthorizationHeader({ type: 'Bearer', token: memberGrant.access_token });

        const material = {
            use: JWKUse.SIGNATURE,
            status: KeyStatus.PASSIVE,
            decryptionKey: privateKey,
            encryptionKey: publicKey,
        };

        const { data: realmKey } = await suite.client.key.create({
            ...material, 
            name: `binding-${Date.now()}`, 
            realmId, 
        });
        realmKeyId = realmKey.id;

        const { data: masterKey } = await suite.client.key.create({
            ...material, 
            name: `binding-m-${Date.now()}`, 
            realmId: admin.realm_id, 
        });
        masterKeyId = masterKey.id;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function sign(kid: string, payload: Partial<OAuth2TokenPayload>) {
        return signToken({
            kind: OAuth2TokenKind.ACCESS,
            sub: admin.sub,
            sub_kind: admin.sub_kind,
            scope: admin.scope,
            jti: randomUUID(),
            exp: Math.floor(Date.now() / 1000) + 600,
            ...payload,
        }, {
            type: JWKType.RSA,
            key: privateKey,
            keyId: kid,
        });
    }

    it('should refuse a bearer naming a subject of another realm', async () => {
        const token = await sign(realmKeyId, {
            realm_id: realmId,
            session_id: admin.session_id,
        });

        const response = await httpRequest(suite, 'GET', '/users/@me', { headers: { Authorization: `Bearer ${token}` } });

        expect(response.status).toEqual(401);
    });

    it('should report a token naming a subject of another realm as bare inactive', async () => {
        const token = await sign(realmKeyId, {
            realm_id: realmId,
            session_id: member.session_id,
        });

        const response = await suite.client.token.introspect({ token }, { authorizationHeaderInherit: true });

        expect(response).toEqual({ active: false });
    });

    it('should report a token bound to another subject\'s session as inactive', async () => {
        const token = await sign(masterKeyId, {
            realm_id: admin.realm_id,
            session_id: member.session_id,
        });

        const response = await suite.client.token.introspect({ token }, { authorizationHeaderInherit: true });

        expect(response.active).toBe(false);
        expect(response.permissions).toBeUndefined();
    });

    it('should refuse a refresh token naming a subject of another realm', async () => {
        const token = await sign(realmKeyId, {
            kind: OAuth2TokenKind.REFRESH,
            realm_id: realmId,
            session_id: memberRefresh.session_id,
            jti: memberRefresh.jti,
        });

        const response = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'refresh_token',
                refresh_token: token,
            },
        });

        expect(response.status).toEqual(400);
    });

    it('should leave another subject\'s session alone on a refresh or revoke naming it', async () => {
        const victim = await suite.client.token.createWithPassword({ username: 'admin', password: 'start123' });
        const victimRefresh = await suite.client.token.introspect(
            { token: victim.refresh_token! },
            { authorizationHeaderInherit: true },
        );

        const token = await sign(realmKeyId, {
            kind: OAuth2TokenKind.REFRESH,
            sub: member.sub,
            sub_kind: member.sub_kind,
            realm_id: realmId,
            session_id: victimRefresh.session_id,
            jti: victimRefresh.jti,
        });

        for (let i = 0; i < 2; i++) {
            const refreshed = await httpRequest(suite, 'POST', '/token', {
                form: {
                    grant_type: 'refresh_token',
                    refresh_token: token,
                },
            });
            expect(refreshed.status).toEqual(400);
        }

        const revoked = await httpRequest(suite, 'POST', '/token/revoke', { form: { token } });
        expect(revoked.status).toEqual(200);

        const response = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'refresh_token',
                refresh_token: victim.refresh_token!,
            },
        });
        expect(response.status).toEqual(200);
    });

    it('should not import signature key material at own-realm reach', async () => {
        await expectClientError(
            () => realmAdmin.key.create({
                use: JWKUse.SIGNATURE,
                name: `binding-import-${Date.now()}`,
                realmId,
                decryptionKey: privateKey,
                encryptionKey: publicKey,
            }),
            { status: 403 },
        );

        const { data: generated } = await realmAdmin.key.create({
            use: JWKUse.SIGNATURE,
            name: `binding-generate-${Date.now()}`,
            realmId,
            status: KeyStatus.PASSIVE,
        });
        expect(generated.realmId).toEqual(realmId);
    });

    it('should not end another realm subject\'s session through a logout hint', async () => {
        const hint = await sign(realmKeyId, {
            kind: OAuth2TokenKind.ID_TOKEN,
            realm_id: realmId,
            sid: admin.session_id,
        });

        const response = await httpRequest(suite, 'POST', '/logout', {
            body: JSON.stringify({ id_token_hint: hint }),
            headers: { 'Content-Type': 'application/json' },
        });
        expect(response.status).toEqual(200);
        const body = await response.json();
        expect(body.serverRevoked).toBeFalsy();

        const me = await httpRequest(suite, 'GET', '/users/@me', { headers: { Authorization: `Bearer ${adminAccessToken}` } });
        expect(me.status).toEqual(200);
    });
});
