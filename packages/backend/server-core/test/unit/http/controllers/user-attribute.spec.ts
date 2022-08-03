/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UserAttribute } from '@authelion/common';
import { useSuperTest } from '../../../utils/supertest';
import { DatabaseRootSeederRunResponse } from '../../../../src';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';

describe('src/http/controllers/user-attribute', () => {
    const superTest = useSuperTest();

    let seederResponse: DatabaseRootSeederRunResponse | undefined;

    beforeAll(async () => {
        seederResponse = await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    it('should create, read, update, delete resource', async () => {
        const response = await superTest
            .post('/user-attributes')
            .send({
                name: 'foo',
                value: 'bar',
            } as UserAttribute)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);

        const body = response.body as UserAttribute;
        expect(body).toBeDefined();
        expect(body.name).toEqual('foo');
        expect(body.value).toEqual('bar');
    });
});
