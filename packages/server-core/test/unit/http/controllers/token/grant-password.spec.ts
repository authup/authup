/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ErrorCode,
} from '@authup/kit';
import type { TestAgent } from '../../../../utils/supertest';
import { useSuperTest } from '../../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import {
    createSuperTestUser,
    updateSuperTestUser,
} from '../../../../utils/domains';

describe('src/http/controllers/token', () => {
    let superTest : TestAgent;

    beforeAll(async () => {
        superTest = useSuperTest();
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    it('should grant token with password', async () => {
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

    it('should not grant token with password grant', async () => {
        const credentials = {
            username: 'test',
            password: 'foo-bar-baz',
        };

        let response = await superTest
            .post('/token')
            .send(credentials);

        expect(response.status).toEqual(400);
        expect(response.body.code).toEqual(ErrorCode.CREDENTIALS_INVALID);

        const entity = await createSuperTestUser(superTest, {
            password: 'foo-bar-baz',
            active: false,
        });

        credentials.username = entity.body.name;

        response = await superTest
            .post('/token')
            .send(credentials);

        expect(response.status).toEqual(400);
        expect(response.body.code).toEqual(ErrorCode.ENTITY_INACTIVE);

        await updateSuperTestUser(superTest, entity.body.id, { active: true });

        response = await superTest
            .post('/token')
            .send(credentials);

        expect(response.status).toEqual(200);

        response = await superTest
            .post('/token')
            .send({
                ...credentials,
                password: 'foo',
            });

        expect(response.status).toEqual(400);
        expect(response.body.code).toEqual(ErrorCode.CREDENTIALS_INVALID);
    });
});
