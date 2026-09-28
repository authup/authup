/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it,
} from 'vitest';
import { createTestApplication } from '../../../../app';
import { PermissionName } from '@authup/core-kit';
import {
    createFakeRole,
    createFakeUser,
    expectClientError,
    expectPropertiesEqualToSrc,
    httpRequest,
} from '../../../../utils';

describe('src/http/controllers/role', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    const details = createFakeRole();

    it('should create resource', async () => {
        const { data: response } = await suite.client
            .role
            .create(details);

        expect(response).toBeDefined();

        details.id = response.id;
    });

    it('should not create same resource', async () => {
        await expectClientError(
            () => suite.client.role.create({ name: details.name }),
            { status: 409 },
        );
    });

    // #3671: a numeric-looking value reads back as a string
    it('should keep a numeric-looking attribute value a string', async () => {
        const { data: created } = await suite.client.roleAttribute.create({
            name: `numeric_${Date.now()}`,
            value: '123',
            roleId: details.id!,
        });

        const { data: read } = await suite.client.roleAttribute.getOne(created.id);
        expect(read.value).toBe('123');

        await suite.client.roleAttribute.delete(created.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .role
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should read resource', async () => {
        const { data: response } = await suite.client
            .role
            .getOne(details.id!);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);
    });

    it('should read resource by name', async () => {
        const { data: response } = await suite.client
            .role
            .getOne(details.id!);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(details, response);
    });

    it('should update resource', async () => {
        const { data: response } = await suite.client
            .role
            .update(details.id!, {
                ...details,
                name: 'testa',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('testa');

        details.name = 'testa';
        expectPropertiesEqualToSrc(details, response);
    });

    it('should update resource by name', async () => {
        const { data: response } = await suite.client
            .role
            .update(details.name, {
                ...details,
                name: 'testb',
            });

        expect(response).toBeDefined();
        expect(response.name).toEqual('testb');

        details.name = 'testb';
        expectPropertiesEqualToSrc(details, response);
    });

    it('should delete resource', async () => {
        const { data: response } = await suite.client
            .role
            .delete(details.id!);

        expect(response.id).toBeDefined();
    });

    it('should remove the grants of a deleted role immediately', async () => {
        const password = 'role-holder-password';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const { data: role } = await suite.client.role.create(createFakeRole());
        const { data: permission } = await suite.client.permission.getOne(PermissionName.PERMISSION_READ);

        await suite.client.rolePermission.create({ roleId: role.id, permissionId: permission.id });
        await suite.client.userRole.create({ userId: user.id, roleId: role.id });

        const token = await suite.client.token.createWithPassword({ username: user.name, password });
        const read = () => httpRequest(suite, 'GET', '/permissions', { headers: { Authorization: `Bearer ${token.access_token}` } });

        expect((await read()).status).toEqual(200);

        await suite.client.role.delete(role.id);

        expect((await read()).status).toEqual(403);
    });

    it('should create and update resource with put', async () => {
        const { name } = createFakeRole();

        let { data: response } = await suite.client
            .role.createOrUpdate(name, { name });

        expect(response).toBeDefined();
        expect(response.name).toEqual(name);

        const { id } = response;

        const { name: nextName } = createFakeRole();

        response = (await suite.client
            .role
            .createOrUpdate(name, { name: nextName })).data;

        expect(response).toBeDefined();
        expect(response.name).toEqual(nextName);
        expect(response.id).toEqual(id);
    });
});
