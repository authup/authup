/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode } from '@typescript-auth/domains/dist/error/constants';
import { useSuperTest } from '../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../utils/database/connection';

describe('src/http/controllers/role', () => {
    const superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    it('should grant token', async () => {
        const response = await superTest
            .post('/token')
            .send({
                username: 'admin',
                password: 'start123',
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.access_token).toBeDefined();
        expect(response.body.expires_in).toBeDefined();
    });

    it('should not grant token', async () => {
        const response = await superTest
            .post('/token')
            .send({
                username: 'admin',
                password: 'start1234',
            });

        expect(response.status).toEqual(400);
        expect(response.body.code).toEqual(ErrorCode.CREDENTIALS_INVALID);
    });

    it('should revoke token', async () => {
        const response = await superTest
            .delete('/token');

        expect(response.status).toEqual(200);
    });
});
