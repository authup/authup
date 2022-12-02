/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { User } from '@authelion/common';
import { DatabaseRootSeederResult } from '@authelion/server-database';
import { hash } from '@authelion/server-common';
import { expectPropertiesEqualToSrc } from '../../../utils/properties';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';
import { TEST_DEFAULT_USER, createSuperTestUser } from '../../../utils/domains/user';

describe('src/http/controllers/user', () => {
    const superTest = useSuperTest();

    let seederResponse : DatabaseRootSeederResult | undefined;

    beforeAll(async () => {
        seederResponse = await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();
    });

    const details : Partial<User> = {
        ...TEST_DEFAULT_USER,
    };

    it('should create, read, update, delete resource', async () => {
        let response = await createSuperTestUser(superTest, {
            ...details,
            password: await hash('start123'),
        });

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);

        // ---------------------------------------------------------

        const collectionResponse = await superTest
            .get('/users')
            .auth('admin', 'start123');

        expect(collectionResponse.status).toEqual(200);
        expect(collectionResponse.body).toBeDefined();
        expect(collectionResponse.body.data).toBeDefined();
        expect(collectionResponse.body.data.length).toEqual(2);

        // ---------------------------------------------------------

        response = await superTest
            .get(`/users/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        // ---------------------------------------------------------

        details.name = 'TestA';
        details.first_name = 'bar';
        details.last_name = 'baz';

        response = await superTest
            .post(`/users/${response.body.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);

        // ---------------------------------------------------------

        response = await superTest
            .delete(`/users/${response.body.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
    });
});
