/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createTestSuite } from '../../../../utils';

describe('src/http/controllers/auth/jwks/*.ts', () => {
    const suite = createTestSuite();

    beforeAll(async () => {
        await suite.up();
    });

    afterAll(async () => {
        await suite.down();
    });

    it('should return json web token keys', async () => {
        const response = await suite.client.getJwks();

        expect(response.keys).toBeDefined();
        expect(response.keys.length).toBeGreaterThanOrEqual(0);
    });
});
