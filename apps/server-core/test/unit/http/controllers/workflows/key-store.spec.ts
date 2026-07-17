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
import { Client as HTTPClient } from '@authup/core-http-kit';
import { UserAuthenticatorKind } from '@authup/core-kit';
import { JWKUse } from '@authup/specs';
import { Secret, TOTP } from 'otpauth';
import { KeyEntity, UserAuthenticatorEntity } from '../../../../../src/adapters/database/domains/index.ts';
import { createFakeUser, httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

// KEK wrapping is deliberately NOT exercised here — the http suites share one
// sqlite database across parallel spec files, and a wrapped master-realm
// signing key would poison every KEK-less sibling suite. The wrap/unwrap
// matrix lives in test/unit/app/modules/oauth2/key-repository.spec.ts over an
// isolated in-memory DataSource.
describe('src/http realm key store (zero-config MFA + jwks hygiene)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('mints the realm enc key on first enrollment — zero key configuration', async () => {
        const password = 'key-store-user-pw';
        const user = await suite.client.user.create(createFakeUser({ password }));
        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
        });

        const bearer = new HTTPClient({ baseURL: suite.baseURL });
        bearer.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const enrolled = await bearer.userAuthenticator.enroll('@me', { kind: UserAuthenticatorKind.TOTP });
        expect(enrolled.meta.secret).toBeDefined();

        const totp = new TOTP({
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: Secret.fromBase32(enrolled.meta.secret!),
        });
        const confirmed = await bearer.userAuthenticator.confirm('@me', enrolled.data.id, { code: totp.generate() });
        expect(confirmed.confirmed).toBeTruthy();

        // an enc key exists for the user's realm ...
        const encKeys = await suite.dataSource.getRepository(KeyEntity).findBy({
            realm_id: user.realm_id,
            use: JWKUse.ENCRYPTION,
        });
        expect(encKeys.length).toBeGreaterThanOrEqual(1);

        // ... and the seed at rest is a self-describing blob bound to one of them
        const device = await suite.dataSource.getRepository(UserAuthenticatorEntity)
            .createQueryBuilder('device')
            .addSelect('device.secret')
            .where('device.id = :id', { id: enrolled.data.id })
            .getOne();

        const [version, keyId] = device!.secret!.split('.');
        expect(version).toEqual('v1');
        expect(encKeys.map((key) => key.id)).toContain(keyId);
        expect(device!.secret).not.toContain(enrolled.meta.secret!);
    });

    it('never surfaces enc keys via jwks', async () => {
        const response = await httpRequest(suite, 'GET', '/jwks');
        expect(response.status).toEqual(200);

        const body = await response.json() as { keys: { kty: string }[] };
        expect(body.keys.length).toBeGreaterThanOrEqual(1);

        for (const key of body.keys) {
            expect(key.kty).not.toEqual('oct');
        }
    });
});
