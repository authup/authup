/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission, Role } from '@authup/core-kit';
import { PermissionName } from '@authup/core-kit';
import { expectPropertiesEqualToSrc } from '../../../utils/properties';
import { useSuperTest } from '../../../utils/supertest';
import { dropTestDatabase, useTestDatabase } from '../../../utils/database/connection';

describe('src/http/controllers/permission', () => {
    let superTest = useSuperTest();

    beforeAll(async () => {
        await useTestDatabase();
    });

    afterAll(async () => {
        await dropTestDatabase();

        superTest = undefined;
    });

    const details : Partial<Permission> = {
        name: 'testAdd999',
    };

    it('should create collection', async () => {
        const response = await superTest
            .post('/permissions')
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(201);
        expect(response.body).toBeDefined();

        details.id = response.body.id;
    });

    it('should not create same resource', async () => {
        const response = await superTest
            .post('/permissions')
            .send({
                name: details.name,
            } satisfies Partial<Role>)
            .auth('admin', 'start123');

        expect(response.statusCode).toEqual(409);
    });

    it('should read collection', async () => {
        const response = await superTest
            .get('/permissions')
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();
        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toEqual(Object.values(PermissionName).length + 1);
    });

    it('should read resource', async () => {
        const response = await superTest
            .get(`/permissions/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should read resource by name', async () => {
        const response = await superTest
            .get(`/permissions/${details.name}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(200);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should update resource', async () => {
        details.name = 'foo_add';

        const response = await superTest
            .post(`/permissions/${details.id}`)
            .send(details)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();

        expectPropertiesEqualToSrc(details, response.body);
    });

    it('should delete resource', async () => {
        const response = await superTest
            .delete(`/permissions/${details.id}`)
            .auth('admin', 'start123');

        expect(response.status).toEqual(202);
        expect(response.body).toBeDefined();
    });
});
