/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import type { Client } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { isClientError } from 'hapic';
import { createFakeClient } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

describe('refresh-token', () => {
    const suite = createTestApplication();

    let entity : Client;

    beforeAll(async () => {
        await suite.start();

        entity = await suite.client.client.create(createFakeClient());
    });

    afterAll(async () => {
        await suite.stop();
    });

    it('should grant token with client credentials', async () => {
        const response = await suite.client
            .token
            .createWithClientCredentials({
                client_id: entity.id,
                client_secret: entity.secret,
            });

        expect(response.access_token).toBeDefined();
        expect(response.expires_in).toBeDefined();
        expect(response.refresh_token).toBeUndefined();
    });

    it('should not grant with client-credentials (inactive)', async () => {
        await suite.client.client.update(entity.id, {
            active: false,
        });

        expect.assertions(2);

        try {
            await suite.client
                .token
                .createWithClientCredentials({
                    client_id: entity.id,
                    client_secret: entity.secret,
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status).toEqual(400);
                expect(e.response.data.code).toEqual(ErrorCode.ENTITY_INACTIVE);
            }
        } finally {
            await suite.client.client.update(entity.id, {
                active: true,
            });
        }
    });

    it('should not grant with client-credentials (invalid credentials)', async () => {
        expect.assertions(2);

        try {
            await suite.client
                .token
                .createWithClientCredentials({
                    client_id: entity.id,
                    client_secret: 'foo',
                });
        } catch (e) {
            if (isClientError(e)) {
                expect(e.status).toEqual(400);
                expect(e.response.data.code).toEqual(ErrorCode.ENTITY_CREDENTIALS_INVALID);
            }
        }
    });
});
