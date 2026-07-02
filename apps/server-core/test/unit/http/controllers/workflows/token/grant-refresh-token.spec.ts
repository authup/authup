/*
 * Copyright (c) 2024-2026.
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
import type { Client } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    expectClientError,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('refresh-token', () => {
    const suite = createTestApplication();

    let confidentialClient: Client;
    let confidentialSecret: string;

    beforeAll(async () => {
        await suite.setup();

        confidentialSecret = 'refresh-token-test-secret';
        confidentialClient = await suite.client
            .client
            .create(createFakeClient({
                secret: confidentialSecret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should grant token with refresh token issued by password grant (no client)', async () => {
        let response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        expect(response.access_token).toBeDefined();

        response = await suite.client
            .token
            .createWithRefreshToken({ refresh_token: response.refresh_token! });

        expect(response).toBeDefined();
        expect(response.access_token).toBeDefined();
        expect(response.expires_in).toBeDefined();
        expect(response.refresh_token).toBeDefined();
    });

    it('should grant refresh when authenticated client matches token client_id', async () => {
        const initial = await suite.client
            .token
            .createWithClientCredentials({
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        // client_credentials grant doesn't issue a refresh_token; use the
        // password grant with explicit client auth instead to obtain a
        // refresh_token bound to the confidential client.
        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        expect(initial.access_token).toBeDefined();
        expect(passwordResponse.refresh_token).toBeDefined();

        const refreshed = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        expect(refreshed.access_token).toBeDefined();
    });

    it('should reject refresh when token has client_id but request omits client auth', async () => {
        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        await expectClientError(
            () => suite.client.token.createWithRefreshToken({ refresh_token: passwordResponse.refresh_token! }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });

    it('should reject refresh when authenticated client_id does not match token client_id', async () => {
        const otherSecret = 'other-refresh-secret';
        const otherClient = await suite.client
            .client
            .create(createFakeClient({
                secret: otherSecret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));

        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        await expectClientError(
            () => suite.client.token.createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: otherClient.id,
                client_secret: otherSecret,
            }),
            { status: 400, code: ErrorCode.OAUTH_GRANT_INVALID },
        );
    });

    it('should reject refresh when client provides wrong secret', async () => {
        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        await expectClientError(
            () => suite.client.token.createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: confidentialClient.id,
                client_secret: 'wrong-secret',
            }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });

    it('should resolve a name-identified client deterministically across password and refresh legs', async () => {
        // same-named confidential clients in master and another realm — the
        // realm-less name lookup must resolve master on BOTH legs instead of
        // matching an arbitrary realm's client on refresh
        const realm = await suite.client.realm.create(createFakeRealm());
        const { name } = createFakeClient();
        const masterSecret = 'master-leg-secret';
        await suite.client.client.create(createFakeClient({
            name,
            secret: masterSecret,
            secret_hashed: false,
            secret_encrypted: false,
            is_confidential: true,
        }));
        await suite.client.client.create(createFakeClient({
            name,
            realm_id: realm.id,
            secret: 'other-realm-secret',
            secret_hashed: false,
            secret_encrypted: false,
            is_confidential: true,
        }));

        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: name,
                client_secret: masterSecret,
            });

        const refreshed = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: name,
                client_secret: masterSecret,
            });

        expect(refreshed.access_token).toBeDefined();
    });

    it('should scope a name-identified client on refresh to the realm hint', async () => {
        const realm = await suite.client.realm.create(createFakeRealm());
        const secret = 'realm-refresh-secret';
        const client = await suite.client.client.create(createFakeClient({
            realm_id: realm.id,
            secret,
            secret_hashed: false,
            secret_encrypted: false,
            is_confidential: true,
        }));
        const user = await suite.client.user.create(createFakeUser({
            realm_id: realm.id,
            password: 'realm-user-secret',
        }));

        const login = () => suite.client
            .token
            .createWithPassword({
                username: user.name,
                password: 'realm-user-secret',
                client_id: client.name,
                client_secret: secret,
                realm_id: realm.id,
            });

        let passwordResponse = await login();
        const refreshed = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: client.name,
                client_secret: secret,
                realm_id: realm.id,
            });

        expect(refreshed.access_token).toBeDefined();

        // realm_name is honored and canonicalized on the refresh leg too
        passwordResponse = await login();
        const rawResponse = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'refresh_token',
                refresh_token: passwordResponse.refresh_token!,
                client_id: client.name,
                client_secret: secret,
                realm_name: ` ${realm.name.toUpperCase()} `,
            },
        });
        expect(rawResponse.status).toEqual(200);

        // without a hint the name resolves in master, where the client does
        // not exist — deterministic fail-closed instead of an unscoped match
        passwordResponse = await login();
        await expectClientError(
            () => suite.client.token.createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: client.name,
                client_secret: secret,
            }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });

    it('should ignore the realm hint for a UUID-identified client on refresh', async () => {
        const passwordResponse = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
            });

        const refreshed = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: passwordResponse.refresh_token!,
                client_id: confidentialClient.id,
                client_secret: confidentialSecret,
                realm_id: 'this-realm-does-not-exist',
            });

        expect(refreshed.access_token).toBeDefined();
    });
});
