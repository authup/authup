/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll, beforeAll, describe, expect, it,
} from 'vitest';
import { createTestApplication } from '../../../../app';

describe('src/http/controllers/auth/jwks/*.ts', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.start();
    });

    afterAll(async () => {
        await suite.stop();
    });

    it('should return json web token keys', async () => {
        const response = await suite.client.getJwks();

        expect(response.keys).toBeDefined();
        expect(response.keys.length).toBeGreaterThanOrEqual(0);
    });
});
