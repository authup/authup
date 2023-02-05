/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2AuthorizationCodeRequest, OAuth2AuthorizationResponseType, ScopeName,
} from '@authup/common';
import { SuperTest, Test } from 'supertest';
import { dropTestDatabase, useTestDatabase } from '../../../../utils/database/connection';
import { createSuperTestClientWithScope } from '../../../../utils/domains';
import { useSuperTest } from '../../../../utils/supertest';

describe('src/http/controllers/token', () => {
    let superTest: SuperTest<Test>;

    let payload : OAuth2AuthorizationCodeRequest;

    beforeAll(async () => {
        superTest = useSuperTest();
        await useTestDatabase();

        const response = await createSuperTestClientWithScope(superTest);

        payload = {
            client_id: response.body.id,
            redirect_uri: 'https://example.com/redirect',
            scope: ScopeName.GLOBAL,
        };
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    it('should authorize with response_type: code', async () => {
        const response = await superTest
            .post('/authorize')
            .send({
                ...payload,
                response_type: `${OAuth2AuthorizationResponseType.CODE}`,
            })
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(200);
        expect(response.body.url).toBeDefined();

        const url = new URL(response.body.url);
        expect(url.searchParams.get('access_token')).toBeFalsy();
        expect(url.searchParams.get('code')).toBeDefined();
        expect(url.searchParams.get('id_token')).toBeFalsy();
    });

    it('should authorize with response_type: id_token', async () => {
        const response = await superTest
            .post('/authorize')
            .send({
                ...payload,
                response_type: `${OAuth2AuthorizationResponseType.ID_TOKEN}`,
            })
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(200);
        expect(response.body.url).toBeDefined();

        const url = new URL(response.body.url);
        expect(url.searchParams.get('access_token')).toBeFalsy();
        expect(url.searchParams.get('code')).toBeFalsy();
        expect(url.searchParams.get('id_token')).toBeDefined();
    });

    it('should authorize with response_type: token', async () => {
        const response = await superTest
            .post('/authorize')
            .send({
                ...payload,
                response_type: `${OAuth2AuthorizationResponseType.TOKEN}`,
            })
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(200);
        expect(response.body.url).toBeDefined();

        const url = new URL(response.body.url);
        expect(url.searchParams.get('access_token')).toBeDefined();
        expect(url.searchParams.get('code')).toBeFalsy();
        expect(url.searchParams.get('id_token')).toBeFalsy();
    });

    it('should authorize with response_type: id_token & token', async () => {
        const response = await superTest
            .post('/authorize')
            .send({
                ...payload,
                response_type: `${OAuth2AuthorizationResponseType.ID_TOKEN} ${OAuth2AuthorizationResponseType.TOKEN}`,
            })
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(200);
        expect(response.body.url).toBeDefined();

        const url = new URL(response.body.url);
        expect(url.searchParams.get('access_token')).toBeDefined();
        expect(url.searchParams.get('code')).toBeFalsy();
        expect(url.searchParams.get('id_token')).toBeDefined();
    });
});
