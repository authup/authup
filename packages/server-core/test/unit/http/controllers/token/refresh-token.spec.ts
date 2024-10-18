/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { OAuth2TokenPayload } from '@authup/kit';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import type { TestAgent } from '../../../../utils/supertest';
import { useSuperTest } from '../../../../utils/supertest';

describe('refresh-token', () => {
    let superTest: TestAgent;
    let tokenPayload : OAuth2TokenPayload;

    beforeAll(async () => {
        superTest = useSuperTest();
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    it('should grant token with refresh token', async () => {
        let response = await superTest
            .post('/token')
            .send({
                username: 'admin',
                password: 'start123',
            });

        expect(response.status).toEqual(200);

        response = await superTest
            .post('/token')
            .send({
                refresh_token: response.body.refresh_token,
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.access_token).toBeDefined();
        expect(response.body.expires_in).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();

        tokenPayload = response.body;
    });

    it('should revoke refresh token', async () => {
        const response = await superTest
            .post('/token/revoke')
            .send({
                token: tokenPayload.refresh_token,
            });

        expect(response.status).toEqual(200);
    });
});
