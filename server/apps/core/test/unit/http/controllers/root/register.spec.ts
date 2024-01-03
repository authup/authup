/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core';
import { useConfig } from '../../../../../src';
import { useSuperTest } from '../../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';

describe('src/http/controllers/auth/handlers/*.ts', () => {
    let superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    it('should register a new user', async () => {
        let response;

        const config = useConfig();
        config.registration = false;

        response = await superTest
            .post('/register')
            .send({
                name: 'test',
                email: 'test@example.com',
                password: 'my-password',
            });

        expect(response.status).toEqual(400);

        config.registration = true;
        config.emailVerification = true;

        response = await superTest
            .post('/register')
            .send({
                name: 'test',
                email: 'test@example.com',
                password: 'my-password',
            });

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();

        const data = response.body as User;

        expect(data.name).toEqual('test');
        expect(data.email).toEqual('test@example.com');
        expect(data.id).toBeDefined();
        expect(data.created_at).toBeDefined();
        expect(data.updated_at).toBeDefined();
    });
});
