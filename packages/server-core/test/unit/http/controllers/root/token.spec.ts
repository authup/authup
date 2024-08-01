/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/kit';
import {
    ErrorCode, OAuth2AuthorizationResponseType,
} from '@authup/kit';
import { ScopeName } from '@authup/core-kit';
import type { SuperTest, Test } from 'supertest';
import type { DatabaseRootSeederResult } from '../../../../../src';
import { useSuperTest } from '../../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import {
    createSuperTestClientWithScope,
    createSuperTestUser,
    updateSuperTestRobot,
    updateSuperTestUser,
} from '../../../../utils/domains';

describe('src/http/controllers/token', () => {
    let superTest : SuperTest<Test>;

    let seederResponse : DatabaseRootSeederResult | undefined;
    let robotCredentials : { id: string, secret: string };

    beforeAll(async () => {
        superTest = useSuperTest();
        seederResponse = await useTestDatabase();

        robotCredentials = {
            id: seederResponse.robot.id,
            secret: seederResponse.robot.secret,
        };
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    let tokenPayload : OAuth2TokenGrantResponse;

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

        tokenPayload = response.body;
    });

    it('should grant token with refresh token', async () => {
        const response = await superTest
            .post('/token')
            .send({
                refresh_token: tokenPayload.refresh_token,
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.access_token).toBeDefined();
        expect(response.body.expires_in).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();
    });

    it('should grant token with robot credentials', async () => {
        const response = await superTest
            .post('/token')
            .send({
                id: seederResponse.robot.id,
                secret: seederResponse.robot.secret,
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.access_token).toBeDefined();
        expect(response.body.expires_in).toBeDefined();
        expect(response.body.refresh_token).toBeUndefined();
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

    it('should grant token with robot-credentials', async () => {
        const response = await superTest
            .post('/token')
            .send(robotCredentials);

        expect(response.status).toEqual(200);
    });

    it('should not grant with robot-credentials (inactive)', async () => {
        await updateSuperTestRobot(superTest, seederResponse.robot.id, {
            active: false,
        });

        const response = await superTest
            .post('/token')
            .send(robotCredentials);

        expect(response.status).toEqual(400);
        expect(response.body.code).toEqual(ErrorCode.ENTITY_INACTIVE);
    });

    it('should not grant with robot-credentials (invalid credentials)', async () => {
        await updateSuperTestRobot(superTest, seederResponse.robot.id, { active: true });

        const response = await superTest
            .post('/token')
            .send({
                ...robotCredentials,
                secret: 'foo',
            });

        expect(response.status).toEqual(400);
        expect(response.body.code).toEqual(ErrorCode.CREDENTIALS_INVALID);
    });

    it('should grant with authorize grant', async () => {
        const { body: client } = await createSuperTestClientWithScope(superTest);

        let response = await superTest
            .post('/authorize')
            .send({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: client.id,
                redirect_uri: 'https://example.com/redirect',
                scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            })
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(200);
        expect(response.body.url).toBeDefined();

        const url = new URL(response.body.url);
        expect(url.searchParams.get('access_token')).toBeFalsy();
        expect(url.searchParams.get('code')).toBeDefined();
        expect(url.searchParams.get('id_token')).toBeDefined();

        const code = url.searchParams.get('code');

        response = await superTest
            .post('/token')
            .send({
                grant_type: 'authorization_code',
                redirect_uri: 'https://example.com/redirect',
                code,
            });

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.access_token).toBeDefined();
        expect(response.body.id_token).toBeDefined();
        expect(response.body.expires_in).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();
    });
});
