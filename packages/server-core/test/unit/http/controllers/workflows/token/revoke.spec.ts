/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { createTestApplication } from '../../../../../app';

describe('token-revoke', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    it('should revoke access token', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        expect(response).toBeDefined();
        expect(response.access_token).toBeDefined();

        await suite.client
            .token
            .revoke({
                token: response.access_token,
            });

        const introspectResponse = await suite.client
            .token
            .introspect({
                token: response.access_token,
            });

        expect(introspectResponse).toBeDefined();
        expect(introspectResponse.active).toBeFalsy();
    });

    it('should revoke refresh token', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        expect(response).toBeDefined();
        expect(response.refresh_token).toBeDefined();

        await suite.client
            .token
            .revoke({
                token: response.refresh_token,
            });

        const introspectResponse = await suite.client
            .token
            .introspect({
                token: response.refresh_token,
            });

        expect(introspectResponse).toBeDefined();
        expect(introspectResponse.active).toBeFalsy();
    });
});
