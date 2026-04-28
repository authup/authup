/*
 * Copyright (c) 2021-2026.
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
import { ErrorCode } from '@authup/errors';
import { isClientError } from 'hapic';
import { createFakeClient, createFakeUser } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('src/http/controllers/token', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should grant token with password', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        expect(response).toBeDefined();
        expect(response.access_token).toBeDefined();
        expect(response.expires_in).toBeDefined();
        expect(response.refresh_token).toBeDefined();
    });

    it('should not grant token with password grant (credentials invalid)', async () => {
        const credentials = {
            username: 'admin',
            password: 'foo-bar-baz',
        };

        try {
            await suite.client
                .token
                .createWithPassword(credentials);
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status)
                    .toEqual(400);
                expect(e.response.data.code)
                    .toEqual(ErrorCode.ENTITY_CREDENTIALS_INVALID);
            }
        }
    });

    it('should grant token with password and confidential client authentication', async () => {
        const secret = 'password-grant-test-secret';
        const client = await suite.client
            .client
            .create(createFakeClient({
                secret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));

        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
                client_id: client.id,
                client_secret: secret,
            });

        expect(response.access_token).toBeDefined();
        expect(response.refresh_token).toBeDefined();
    });

    it('should reject password grant when confidential client provides wrong secret', async () => {
        const secret = 'password-grant-wrong-secret-test';
        const client = await suite.client
            .client
            .create(createFakeClient({
                secret,
                secret_hashed: false,
                secret_encrypted: false,
                is_confidential: true,
            }));

        expect.assertions(1);

        try {
            await suite.client
                .token
                .createWithPassword({
                    username: 'admin',
                    password: 'start123',
                    client_id: client.id,
                    client_secret: 'wrong-secret',
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.response?.data?.code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
            }
        }
    });

    it('should not grant token with password grant (inactive)', async () => {
        const entity = await suite.client.user.create(createFakeUser({
            password: 'foo-bar-baz',
            active: false,
        }));

        try {
            await suite.client
                .token
                .createWithPassword({
                    username: entity.name,
                    password: 'foo-bar-baz',
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status).toEqual(400);
                expect(e.response.data.code).toEqual(ErrorCode.ENTITY_INACTIVE);
            }
        }

        await suite.client.user.update(entity.id, { active: true });

        const response = await suite.client
            .token
            .createWithPassword({
                username: entity.name,
                password: 'foo-bar-baz',
            });

        expect(response).toBeDefined();

        try {
            await suite.client
                .token
                .createWithPassword({
                    username: entity.name,
                    password: 'foo',
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status).toEqual(400);
                expect(e.response.data.code).toEqual(ErrorCode.ENTITY_CREDENTIALS_INVALID);
            }
        }
    });
});
