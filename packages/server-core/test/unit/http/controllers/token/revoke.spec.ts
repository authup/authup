/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import type { TestAgent } from '../../../../utils/supertest';
import { useSuperTest } from '../../../../utils/supertest';

describe('token-revoke', () => {
    let superTest: TestAgent;

    beforeAll(async () => {
        superTest = useSuperTest();
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    it('should revoke access token', async () => {
        let response = await superTest
            .post('/token')
            .send({
                username: 'admin',
                password: 'start123',
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        const accessToken = response.body.access_token;
        expect(accessToken).toBeDefined();

        response = await superTest
            .post('/token/revoke')
            .send({
                token: accessToken,
            });

        expect(response.status).toEqual(200);

        response = await superTest
            .post('/token/introspect')
            .send({
                token: accessToken,
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.active).toBeFalsy();
    });

    it('should revoke refresh token', async () => {
        let response = await superTest
            .post('/token')
            .send({
                username: 'admin',
                password: 'start123',
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        const refreshToken = response.body.refresh_token;
        expect(refreshToken).toBeDefined();

        response = await superTest
            .post('/token/revoke')
            .send({
                token: refreshToken,
            });

        expect(response.status).toEqual(200);

        response = await superTest
            .post('/token/introspect')
            .send({
                token: refreshToken,
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.active).toBeFalsy();
    });
});
