/*
 * Copyright (c) 2024.
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
import { createFakeClient, expectClientError } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('refresh-token', () => {
    const suite = createTestApplication();

    let entity : Client;

    beforeAll(async () => {
        await suite.setup();

        const input = createFakeClient();
        input.active = true;
        input.auth_method = 'secret';
        input.token_binding_method = 'none';
        input.secret_hashed = false;
        input.secret_encrypted = false;

        entity = await suite.client.client.create(input);
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should grant token with client credentials', async () => {
        const response = await suite.client
            .token
            .createWithClientCredentials({
                client_id: entity.id,
                client_secret: entity.secret!,
            });

        expect(response.access_token).toBeDefined();
        expect(response.expires_in).toBeDefined();
        expect(response.refresh_token).toBeUndefined();
    });

    it('should not grant with client-credentials (inactive)', async () => {
        await suite.client.client.update(entity.id, { active: false });

        try {
            await expectClientError(
                () => suite.client.token.createWithClientCredentials({
                    client_id: entity.id,
                    client_secret: entity.secret!,
                }),
                { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
            );
        } finally {
            await suite.client.client.update(entity.id, { active: true });
        }
    });

    it('should not grant with client-credentials (invalid credentials)', async () => {
        await expectClientError(
            () => suite.client.token.createWithClientCredentials({
                client_id: entity.id,
                client_secret: 'foo',
            }),
            { status: 401, code: ErrorCode.OAUTH_CLIENT_INVALID },
        );
    });
});
