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
import { REALM_MASTER_NAME } from '@authup/core-kit';
import { OAuth2TokenKind } from '@authup/specs';
import { createFakeUser, httpRequest } from '../../../../utils';
import { createTestApplication } from '../../../../app';

function decodeJwtPayload(token: string): Record<string, any> {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
}

// Plan 073 boundary pin (the Keycloak/Okta split): the OAuth2/OIDC protocol
// surface stays snake_case forever, while the management/entity API is
// camelCase. This spec freezes both sides of the line against future drift —
// a failure here means the wire contract changed, not that this spec is stale.
describe('protocol-surface freeze (plan 073)', () => {
    const suite = createTestApplication();

    let grant : Record<string, any>;

    beforeAll(async () => {
        await suite.setup();

        const response = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'password',
                username: 'admin',
                password: 'start123',
            },
        });
        expect(response.status).toEqual(200);
        grant = await response.json();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('keeps the /token password-grant response snake_case', () => {
        expect(typeof grant.access_token).toEqual('string');
        expect(typeof grant.expires_in).toEqual('number');
        expect(typeof grant.refresh_token).toEqual('string');

        expect(grant).not.toHaveProperty('accessToken');
        expect(grant).not.toHaveProperty('expiresIn');
        expect(grant).not.toHaveProperty('refreshToken');
    });

    it('keeps the access-token JWT claims snake_case', () => {
        const payload = decodeJwtPayload(grant.access_token);

        expect(typeof payload.realm_id).toEqual('string');
        expect(typeof payload.realm_name).toEqual('string');
        expect(typeof payload.session_id).toEqual('string');
        expect(typeof payload.sub_kind).toEqual('string');
        expect(payload.kind).toEqual(OAuth2TokenKind.ACCESS);

        expect(payload).not.toHaveProperty('realmId');
        expect(payload).not.toHaveProperty('realmName');
        expect(payload).not.toHaveProperty('sessionId');
        expect(payload).not.toHaveProperty('subKind');
    });

    it('keeps the discovery document keys snake_case', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            `/realms/${REALM_MASTER_NAME}/.well-known/openid-configuration`,
        );
        expect(response.status).toEqual(200);
        const discovery = await response.json();

        expect(typeof discovery.authorization_endpoint).toEqual('string');
        expect(typeof discovery.token_endpoint).toEqual('string');
        expect(typeof discovery.end_session_endpoint).toEqual('string');

        expect(discovery).not.toHaveProperty('authorizationEndpoint');
        expect(discovery).not.toHaveProperty('tokenEndpoint');
        expect(discovery).not.toHaveProperty('endSessionEndpoint');
    });

    it('keeps the /token/introspect response snake_case', async () => {
        const response = await httpRequest(suite, 'POST', '/token/introspect', { form: { token: grant.access_token } });
        expect(response.status).toEqual(200);
        const claims = await response.json();

        expect(typeof claims.session_id).toEqual('string');
        expect(typeof claims.sub_kind).toEqual('string');
        expect(typeof claims.realm_id).toEqual('string');

        expect(claims).not.toHaveProperty('sessionId');
        expect(claims).not.toHaveProperty('subKind');
        expect(claims).not.toHaveProperty('realmId');
    });

    it('serves the management realm read with camelCase keys', async () => {
        const realm = await suite.client.realm.getOne(REALM_MASTER_NAME);

        expect(realm.builtIn).toBe(true);
        expect(typeof realm.createdAt).toEqual('string');

        expect(realm).not.toHaveProperty('built_in');
        expect(realm).not.toHaveProperty('created_at');
    });

    it('serves the management user create with camelCase keys', async () => {
        const user = await suite.client.user.create(createFakeUser());

        expect(typeof user.createdAt).toEqual('string');
        expect(typeof user.realmId).toEqual('string');
        expect(user.nameLocked).toBe(false);

        expect(user).not.toHaveProperty('created_at');
        expect(user).not.toHaveProperty('realm_id');
        expect(user).not.toHaveProperty('name_locked');
    });
});
