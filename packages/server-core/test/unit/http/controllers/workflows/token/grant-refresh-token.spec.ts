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

describe('refresh-token', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    it('should grant token with refresh token', async () => {
        let response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        expect(response.access_token).toBeDefined();

        response = await suite.client
            .token
            .createWithRefreshToken({
                refresh_token: response.refresh_token,
            });

        expect(response).toBeDefined();
        expect(response.access_token).toBeDefined();
        expect(response.expires_in).toBeDefined();
        expect(response.refresh_token).toBeDefined();
    });
});
