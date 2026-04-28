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
import { isClientError } from 'hapic';
import { createFakeClient } from '../../../../../utils';
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
            .createWithRefreshToken({ refresh_token: response.refresh_token });

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
                refresh_token: passwordResponse.refresh_token,
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

        expect.assertions(1);

        try {
            await suite.client
                .token
                .createWithRefreshToken({ refresh_token: passwordResponse.refresh_token });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.response?.data?.code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
            }
        }
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

        expect.assertions(1);

        try {
            await suite.client
                .token
                .createWithRefreshToken({
                    refresh_token: passwordResponse.refresh_token,
                    client_id: otherClient.id,
                    client_secret: otherSecret,
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.response?.data?.code).toEqual(ErrorCode.OAUTH_GRANT_INVALID);
            }
        }
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

        expect.assertions(1);

        try {
            await suite.client
                .token
                .createWithRefreshToken({
                    refresh_token: passwordResponse.refresh_token,
                    client_id: confidentialClient.id,
                    client_secret: 'wrong-secret',
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.response?.data?.code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
            }
        }
    });
});
