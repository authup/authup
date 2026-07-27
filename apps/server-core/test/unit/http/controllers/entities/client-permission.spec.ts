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
import type { ClientPermission } from '@authup/core-kit';

import { createTestApplication } from '../../../../app';
import { createFakeClient, createFakePermission, expectPropertiesEqualToSrc } from '../../../../utils';

describe('src/http/controllers/client-permission', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    let entity : ClientPermission | undefined;

    it('should create resource', async () => {
        const { data: client } = await suite.client.client.create(createFakeClient());
        const { data: permission } = await suite.client.permission.create(createFakePermission());

        entity = (await suite.client
            .clientPermission
            .create({
                clientId: client.id,
                permissionId: permission.id,
            })).data;

        expect(entity.clientId).toEqual(client.id);
        expect(entity.permissionId).toEqual(permission.id);
    });

    it('should read collection', async () => {
        const response = await suite.client
            .clientPermission
            .getMany();

        expect(response.data).toBeDefined();
        expect(response.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should read resource', async () => {
        const { data: response } = await suite.client
            .clientPermission
            .getOne(entity!.id);

        expect(response).toBeDefined();

        expectPropertiesEqualToSrc(entity!, response, ['client', 'permission']);
    });

    it('should delete resource', async () => {
        const { data: response } = await suite.client
            .clientPermission
            .delete(entity!.id);

        expect(response.id).toBeDefined();
    });
});
