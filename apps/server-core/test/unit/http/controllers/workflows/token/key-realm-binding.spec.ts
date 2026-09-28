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
import { KeyStatus } from '@authup/core-kit';
import { signToken } from '@authup/server-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import { JWKType, JWKUse, OAuth2TokenKind } from '@authup/specs';
import { createTestApplication } from '../../../../../app';
import { httpRequest } from '../../../../../utils';

/**
 * A token is only verified with a key of the realm its payload names: the
 * signer always signs with the realm key named by `realm_id`, so a signature
 * made with another realm's key is refused.
 */
describe('token verification: key realm binding', () => {
    const suite = createTestApplication();

    let payload : OAuth2TokenPayload;
    let privateKey : string;
    let publicKey : string;

    beforeAll(async () => {
        await suite.setup();

        const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
        privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
        publicKey = pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

        const grant = await suite.client.token.createWithPassword({
            username: 'admin',
            password: 'start123',
        });

        payload = await suite.client.token.introspect(
            { token: grant.access_token },
            { authorizationHeaderInherit: true },
        );
    });

    afterAll(async () => {
        await suite.teardown();
    });

    async function sign(kid: string) {
        return signToken({
            kind: OAuth2TokenKind.ACCESS,
            sub: payload.sub,
            sub_kind: payload.sub_kind,
            realm_id: payload.realm_id,
            realm_name: payload.realm_name,
            session_id: payload.session_id,
            scope: payload.scope,
            jti: randomUUID(),
            exp: Math.floor(Date.now() / 1000) + 600,
        }, {
            type: JWKType.RSA,
            key: privateKey,
            keyId: kid,
        });
    }

    it('should accept a token signed with a key of the token realm', async () => {
        const { data: key } = await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: `binding-own-${Date.now()}`,
            realmId: payload.realm_id,
            status: KeyStatus.PASSIVE,
            decryptionKey: privateKey,
            encryptionKey: publicKey,
        });

        const response = await httpRequest(suite, 'GET', '/users/@me', { headers: { Authorization: `Bearer ${await sign(key.id)}` } });

        expect(response.status).toEqual(200);
    });

    it('should refuse a token signed with a key of another realm', async () => {
        const { data: realm } = await suite.client.realm.create({ name: `binding-${Date.now()}` });
        const { data: key } = await suite.client.key.create({
            use: JWKUse.SIGNATURE,
            name: `binding-foreign-${Date.now()}`,
            realmId: realm.id,
            decryptionKey: privateKey,
            encryptionKey: publicKey,
        });

        const response = await httpRequest(suite, 'GET', '/users/@me', { headers: { Authorization: `Bearer ${await sign(key.id)}` } });

        expect(response.status).toEqual(401);
    });
});
