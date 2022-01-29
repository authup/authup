/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ErrorCode, OAuth2TokenResponse } from '@typescript-auth/domains';
import { useSuperTest } from '../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../utils/database/connection';

describe('src/http/controllers/token', () => {
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
        expect(response.body.refresh_token).toBeDefined();
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

    fit('should revoke token', async () => {
        let response = await superTest
            .post('/token')
            .send({
                username: 'admin',
                password: 'start123',
            });

        const tokenPayload : OAuth2TokenResponse = response.body;

        response = await superTest
            .delete('/token')
            .auth(tokenPayload.access_token, { type: 'bearer' });

        expect(response.status).toEqual(200);
    });

    it('should refresh token', async () => {
        let response = await superTest
            .post('/token')
            .send({
                username: 'admin',
                password: 'start123',
            });

        const tokenPayload : OAuth2TokenResponse = response.body;

        response = await superTest
            .post('/token')
            .send({
                refresh_token: tokenPayload.refresh_token,
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.access_token).toBeDefined();
        expect(response.body.expires_in).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();

        // original access-token should not be there anymore!
        response = await superTest
            .get('/token')
            .auth(tokenPayload.access_token, { type: 'bearer' });

        expect(response.status).toEqual(404);
    });
});
