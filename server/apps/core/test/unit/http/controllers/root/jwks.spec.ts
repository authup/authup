/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useSuperTest } from '../../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';

describe('src/http/controllers/auth/jwks/*.ts', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    it('should return json web token keys', async () => {
        const response = await superTest
            .get('/jwks');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.keys).toBeDefined();
        expect(response.body.keys.length).toBeGreaterThanOrEqual(0);
    });
});
